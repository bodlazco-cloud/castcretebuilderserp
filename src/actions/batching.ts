"use server";

import { db } from "@/db";
import {
  batchingProductionLogs, concreteDeliveryNotes,
  concreteDeliveryReceipts, batchingInternalSales,
  mixDesigns, inventoryStock, inventoryLedger,
} from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { z } from "zod";
import { revalidatePath } from "next/cache";

// ═══════════════════════════════════════════════════════════════════════════════
// BATCHING PLANT — Yield Variance & Theft Prevention
//
// Mass Balance logic (Triple-Lock System):
//   Gate 1 (Input):    Every kg of raw material entering the mixer is logged.
//   Gate 2 (Mix Design): Theoretical yield is calculated from Planning's mix design.
//   Gate 3 (Delivery): Site Engineer digitally acknowledges volume received.
//
// Flags:
//   Production Leak:  Actual produced < Theoretical yield  (>2% variance → Audit)
//   Delivery Leak:    Volume dispatched > Volume received at site
// ═══════════════════════════════════════════════════════════════════════════════

const YIELD_VARIANCE_THRESHOLD_PCT = 2.0;   // >2% triggers Audit flag
const DELIVERY_VARIANCE_THRESHOLD_M3 = 0;   // any gap triggers flag

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

export type LogBatchResult =
  | { success: true; logId: string; isFlagged: boolean; yieldVariancePct: number; flagReason?: string }
  | { success: false; error: string };

/**
 * Gate 1 + Gate 2: Log raw material inputs, compute theoretical yield,
 * check variance, and auto-flag to Audit if >2%.
 */
export async function logBatchProduction(
  input: z.infer<typeof LogBatchSchema>,
): Promise<LogBatchResult> {
  const parsed = LogBatchSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid input." };

  const { projectId, mixDesignId, batchDate, shift,
          cementUsedBags, sandUsedKg, gravelUsedKg,
          volumeProducedM3, operatorId } = parsed.data;

  // ── Fetch mix design for theoretical yield calculation ────────────────────
  const [mix] = await db
    .select()
    .from(mixDesigns)
    .where(and(eq(mixDesigns.id, mixDesignId), eq(mixDesigns.isActive, true)))
    .limit(1);

  if (!mix) return { success: false, error: "Mix design not found or inactive." };

  // ── Gate 2: Theoretical yield from actual raw material inputs ─────────────
  // Limiting reagent: whichever material gives the smallest yield
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

  // ── Insert production log ─────────────────────────────────────────────────
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
      isProductionFlagged,
      flagReason: flagReason ?? null,
      operatorId,
    })
    .returning({ id: batchingProductionLogs.id });

  revalidatePath(`/projects/${projectId}/batching`);
  return {
    success: true,
    logId: log.id,
    isFlagged: isProductionFlagged,
    yieldVariancePct: Number(yieldVariancePct.toFixed(4)),
    flagReason,
  };
}

// ─── Gate 3: Record concrete delivery receipt at site ─────────────────────────
const ReceiveDeliverySchema = z.object({
  deliveryNoteId:   z.string().uuid(),
  unitId:           z.string().uuid(),
  volumeReceivedM3: z.number().positive(),
  internalRatePerM3: z.number().positive(),
  receivedBy:       z.string().uuid(),
});

export type ReceiveDeliveryResult =
  | { success: true; receiptId: string; isFlagged: boolean; varianceM3: number }
  | { success: false; error: string };

/**
 * Gate 3: Site Engineer confirms volume received.
 * Any gap between dispatched and received is flagged to Audit immediately.
 * Also creates the internal sale entry (Batching P&L credit).
 */
export async function receiveConcreteDelivery(
  input: z.infer<typeof ReceiveDeliverySchema>,
): Promise<ReceiveDeliveryResult> {
  const parsed = ReceiveDeliverySchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid input." };

  const { deliveryNoteId, unitId, volumeReceivedM3, internalRatePerM3, receivedBy } = parsed.data;

  // ── Fetch delivery note ───────────────────────────────────────────────────
  const [note] = await db
    .select()
    .from(concreteDeliveryNotes)
    .where(eq(concreteDeliveryNotes.id, deliveryNoteId))
    .limit(1);

  if (!note) return { success: false, error: "Delivery note not found." };

  const volumeDispatchedM3 = Number(note.volumeDispatchedM3);
  const varianceM3 = volumeDispatchedM3 - volumeReceivedM3;
  const isDeliveryFlagged = varianceM3 > DELIVERY_VARIANCE_THRESHOLD_M3;

  // ── Insert receipt ────────────────────────────────────────────────────────
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

  // ── Create internal sale (Batching P&L credit, no external cash) ──────────
  await db.insert(batchingInternalSales).values({
    deliveryReceiptId:    receipt.id,
    projectId:            note.projectId,
    unitId,
    volumeM3:             String(volumeReceivedM3),
    internalRatePerM3:    String(internalRatePerM3),
    totalInternalRevenue: String(volumeReceivedM3 * internalRatePerM3),
    transactionDate:      new Date().toISOString().split("T")[0],
  });

  revalidatePath(`/projects/${note.projectId}/batching`);
  return {
    success: true,
    receiptId: receipt.id,
    isFlagged: isDeliveryFlagged,
    varianceM3,
  };
}
