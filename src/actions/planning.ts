"use server";

import { db } from "@/db";
import {
  bomStandards, activityDefinitions, changeOrderRequests, constructionManpowerLogs,
  inventoryStock, purchaseRequisitions, purchaseRequisitionItems,
  projectUnits, materials, resourceForecasts,
} from "@/db/schema";
import { eq, and, sql, sum, desc } from "drizzle-orm";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getAuthUser } from "@/lib/supabase-server";

const BomLineSchema = z.object({
  materialId:      z.string().uuid(),
  quantityPerUnit: z.number().positive(),
});

const SaveBomSchema = z.object({
  activityDefId: z.string().uuid(),
  unitModel:     z.string().min(1).max(50),
  unitType:      z.enum(["BEG", "REG", "END"]),
  items:         z.array(BomLineSchema).min(1, "At least one material line is required"),
});

export type SaveBomResult =
  | { success: true; inserted: number }
  | { success: false; error: string };

export async function saveBomEntries(
  input: z.infer<typeof SaveBomSchema>,
): Promise<SaveBomResult> {
  const parsed = SaveBomSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.errors[0]?.message ?? "Invalid input." };

  const { activityDefId, unitModel, unitType, items } = parsed.data;

  // Verify activity exists
  const [activity] = await db
    .select({ id: activityDefinitions.id })
    .from(activityDefinitions)
    .where(eq(activityDefinitions.id, activityDefId));

  if (!activity) return { success: false, error: "Activity definition not found." };

  // Deactivate existing BOM entries for this scope to maintain versioning
  await db
    .update(bomStandards)
    .set({ isActive: false })
    .where(
      and(
        eq(bomStandards.activityDefId, activityDefId),
        eq(bomStandards.unitModel, unitModel),
        eq(bomStandards.unitType, unitType),
        eq(bomStandards.isActive, true),
      ),
    );

  // Insert new entries
  await db.insert(bomStandards).values(
    items.map((item) => ({
      activityDefId,
      unitModel,
      unitType,
      materialId:      item.materialId,
      quantityPerUnit: String(item.quantityPerUnit),
    })),
  );

  revalidatePath("/planning/bom");
  return { success: true, inserted: items.length };
}

// ─── Change Orders ────────────────────────────────────────────────────────────

const CreateCoSchema = z.object({
  projectId:      z.string().uuid(),
  activityDefId:  z.string().uuid().optional(),
  bomStandardId:  z.string().uuid().optional(),
  unitModel:      z.string().max(50).optional(),
  unitType:       z.enum(["BEG", "REG", "END"]).optional(),
  materialId:     z.string().uuid().optional(),
  changeType:     z.enum(["ADD", "MODIFY", "REMOVE"]),
  oldQuantity:    z.number().positive().optional(),
  newQuantity:    z.number().positive().optional(),
  reason:         z.string().min(1).max(2000),
  attachmentUrls: z.array(z.string().url()).max(5).optional(),
});

export type CreateCoResult = { success: true; id: string } | { success: false; error: string };

export async function createChangeOrder(input: z.infer<typeof CreateCoSchema>): Promise<CreateCoResult> {
  const parsed = CreateCoSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.errors[0]?.message ?? "Invalid input." };

  const user = await getAuthUser();
  if (!user) return { success: false, error: "Not authenticated." };
  const { projectId, activityDefId, bomStandardId, unitModel, unitType, materialId, changeType, oldQuantity, newQuantity, reason, attachmentUrls } = parsed.data;

  const [row] = await db
    .insert(changeOrderRequests)
    .values({
      projectId,
      activityDefId:  activityDefId  ?? null,
      bomStandardId:  bomStandardId  ?? null,
      unitModel:      unitModel      ?? null,
      unitType:       unitType       ?? null,
      materialId:     materialId     ?? null,
      changeType,
      oldQuantity:    oldQuantity != null ? String(oldQuantity) : null,
      newQuantity:    newQuantity != null ? String(newQuantity) : null,
      reason,
      attachmentUrls: attachmentUrls && attachmentUrls.length > 0 ? attachmentUrls : null,
      status:         "PENDING",
      requestedBy:    user.id,
    })
    .returning({ id: changeOrderRequests.id });

  revalidatePath("/planning/change-orders");
  return { success: true, id: row.id };
}

export async function reviewChangeOrder(
  id: string,
  action: "APPROVE" | "REJECT",
  rejectionReason?: string,
): Promise<{ success: boolean; error?: string }> {
  const user = await getAuthUser();
  if (!user) return { success: false, error: "Not authenticated." };
  const newStatus = action === "APPROVE" ? "APPROVED" : "REJECTED";

  await db
    .update(changeOrderRequests)
    .set({
      status:          newStatus,
      reviewedBy:      user.id,
      reviewedAt:      new Date(),
      rejectionReason: action === "REJECT" ? (rejectionReason ?? null) : null,
    })
    .where(eq(changeOrderRequests.id, id));

  revalidatePath(`/planning/change-orders/${id}`);
  revalidatePath("/planning/change-orders");
  return { success: true };
}

// ─── Resource Forecasting (Manpower Logs) ────────────────────────────────────

const NO_SHOW_THRESHOLD = 0.80;   // flag when actual < 80% of committed

const CreateManpowerLogSchema = z.object({
  projectId:          z.string().uuid(),
  logDate:            z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  activityDefId:      z.string().uuid().optional(),
  subconId:           z.string().uuid().optional(),
  subconHeadcount:    z.number().int().min(0),
  directStaffCount:   z.number().int().min(0),
  committedHeadcount: z.number().int().min(1).optional(),  // expected deployment for the day
  remarks:            z.string().max(1000).optional(),
});

export type CreateManpowerLogResult = { success: true; id: string } | { success: false; error: string };

export async function createManpowerLog(input: z.infer<typeof CreateManpowerLogSchema>): Promise<CreateManpowerLogResult> {
  const parsed = CreateManpowerLogSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.errors[0]?.message ?? "Invalid input." };

  const user = await getAuthUser();
  if (!user) return { success: false, error: "Not authenticated." };
  const { projectId, logDate, activityDefId, subconId, subconHeadcount, directStaffCount, committedHeadcount, remarks } = parsed.data;

  const isNoShowFlagged =
    committedHeadcount != null
      ? subconHeadcount < committedHeadcount * NO_SHOW_THRESHOLD
      : false;

  const [row] = await db
    .insert(constructionManpowerLogs)
    .values({
      projectId,
      logDate,
      activityDefId:      activityDefId      ?? null,
      subconId:           subconId           ?? null,
      subconHeadcount,
      directStaffCount,
      committedHeadcount: committedHeadcount ?? null,
      isNoShowFlagged,
      remarks:            remarks            ?? null,
      recordedBy:         user.id,
    })
    .returning({ id: constructionManpowerLogs.id });

  revalidatePath("/planning/resource-forecasting");
  return { success: true, id: row.id };
}

// ─── MRP Queue ────────────────────────────────────────────────────────────────
// Gemini: getMRPQueue(site_id) — queried task_assignments for columns that
// don't exist (unit_ids, site_id, PENDING_APPROVAL status).
// Fixed:  Query the mrp_queue VIEW (migration 020/025) which already aggregates
//         demand with BEG/END buffer multipliers and nets against resource_forecasts.

export interface MrpQueueRow {
  projectId:        string;
  materialId:       string;
  materialName:     string;
  unitOfMeasure:    string;
  ntpCount:         number;
  totalNeededQty:   number;
  baselineQty:      number;
  alreadyIssuedQty: number;
  netToProcureQty:  number;
  unitRatePhp:      number;
  estimatedCostPhp: number;
}

export async function getMrpQueue(projectId: string): Promise<MrpQueueRow[]> {
  const rows = await db.execute<{
    project_id: string; material_id: string; material_name: string; unit_of_measure: string;
    ntp_count: string; total_needed_qty: string; baseline_qty: string;
    already_issued_qty: string; net_to_procure_qty: string;
    unit_rate_php: string; estimated_cost_php: string;
  }>(sql`SELECT * FROM mrp_queue WHERE project_id = ${projectId}`);

  return rows.map((r) => ({
    projectId:        r.project_id,
    materialId:       r.material_id,
    materialName:     r.material_name,
    unitOfMeasure:    r.unit_of_measure,
    ntpCount:         Number(r.ntp_count),
    totalNeededQty:   Number(r.total_needed_qty),
    baselineQty:      Number(r.baseline_qty),
    alreadyIssuedQty: Number(r.already_issued_qty),
    netToProcureQty:  Number(r.net_to_procure_qty),
    unitRatePhp:      Number(r.unit_rate_php),
    estimatedCostPhp: Number(r.estimated_cost_php),
  }));
}

// ─── Consolidated MRP PR ──────────────────────────────────────────────────────
// Gemini: consolidateAndIssuePR(siteId, pendingNtpIds)
//   1. calculate_mrp_demand RPC → mrp_queue VIEW (already applies BEG/END buffers)
//   2. virtual warehouse check → inventoryStock.quantityOnHand
//   3. PR insert (site_id, PENDING_PROCUREMENT, pr_items) → purchaseRequisitions schema
//   4. NTP status → PR_GENERATED: not in ntpStatusEnum; dropped.
//      resource_forecasts.actual_issued_qty (updated by DB trigger) already
//      tracks what's in the procurement pipeline — mrp_queue.net_to_procure_qty
//      deducts it automatically.
//
// Admin price sovereignty: unit_rate_php comes from mrp_queue VIEW which
// reads bom_standards.base_rate_php → materials.admin_price (both admin-locked).

const ConsolidatePrSchema = z.object({
  projectId: z.string().uuid(),
});

export type ConsolidatePrResult =
  | { success: true; prId: string; itemCount: number; totalEstValue: string }
  | { success: false; error: string };

export async function consolidateAndIssuePR(
  input: z.infer<typeof ConsolidatePrSchema>,
): Promise<ConsolidatePrResult> {
  const parsed = ConsolidatePrSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid input." };

  const user = await getAuthUser();
  if (!user) return { success: false, error: "Not authenticated." };

  const { projectId } = parsed.data;

  // ── 1. MRP demand from the VIEW (already buffered + netted vs resource_forecasts) ──
  const mrpRows = await getMrpQueue(projectId);
  if (mrpRows.length === 0) {
    return { success: false, error: "No pending NTP demand found for this project." };
  }

  // ── 2. Net against physical inventory stock already on-site ───────────────
  const materialIds = mrpRows.map((r) => r.materialId);
  const stockRows = await db
    .select({ materialId: inventoryStock.materialId, quantityOnHand: inventoryStock.quantityOnHand })
    .from(inventoryStock)
    .where(
      and(
        eq(inventoryStock.projectId, projectId),
        sql`${inventoryStock.materialId} = ANY(${materialIds})`,
      ),
    );

  const stockMap = new Map<string, number>(stockRows.map((s) => [s.materialId, Number(s.quantityOnHand)]));

  const lineItems = mrpRows
    .map((row) => {
      const onHand: number = stockMap.get(row.materialId) ?? 0;
      const toOrder = Math.max(0, row.netToProcureQty - onHand);
      return {
        materialId:       row.materialId,
        quantityRequired: String(row.totalNeededQty.toFixed(4)),
        quantityInStock:  String(onHand.toFixed(4)),
        quantityToOrder:  String(toOrder.toFixed(4)),
        unitPrice:        String(row.unitRatePhp.toFixed(2)),
      };
    })
    .filter((item) => Number(item.quantityToOrder) > 0);

  if (lineItems.length === 0) {
    return { success: false, error: "All materials are sufficiently stocked. No consolidated PR needed." };
  }

  // ── 3. Create consolidated PR header ────────────────────────────────────
  const totalEstValue = lineItems.reduce(
    (sum, item) => sum + Number(item.quantityToOrder) * Number(item.unitPrice),
    0,
  );

  const [pr] = await db
    .insert(purchaseRequisitions)
    .values({
      projectId,
      status:      "DRAFT",
      requestedBy: user.id,
    })
    .returning({ id: purchaseRequisitions.id });

  // ── 4. Insert line items ─────────────────────────────────────────────────
  await db.insert(purchaseRequisitionItems).values(
    lineItems.map((item) => ({
      prId:             pr.id,
      materialId:       item.materialId,
      quantityRequired: item.quantityRequired,
      quantityInStock:  item.quantityInStock,
      quantityToOrder:  item.quantityToOrder,
      unitPrice:        item.unitPrice,
    })),
  );

  revalidatePath(`/projects/${projectId}/procurement`);
  revalidatePath("/planning/resource-mapping");
  revalidatePath("/procurement/requisitions");
  return { success: true, prId: pr.id, itemCount: lineItems.length, totalEstValue: totalEstValue.toFixed(2) };
}

// ─── Project BOM Forecast ─────────────────────────────────────────────────────
// Gemini SQL: JOIN units → master_bom → master_price_list
// Fixed: project_units → bom_standards (quantityPerUnit, not required_quantity,
//        isActive filter) → materials. Aggregates total material requirement
//        across ALL units in the project regardless of NTP status.
// Distinct from getMrpQueue which only covers BOD_APPROVED/ACTIVE NTPs with
// buffer multipliers. Use this for initial project planning before NTPs are issued.

export interface BomForecastRow {
  materialId:   string;
  materialName: string;
  uom:          string;
  totalNeeded:  number;
  unitRate:     number;
  estimatedCost: number;
}

export async function getProjectBomForecast(projectId: string): Promise<BomForecastRow[]> {
  const rows = await db
    .select({
      materialId:    materials.id,
      materialName:  materials.name,
      uom:           materials.unit,
      totalNeeded:   sum(bomStandards.quantityPerUnit),
      unitRate:      materials.adminPrice,
    })
    .from(projectUnits)
    .innerJoin(bomStandards, eq(bomStandards.unitModel, projectUnits.unitModel))
    .innerJoin(materials, eq(materials.id, bomStandards.materialId))
    .where(
      and(
        eq(projectUnits.projectId, projectId),
        eq(bomStandards.isActive, true),
        eq(materials.isActive, true),
      ),
    )
    .groupBy(materials.id, materials.name, materials.unit, materials.adminPrice)
    .orderBy(desc(sum(bomStandards.quantityPerUnit)));

  return rows.map((r) => {
    const totalNeeded  = Number(r.totalNeeded  ?? 0);
    const unitRate     = Number(r.unitRate      ?? 0);
    return {
      materialId:    r.materialId,
      materialName:  r.materialName,
      uom:           r.uom,
      totalNeeded,
      unitRate,
      estimatedCost: totalNeeded * unitRate,
    };
  });
}

// ─── Generate PR from Resource Forecasts ─────────────────────────────────────
// Gemini: generatePRFromForecast(siteId)
//   - site_id → projectId
//   - requested_by: 'SYSTEM_FORECAST' (a literal string in a UUID FK) → getAuthUser()
//   - status: 'AWAITING_PO_CONVERSION' (not in approvalStatusEnum) → 'DRAFT'
//   - pr_items → purchaseRequisitionItems; f.item_id → materialId
//   - unitPrice missing → fetched from materials.adminPrice (admin sovereignty)
//   - resource_forecasts.prId column ignored → now stamped on status update
//   - no stock netting → nets against inventoryStock (same as consolidateAndIssuePR)

const GeneratePrFromForecastSchema = z.object({
  projectId: z.string().uuid(),
});

export type GeneratePrFromForecastResult =
  | { success: true; prId: string; lineCount: number; forecastsLinked: number }
  | { success: false; error: string };

export async function generatePRFromForecast(
  input: z.infer<typeof GeneratePrFromForecastSchema>,
): Promise<GeneratePrFromForecastResult> {
  const parsed = GeneratePrFromForecastSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid input." };

  const user = await getAuthUser();
  if (!user) return { success: false, error: "Not authenticated." };

  const { projectId } = parsed.data;

  // ── 1. PENDING_PR forecasts for this project ──────────────────────────────
  const forecasts = await db
    .select({
      id:          resourceForecasts.id,
      materialId:  resourceForecasts.materialId,
      forecastQty: resourceForecasts.forecastQty,
    })
    .from(resourceForecasts)
    .where(
      and(
        eq(resourceForecasts.projectId, projectId),
        eq(resourceForecasts.status, "PENDING_PR"),
      ),
    );

  if (forecasts.length === 0) {
    return { success: false, error: "No pending forecasts found for this project." };
  }

  // ── 2. Aggregate demand per material ─────────────────────────────────────
  const demandMap = new Map<string, number>();
  for (const f of forecasts) {
    demandMap.set(f.materialId, (demandMap.get(f.materialId) ?? 0) + Number(f.forecastQty));
  }
  const materialIds = [...demandMap.keys()];

  // ── 3. Admin-locked prices + current stock (parallel) ────────────────────
  const [priceRows, stockRows] = await Promise.all([
    db.select({ id: materials.id, adminPrice: materials.adminPrice })
      .from(materials)
      .where(sql`${materials.id} = ANY(${materialIds})`),
    db.select({ materialId: inventoryStock.materialId, quantityOnHand: inventoryStock.quantityOnHand })
      .from(inventoryStock)
      .where(
        and(
          eq(inventoryStock.projectId, projectId),
          sql`${inventoryStock.materialId} = ANY(${materialIds})`,
        ),
      ),
  ]);

  const priceMap = new Map<string, number>(priceRows.map((r) => [r.id, Number(r.adminPrice)]));
  const stockMap = new Map<string, number>(stockRows.map((s) => [s.materialId, Number(s.quantityOnHand)]));

  // ── 4. Net against physical stock ────────────────────────────────────────
  const lineItems = materialIds
    .map((materialId) => {
      const required = demandMap.get(materialId) ?? 0;
      const onHand   = stockMap.get(materialId)  ?? 0;
      const toOrder  = Math.max(0, required - onHand);
      const price    = priceMap.get(materialId)  ?? 0;
      return { materialId, required, onHand, toOrder, price };
    })
    .filter((item) => item.toOrder > 0);

  // ── 5. Create PR header ───────────────────────────────────────────────────
  const [pr] = await db
    .insert(purchaseRequisitions)
    .values({ projectId, status: "DRAFT", requestedBy: user.id })
    .returning({ id: purchaseRequisitions.id });

  if (lineItems.length > 0) {
    await db.insert(purchaseRequisitionItems).values(
      lineItems.map((item) => ({
        prId:             pr.id,
        materialId:       item.materialId,
        quantityRequired: String(item.required.toFixed(4)),
        quantityInStock:  String(item.onHand.toFixed(4)),
        quantityToOrder:  String(item.toOrder.toFixed(4)),
        unitPrice:        String(item.price.toFixed(2)),
      })),
    );
  }

  // ── 6. Mark forecasts PR_CREATED + stamp prId for traceability ───────────
  await db
    .update(resourceForecasts)
    .set({ status: "PR_CREATED", prId: pr.id })
    .where(
      and(
        eq(resourceForecasts.projectId, projectId),
        eq(resourceForecasts.status, "PENDING_PR"),
      ),
    );

  revalidatePath(`/projects/${projectId}/procurement`);
  revalidatePath("/procurement/requisitions");
  return { success: true, prId: pr.id, lineCount: lineItems.length, forecastsLinked: forecasts.length };
}
