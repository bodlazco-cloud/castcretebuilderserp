"use server";

import { db } from "@/db";
import {
  mixDesigns, mixDesignBom, internalPurchaseOrders, batchingProductionLogs,
  materials,
} from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { z } from "zod";
import { revalidatePath } from "next/cache";

// ── Mix Design Approval Workflow ──────────────────────────────────────────────
// Status flow: DRAFT → PENDING_REVIEW → APPROVED (locked) / REJECTED (editable)
// APPROVED mix designs are immutable. To change one, clone it as a new version.

export type MixDesignActionResult =
  | { success: true }
  | { success: false; error: string };

export async function submitMixDesignForApproval(
  id: string,
  submittedBy: string,
): Promise<MixDesignActionResult> {
  const [mix] = await db.select({ status: mixDesigns.status }).from(mixDesigns).where(eq(mixDesigns.id, id)).limit(1);
  if (!mix) return { success: false, error: "Mix design not found." };
  if (mix.status === "APPROVED") return { success: false, error: "Mix design is already approved and locked." };
  if (mix.status === "PENDING_REVIEW") return { success: false, error: "Already submitted for review." };

  await db.update(mixDesigns).set({
    status:      "PENDING_REVIEW",
    submittedBy,
    submittedAt: new Date(),
    rejectionReason: null,
  }).where(eq(mixDesigns.id, id));

  revalidatePath(`/batching/recipes/${id}`);
  revalidatePath("/batching/recipes");
  return { success: true };
}

export async function approveMixDesign(
  id: string,
  approvedBy: string,
): Promise<MixDesignActionResult> {
  const [mix] = await db.select({ status: mixDesigns.status }).from(mixDesigns).where(eq(mixDesigns.id, id)).limit(1);
  if (!mix) return { success: false, error: "Mix design not found." };
  if (mix.status !== "PENDING_REVIEW") return { success: false, error: "Mix design must be in PENDING_REVIEW to approve." };

  await db.update(mixDesigns).set({
    status:     "APPROVED",
    approvedBy,
    approvedAt: new Date(),
    rejectionReason: null,
  }).where(eq(mixDesigns.id, id));

  revalidatePath(`/batching/recipes/${id}`);
  revalidatePath("/batching/recipes");
  return { success: true };
}

export async function rejectMixDesign(
  id: string,
  reason: string,
): Promise<MixDesignActionResult> {
  if (!reason?.trim()) return { success: false, error: "Rejection reason is required." };
  const [mix] = await db.select({ status: mixDesigns.status }).from(mixDesigns).where(eq(mixDesigns.id, id)).limit(1);
  if (!mix) return { success: false, error: "Mix design not found." };
  if (mix.status !== "PENDING_REVIEW") return { success: false, error: "Only PENDING_REVIEW designs can be rejected." };

  await db.update(mixDesigns).set({
    status:          "REJECTED",
    rejectionReason: reason.trim(),
    approvedBy:      null,
    approvedAt:      null,
  }).where(eq(mixDesigns.id, id));

  revalidatePath(`/batching/recipes/${id}`);
  revalidatePath("/batching/recipes");
  return { success: true };
}

// Clone an APPROVED mix design as a new DRAFT version (to propose edits).
const CloneSchema = z.object({
  sourceMixDesignId: z.string().uuid(),
  newCode:           z.string().min(1).max(50),
  newName:           z.string().min(1).max(100),
  createdBy:         z.string().uuid(),
});

export type CloneResult =
  | { success: true; id: string }
  | { success: false; error: string };

export async function cloneMixDesignAsDraft(
  input: z.infer<typeof CloneSchema>,
): Promise<CloneResult> {
  const p = CloneSchema.safeParse(input);
  if (!p.success) return { success: false, error: p.error.errors[0]?.message ?? "Invalid input." };
  const d = p.data;

  const [src] = await db.select().from(mixDesigns).where(eq(mixDesigns.id, d.sourceMixDesignId)).limit(1);
  if (!src) return { success: false, error: "Source mix design not found." };

  // Clone the mix design as DRAFT
  const [newMix] = await db
    .insert(mixDesigns)
    .values({
      projectId:        src.projectId,
      code:             d.newCode,
      name:             d.newName,
      cementBagsPerM3:  src.cementBagsPerM3,
      sandKgPerM3:      src.sandKgPerM3,
      gravelKgPerM3:    src.gravelKgPerM3,
      waterLitersPerM3: src.waterLitersPerM3,
      status:           "DRAFT",
      createdBy:        d.createdBy,
    })
    .returning({ id: mixDesigns.id });

  // Copy BOM ingredients from source
  const srcBom = await db.select().from(mixDesignBom).where(eq(mixDesignBom.mixDesignId, d.sourceMixDesignId));
  if (srcBom.length > 0) {
    await db.insert(mixDesignBom).values(
      srcBom.map((b) => ({
        mixDesignId:      newMix.id,
        materialId:       b.materialId,
        requiredQuantity: b.requiredQuantity,
        unitOfMeasure:    b.unitOfMeasure,
        sortOrder:        b.sortOrder,
        notes:            b.notes,
      }))
    );
  }

  revalidatePath("/batching/recipes");
  return { success: true, id: newMix.id };
}

// ── Mix Design ────────────────────────────────────────────────────────────────

const CreateMixDesignSchema = z.object({
  projectId:        z.string().uuid(),
  code:             z.string().min(1).max(50),
  name:             z.string().min(1).max(100),
  cementBagsPerM3:  z.number().positive(),
  sandKgPerM3:      z.number().positive(),
  gravelKgPerM3:    z.number().positive(),
  waterLitersPerM3: z.number().positive(),
  createdBy:        z.string().uuid(),
});

export type MixDesignResult =
  | { success: true; id: string }
  | { success: false; error: string };

export async function createMixDesign(
  input: z.infer<typeof CreateMixDesignSchema>,
): Promise<MixDesignResult> {
  const p = CreateMixDesignSchema.safeParse(input);
  if (!p.success) return { success: false, error: p.error.errors[0]?.message ?? "Invalid input." };
  const d = p.data;
  const [row] = await db
    .insert(mixDesigns)
    .values({
      projectId:        d.projectId,
      code:             d.code,
      name:             d.name,
      cementBagsPerM3:  String(d.cementBagsPerM3),
      sandKgPerM3:      String(d.sandKgPerM3),
      gravelKgPerM3:    String(d.gravelKgPerM3),
      waterLitersPerM3: String(d.waterLitersPerM3),
      createdBy:        d.createdBy,
    })
    .returning({ id: mixDesigns.id });

  revalidatePath("/batching/recipes");
  return { success: true, id: row.id };
}

// ── Recipe BOM ────────────────────────────────────────────────────────────────

const BomIngredientSchema = z.object({
  mixDesignId:      z.string().uuid(),
  materialId:       z.string().uuid(),
  requiredQuantity: z.number().positive(),
  unitOfMeasure:    z.string().min(1).max(10),
  sortOrder:        z.number().int().min(0).optional(),
  notes:            z.string().max(500).optional(),
});

export type BomIngredientResult =
  | { success: true; id: string }
  | { success: false; error: string };

export async function addBomIngredient(
  input: z.infer<typeof BomIngredientSchema>,
): Promise<BomIngredientResult> {
  const p = BomIngredientSchema.safeParse(input);
  if (!p.success) return { success: false, error: p.error.errors[0]?.message ?? "Invalid input." };
  const d = p.data;
  const [row] = await db
    .insert(mixDesignBom)
    .values({
      mixDesignId:      d.mixDesignId,
      materialId:       d.materialId,
      requiredQuantity: String(d.requiredQuantity),
      unitOfMeasure:    d.unitOfMeasure,
      sortOrder:        d.sortOrder != null ? String(d.sortOrder) : "0",
      notes:            d.notes ?? null,
    })
    .returning({ id: mixDesignBom.id });

  revalidatePath(`/batching/recipes/${d.mixDesignId}`);
  revalidatePath("/batching/recipes");
  return { success: true, id: row.id };
}

export async function deleteBomIngredient(
  id: string,
  mixDesignId: string,
): Promise<{ success: boolean; error?: string }> {
  if (!id || !mixDesignId) return { success: false, error: "Missing id." };
  await db.delete(mixDesignBom).where(eq(mixDesignBom.id, id));
  revalidatePath(`/batching/recipes/${mixDesignId}`);
  revalidatePath("/batching/recipes");
  return { success: true };
}

// ── Internal Purchase Orders ──────────────────────────────────────────────────

const CreateIPOSchema = z.object({
  projectId:         z.string().uuid(),
  unitId:            z.string().uuid(),
  mixDesignId:       z.string().uuid(),
  requestedVolumeM3: z.number().positive(),
  internalRatePerM3: z.number().positive().optional(),
  triggeredBy:       z.string().max(100).optional(),
  requestedBy:       z.string().uuid().optional(),
  notes:             z.string().max(1000).optional(),
});

export type IPOResult =
  | { success: true; id: string; ipoNumber: string }
  | { success: false; error: string };

export async function createInternalPO(
  input: z.infer<typeof CreateIPOSchema>,
): Promise<IPOResult> {
  const p = CreateIPOSchema.safeParse(input);
  if (!p.success) return { success: false, error: p.error.errors[0]?.message ?? "Invalid input." };
  const d = p.data;

  // Generate sequential IPO number
  const [seqRow] = await db.execute(
    sql`SELECT COUNT(*) AS cnt FROM internal_purchase_orders WHERE created_at >= date_trunc('year', now())`
  ) as unknown as [{ cnt: string }];
  const seq = (parseInt(seqRow?.cnt ?? "0", 10) + 1).toString().padStart(5, "0");
  const year = new Date().getFullYear();
  const ipoNumber = `IPO-${year}-${seq}`;

  const [row] = await db
    .insert(internalPurchaseOrders)
    .values({
      ipoNumber,
      projectId:         d.projectId,
      unitId:            d.unitId,
      mixDesignId:       d.mixDesignId,
      requestedVolumeM3: String(d.requestedVolumeM3),
      internalRatePerM3: d.internalRatePerM3 != null ? String(d.internalRatePerM3) : null,
      triggeredBy:       d.triggeredBy ?? null,
      requestedBy:       d.requestedBy ?? null,
      notes:             d.notes ?? null,
    })
    .returning({ id: internalPurchaseOrders.id });

  revalidatePath("/batching/ipo");
  revalidatePath("/batching");
  return { success: true, id: row.id, ipoNumber };
}

const UpdateIPOStatusSchema = z.object({
  id:              z.string().uuid(),
  status:          z.enum(["PENDING", "ACCEPTED", "IN_PRODUCTION", "DELIVERED", "BILLED"]),
  acceptedBy:      z.string().uuid().optional(),
  productionLogId: z.string().uuid().optional(),
});

export async function updateIPOStatus(
  input: z.infer<typeof UpdateIPOStatusSchema>,
): Promise<{ success: boolean; error?: string }> {
  const p = UpdateIPOStatusSchema.safeParse(input);
  if (!p.success) return { success: false, error: p.error.errors[0]?.message ?? "Invalid input." };
  const d = p.data;

  await db
    .update(internalPurchaseOrders)
    .set({
      status:          d.status,
      acceptedBy:      d.acceptedBy ?? null,
      acceptedAt:      d.acceptedBy ? new Date() : undefined,
      productionLogId: d.productionLogId ?? null,
      updatedAt:       new Date(),
    })
    .where(eq(internalPurchaseOrders.id, d.id));

  revalidatePath("/batching/ipo");
  revalidatePath("/batching");
  return { success: true };
}
