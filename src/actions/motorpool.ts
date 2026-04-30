"use server";

import { db } from "@/db";
import {
  equipment, equipmentAssignments, maintenanceRecords,
  fuelLogs, equipmentDailyChecklists, fixOrFlipAssessments,
} from "@/db/schema";
import { eq, and, gte, sum, max, sql } from "drizzle-orm";
import { z } from "zod";
import { revalidatePath } from "next/cache";

// ═══════════════════════════════════════════════════════════════════════════════
// MOTORPOOL — Fix-or-Flip Assessment & Fuel Efficiency Tracking
//
// Each machine is a micro-business:
//   Income  = Daily Rental Rate × Days on Site
//   Expense = Fuel + Operator Salary + Spare Parts + Labor
//
// Efficiency Ratio = (Maintenance Costs + Downtime Losses) / Rental Income
//   FIX  → ratio < 30%
//   FLIP → ratio > 50% for 3 consecutive months,
//          OR life-to-date maintenance > 60% of new machine value,
//          OR engine hours > 10,000 / age > 7 years
//          OR downtime > 15 days in a single month
//   MONITOR → 30–50%
//
// Fuel flag: actual liters/hour > standard by >20%
// ═══════════════════════════════════════════════════════════════════════════════

const FIX_THRESHOLD_PCT   = 0.30;
const FLIP_THRESHOLD_PCT  = 0.50;
const MAX_ENGINE_HOURS    = 10_000;
const MAX_DOWNTIME_DAYS   = 15;
const FUEL_VARIANCE_LIMIT = 0.20;  // 20% over standard

// ─── Log fuel consumption and flag anomalies ──────────────────────────────────
const LogFuelSchema = z.object({
  equipmentId:       z.string().uuid(),
  assignmentId:      z.string().uuid(),
  logDate:           z.string().date(),
  engineHoursStart:  z.number().min(0),
  engineHoursEnd:    z.number().min(0),
  fuelConsumedLiters: z.number().positive(),
  operatorId:        z.string().uuid(),
});

export type LogFuelResult =
  | { success: true; logId: string; isFlagged: boolean; variancePct: number }
  | { success: false; error: string };

export async function logFuelConsumption(
  input: z.infer<typeof LogFuelSchema>,
): Promise<LogFuelResult> {
  const parsed = LogFuelSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid input." };

  const { equipmentId, assignmentId, logDate,
          engineHoursStart, engineHoursEnd,
          fuelConsumedLiters, operatorId } = parsed.data;

  const [equip] = await db
    .select({ standard: equipment.fuelStandardLitersPerHour })
    .from(equipment)
    .where(eq(equipment.id, equipmentId))
    .limit(1);

  if (!equip) return { success: false, error: "Equipment not found." };

  const engineHoursTotal = engineHoursEnd - engineHoursStart;
  if (engineHoursTotal <= 0) return { success: false, error: "Engine hours end must be greater than start." };

  const actualEfficiency = fuelConsumedLiters / engineHoursTotal;
  const standard         = Number(equip.standard);
  const variancePct      = (actualEfficiency - standard) / standard;
  const isFlagged        = variancePct > FUEL_VARIANCE_LIMIT;

  const [log] = await db
    .insert(fuelLogs)
    .values({
      equipmentId,
      assignmentId,
      logDate,
      engineHoursStart:         String(engineHoursStart),
      engineHoursEnd:           String(engineHoursEnd),
      engineHoursTotal:         String(engineHoursTotal),
      fuelConsumedLiters:       String(fuelConsumedLiters),
      fuelEfficiencyActual:     String(actualEfficiency.toFixed(4)),
      fuelStandardLitersPerHour: String(standard),
      efficiencyVariancePct:    String((variancePct * 100).toFixed(4)),
      isFlagged,
      operatorId,
    })
    .returning({ id: fuelLogs.id });

  // Update cumulative engine hours on the equipment record
  await db
    .update(equipment)
    .set({
      totalEngineHours: sql`${equipment.totalEngineHours} + ${engineHoursTotal}`,
      updatedAt: new Date(),
    })
    .where(eq(equipment.id, equipmentId));

  return {
    success: true,
    logId: log.id,
    isFlagged,
    variancePct: Number((variancePct * 100).toFixed(2)),
  };
}

// ─── Submit daily operator checklist ─────────────────────────────────────────
const ChecklistSchema = z.object({
  equipmentId:  z.string().uuid(),
  assignmentId: z.string().uuid(),
  checkDate:    z.string().date(),
  oilOk:        z.boolean(),
  fuelOk:       z.boolean(),
  hydraulicsOk: z.boolean(),
  otherChecks:  z.record(z.boolean()).optional(),
  operatorId:   z.string().uuid(),
});

export type ChecklistResult =
  | { success: true; allPassed: boolean; equipmentLocked: boolean }
  | { success: false; error: string };

export async function submitDailyChecklist(
  input: z.infer<typeof ChecklistSchema>,
): Promise<ChecklistResult> {
  const parsed = ChecklistSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid input." };

  const { equipmentId, assignmentId, checkDate,
          oilOk, fuelOk, hydraulicsOk, otherChecks, operatorId } = parsed.data;

  const otherAllPass = otherChecks
    ? Object.values(otherChecks).every(Boolean)
    : true;

  const allPassed = oilOk && fuelOk && hydraulicsOk && otherAllPass;
  const equipmentLocked = !allPassed;

  await db.insert(equipmentDailyChecklists).values({
    equipmentId,
    assignmentId,
    checkDate,
    oilOk,
    fuelOk,
    hydraulicsOk,
    otherChecks: otherChecks ?? null,
    allPassed,
    equipmentLocked,
    operatorId,
  });

  // Lock the equipment in the ERP if any check fails
  if (equipmentLocked) {
    await db
      .update(equipment)
      .set({ isLocked: true, updatedAt: new Date() })
      .where(eq(equipment.id, equipmentId));
  }

  return { success: true, allPassed, equipmentLocked };
}

// ─── Run Fix-or-Flip assessment for a piece of equipment ─────────────────────
const AssessmentSchema = z.object({
  equipmentId: z.string().uuid(),
  assessedBy:  z.string().uuid().optional(),
});

export type AssessmentResult =
  | { success: true; recommendation: "FIX" | "FLIP" | "MONITOR"; efficiencyRatio: number; reasons: string[] }
  | { success: false; error: string };

export async function runFixOrFlipAssessment(
  input: z.infer<typeof AssessmentSchema>,
): Promise<AssessmentResult> {
  const parsed = AssessmentSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid input." };

  const { equipmentId, assessedBy } = parsed.data;

  const [equip] = await db
    .select()
    .from(equipment)
    .where(eq(equipment.id, equipmentId))
    .limit(1);

  if (!equip) return { success: false, error: "Equipment not found." };

  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setFullYear(twelveMonthsAgo.getFullYear() - 1);
  const cutoffDate = twelveMonthsAgo.toISOString().split("T")[0];

  // ── 12-month maintenance cost ─────────────────────────────────────────────
  const [maintenanceAgg] = await db
    .select({ totalCost: sum(maintenanceRecords.totalCost) })
    .from(maintenanceRecords)
    .where(
      and(
        eq(maintenanceRecords.equipmentId, equipmentId),
        gte(maintenanceRecords.maintenanceDate, cutoffDate),
      ),
    );
  const maintenanceCost12mo = Number(maintenanceAgg?.totalCost ?? 0);

  // ── 12-month rental income ────────────────────────────────────────────────
  const [rentalAgg] = await db
    .select({ totalIncome: sum(equipmentAssignments.totalRentalIncome) })
    .from(equipmentAssignments)
    .where(
      and(
        eq(equipmentAssignments.equipmentId, equipmentId),
        eq(equipmentAssignments.status, "RETURNED"),
        gte(equipmentAssignments.assignedDate, cutoffDate),
      ),
    );
  const annualRentalIncome = Number(rentalAgg?.totalIncome ?? 0);

  // ── Monthly downtime (current month) ─────────────────────────────────────
  const [downtimeAgg] = await db
    .select({ totalDowntime: sum(maintenanceRecords.downtimeDays) })
    .from(maintenanceRecords)
    .where(
      and(
        eq(maintenanceRecords.equipmentId, equipmentId),
        gte(maintenanceRecords.maintenanceDate, new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0]),
      ),
    );
  const monthlyDowntimeDays = Number(downtimeAgg?.totalDowntime ?? 0);

  // ── Fuel efficiency variance (latest 30 days average) ────────────────────
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const [fuelAgg] = await db
    .select({ avgVariance: sql<number>`AVG(${fuelLogs.efficiencyVariancePct})` })
    .from(fuelLogs)
    .where(
      and(
        eq(fuelLogs.equipmentId, equipmentId),
        gte(fuelLogs.logDate, thirtyDaysAgo.toISOString().split("T")[0]),
      ),
    );
  const fuelVariancePct = Number(fuelAgg?.avgVariance ?? 0);

  // ── Consecutive months over 50% (from assessment history) ────────────────
  const [lastAssessment] = await db
    .select({ consecutive: fixOrFlipAssessments.consecutiveMonthsOver50Pct })
    .from(fixOrFlipAssessments)
    .where(eq(fixOrFlipAssessments.equipmentId, equipmentId))
    .orderBy(sql`${fixOrFlipAssessments.createdAt} DESC`)
    .limit(1);

  const efficiencyRatio = annualRentalIncome > 0
    ? maintenanceCost12mo / annualRentalIncome
    : 1;  // treat as 100% if no income

  const previousConsecutive = Number(lastAssessment?.consecutive ?? 0);
  const consecutiveMonthsOver50 = efficiencyRatio > FLIP_THRESHOLD_PCT
    ? previousConsecutive + 1
    : 0;

  // ── Decision logic ────────────────────────────────────────────────────────
  const reasons: string[] = [];
  let recommendation: "FIX" | "FLIP" | "MONITOR" = "FIX";

  if (efficiencyRatio > FLIP_THRESHOLD_PCT) {
    reasons.push(`Efficiency ratio ${(efficiencyRatio * 100).toFixed(1)}% exceeds 50% flip threshold.`);
    recommendation = "MONITOR";
  }
  if (consecutiveMonthsOver50 >= 3) {
    reasons.push(`Ratio has exceeded 50% for ${consecutiveMonthsOver50} consecutive months.`);
    recommendation = "FLIP";
  }
  if (Number(equip.totalEngineHours) >= MAX_ENGINE_HOURS) {
    reasons.push(`Engine hours (${equip.totalEngineHours}) exceed 10,000-hour limit.`);
    recommendation = "FLIP";
  }
  if (monthlyDowntimeDays > MAX_DOWNTIME_DAYS) {
    reasons.push(`Monthly downtime (${monthlyDowntimeDays} days) exceeds 15-day threshold.`);
    recommendation = "FLIP";
  }
  if (equip.purchaseValue && (maintenanceCost12mo / Number(equip.purchaseValue)) > 0.60) {
    reasons.push(`Life-to-date maintenance exceeds 60% of purchase value.`);
    recommendation = "FLIP";
  }
  if (fuelVariancePct > FUEL_VARIANCE_LIMIT * 100) {
    reasons.push(`Average fuel efficiency variance (${fuelVariancePct.toFixed(1)}%) exceeds 20%.`);
    if (recommendation === "FIX") recommendation = "MONITOR";
  }
  if (recommendation === "FIX" && efficiencyRatio <= FIX_THRESHOLD_PCT) {
    reasons.push(`Efficiency ratio ${(efficiencyRatio * 100).toFixed(1)}% is within healthy range.`);
  }

  const isTriggered = recommendation === "FLIP";

  // ── Save assessment ───────────────────────────────────────────────────────
  await db.insert(fixOrFlipAssessments).values({
    equipmentId,
    assessmentDate:                    new Date().toISOString().split("T")[0],
    cumulativeMaintenanceCost12mo:     String(maintenanceCost12mo),
    annualRentalIncome:                String(annualRentalIncome),
    efficiencyRatio:                   String(efficiencyRatio.toFixed(4)),
    totalEngineHours:                  equip.totalEngineHours,
    monthlyDowntimeDays,
    fuelEfficiencyVariancePct:         String(fuelVariancePct.toFixed(4)),
    consecutiveMonthsOver50Pct:        consecutiveMonthsOver50,
    recommendation,
    isTriggered,
    assessedBy: assessedBy ?? null,
  });

  if (isTriggered) {
    await db
      .update(equipment)
      .set({ isFlaggedForFlip: true, updatedAt: new Date() })
      .where(eq(equipment.id, equipmentId));
  }

  return { success: true, recommendation, efficiencyRatio, reasons };
}

// ─── Add Equipment ────────────────────────────────────────────────────────────
const AddEquipmentSchema = z.object({
  code:                      z.string().min(1).max(50),
  name:                      z.string().min(1).max(150),
  type:                      z.string().min(1).max(50),
  make:                      z.string().max(100).optional(),
  model:                     z.string().max(100).optional(),
  year:                      z.number().int().min(1950).max(2100).optional(),
  purchaseValue:             z.number().positive().optional(),
  dailyRentalRate:           z.number().positive(),
  fuelStandardLitersPerHour: z.number().positive(),
});

export type AddEquipmentResult =
  | { success: true; equipmentId: string }
  | { success: false; error: string };

export async function addEquipment(
  input: z.infer<typeof AddEquipmentSchema>,
): Promise<AddEquipmentResult> {
  const parsed = AddEquipmentSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid input." };
  const d = parsed.data;

  const existing = await db
    .select({ id: equipment.id })
    .from(equipment)
    .where(eq(equipment.code, d.code))
    .limit(1);
  if (existing.length > 0) return { success: false, error: "Equipment code already exists." };

  const [eq_] = await db
    .insert(equipment)
    .values({
      code:                      d.code,
      name:                      d.name,
      type:                      d.type,
      make:                      d.make ?? null,
      model:                     d.model ?? null,
      year:                      d.year ?? null,
      purchaseValue:             d.purchaseValue != null ? String(d.purchaseValue) : null,
      dailyRentalRate:           String(d.dailyRentalRate),
      fuelStandardLitersPerHour: String(d.fuelStandardLitersPerHour),
    })
    .returning({ id: equipment.id });

  revalidatePath("/motorpool");
  return { success: true, equipmentId: eq_.id };
}

// ─── Create Equipment Assignment ──────────────────────────────────────────────
const AssignEquipmentSchema = z.object({
  equipmentId:  z.string().uuid(),
  projectId:    z.string().uuid(),
  unitId:       z.string().uuid().optional(),
  costCenterId: z.string().uuid(),
  operatorId:   z.string().uuid(),
  assignedDate: z.string().date(),
  dailyRate:    z.number().positive(),
});

export type AssignEquipmentResult =
  | { success: true; assignmentId: string }
  | { success: false; error: string };

export async function createEquipmentAssignment(
  input: z.infer<typeof AssignEquipmentSchema>,
): Promise<AssignEquipmentResult> {
  const parsed = AssignEquipmentSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid input." };
  const d = parsed.data;

  const [equip] = await db
    .select({ status: equipment.status, isLocked: equipment.isLocked })
    .from(equipment)
    .where(eq(equipment.id, d.equipmentId))
    .limit(1);

  if (!equip) return { success: false, error: "Equipment not found." };
  if (equip.isLocked) return { success: false, error: "Equipment is locked due to a failed checklist. Resolve maintenance first." };
  if (equip.status !== "AVAILABLE") return { success: false, error: `Equipment is ${equip.status}, not AVAILABLE.` };

  const [assignment] = await db
    .insert(equipmentAssignments)
    .values({
      equipmentId:  d.equipmentId,
      projectId:    d.projectId,
      unitId:       d.unitId ?? null,
      costCenterId: d.costCenterId,
      operatorId:   d.operatorId,
      assignedDate: d.assignedDate,
      dailyRate:    String(d.dailyRate),
      status:       "ACTIVE",
    })
    .returning({ id: equipmentAssignments.id });

  await db
    .update(equipment)
    .set({ status: "DEPLOYED", updatedAt: new Date() })
    .where(eq(equipment.id, d.equipmentId));

  revalidatePath("/motorpool");
  return { success: true, assignmentId: assignment.id };
}
