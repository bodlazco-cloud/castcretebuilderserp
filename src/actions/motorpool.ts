"use server";

import { db } from "@/db";
import {
  equipment, equipmentAssignments, maintenanceRecords,
  fuelLogs, equipmentDailyChecklists, fixOrFlipAssessments,
  equipmentDeployments, equipmentMonthlyBillings,
  departments, costCenters, financialLedger,
} from "@/db/schema";
import { eq, and, gte, sum, sql, isNull, or } from "drizzle-orm";
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

  // ── 12-month fixed rental revenue (from monthly billing records) ────────────
  const [rentalAgg] = await db
    .select({ totalIncome: sum(equipmentMonthlyBillings.monthlyRate) })
    .from(equipmentMonthlyBillings)
    .where(
      and(
        eq(equipmentMonthlyBillings.equipmentId, equipmentId),
        eq(equipmentMonthlyBillings.status, "POSTED"),
        gte(equipmentMonthlyBillings.billingMonth, cutoffDate.slice(0, 7)),
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
  rateType:     z.enum(["DAILY", "WEEKLY", "MONTHLY"]).default("DAILY"),
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

  try {
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
        rateType:     d.rateType,
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
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

// ─── Add Maintenance Record ───────────────────────────────────────────────────

const AddMaintenanceSchema = z.object({
  equipmentId:     z.string().uuid(),
  maintenanceType: z.enum(["PREVENTIVE", "CORRECTIVE", "EMERGENCY"]),
  description:     z.string().min(1).max(1000),
  partsCost:       z.number().min(0),
  laborCost:       z.number().min(0),
  downtimeDays:    z.number().int().min(0),
  maintenanceDate: z.string().date(),
  recordedBy:      z.string().uuid(),
});

export type AddMaintenanceResult =
  | { success: true; recordId: string }
  | { success: false; error: string };

export async function addMaintenanceRecord(
  input: z.infer<typeof AddMaintenanceSchema>,
): Promise<AddMaintenanceResult> {
  const parsed = AddMaintenanceSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.errors[0]?.message ?? "Invalid input." };
  const d = parsed.data;

  const totalCost = d.partsCost + d.laborCost;

  const [record] = await db
    .insert(maintenanceRecords)
    .values({
      equipmentId:     d.equipmentId,
      maintenanceType: d.maintenanceType,
      description:     d.description,
      partsCost:       String(d.partsCost),
      laborCost:       String(d.laborCost),
      totalCost:       String(totalCost),
      downtimeDays:    d.downtimeDays,
      maintenanceDate: d.maintenanceDate,
      status:          "PENDING",
      recordedBy:      d.recordedBy,
    })
    .returning({ id: maintenanceRecords.id });

  revalidatePath("/motorpool/maintenance");
  revalidatePath("/motorpool");
  return { success: true, recordId: record.id };
}

// ─── Log Fleet Manpower ───────────────────────────────────────────────────────

const LogFleetManpowerSchema = z.object({
  logDate:      z.string().date(),
  employeeId:   z.string().uuid(),
  equipmentId:  z.string().uuid().optional(),
  hoursWorked:  z.number().positive(),
  overtimeHours: z.number().min(0),
  costCenterId: z.string().uuid(),
  recordedBy:   z.string().uuid(),
});

export type LogFleetManpowerResult =
  | { success: true; logId: string }
  | { success: false; error: string };

export async function logFleetManpower(
  input: z.infer<typeof LogFleetManpowerSchema>,
): Promise<LogFleetManpowerResult> {
  const parsed = LogFleetManpowerSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.errors[0]?.message ?? "Invalid input." };
  const d = parsed.data;

  const { fleetManpowerLogs } = await import("@/db/schema");

  const [log] = await db
    .insert(fleetManpowerLogs)
    .values({
      logDate:      d.logDate,
      employeeId:   d.employeeId,
      equipmentId:  d.equipmentId ?? null,
      hoursWorked:  String(d.hoursWorked),
      overtimeHours: String(d.overtimeHours),
      costCenterId: d.costCenterId,
      recordedBy:   d.recordedBy,
    })
    .returning({ id: fleetManpowerLogs.id });

  revalidatePath("/motorpool/manpower");
  return { success: true, logId: log.id };
}

const CreateDeploymentSchema = z.object({
  equipmentId:      z.string().uuid(),
  deployedToDeptId: z.string().uuid(),
  projectId:        z.string().uuid().optional(),
  monthlyRate:      z.number().positive(),
  startDate:        z.string().date(),
  notes:            z.string().max(500).optional(),
  approvedBy:       z.string().uuid().optional(),
});

export type CreateDeploymentResult =
  | { success: true; deploymentId: string }
  | { success: false; error: string };

export async function createDeployment(
  input: z.infer<typeof CreateDeploymentSchema>,
): Promise<CreateDeploymentResult> {
  const parsed = CreateDeploymentSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid input." };
  const d = parsed.data;

  // Only one active deployment per machine at a time
  const [existing] = await db
    .select({ id: equipmentDeployments.id })
    .from(equipmentDeployments)
    .where(and(eq(equipmentDeployments.equipmentId, d.equipmentId), eq(equipmentDeployments.status, "ACTIVE")))
    .limit(1);
  if (existing) return { success: false, error: "This equipment already has an active deployment. End it first." };

  const [dep] = await db
    .insert(equipmentDeployments)
    .values({
      equipmentId:      d.equipmentId,
      deployedToDeptId: d.deployedToDeptId,
      projectId:        d.projectId ?? null,
      monthlyRate:      String(d.monthlyRate),
      startDate:        d.startDate,
      notes:            d.notes ?? null,
      approvedBy:       d.approvedBy ?? null,
    })
    .returning({ id: equipmentDeployments.id });

  await db.update(equipment).set({ status: "DEPLOYED", updatedAt: new Date() }).where(eq(equipment.id, d.equipmentId));

  revalidatePath("/motorpool/deployments");
  revalidatePath("/motorpool");
  return { success: true, deploymentId: dep.id };
}

export type EndDeploymentResult =
  | { success: true }
  | { success: false; error: string };

export async function endDeployment(deploymentId: string, endDate: string): Promise<EndDeploymentResult> {
  const [dep] = await db
    .select({ id: equipmentDeployments.id, equipmentId: equipmentDeployments.equipmentId })
    .from(equipmentDeployments)
    .where(eq(equipmentDeployments.id, deploymentId))
    .limit(1);
  if (!dep) return { success: false, error: "Deployment not found." };

  await db.update(equipmentDeployments)
    .set({ status: "ENDED", endDate })
    .where(eq(equipmentDeployments.id, deploymentId));

  await db.update(equipment).set({ status: "AVAILABLE", updatedAt: new Date() }).where(eq(equipment.id, dep.equipmentId));

  revalidatePath("/motorpool/deployments");
  revalidatePath("/motorpool");
  return { success: true };
}

// ─── Monthly Billing Run (idempotent) ────────────────────────────────────────
// Safe to call multiple times — skips already-billed deployment+month combos.
// Posts two financial_ledger entries per billing:
//   OUTFLOW → receiving dept cost center
//   INFLOW  → Motorpool cost center

export type RunMonthlyBillingResult =
  | { success: true; posted: number; skipped: number; billingMonth: string }
  | { success: false; error: string };

export async function runMonthlyBilling(billingMonth?: string): Promise<RunMonthlyBillingResult> {
  const month = billingMonth ?? new Date().toISOString().slice(0, 7); // YYYY-MM

  const activeDeployments = await db
    .select({
      id:               equipmentDeployments.id,
      equipmentId:      equipmentDeployments.equipmentId,
      deployedToDeptId: equipmentDeployments.deployedToDeptId,
      projectId:        equipmentDeployments.projectId,
      monthlyRate:      equipmentDeployments.monthlyRate,
    })
    .from(equipmentDeployments)
    .where(
      and(
        eq(equipmentDeployments.status, "ACTIVE"),
        or(isNull(equipmentDeployments.endDate), gte(equipmentDeployments.endDate, `${month}-01`)),
      ),
    );

  // Lookup Motorpool CC once
  const [motorpoolDept] = await db.select({ id: departments.id }).from(departments)
    .where(eq(departments.code, "MOTORPOOL")).limit(1);
  const motorpoolCC = motorpoolDept
    ? await db.select({ id: costCenters.id }).from(costCenters)
        .where(and(eq(costCenters.deptId, motorpoolDept.id), eq(costCenters.isActive, true))).limit(1)
    : [];

  let posted = 0;
  let skipped = 0;

  for (const dep of activeDeployments) {
    // Idempotency check
    const [existing] = await db
      .select({ id: equipmentMonthlyBillings.id })
      .from(equipmentMonthlyBillings)
      .where(and(
        eq(equipmentMonthlyBillings.deploymentId, dep.id),
        eq(equipmentMonthlyBillings.billingMonth, month),
      ))
      .limit(1);

    if (existing) { skipped++; continue; }

    const [billing] = await db
      .insert(equipmentMonthlyBillings)
      .values({
        deploymentId: dep.id,
        equipmentId:  dep.equipmentId,
        deptId:       dep.deployedToDeptId,
        projectId:    dep.projectId ?? null,
        billingMonth: month,
        monthlyRate:  dep.monthlyRate,
        status:       "PENDING",
      })
      .returning({ id: equipmentMonthlyBillings.id });

    // Post ledger entries if both CCs are configured
    try {
      const [receivingCC] = await db.select({ id: costCenters.id }).from(costCenters)
        .where(and(eq(costCenters.deptId, dep.deployedToDeptId), eq(costCenters.isActive, true))).limit(1);

      if (receivingCC && motorpoolCC[0] && motorpoolDept && dep.projectId) {
        const desc = `Equipment rental — ${month}`;
        await db.insert(financialLedger).values([
          {
            projectId: dep.projectId, costCenterId: receivingCC.id, deptId: dep.deployedToDeptId,
            resourceType: "MACHINE", resourceId: dep.equipmentId,
            transactionType: "OUTFLOW", referenceType: "MONTHLY_EQUIPMENT_RENTAL", referenceId: billing.id,
            amount: dep.monthlyRate, isExternal: false,
            transactionDate: `${month}-01`, description: `${desc} — receiving dept`,
          },
          {
            projectId: dep.projectId, costCenterId: motorpoolCC[0].id, deptId: motorpoolDept.id,
            resourceType: "MACHINE", resourceId: dep.equipmentId,
            transactionType: "INFLOW", referenceType: "MONTHLY_EQUIPMENT_RENTAL", referenceId: billing.id,
            amount: dep.monthlyRate, isExternal: false,
            transactionDate: `${month}-01`, description: `${desc} — Motorpool revenue`,
          },
        ]);
      }
    } catch { /* billing record saved; ledger posting failed silently */ }

    await db.update(equipmentMonthlyBillings)
      .set({ status: "POSTED", postedAt: new Date() })
      .where(eq(equipmentMonthlyBillings.id, billing.id));

    posted++;
  }

  revalidatePath("/motorpool/billing");
  revalidatePath("/motorpool");
  return { success: true, posted, skipped, billingMonth: month };
}
