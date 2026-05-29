"use server";

import { db } from "@/db";
import {
  masterBomEntries,
  resourceForecasts,
  planningVarianceRequests,
  constructionManpowerLogs,
} from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getAuthUser } from "@/lib/supabase-server";

// ─── Helpers ──────────────────────────────────────────────────────────────────

type DeptCode = string;

function guardDept(dept: DeptCode, allowed: DeptCode[]): boolean {
  return allowed.includes(dept);
}

// ─── Master BOM ───────────────────────────────────────────────────────────────

const BomLineSchema = z.object({
  materialId:      z.string().uuid(),
  quantityPerUnit: z.number().positive(),
  equipmentType:   z.string().max(100).optional(),
});

const SaveMasterBomSchema = z.object({
  projectId:       z.string().uuid(),
  phaseScopeId:    z.string().uuid(),
  phaseActivityId: z.string().uuid().optional(),
  unitModel:       z.string().min(1).max(50),
  unitType:        z.enum(["BEG", "MID", "END", "SHOP"]),
  items:           z.array(BomLineSchema).min(1, "At least one material line is required"),
});

export type SaveBomResult =
  | { success: true; inserted: number }
  | { success: false; error: string };

export async function saveMasterBomEntries(
  input: z.infer<typeof SaveMasterBomSchema>,
): Promise<SaveBomResult> {
  const parsed = SaveMasterBomSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.errors[0]?.message ?? "Invalid input." };

  const user = await getAuthUser();
  if (!user) return { success: false, error: "Not authenticated." };

  const dept = user.user_metadata?.dept_code as DeptCode;
  if (!guardDept(dept, ["PLANNING", "ADMIN", "BOD"])) {
    return { success: false, error: "Only Planning, Admin, or BOD may create BOM entries." };
  }

  const { projectId, phaseScopeId, phaseActivityId, unitModel, unitType, items } = parsed.data;

  // Deactivate existing DRAFT entries for same scope (soft version bump)
  await db
    .update(masterBomEntries)
    .set({ isActive: false })
    .where(
      and(
        eq(masterBomEntries.projectId, projectId),
        eq(masterBomEntries.phaseScopeId, phaseScopeId),
        eq(masterBomEntries.unitModel, unitModel),
        eq(masterBomEntries.unitType, unitType),
        eq(masterBomEntries.isActive, true),
        eq(masterBomEntries.status, "DRAFT"),
      ),
    );

  await db.insert(masterBomEntries).values(
    items.map((item) => ({
      projectId,
      activityDefId:   null,
      phaseScopeId,
      phaseActivityId: phaseActivityId ?? null,
      unitModel,
      unitType,
      materialId:      item.materialId,
      quantityPerUnit: String(item.quantityPerUnit),
      equipmentType:   item.equipmentType ?? null,
      status:          "DRAFT" as const,
      createdBy:       user.id,
    })),
  );

  revalidatePath("/planning/bom");
  return { success: true, inserted: items.length };
}

export type BomReviewResult = { success: boolean; error?: string };

export async function submitBomForReview(ids: string[]): Promise<BomReviewResult> {
  if (ids.length === 0) return { success: false, error: "No entries selected." };

  const user = await getAuthUser();
  if (!user) return { success: false, error: "Not authenticated." };

  const dept = user.user_metadata?.dept_code as DeptCode;
  if (!guardDept(dept, ["PLANNING", "ADMIN", "BOD"])) {
    return { success: false, error: "Only Planning may submit BOM for review." };
  }

  await db
    .update(masterBomEntries)
    .set({ status: "PENDING_REVIEW", submittedBy: user.id, submittedAt: new Date() })
    .where(and(inArray(masterBomEntries.id, ids), eq(masterBomEntries.status, "DRAFT")));

  revalidatePath("/planning/bom");
  return { success: true };
}

export async function reviewMasterBom(
  id: string,
  action: "APPROVE" | "REJECT",
  rejectionReason?: string,
): Promise<BomReviewResult> {
  const user = await getAuthUser();
  if (!user) return { success: false, error: "Not authenticated." };

  const dept = user.user_metadata?.dept_code as DeptCode;
  if (!guardDept(dept, ["ADMIN", "BOD"])) {
    return { success: false, error: "Only Admin or BOD may approve/reject BOM entries." };
  }

  await db
    .update(masterBomEntries)
    .set({
      status:          action === "APPROVE" ? "APPROVED" : "REJECTED",
      reviewedBy:      user.id,
      reviewedAt:      new Date(),
      rejectionReason: action === "REJECT" ? (rejectionReason ?? null) : null,
      updatedAt:       new Date(),
    })
    .where(eq(masterBomEntries.id, id));

  revalidatePath("/planning/bom");
  return { success: true };
}

// ─── Resource Forecasts ───────────────────────────────────────────────────────

export type ForecastUpdateResult = { success: boolean; error?: string };

export async function updateForecastStatus(
  forecastId: string,
  newStatus: "PENDING_PR" | "PR_CREATED" | "PO_ISSUED" | "ISSUED",
  prId?: string,
): Promise<ForecastUpdateResult> {
  const user = await getAuthUser();
  if (!user) return { success: false, error: "Not authenticated." };

  const dept = user.user_metadata?.dept_code as DeptCode;
  if (!guardDept(dept, ["PROCUREMENT", "PLANNING", "ADMIN", "BOD"])) {
    return { success: false, error: "Insufficient permissions." };
  }

  await db
    .update(resourceForecasts)
    .set({
      status:               newStatus,
      purchaseRequisitionId: prId ?? null,
      updatedAt:            new Date(),
    })
    .where(eq(resourceForecasts.id, forecastId));

  revalidatePath("/planning/mrp-queue");
  revalidatePath("/planning/batching-forecast");
  revalidatePath("/planning/motorpool-needs");
  return { success: true };
}

export type BudgetCheckResult =
  | { allowed: true }
  | { allowed: false; overBy: number; requiresBodApproval: boolean };

export async function checkForecastBudget(input: {
  projectId:     string;
  materialId:    string;
  requestedQty:  number;
}): Promise<BudgetCheckResult> {
  // Aggregate gross_quantity from approved forecasts for this material on this project
  const rows = await db
    .select({ grossQuantity: resourceForecasts.grossQuantity, quantityConsumed: resourceForecasts.quantityConsumed })
    .from(resourceForecasts)
    .where(eq(resourceForecasts.projectId, input.projectId));

  // Sum remaining across all forecasts (simplistic check — real gate is per unit)
  const totalRemaining = rows.reduce(
    (acc, r) => acc + (Number(r.grossQuantity) - Number(r.quantityConsumed)),
    0,
  );

  if (input.requestedQty <= totalRemaining) return { allowed: true };

  const overBy = input.requestedQty - totalRemaining;
  return { allowed: false, overBy, requiresBodApproval: true };
}

// ─── Variance Requests ────────────────────────────────────────────────────────

const VarianceRequestSchema = z.object({
  projectId:            z.string().uuid(),
  requestType:          z.enum(["BOM_CHANGE", "PROCUREMENT_VARIANCE"]),
  // BOM change
  masterBomEntryId:     z.string().uuid().optional(),
  bomChangeType:        z.enum(["ADD", "MODIFY", "REMOVE"]).optional(),
  oldQuantity:          z.number().positive().optional(),
  newQuantity:          z.number().positive().optional(),
  newMaterialId:        z.string().uuid().optional(),
  // Procurement variance
  resourceForecastId:   z.string().uuid().optional(),
  purchaseRequisitionId: z.string().uuid().optional(),
  requestedQuantity:    z.number().positive().optional(),
  isMinOrderQtyIssue:   z.boolean().default(false),
  // Common
  reason:               z.string().min(10).max(3000),
});

export type CreateVarianceResult =
  | { success: true; id: string }
  | { success: false; error: string };

export async function createVarianceRequest(
  input: z.infer<typeof VarianceRequestSchema>,
): Promise<CreateVarianceResult> {
  const parsed = VarianceRequestSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.errors[0]?.message ?? "Invalid input." };

  const user = await getAuthUser();
  if (!user) return { success: false, error: "Not authenticated." };

  const dept = user.user_metadata?.dept_code as DeptCode;
  if (!guardDept(dept, ["PLANNING", "PROCUREMENT", "ADMIN", "BOD"])) {
    return { success: false, error: "Insufficient permissions to create variance request." };
  }

  const d = parsed.data;

  const [row] = await db
    .insert(planningVarianceRequests)
    .values({
      projectId:            d.projectId,
      requestType:          d.requestType,
      masterBomEntryId:     d.masterBomEntryId     ?? null,
      bomChangeType:        d.bomChangeType         ?? null,
      oldQuantity:          d.oldQuantity != null    ? String(d.oldQuantity) : null,
      newQuantity:          d.newQuantity != null    ? String(d.newQuantity) : null,
      newMaterialId:        d.newMaterialId         ?? null,
      resourceForecastId:   d.resourceForecastId    ?? null,
      purchaseRequisitionId: d.purchaseRequisitionId ?? null,
      requestedQuantity:    d.requestedQuantity != null ? String(d.requestedQuantity) : null,
      isMinOrderQtyIssue:   d.isMinOrderQtyIssue,
      reason:               d.reason,
      status:               "DRAFT",
      submittedBy:          user.id,
    })
    .returning({ id: planningVarianceRequests.id });

  revalidatePath("/planning/variance-requests");
  return { success: true, id: row.id };
}

export async function submitVarianceRequest(id: string): Promise<BomReviewResult> {
  const user = await getAuthUser();
  if (!user) return { success: false, error: "Not authenticated." };

  await db
    .update(planningVarianceRequests)
    .set({ status: "PENDING_REVIEW", submittedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(planningVarianceRequests.id, id), eq(planningVarianceRequests.status, "DRAFT")));

  revalidatePath("/planning/variance-requests");
  return { success: true };
}

export async function reviewVarianceRequest(
  id: string,
  action: "APPROVE" | "REJECT",
  rejectionReason?: string,
): Promise<BomReviewResult> {
  const user = await getAuthUser();
  if (!user) return { success: false, error: "Not authenticated." };

  const dept = user.user_metadata?.dept_code as DeptCode;

  // BOD-only for min-order-qty variances
  const [req] = await db
    .select({ isMinOrderQtyIssue: planningVarianceRequests.isMinOrderQtyIssue })
    .from(planningVarianceRequests)
    .where(eq(planningVarianceRequests.id, id));

  if (req?.isMinOrderQtyIssue && !guardDept(dept, ["BOD"])) {
    return { success: false, error: "Minimum order quantity variances require BOD approval." };
  }

  if (!guardDept(dept, ["ADMIN", "BOD"])) {
    return { success: false, error: "Only Admin or BOD may approve/reject variance requests." };
  }

  await db
    .update(planningVarianceRequests)
    .set({
      status:          action === "APPROVE" ? "APPROVED" : "REJECTED",
      reviewedBy:      user.id,
      reviewedAt:      new Date(),
      rejectionReason: action === "REJECT" ? (rejectionReason ?? null) : null,
      updatedAt:       new Date(),
    })
    .where(eq(planningVarianceRequests.id, id));

  revalidatePath("/planning/variance-requests");
  return { success: true };
}

// ─── Edit Draft BOM Group ─────────────────────────────────────────────────────

const BomGroupLineSchema = z.object({
  id:              z.string().uuid().optional(),   // existing line; omit for new
  materialId:      z.string().uuid(),
  quantityPerUnit: z.number().positive(),
  equipmentType:   z.string().max(100).optional(),
});

const SaveEditedBomGroupSchema = z.object({
  referenceId: z.string().uuid(),                  // any existing line in the group
  lines:       z.array(BomGroupLineSchema).min(1, "At least one material line is required"),
});

export type SaveEditedBomGroupResult =
  | { success: true }
  | { success: false; error: string };

export async function saveEditedBomGroup(
  input: z.infer<typeof SaveEditedBomGroupSchema>,
): Promise<SaveEditedBomGroupResult> {
  const parsed = SaveEditedBomGroupSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.errors[0]?.message ?? "Invalid input." };

  const user = await getAuthUser();
  if (!user) return { success: false, error: "Not authenticated." };

  const dept = user.user_metadata?.dept_code as DeptCode;
  if (!guardDept(dept, ["PLANNING", "ADMIN", "BOD"])) {
    return { success: false, error: "Only Planning, Admin, or BOD may edit BOM entries." };
  }

  // Load reference line to identify the group
  const [ref] = await db
    .select({
      projectId:       masterBomEntries.projectId,
      phaseScopeId:    masterBomEntries.phaseScopeId,
      phaseActivityId: masterBomEntries.phaseActivityId,
      unitModel:       masterBomEntries.unitModel,
      unitType:        masterBomEntries.unitType,
      status:          masterBomEntries.status,
    })
    .from(masterBomEntries)
    .where(eq(masterBomEntries.id, parsed.data.referenceId));

  if (!ref) return { success: false, error: "BOM entry not found." };
  if (ref.status !== "DRAFT") return { success: false, error: "Only DRAFT entries can be edited." };

  // All current DRAFT lines in this group
  const currentLines = await db
    .select({ id: masterBomEntries.id })
    .from(masterBomEntries)
    .where(
      and(
        eq(masterBomEntries.projectId,  ref.projectId),
        eq(masterBomEntries.phaseScopeId, ref.phaseScopeId!),
        eq(masterBomEntries.unitModel,  ref.unitModel),
        eq(masterBomEntries.unitType,   ref.unitType),
        eq(masterBomEntries.isActive,   true),
        eq(masterBomEntries.status,     "DRAFT"),
      ),
    );

  const submittedIds = new Set(parsed.data.lines.map((l) => l.id).filter(Boolean) as string[]);

  // Soft-delete lines not in the submitted set
  const toDelete = currentLines.map((l) => l.id).filter((id) => !submittedIds.has(id));
  if (toDelete.length > 0) {
    await db
      .update(masterBomEntries)
      .set({ isActive: false, updatedAt: new Date() })
      .where(inArray(masterBomEntries.id, toDelete));
  }

  // Update existing lines
  for (const line of parsed.data.lines) {
    if (!line.id) continue;
    await db
      .update(masterBomEntries)
      .set({
        materialId:      line.materialId,
        quantityPerUnit: String(line.quantityPerUnit),
        equipmentType:   line.equipmentType ?? null,
        updatedAt:       new Date(),
      })
      .where(and(eq(masterBomEntries.id, line.id), eq(masterBomEntries.status, "DRAFT")));
  }

  // Insert new lines
  const newLines = parsed.data.lines.filter((l) => !l.id);
  if (newLines.length > 0) {
    await db.insert(masterBomEntries).values(
      newLines.map((line) => ({
        projectId:       ref.projectId,
        phaseScopeId:    ref.phaseScopeId,
        phaseActivityId: ref.phaseActivityId ?? null,
        unitModel:       ref.unitModel,
        unitType:        ref.unitType,
        materialId:      line.materialId,
        quantityPerUnit: String(line.quantityPerUnit),
        equipmentType:   line.equipmentType ?? null,
        activityDefId:   null,
        status:          "DRAFT" as const,
        createdBy:       user.id,
      })),
    );
  }

  revalidatePath("/planning/bom");
  return { success: true };
}

// kept for any external callers
export type UpdateDraftBomResult = SaveEditedBomGroupResult;

// ─── Manpower Logs (kept for resource-forecasting page) ───────────────────────

const CreateManpowerLogSchema = z.object({
  projectId:        z.string().uuid(),
  logDate:          z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  activityDefId:    z.string().uuid().optional(),
  subconId:         z.string().uuid().optional(),
  subconHeadcount:  z.number().int().min(0),
  directStaffCount: z.number().int().min(0),
  remarks:          z.string().max(1000).optional(),
});

export type CreateManpowerLogResult = { success: true; id: string } | { success: false; error: string };

export async function createManpowerLog(
  input: z.infer<typeof CreateManpowerLogSchema>,
): Promise<CreateManpowerLogResult> {
  const parsed = CreateManpowerLogSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.errors[0]?.message ?? "Invalid input." };

  const user = await getAuthUser();
  if (!user) return { success: false, error: "Not authenticated." };

  const { projectId, logDate, activityDefId, subconId, subconHeadcount, directStaffCount, remarks } = parsed.data;

  const [row] = await db
    .insert(constructionManpowerLogs)
    .values({
      projectId,
      logDate,
      activityDefId:    activityDefId ?? null,
      subconId:         subconId      ?? null,
      subconHeadcount,
      directStaffCount,
      remarks:          remarks       ?? null,
      recordedBy:       user.id,
    })
    .returning({ id: constructionManpowerLogs.id });

  revalidatePath("/planning/resource-forecasting");
  return { success: true, id: row.id };
}
