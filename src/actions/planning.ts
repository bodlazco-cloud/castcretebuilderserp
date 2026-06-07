"use server";

import { db } from "@/db";
import {
  masterBomEntries,
  resourceForecasts,
  planningVarianceRequests,
  constructionManpowerLogs,
  projectUnits,
  materials,
  purchaseRequisitions,
  purchaseRequisitionItems,
  activityDefinitions,
  phaseScopes,
  phaseActivities,
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
  activityDefId:   z.string().uuid().optional(),
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
  let { activityDefId } = parsed.data;

  // Auto-link to a matching Scope of Work item by code when not explicitly provided
  // (e.g. entries created from the general BOM form rather than via "+ Add BOM Entry" on a SOW item)
  if (!activityDefId) {
    const [scope] = await db.select({ code: phaseScopes.code }).from(phaseScopes).where(eq(phaseScopes.id, phaseScopeId));
    const activity = phaseActivityId
      ? (await db.select({ code: phaseActivities.code }).from(phaseActivities).where(eq(phaseActivities.id, phaseActivityId)))[0]
      : null;

    if (scope) {
      const conditions = [eq(activityDefinitions.scopeCode, scope.code)];
      if (activity) conditions.push(eq(activityDefinitions.activityCode, activity.code));
      const [match] = await db.select({ id: activityDefinitions.id }).from(activityDefinitions).where(and(...conditions)).limit(1);
      if (match) activityDefId = match.id;
    }
  }

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
      activityDefId:   activityDefId ?? null,
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

// ─── Add a single Material line to an existing BOM group ─────────────────────

const AddBomLineSchema = z.object({
  projectId:       z.string().uuid(),
  phaseScopeId:    z.string().uuid(),
  phaseActivityId: z.string().uuid().optional(),
  activityDefId:   z.string().uuid().optional(),
  unitModel:       z.string().min(1).max(50),
  unitType:        z.enum(["BEG", "MID", "END", "SHOP"]),
  materialId:      z.string().uuid(),
  quantityPerUnit: z.number().positive(),
  equipmentType:   z.string().max(100).optional(),
});

export type AddBomLineResult =
  | { success: true; id: string }
  | { success: false; error: string };

export async function addMasterBomLine(
  input: z.infer<typeof AddBomLineSchema>,
): Promise<AddBomLineResult> {
  const parsed = AddBomLineSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.errors[0]?.message ?? "Invalid input." };

  const user = await getAuthUser();
  if (!user) return { success: false, error: "Not authenticated." };

  const dept = user.user_metadata?.dept_code as DeptCode;
  if (!guardDept(dept, ["PLANNING", "ADMIN", "BOD"])) {
    return { success: false, error: "Only Planning, Admin, or BOD may add BOM material lines." };
  }

  const d = parsed.data;

  const [row] = await db
    .insert(masterBomEntries)
    .values({
      projectId:       d.projectId,
      activityDefId:   d.activityDefId   ?? null,
      phaseScopeId:    d.phaseScopeId,
      phaseActivityId: d.phaseActivityId ?? null,
      unitModel:       d.unitModel,
      unitType:        d.unitType,
      materialId:      d.materialId,
      quantityPerUnit: String(d.quantityPerUnit),
      equipmentType:   d.equipmentType ?? null,
      status:          "DRAFT" as const,
      createdBy:       user.id,
    })
    .returning({ id: masterBomEntries.id });

  revalidatePath("/planning/bom");
  return { success: true, id: row.id };
}

// ─── Delete a Draft / Rejected BOM line ──────────────────────────────────────

export type BomReviewResult = { success: boolean; error?: string };

export async function deleteDraftBomEntry(id: string): Promise<BomReviewResult> {
  const user = await getAuthUser();
  if (!user) return { success: false, error: "Not authenticated." };

  const dept = user.user_metadata?.dept_code as DeptCode;
  if (!guardDept(dept, ["PLANNING", "ADMIN", "BOD"])) {
    return { success: false, error: "Only Planning, Admin, or BOD may delete BOM material lines." };
  }

  const [existing] = await db
    .select({ status: masterBomEntries.status })
    .from(masterBomEntries)
    .where(eq(masterBomEntries.id, id));

  if (!existing) return { success: false, error: "BOM entry not found." };
  if (existing.status !== "DRAFT" && existing.status !== "REJECTED") {
    return { success: false, error: "Only Draft or Rejected lines can be deleted. Pending entries must be withdrawn first." };
  }

  await db.delete(masterBomEntries).where(eq(masterBomEntries.id, id));

  revalidatePath("/planning/bom");
  return { success: true };
}


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

// ─── Update Draft BOM Entry ───────────────────────────────────────────────────

const UpdateDraftBomSchema = z.object({
  id:              z.string().uuid(),
  phaseScopeId:    z.string().uuid(),
  phaseActivityId: z.string().uuid().optional(),
  unitModel:       z.string().min(1).max(50),
  unitType:        z.enum(["BEG", "MID", "END", "SHOP"]),
  materialId:      z.string().uuid(),
  quantityPerUnit: z.number().positive(),
  equipmentType:   z.string().max(100).optional(),
});

export type UpdateDraftBomResult =
  | { success: true }
  | { success: false; error: string };

export async function updateDraftBomEntry(
  input: z.infer<typeof UpdateDraftBomSchema>,
): Promise<UpdateDraftBomResult> {
  const parsed = UpdateDraftBomSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.errors[0]?.message ?? "Invalid input." };

  const user = await getAuthUser();
  if (!user) return { success: false, error: "Not authenticated." };

  const dept = user.user_metadata?.dept_code as DeptCode;
  if (!guardDept(dept, ["PLANNING", "ADMIN", "BOD"])) {
    return { success: false, error: "Only Planning, Admin, or BOD may edit BOM entries." };
  }

  const [existing] = await db
    .select({ status: masterBomEntries.status })
    .from(masterBomEntries)
    .where(eq(masterBomEntries.id, parsed.data.id));

  if (!existing) return { success: false, error: "BOM entry not found." };
  if (existing.status !== "DRAFT" && existing.status !== "REJECTED") {
    return { success: false, error: "Only DRAFT or REJECTED entries can be edited. Pending entries must be withdrawn first." };
  }

  await db
    .update(masterBomEntries)
    .set({
      phaseScopeId:    parsed.data.phaseScopeId,
      phaseActivityId: parsed.data.phaseActivityId ?? null,
      unitModel:       parsed.data.unitModel,
      unitType:        parsed.data.unitType,
      materialId:      parsed.data.materialId,
      quantityPerUnit: String(parsed.data.quantityPerUnit),
      equipmentType:   parsed.data.equipmentType ?? null,
      // Edits to a previously reviewed line must go through BOD approval again
      status:          "DRAFT",
      reviewedBy:      null,
      reviewedAt:      null,
      rejectionReason: null,
      updatedAt:       new Date(),
    })
    .where(eq(masterBomEntries.id, parsed.data.id));

  revalidatePath("/planning/bom");
  return { success: true };
}

// ─── Withdraw a Submitted BOM Entry (return PENDING_REVIEW → DRAFT) ───────────

export async function withdrawBomSubmission(id: string): Promise<BomReviewResult> {
  const user = await getAuthUser();
  if (!user) return { success: false, error: "Not authenticated." };

  const dept = user.user_metadata?.dept_code as DeptCode;
  if (!guardDept(dept, ["PLANNING", "ADMIN", "BOD"])) {
    return { success: false, error: "Only Planning, Admin, or BOD may withdraw a submitted BOM entry." };
  }

  const [existing] = await db
    .select({ status: masterBomEntries.status })
    .from(masterBomEntries)
    .where(eq(masterBomEntries.id, id));

  if (!existing) return { success: false, error: "BOM entry not found." };
  if (existing.status !== "PENDING_REVIEW") {
    return { success: false, error: "Only entries pending BOD review can be withdrawn." };
  }

  await db
    .update(masterBomEntries)
    .set({ status: "DRAFT", submittedBy: null, submittedAt: null, updatedAt: new Date() })
    .where(eq(masterBomEntries.id, id));

  revalidatePath("/planning/bom");
  return { success: true };
}


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

// ─── Generate Resource Forecasts for Unit ─────────────────────────────────────

export async function generateResourceForecastsForUnit(
  projectId: string,
  unitId: string,
): Promise<void> {
  const [unit] = await db
    .select({ unitModel: projectUnits.unitModel, unitType: projectUnits.unitType })
    .from(projectUnits)
    .where(eq(projectUnits.id, unitId))
    .limit(1);

  if (!unit) return;

  const bomEntries = await db
    .select({
      id:              masterBomEntries.id,
      quantityPerUnit: masterBomEntries.quantityPerUnit,
      equipmentType:   masterBomEntries.equipmentType,
      matCategory:     materials.category,
    })
    .from(masterBomEntries)
    .leftJoin(materials, eq(masterBomEntries.materialId, materials.id))
    .where(
      and(
        eq(masterBomEntries.projectId, projectId),
        eq(masterBomEntries.unitModel, unit.unitModel),
        eq(masterBomEntries.unitType, unit.unitType as any),
        eq(masterBomEntries.status, "APPROVED"),
        eq(masterBomEntries.isActive, true),
      ),
    );

  if (bomEntries.length === 0) return;

  const existing = await db
    .select({ masterBomEntryId: resourceForecasts.masterBomEntryId })
    .from(resourceForecasts)
    .where(
      and(
        eq(resourceForecasts.projectId, projectId),
        eq(resourceForecasts.unitId, unitId),
      ),
    );

  const existingSet = new Set(existing.map((r) => r.masterBomEntryId));
  const toCreate = bomEntries.filter((b) => !existingSet.has(b.id));

  if (toCreate.length === 0) return;

  await db.insert(resourceForecasts).values(
    toCreate.map((b) => ({
      projectId,
      unitId,
      masterBomEntryId: b.id,
      forecastType: (
        b.equipmentType
          ? "EQUIPMENT"
          : b.matCategory === "CONCRETE"
          ? "CONCRETE"
          : "MATERIAL"
      ) as "MATERIAL" | "CONCRETE" | "EQUIPMENT",
      grossQuantity:    b.quantityPerUnit,
      quantityConsumed: "0",
      status:           "PENDING_PR" as const,
      equipmentType:    b.equipmentType ?? null,
    })),
  );

  revalidatePath("/planning/mrp-queue");
  revalidatePath("/planning/batching-forecast");
  revalidatePath("/planning/motorpool-needs");
  revalidatePath("/planning");
}

// ─── Raise MRP Purchase Requisition ──────────────────────────────────────────

export type RaiseMrpPrResult =
  | { success: true; prId: string }
  | { success: false; error: string };

export async function raiseMrpPurchaseRequisition(
  forecastId: string,
): Promise<RaiseMrpPrResult> {
  const user = await getAuthUser();
  if (!user) return { success: false, error: "Not authenticated." };

  const dept = user.user_metadata?.dept_code as DeptCode;
  if (!guardDept(dept, ["PLANNING", "ADMIN", "BOD"])) {
    return { success: false, error: "Only Planning, Admin, or BOD may raise purchase requisitions." };
  }

  const [forecast] = await db
    .select({
      id:               resourceForecasts.id,
      projectId:        resourceForecasts.projectId,
      unitId:           resourceForecasts.unitId,
      status:           resourceForecasts.status,
      grossQuantity:    resourceForecasts.grossQuantity,
      quantityConsumed: resourceForecasts.quantityConsumed,
      materialId:       masterBomEntries.materialId,
      adminPrice:       materials.adminPrice,
    })
    .from(resourceForecasts)
    .leftJoin(masterBomEntries, eq(resourceForecasts.masterBomEntryId, masterBomEntries.id))
    .leftJoin(materials, eq(masterBomEntries.materialId, materials.id))
    .where(eq(resourceForecasts.id, forecastId))
    .limit(1);

  if (!forecast) return { success: false, error: "Forecast line not found." };
  if (forecast.status !== "PENDING_PR") {
    return { success: false, error: "Only PENDING_PR forecasts can be converted to a PR." };
  }
  if (!forecast.materialId) {
    return { success: false, error: "Forecast has no linked material — check BOM entry." };
  }

  const gross    = Number(forecast.grossQuantity);
  const consumed = Number(forecast.quantityConsumed);
  const toOrder  = Math.max(0, gross - consumed);

  if (toOrder <= 0) return { success: false, error: "No remaining quantity to order for this line." };

  const [pr] = await db
    .insert(purchaseRequisitions)
    .values({
      projectId:   forecast.projectId,
      unitId:      forecast.unitId ?? null,
      status:      "DRAFT" as const,
      requestedBy: user.id,
    })
    .returning({ id: purchaseRequisitions.id });

  await db.insert(purchaseRequisitionItems).values({
    prId:             pr.id,
    materialId:       forecast.materialId,
    quantityRequired: String(gross),
    quantityInStock:  String(consumed),
    quantityToOrder:  String(toOrder),
    unitPrice:        forecast.adminPrice ?? "0",
  });

  await db
    .update(resourceForecasts)
    .set({
      status:                "PR_CREATED" as const,
      purchaseRequisitionId: pr.id,
      updatedAt:             new Date(),
    })
    .where(eq(resourceForecasts.id, forecastId));

  revalidatePath("/planning/mrp-queue");
  revalidatePath("/planning");
  revalidatePath("/procurement/purchase-requisitions");

  return { success: true, prId: pr.id };
}
