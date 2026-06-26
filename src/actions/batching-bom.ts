"use server";

import { db } from "@/db";
import {
  mixDesigns, mixDesignBom, internalPurchaseOrders,
  premixMaterialLinks, ipoRawMaterialRequirements, batchingPlantPRFlags,
  materials, financialLedger, departments, costCenters,
} from "@/db/schema";
import {
  purchaseRequisitions, purchaseRequisitionItems, inventoryStock,
} from "@/db/schema";
import { eq, and, sql, inArray } from "drizzle-orm";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getAuthUser } from "@/lib/supabase-server";

// ── Mix Design Approval Workflow ──────────────────────────────────────────────

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
    status:          "PENDING_REVIEW",
    submittedBy,
    submittedAt:     new Date(),
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
    status:          "APPROVED",
    approvedBy,
    approvedAt:      new Date(),
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

// ── Mix Design CRUD ───────────────────────────────────────────────────────────

const CreateMixDesignSchema = z.object({
  projectId:            z.string().uuid(),
  code:                 z.string().min(1).max(50),
  name:                 z.string().min(1).max(100),
  cementBagsPerM3:      z.number().positive(),
  sandKgPerM3:          z.number().positive(),
  gravelKgPerM3:        z.number().positive(),
  gravelSpec:           z.string().max(500).optional(),
  waterLitersPerM3:     z.number().positive(),
  admixtureLitersPerM3: z.number().nonnegative().optional(),
  admixtureType:        z.string().max(100).optional(),
  createdBy:            z.string().uuid(),
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
  try {
    const [row] = await db
      .insert(mixDesigns)
      .values({
        projectId:            d.projectId,
        code:                 d.code,
        name:                 d.name,
        cementBagsPerM3:      String(d.cementBagsPerM3),
        sandKgPerM3:          String(d.sandKgPerM3),
        gravelKgPerM3:        String(d.gravelKgPerM3),
        gravelSpec:           d.gravelSpec ?? null,
        waterLitersPerM3:     String(d.waterLitersPerM3),
        admixtureLitersPerM3: d.admixtureLitersPerM3 != null ? String(d.admixtureLitersPerM3) : null,
        admixtureType:        d.admixtureType ?? null,
        createdBy:            d.createdBy,
      })
      .returning({ id: mixDesigns.id });
    revalidatePath("/batching/recipes");
    return { success: true, id: row.id };
  } catch (err: unknown) {
    const e = err as Record<string, unknown>;
    const msg    = (e.message   as string) ?? String(err);
    const detail = (e.detail    as string) ?? "";
    const code   = (e.code      as string) ?? "";
    const hint   = (e.hint      as string) ?? "";
    if (msg.includes("unique") || msg.includes("duplicate") || code === "23505") {
      return { success: false, error: `Mix code "${d.code}" already exists. Use a unique code.` };
    }
    return { success: false, error: `[${code}] ${msg}${detail ? " | " + detail : ""}${hint ? " | hint: " + hint : ""}` };
  }
}

// ── Recipe BOM Ingredients ────────────────────────────────────────────────────

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

  // Guard: only editable statuses
  const [mix] = await db.select({ status: mixDesigns.status }).from(mixDesigns).where(eq(mixDesigns.id, d.mixDesignId)).limit(1);
  if (mix?.status === "APPROVED" || mix?.status === "PENDING_REVIEW") {
    return { success: false, error: "Cannot edit a locked mix design." };
  }

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

  const [mix] = await db.select({ status: mixDesigns.status }).from(mixDesigns).where(eq(mixDesigns.id, mixDesignId)).limit(1);
  if (mix?.status === "APPROVED" || mix?.status === "PENDING_REVIEW") {
    return { success: false, error: "Cannot edit a locked mix design." };
  }

  await db.delete(mixDesignBom).where(eq(mixDesignBom.id, id));
  revalidatePath(`/batching/recipes/${mixDesignId}`);
  revalidatePath("/batching/recipes");
  return { success: true };
}

// ── Premix Material Link ──────────────────────────────────────────────────────
// Links a master material (Planning BOM product) to its mix design recipe.

export async function linkMaterialToMixDesign(
  materialId: string,
  mixDesignId: string,
): Promise<{ success: boolean; error?: string }> {
  if (!materialId || !mixDesignId) return { success: false, error: "Missing IDs." };

  // Upsert: delete existing link for this material then insert
  await db.delete(premixMaterialLinks).where(eq(premixMaterialLinks.materialId, materialId));
  await db.insert(premixMaterialLinks).values({ materialId, mixDesignId });

  revalidatePath(`/batching/recipes/${mixDesignId}`);
  return { success: true };
}

export async function unlinkMaterialFromMixDesign(
  materialId: string,
  mixDesignId: string,
): Promise<{ success: boolean; error?: string }> {
  await db.delete(premixMaterialLinks).where(
    and(eq(premixMaterialLinks.materialId, materialId), eq(premixMaterialLinks.mixDesignId, mixDesignId))
  );
  revalidatePath(`/batching/recipes/${mixDesignId}`);
  return { success: true };
}

// ── IPO CRUD ──────────────────────────────────────────────────────────────────

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

  const [seqRow] = await db.execute(
    sql`SELECT COUNT(*) AS cnt FROM internal_purchase_orders WHERE created_at >= date_trunc('year', now())`
  ) as unknown as [{ cnt: string }];
  const seq = (parseInt(seqRow?.cnt ?? "0", 10) + 1).toString().padStart(5, "0");
  const ipoNumber = `IPO-${new Date().getFullYear()}-${seq}`;

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

  // On acceptance: explode BOM → generate raw-material PR → post cost allocation
  if (d.status === "ACCEPTED") {
    const userId = d.acceptedBy ?? (await getAuthUser())?.id;
    if (!userId) return { success: false, error: "Not authenticated." };
    await explodeIPORequirements(d.id);
    const prResult = await generateBatchingPlantPR(d.id, userId);
    await postIpoRawMaterialCost(d.id);

    // Revalidate procurement pages so the generated PR appears
    if (prResult.success) {
      revalidatePath("/procurement/pr");
      revalidatePath("/procurement/pr-po");
    }
  }

  revalidatePath(`/batching/ipo/${d.id}`);
  revalidatePath("/batching/ipo");
  revalidatePath("/batching");
  return { success: true };
}

// ── Cost allocation: raw materials consumed → Batching Plant cost center ──────
// Posted once, when the Batching Plant accepts an IPO. Mirrors the MRR ledger
// pattern (procurement.ts) — uses materials.adminPrice as the standard cost.
async function postIpoRawMaterialCost(ipoId: string): Promise<void> {
  const [alreadyPosted] = await db
    .select({ id: financialLedger.id })
    .from(financialLedger)
    .where(and(eq(financialLedger.referenceType, "IPO_RAW_MATERIAL"), eq(financialLedger.referenceId, ipoId)))
    .limit(1);
  if (alreadyPosted) return;

  let requirements = await db
    .select({ materialId: ipoRawMaterialRequirements.materialId, requiredQty: ipoRawMaterialRequirements.requiredQty })
    .from(ipoRawMaterialRequirements)
    .where(eq(ipoRawMaterialRequirements.ipoId, ipoId));

  if (requirements.length === 0) {
    const exploded = await explodeIPORequirements(ipoId);
    if (!exploded.success) return;
    requirements = exploded.items.map((i) => ({ materialId: i.materialId, requiredQty: String(i.requiredQty) }));
  }

  const [ipo] = await db
    .select({ projectId: internalPurchaseOrders.projectId, mixDesignId: internalPurchaseOrders.mixDesignId })
    .from(internalPurchaseOrders)
    .where(eq(internalPurchaseOrders.id, ipoId))
    .limit(1);
  if (!ipo) return;

  const [batchingDept] = await db
    .select({ id: departments.id })
    .from(departments)
    .where(eq(departments.code, "BATCHING"))
    .limit(1);
  if (!batchingDept) return;

  const [batchingCC] = await db
    .select({ id: costCenters.id })
    .from(costCenters)
    .where(and(eq(costCenters.deptId, batchingDept.id), eq(costCenters.isActive, true)))
    .limit(1);
  if (!batchingCC) return;

  const matIds = requirements.map((r) => r.materialId);
  const matRows = await db
    .select({ id: materials.id, adminPrice: materials.adminPrice })
    .from(materials)
    .where(inArray(materials.id, matIds));
  const priceMap = new Map(matRows.map((m) => [m.id, Number(m.adminPrice)]));

  const totalCost = requirements.reduce(
    (sum, r) => sum + Number(r.requiredQty) * (priceMap.get(r.materialId) ?? 0),
    0,
  );
  if (totalCost <= 0) return;

  await db.insert(financialLedger).values({
    projectId:       ipo.projectId,
    costCenterId:    batchingCC.id,
    deptId:          batchingDept.id,
    resourceType:    "MATERIAL",
    resourceId:      ipo.mixDesignId,
    transactionType: "OUTFLOW",
    referenceType:   "IPO_RAW_MATERIAL",
    referenceId:     ipoId,
    amount:          String(totalCost.toFixed(2)),
    isExternal:      false,
    transactionDate: new Date().toISOString().split("T")[0],
    description:     `Raw material cost — Batching Plant production for IPO`,
  });
}

// ── IPO BOM Explosion ─────────────────────────────────────────────────────────
// Multiplies each mix_design_bom ingredient by the IPO volume to produce the
// raw material purchase requirements for the Batching Plant.

export type ExplodeResult =
  | { success: true; items: { materialId: string; materialName: string; requiredQty: number; unitOfMeasure: string }[] }
  | { success: false; error: string };

export async function explodeIPORequirements(ipoId: string): Promise<ExplodeResult> {
  const [ipo] = await db
    .select({ mixDesignId: internalPurchaseOrders.mixDesignId, volumeM3: internalPurchaseOrders.requestedVolumeM3 })
    .from(internalPurchaseOrders)
    .where(eq(internalPurchaseOrders.id, ipoId))
    .limit(1);

  if (!ipo) return { success: false, error: "IPO not found." };

  const bomItems = await db
    .select({
      materialId:      mixDesignBom.materialId,
      materialName:    materials.name,
      requiredQuantity: mixDesignBom.requiredQuantity,
      unitOfMeasure:   mixDesignBom.unitOfMeasure,
    })
    .from(mixDesignBom)
    .leftJoin(materials, eq(mixDesignBom.materialId, materials.id))
    .where(eq(mixDesignBom.mixDesignId, ipo.mixDesignId));

  if (bomItems.length === 0) {
    return { success: false, error: "No recipe BOM defined for this mix design. Add ingredients on the Recipe page first." };
  }

  const volumeM3 = Number(ipo.volumeM3);

  // Delete and re-insert to allow re-explosion
  await db.delete(ipoRawMaterialRequirements).where(eq(ipoRawMaterialRequirements.ipoId, ipoId));

  const inserted = await db
    .insert(ipoRawMaterialRequirements)
    .values(
      bomItems.map((b) => ({
        ipoId,
        materialId:    b.materialId!,
        requiredQty:   String(Number(b.requiredQuantity) * volumeM3),
        unitOfMeasure: b.unitOfMeasure,
      }))
    )
    .returning();

  revalidatePath(`/batching/ipo/${ipoId}`);

  return {
    success: true,
    items: inserted.map((r, i) => ({
      materialId:    r.materialId,
      materialName:  bomItems[i]?.materialName ?? "—",
      requiredQty:   Number(r.requiredQty),
      unitOfMeasure: r.unitOfMeasure,
    })),
  };
}

// ── Generate Batching Plant Purchase Requisition ──────────────────────────────
// Creates a PR in the normal procurement flow, flagged for Batching Plant receipt.

export type GeneratePRResult =
  | { success: true; prId: string }
  | { success: false; error: string };

export async function generateBatchingPlantPR(
  ipoId: string,
  requestedBy: string,
): Promise<GeneratePRResult> {
  if (!ipoId || !requestedBy) return { success: false, error: "Missing required fields." };

  // Check not already generated
  const [existing] = await db
    .select({ id: batchingPlantPRFlags.id })
    .from(batchingPlantPRFlags)
    .where(eq(batchingPlantPRFlags.ipoId, ipoId))
    .limit(1);
  if (existing) return { success: false, error: "A PR has already been generated for this IPO." };

  // Fetch IPO
  const [ipo] = await db
    .select({
      projectId: internalPurchaseOrders.projectId,
      status:    internalPurchaseOrders.status,
    })
    .from(internalPurchaseOrders)
    .where(eq(internalPurchaseOrders.id, ipoId))
    .limit(1);
  if (!ipo) return { success: false, error: "IPO not found." };

  // Fetch exploded requirements with pricing + preferred supplier
  const requirements = await db
    .select({
      id:                  ipoRawMaterialRequirements.id,
      materialId:          ipoRawMaterialRequirements.materialId,
      requiredQty:         ipoRawMaterialRequirements.requiredQty,
      unitOfMeasure:       ipoRawMaterialRequirements.unitOfMeasure,
      adminPrice:          materials.adminPrice,
      preferredSupplierId: materials.preferredSupplierId,
    })
    .from(ipoRawMaterialRequirements)
    .leftJoin(materials, eq(ipoRawMaterialRequirements.materialId, materials.id))
    .where(eq(ipoRawMaterialRequirements.ipoId, ipoId));

  if (requirements.length === 0) {
    return { success: false, error: "No raw material requirements found. Run BOM explosion first." };
  }

  // Fetch Batching Plant stock-on-hand for each material
  const materialIds = requirements.map((r) => r.materialId).filter(Boolean) as string[];
  const stockRows = materialIds.length > 0
    ? await db
        .select({ materialId: inventoryStock.materialId, qty: inventoryStock.quantityOnHand })
        .from(inventoryStock)
        .where(and(
          sql`${inventoryStock.materialId} = ANY(ARRAY[${sql.join(materialIds.map((id) => sql`${id}::uuid`), sql`, `)}])`,
          eq(inventoryStock.projectId, ipo.projectId),
        ))
    : [];
  const stockMap = new Map(stockRows.map((s) => [s.materialId, Number(s.qty ?? 0)]));

  // Create PR
  const [pr] = await db
    .insert(purchaseRequisitions)
    .values({
      projectId:   ipo.projectId,
      status:      "DRAFT",
      requestedBy,
    })
    .returning({ id: purchaseRequisitions.id });

  // Create PR items with pricing, preferred supplier, and stock netting
  for (const req of requirements) {
    const unitPrice     = Number(req.adminPrice ?? 0);
    const required      = Number(req.requiredQty);
    const inStock       = stockMap.get(req.materialId ?? "") ?? 0;
    const toOrder       = Math.max(0, required - inStock);
    const [prItem] = await db
      .insert(purchaseRequisitionItems)
      .values({
        prId:                pr.id,
        materialId:          req.materialId!,
        quantityRequired:    String(required),
        quantityInStock:     String(inStock),
        quantityToOrder:     String(toOrder),
        unitPrice:           String(unitPrice),
        preferredSupplierId: req.preferredSupplierId ?? null,
      })
      .returning({ id: purchaseRequisitionItems.id });

    await db
      .update(ipoRawMaterialRequirements)
      .set({ prItemId: prItem.id })
      .where(eq(ipoRawMaterialRequirements.id, req.id));
  }

  // Flag the PR as Batching Plant delivery
  await db.insert(batchingPlantPRFlags).values({
    prId:              pr.id,
    ipoId,
    receivingLocation: "BATCHING_PLANT",
  });

  revalidatePath(`/batching/ipo/${ipoId}`);
  revalidatePath("/batching/ipo");
  return { success: true, prId: pr.id };
}

// ─── Admin: Revert IPO Status ────────────────────────────────────────────────
export async function adminRevertIPOStatus(
  id: string,
  newStatus: "PENDING" | "ACCEPTED" | "IN_PRODUCTION" | "DELIVERED" | "BILLED",
): Promise<{ success: boolean; error?: string }> {
  const user = await getAuthUser();
  if (!user) return { success: false, error: "Not authenticated." };
  const { isAdminOrBod } = await import("@/lib/supabase-server");
  if (!(await isAdminOrBod())) return { success: false, error: "Admin/BOD only." };

  await db
    .update(internalPurchaseOrders)
    .set({ status: newStatus, updatedAt: new Date() })
    .where(eq(internalPurchaseOrders.id, id));

  revalidatePath(`/batching/ipo/${id}`);
  revalidatePath("/batching/ipo");
  revalidatePath("/batching");
  return { success: true };
}

// ─── Admin: Delete IPO ───────────────────────────────────────────────────────
export async function adminDeleteIPO(id: string): Promise<{ success: boolean; error?: string }> {
  const user = await getAuthUser();
  if (!user) return { success: false, error: "Not authenticated." };
  const { isAdminOrBod } = await import("@/lib/supabase-server");
  if (!(await isAdminOrBod())) return { success: false, error: "Admin/BOD only." };

  // Delete linked requirements, PR flags, then the IPO itself
  await db.delete(ipoRawMaterialRequirements).where(eq(ipoRawMaterialRequirements.ipoId, id));
  await db.delete(batchingPlantPRFlags).where(eq(batchingPlantPRFlags.ipoId, id));
  await db.delete(internalPurchaseOrders).where(eq(internalPurchaseOrders.id, id));

  revalidatePath("/batching/ipo");
  revalidatePath("/batching");
  return { success: true };
}
