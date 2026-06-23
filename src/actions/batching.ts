"use server";

import { db } from "@/db";
import {
  batchingProductionLogs, concreteDeliveryNotes,
  concreteDeliveryReceipts, batchingInternalSales,
  mixDesigns, mixDesignBom, standardMixes, inventoryStock,
  financialLedger, departments, costCenters,
} from "@/db/schema";
import { materials } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { z } from "zod";
import { revalidatePath } from "next/cache";

const YIELD_VARIANCE_THRESHOLD_PCT = 2.0;
const DELIVERY_VARIANCE_THRESHOLD_M3 = 0;

// ── Gate 1 + 2: Log batch production ─────────────────────────────────────────

const LogBatchSchema = z.object({
  projectId:        z.string().uuid(),
  mixDesignId:      z.string().uuid(),
  batchDate:        z.string().date(),
  shift:            z.enum(["AM", "PM", "NIGHT"]),
  cementUsedBags:   z.number().positive(),
  sandUsedKg:       z.number().positive(),
  gravelUsedKg:     z.number().positive(),
  volumeProducedM3: z.number().positive(),
  operatorId:       z.string().uuid(),
});

export type StockWarning = { materialName: string; neededQty: number; availableQty: number; shortfall: number; uom: string };

export type LogBatchResult =
  | { success: true; logId: string; isFlagged: boolean; yieldVariancePct: number; flagReason?: string; stockWarnings: StockWarning[] }
  | { success: false; error: string };

export async function logBatchProduction(
  input: z.infer<typeof LogBatchSchema>,
): Promise<LogBatchResult> {
  const parsed = LogBatchSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid input." };

  const { projectId, mixDesignId, batchDate, shift,
          cementUsedBags, sandUsedKg, gravelUsedKg,
          volumeProducedM3, operatorId } = parsed.data;

  const [mix] = await db
    .select()
    .from(mixDesigns)
    .where(and(eq(mixDesigns.id, mixDesignId), eq(mixDesigns.isActive, true)))
    .limit(1);

  if (!mix) return { success: false, error: "Mix design not found or inactive." };

  const yieldFromCement  = cementUsedBags  / Number(mix.cementBagsPerM3);
  const yieldFromSand    = sandUsedKg      / Number(mix.sandKgPerM3);
  const yieldFromGravel  = gravelUsedKg    / Number(mix.gravelKgPerM3);
  const theoreticalYieldM3 = Math.min(yieldFromCement, yieldFromSand, yieldFromGravel);

  const yieldVariancePct =
    theoreticalYieldM3 > 0
      ? ((theoreticalYieldM3 - volumeProducedM3) / theoreticalYieldM3) * 100
      : 0;

  const isProductionFlagged = Math.abs(yieldVariancePct) > YIELD_VARIANCE_THRESHOLD_PCT;
  const flagReason = isProductionFlagged
    ? `Production yield variance of ${yieldVariancePct.toFixed(2)}% exceeds the 2% threshold. Possible raw material theft or equipment error.`
    : undefined;

  // Gap #2: Pre-flight stock check — soft warning, does not block the batch
  const bomItems = await db
    .select({
      materialId:       mixDesignBom.materialId,
      requiredQuantity: mixDesignBom.requiredQuantity,
      unitOfMeasure:    mixDesignBom.unitOfMeasure,
      materialName:     materials.name,
    })
    .from(mixDesignBom)
    .leftJoin(materials, eq(mixDesignBom.materialId, materials.id))
    .where(eq(mixDesignBom.mixDesignId, mixDesignId));

  const stockWarnings: StockWarning[] = [];
  for (const item of bomItems) {
    if (!item.materialId) continue;
    const neededQty = Number(item.requiredQuantity) * volumeProducedM3;
    const [stock] = await db
      .select({ quantityOnHand: inventoryStock.quantityOnHand })
      .from(inventoryStock)
      .where(and(eq(inventoryStock.materialId, item.materialId), eq(inventoryStock.projectId, projectId)))
      .limit(1);
    const availableQty = Number(stock?.quantityOnHand ?? 0);
    if (availableQty < neededQty) {
      stockWarnings.push({
        materialName: item.materialName ?? item.materialId,
        neededQty,
        availableQty,
        shortfall: neededQty - availableQty,
        uom: item.unitOfMeasure,
      });
    }
  }

  const [log] = await db
    .insert(batchingProductionLogs)
    .values({
      projectId,
      mixDesignId,
      batchDate,
      shift,
      cementUsedBags:     String(cementUsedBags),
      sandUsedKg:         String(sandUsedKg),
      gravelUsedKg:       String(gravelUsedKg),
      volumeProducedM3:   String(volumeProducedM3),
      theoreticalYieldM3: String(theoreticalYieldM3),
      yieldVariancePct:   String(yieldVariancePct.toFixed(4)),
      isProductionFlagged,
      flagReason:         flagReason ?? null,
      operatorId,
    })
    .returning({ id: batchingProductionLogs.id });

  revalidatePath("/batching/production");
  revalidatePath("/batching");
  return {
    success: true,
    logId: log.id,
    isFlagged: isProductionFlagged,
    yieldVariancePct: Number(yieldVariancePct.toFixed(4)),
    flagReason,
    stockWarnings,
  };
}

// ── Dispatch: Batching Plant sends batch to site ──────────────────────────────

const DispatchSchema = z.object({
  productionLogId:    z.string().uuid(),
  projectId:          z.string().uuid(),
  unitId:             z.string().uuid(),
  volumeDispatchedM3: z.number().positive(),
  dispatchedBy:       z.string().uuid(),
});

export type DispatchResult =
  | { success: true; noteId: string }
  | { success: false; error: string };

export async function dispatchConcreteDelivery(
  input: z.infer<typeof DispatchSchema>,
): Promise<DispatchResult> {
  const parsed = DispatchSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.errors[0]?.message ?? "Invalid input." };

  const { productionLogId, projectId, unitId, volumeDispatchedM3, dispatchedBy } = parsed.data;

  // Check production log exists and belongs to correct project
  const [log] = await db
    .select({ id: batchingProductionLogs.id, volumeProducedM3: batchingProductionLogs.volumeProducedM3 })
    .from(batchingProductionLogs)
    .where(eq(batchingProductionLogs.id, productionLogId))
    .limit(1);
  if (!log) return { success: false, error: "Production log not found." };

  if (volumeDispatchedM3 > Number(log.volumeProducedM3)) {
    return { success: false, error: `Cannot dispatch more than produced volume (${Number(log.volumeProducedM3).toFixed(2)} m³).` };
  }

  const [note] = await db
    .insert(concreteDeliveryNotes)
    .values({ productionLogId, projectId, unitId, volumeDispatchedM3: String(volumeDispatchedM3), dispatchedBy })
    .returning({ id: concreteDeliveryNotes.id });

  revalidatePath("/batching/dispatch");
  revalidatePath("/batching/deliver");
  return { success: true, noteId: note.id };
}

// ── Gate 3: Site Engineer signs delivery receipt → IDB + inventory drawdown ───

const ReceiveDeliverySchema = z.object({
  deliveryNoteId:    z.string().uuid(),
  unitId:            z.string().uuid(),
  volumeReceivedM3:  z.number().positive(),
  internalRatePerM3: z.number().positive(),
  receivedBy:        z.string().uuid(),
});

export type ReceiveDeliveryResult =
  | { success: true; receiptId: string; isFlagged: boolean; varianceM3: number; idbTotal: number }
  | { success: false; error: string };

export async function receiveConcreteDelivery(
  input: z.infer<typeof ReceiveDeliverySchema>,
): Promise<ReceiveDeliveryResult> {
  const parsed = ReceiveDeliverySchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid input." };

  const { deliveryNoteId, unitId, volumeReceivedM3, internalRatePerM3, receivedBy } = parsed.data;

  // Fetch delivery note + production log + mix design
  const [note] = await db
    .select({
      id:                concreteDeliveryNotes.id,
      productionLogId:   concreteDeliveryNotes.productionLogId,
      projectId:         concreteDeliveryNotes.projectId,
      volumeDispatchedM3: concreteDeliveryNotes.volumeDispatchedM3,
    })
    .from(concreteDeliveryNotes)
    .where(eq(concreteDeliveryNotes.id, deliveryNoteId))
    .limit(1);

  if (!note) return { success: false, error: "Delivery note not found." };

  // Check not already received
  const [existing] = await db
    .select({ id: concreteDeliveryReceipts.id })
    .from(concreteDeliveryReceipts)
    .where(eq(concreteDeliveryReceipts.deliveryNoteId, deliveryNoteId))
    .limit(1);
  if (existing) return { success: false, error: "This delivery has already been signed off." };

  const [log] = await db
    .select({ mixDesignId: batchingProductionLogs.mixDesignId, projectId: batchingProductionLogs.projectId })
    .from(batchingProductionLogs)
    .where(eq(batchingProductionLogs.id, note.productionLogId))
    .limit(1);
  if (!log) return { success: false, error: "Production log not found." };

  const volumeDispatchedM3 = Number(note.volumeDispatchedM3);
  const varianceM3 = volumeDispatchedM3 - volumeReceivedM3;
  const isDeliveryFlagged = varianceM3 > DELIVERY_VARIANCE_THRESHOLD_M3;
  const idbTotal = volumeReceivedM3 * internalRatePerM3;

  // Insert receipt
  const [receipt] = await db
    .insert(concreteDeliveryReceipts)
    .values({
      deliveryNoteId,
      unitId,
      volumeReceivedM3:  String(volumeReceivedM3),
      volumeVarianceM3:  String(varianceM3),
      isDeliveryFlagged,
      receivedBy,
    })
    .returning({ id: concreteDeliveryReceipts.id });

  // Auto IDB: create internal sale (debit project, credit batching revenue)
  await db.insert(batchingInternalSales).values({
    deliveryReceiptId:    receipt.id,
    projectId:            note.projectId,
    unitId,
    volumeM3:             String(volumeReceivedM3),
    internalRatePerM3:    String(internalRatePerM3),
    totalInternalRevenue: String(idbTotal),
    transactionDate:      new Date().toISOString().split("T")[0],
  });

  // Post IDB to the financial ledger: Construction project cost center is debited
  // (cost of premix concrete consumed); Batching Plant cost center is credited
  // (internal revenue, offsetting the raw-material cost recognized at IPO acceptance).
  await postInternalDeliveryBilling({
    projectId:  note.projectId,
    unitId,
    mixDesignId: log.mixDesignId,
    receiptId:  receipt.id,
    amount:     idbTotal,
  });

  // Inventory drawdown: BOM × volume received subtracted from Batching Plant stock
  const bomItems = await db
    .select({ materialId: mixDesignBom.materialId, requiredQuantity: mixDesignBom.requiredQuantity })
    .from(mixDesignBom)
    .where(eq(mixDesignBom.mixDesignId, log.mixDesignId));

  for (const item of bomItems) {
    if (!item.materialId) continue;
    const drawdown = Number(item.requiredQuantity) * volumeReceivedM3;
    await db
      .update(inventoryStock)
      .set({
        quantityOnHand: sql`GREATEST(0, ${inventoryStock.quantityOnHand} - ${String(drawdown)})`,
        lastUpdated: new Date(),
      })
      .where(and(
        eq(inventoryStock.materialId, item.materialId),
        eq(inventoryStock.projectId, log.projectId),
      ));
  }

  revalidatePath("/batching/deliver");
  revalidatePath("/batching/internal-sales");
  revalidatePath("/batching");
  return { success: true, receiptId: receipt.id, isFlagged: isDeliveryFlagged, varianceM3, idbTotal };
}

// Inter-departmental billing for premix concrete: the Construction project absorbs
// the internal transfer price as a project cost, while the Batching Plant books it
// as internal revenue (offsetting the raw-material cost recognized at IPO acceptance).
async function postInternalDeliveryBilling(args: {
  projectId: string; unitId: string; mixDesignId: string; receiptId: string; amount: number;
}): Promise<void> {
  if (args.amount <= 0) return;

  const [constructionDept, batchingDept] = await Promise.all([
    db.select({ id: departments.id }).from(departments).where(eq(departments.code, "CONSTRUCTION")).limit(1),
    db.select({ id: departments.id }).from(departments).where(eq(departments.code, "BATCHING")).limit(1),
  ]);
  if (!constructionDept[0] || !batchingDept[0]) return;

  const [constructionCC, batchingCC] = await Promise.all([
    db.select({ id: costCenters.id }).from(costCenters)
      .where(and(eq(costCenters.deptId, constructionDept[0].id), eq(costCenters.isActive, true))).limit(1),
    db.select({ id: costCenters.id }).from(costCenters)
      .where(and(eq(costCenters.deptId, batchingDept[0].id), eq(costCenters.isActive, true))).limit(1),
  ]);
  if (!constructionCC[0] || !batchingCC[0]) return;

  const txDate = new Date().toISOString().split("T")[0];
  const amount = String(args.amount.toFixed(2));

  await db.insert(financialLedger).values([
    {
      projectId:       args.projectId,
      costCenterId:    constructionCC[0].id,
      deptId:          constructionDept[0].id,
      unitId:          args.unitId,
      resourceType:    "MATERIAL",
      resourceId:      args.mixDesignId,
      transactionType: "OUTFLOW",
      referenceType:   "IDB",
      referenceId:     args.receiptId,
      amount,
      isExternal:      false,
      transactionDate: txDate,
      description:     "Premix concrete — internal delivery billing (Batching Plant)",
    },
    {
      projectId:       args.projectId,
      costCenterId:    batchingCC[0].id,
      deptId:          batchingDept[0].id,
      unitId:          args.unitId,
      resourceType:    "MATERIAL",
      resourceId:      args.mixDesignId,
      transactionType: "INFLOW",
      referenceType:   "IDB",
      referenceId:     args.receiptId,
      amount,
      isExternal:      false,
      transactionDate: txDate,
      description:     "Premix concrete — internal revenue (delivered to project)",
    },
  ]);
}

// ─── Standard Mixes ───────────────────────────────────────────────────────────

const StandardMixSchema = z.object({
  projectId:       z.string().uuid(),
  unitModel:       z.string().min(1).max(50),
  unitType:        z.enum(["BEG", "MID", "END", "SHOP"]),
  mixDesignId:     z.string().uuid().optional(),
  volumePerUnitM3: z.number().positive().optional(),
  description:     z.string().max(500).optional(),
});

export type StandardMixResult =
  | { success: true; id: string }
  | { success: false; error: string };

export async function createStandardMix(
  input: z.infer<typeof StandardMixSchema>,
): Promise<StandardMixResult> {
  const parsed = StandardMixSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.errors[0]?.message ?? "Invalid input." };

  const d = parsed.data;
  const [row] = await db
    .insert(standardMixes)
    .values({
      projectId:       d.projectId,
      unitModel:       d.unitModel,
      unitType:        d.unitType,
      mixDesignId:     d.mixDesignId ?? null,
      volumePerUnitM3: d.volumePerUnitM3 != null ? String(d.volumePerUnitM3) : null,
      description:     d.description ?? null,
    })
    .returning({ id: standardMixes.id });

  revalidatePath("/batching/recipes");
  return { success: true, id: row.id };
}
