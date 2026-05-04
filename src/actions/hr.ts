"use server";

import { db } from "@/db";
import {
  employees, dailyTimeRecords, leaveSchedules,
  batchingManpowerLogs, fleetManpowerLogs,
  payrollRuns, payrollLineItems,
} from "@/db/schema";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { z } from "zod";
import { computeStatutoryDeductions, detectPeriodType } from "@/lib/payroll-utils";
import { revalidatePath } from "next/cache";
import { getAuthUser } from "@/lib/supabase-server";

// ─── Add Employee ─────────────────────────────────────────────────────────────
const AddEmployeeSchema = z.object({
  employeeCode:           z.string().min(1).max(50),
  fullName:               z.string().min(1).max(150),
  deptId:                 z.string().uuid(),
  costCenterId:           z.string().uuid(),
  position:               z.string().min(1).max(100),
  employmentType:         z.enum(["REGULAR", "CONTRACTUAL", "PROJECT_BASED"]),
  dailyRate:              z.number().positive(),
  sssContribution:        z.number().min(0),
  philhealthContribution: z.number().min(0),
  pagibigContribution:    z.number().min(0),
  hireDate:               z.string().date(),
  tinNumber:              z.string().optional(),
});

export type AddEmployeeResult =
  | { success: true; employeeId: string }
  | { success: false; error: string };

export async function addEmployee(
  input: z.infer<typeof AddEmployeeSchema>,
): Promise<AddEmployeeResult> {
  const parsed = AddEmployeeSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid input." };
  const d = parsed.data;

  const existing = await db
    .select({ id: employees.id })
    .from(employees)
    .where(eq(employees.employeeCode, d.employeeCode))
    .limit(1);
  if (existing.length > 0) return { success: false, error: "Employee code already exists." };

  const [emp] = await db
    .insert(employees)
    .values({
      employeeCode:           d.employeeCode,
      fullName:               d.fullName,
      deptId:                 d.deptId,
      costCenterId:           d.costCenterId,
      position:               d.position,
      employmentType:         d.employmentType,
      dailyRate:              String(d.dailyRate),
      sssContribution:        String(d.sssContribution),
      philhealthContribution: String(d.philhealthContribution),
      pagibigContribution:    String(d.pagibigContribution),
      hireDate:               d.hireDate,
      tinNumber:              d.tinNumber ?? null,
    })
    .returning({ id: employees.id });

  revalidatePath("/hr");
  return { success: true, employeeId: emp.id };
}

// ─── Log Daily Time Record ────────────────────────────────────────────────────
const LogDtrSchema = z.object({
  employeeId:   z.string().uuid(),
  workDate:     z.string().date(),
  costCenterId: z.string().uuid(),
  unitId:       z.string().uuid().optional(),
  timeIn:       z.string().optional(),
  timeOut:      z.string().optional(),
  hoursWorked:  z.number().min(0).max(24).optional(),
  overtimeHours: z.number().min(0).optional(),
});

export type LogDtrResult =
  | { success: true; dtrId: string }
  | { success: false; error: string };

export async function logDailyTimeRecord(
  input: z.infer<typeof LogDtrSchema>,
): Promise<LogDtrResult> {
  const parsed = LogDtrSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid input." };
  const d = parsed.data;

  const [dtr] = await db
    .insert(dailyTimeRecords)
    .values({
      employeeId:    d.employeeId,
      workDate:      d.workDate,
      costCenterId:  d.costCenterId,
      unitId:        d.unitId ?? null,
      timeIn:        d.timeIn ?? null,
      timeOut:       d.timeOut ?? null,
      hoursWorked:   d.hoursWorked != null ? String(d.hoursWorked) : null,
      overtimeHours: String(d.overtimeHours ?? 0),
    })
    .returning({ id: dailyTimeRecords.id });

  revalidatePath("/hr");
  return { success: true, dtrId: dtr.id };
}

// ─── Record Leave Request ─────────────────────────────────────────────────────
const RecordLeaveSchema = z.object({
  employeeId: z.string().uuid(),
  leaveType:  z.enum(["VACATION", "SICK", "EMERGENCY", "MATERNITY", "PATERNITY", "OTHER"]),
  startDate:  z.string().date(),
  endDate:    z.string().date(),
});

export type RecordLeaveResult =
  | { success: true; leaveId: string }
  | { success: false; error: string };

export async function recordLeaveRequest(
  input: z.infer<typeof RecordLeaveSchema>,
): Promise<RecordLeaveResult> {
  const parsed = RecordLeaveSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid input." };
  const d = parsed.data;

  if (d.endDate < d.startDate) {
    return { success: false, error: "End date must be on or after start date." };
  }

  const [leave] = await db
    .insert(leaveSchedules)
    .values({
      employeeId: d.employeeId,
      leaveType:  d.leaveType,
      startDate:  d.startDate,
      endDate:    d.endDate,
      status:     "PENDING",
    })
    .returning({ id: leaveSchedules.id });

  revalidatePath("/hr");
  return { success: true, leaveId: leave.id };
}

// ─── Process Payroll Run ──────────────────────────────────────────────────────
// Gemini: validateAndProcessPayroll(dept_id, period)
//   get_dept_manpower_logs RPC → get_dtr_summary RPC → calculate_and_post_payroll RPC
//
// Fixed:  All three RPCs replaced with Drizzle queries.
//         DTR integrity gate compares claimed hours (daily_time_records) vs
//         site-logged hours (batching_manpower_logs + fleet_manpower_logs).
//         Construction dept logs headcount only (no employee IDs), so the gate
//         is skipped when totalLoggedHours = 0 — those depts rely on DTR alone.
//         Tax computed from TRAIN Law 2023 brackets (RA 10963 schedule); OT at
//         125% of hourly rate per Philippine Labor Code Art. 87.

// TRAIN Law 2023 annual income tax brackets (effective Jan 1, 2023)
const BIR_BRACKETS = [
  { threshold: 8_000_000, baseTax: 2_202_500, rate: 0.35 },
  { threshold: 2_000_000, baseTax:   402_500, rate: 0.30 },
  { threshold:   800_000, baseTax:   102_500, rate: 0.25 },
  { threshold:   400_000, baseTax:    22_500, rate: 0.20 },
  { threshold:   250_000, baseTax:         0, rate: 0.15 },
  { threshold:         0, baseTax:         0, rate: 0.00 },
] as const;

function computeMonthlyWithholdingTax(monthlyGross: number): number {
  const annualGross = monthlyGross * 12;
  const bracket = BIR_BRACKETS.find((b) => annualGross > b.threshold)!;
  const annualTax = bracket.baseTax + (annualGross - bracket.threshold) * bracket.rate;
  return annualTax / 12;
}

const ProcessPayrollSchema = z.object({
  deptId:      z.string().uuid(),
  periodStart: z.string().date(),
  periodEnd:   z.string().date(),
});

export type ProcessPayrollResult =
  | { success: true;        payrollRunId: string; employeeCount: number; totalNet: string; dtrVerified: boolean }
  | { success: "FLAGGED";   dtrHours: number; loggedHours: number }
  | { success: false;       error: string };

export async function processPayrollRun(
  input: z.infer<typeof ProcessPayrollSchema>,
): Promise<ProcessPayrollResult> {
  const parsed = ProcessPayrollSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid input." };

  const user = await getAuthUser();
  if (!user) return { success: false, error: "Not authenticated." };

  const { deptId, periodStart, periodEnd } = parsed.data;
  if (periodEnd < periodStart) {
    return { success: false, error: "Period end must be on or after period start." };
  }

  // ── 1. Active employees for this department ───────────────────────────────
  const empList = await db
    .select({
      id:          employees.id,
      costCenterId: employees.costCenterId,
      dailyRate:   employees.dailyRate,
    })
    .from(employees)
    .where(and(eq(employees.deptId, deptId), eq(employees.isActive, true)));

  if (empList.length === 0) {
    return { success: false, error: "No active employees found for this department." };
  }

  const empIds = empList.map((e) => e.id);

  // ── 2. DTR totals per employee for the period ─────────────────────────────
  const dtrRows = await db
    .select({
      employeeId:  dailyTimeRecords.employeeId,
      daysWorked:  sql<number>`COUNT(${dailyTimeRecords.id})`,
      totalHours:  sql<number>`COALESCE(SUM(${dailyTimeRecords.hoursWorked}::numeric + ${dailyTimeRecords.overtimeHours}::numeric), 0)`,
      overtimeSum: sql<number>`COALESCE(SUM(${dailyTimeRecords.overtimeHours}::numeric), 0)`,
    })
    .from(dailyTimeRecords)
    .where(
      and(
        sql`${dailyTimeRecords.employeeId} = ANY(${empIds})`,
        gte(dailyTimeRecords.workDate, periodStart),
        lte(dailyTimeRecords.workDate, periodEnd),
      ),
    )
    .groupBy(dailyTimeRecords.employeeId);

  // ── 3. Site log hours (batching + fleet — both carry employee_id) ─────────
  // Construction manpower logs track headcount, not individual employees,
  // so they cannot be used here. Depts without batching/fleet logs bypass the gate.
  const batchLogRows = await db
    .select({
      employeeId: batchingManpowerLogs.employeeId,
      totalHours: sql<number>`COALESCE(SUM(${batchingManpowerLogs.hoursWorked}::numeric + ${batchingManpowerLogs.overtimeHours}::numeric), 0)`,
    })
    .from(batchingManpowerLogs)
    .where(
      and(
        sql`${batchingManpowerLogs.employeeId} = ANY(${empIds})`,
        gte(batchingManpowerLogs.logDate, periodStart),
        lte(batchingManpowerLogs.logDate, periodEnd),
      ),
    )
    .groupBy(batchingManpowerLogs.employeeId);

  const fleetLogRows = await db
    .select({
      employeeId: fleetManpowerLogs.employeeId,
      totalHours: sql<number>`COALESCE(SUM(${fleetManpowerLogs.hoursWorked}::numeric + ${fleetManpowerLogs.overtimeHours}::numeric), 0)`,
    })
    .from(fleetManpowerLogs)
    .where(
      and(
        sql`${fleetManpowerLogs.employeeId} = ANY(${empIds})`,
        gte(fleetManpowerLogs.logDate, periodStart),
        lte(fleetManpowerLogs.logDate, periodEnd),
      ),
    )
    .groupBy(fleetManpowerLogs.employeeId);

  // ── 4. DTR integrity gate ─────────────────────────────────────────────────
  const totalDtrHours = dtrRows.reduce((s, r) => s + Number(r.totalHours), 0);

  const logHoursMap = new Map<string, number>();
  for (const row of [...batchLogRows, ...fleetLogRows]) {
    logHoursMap.set(row.employeeId, (logHoursMap.get(row.employeeId) ?? 0) + Number(row.totalHours));
  }
  const totalLoggedHours = [...logHoursMap.values()].reduce((a, b) => a + b, 0);

  if (totalLoggedHours > 0 && totalDtrHours > totalLoggedHours) {
    return { success: "FLAGGED", dtrHours: totalDtrHours, loggedHours: totalLoggedHours };
  }

  // ── 5. Compute payroll per employee ───────────────────────────────────────
  type DtrRow = { employeeId: string; daysWorked: number; totalHours: number; overtimeSum: number };
  const dtrMap = new Map<string, DtrRow>(dtrRows.map((r) => [r.employeeId, r as DtrRow]));

  const periodType = detectPeriodType(periodStart, periodEnd);

  const lineItems = empList.map((emp) => {
    const dtr        = dtrMap.get(emp.id);
    const daysWorked = Number(dtr?.daysWorked  ?? 0);
    const otHours    = Number(dtr?.overtimeSum ?? 0);
    const dailyRate  = Number(emp.dailyRate);
    const hourlyRate = dailyRate / 8;

    const regularPay = daysWorked * dailyRate;
    const otPay      = otHours * hourlyRate * 1.25;   // Labor Code Art. 87: 125%
    const grossPay   = regularPay + otPay;

    const { phicEE, hdmfEE, sssRegularEE, sssMpfEE, sssEE } = computeStatutoryDeductions(grossPay, grossPay, periodType);
    const tax    = computeMonthlyWithholdingTax(grossPay);
    const netPay = Math.max(0, grossPay - sssEE - phicEE - hdmfEE - tax);

    return {
      employeeId:           emp.id,
      costCenterId:         emp.costCenterId,
      daysWorked:           String(daysWorked),
      overtimeHours:        String(otHours),
      grossPay:             String(grossPay.toFixed(2)),
      sssRegularDeduction:  String(sssRegularEE.toFixed(2)),
      sssMpfDeduction:      String(sssMpfEE.toFixed(2)),
      philhealthDeduction:  String(phicEE.toFixed(2)),
      pagibigDeduction:    String(hdmfEE.toFixed(2)),
      taxWithheld:         String(tax.toFixed(2)),
      otherDeductions:     "0",
      netPay:              String(netPay.toFixed(2)),
    };
  });

  // ── 6. Write payroll run + line items ─────────────────────────────────────
  const totalGross       = lineItems.reduce((s, l) => s + Number(l.grossPay), 0);
  const totalDeductions  = lineItems.reduce(
    (s, l) => s + Number(l.sssRegularDeduction) + Number(l.sssMpfDeduction)
                + Number(l.philhealthDeduction) + Number(l.pagibigDeduction)
                + Number(l.taxWithheld),
    0,
  );
  const totalNet = lineItems.reduce((s, l) => s + Number(l.netPay), 0);
  const dtrVerified = totalLoggedHours > 0;  // site logs confirmed the DTR

  const [run] = await db
    .insert(payrollRuns)
    .values({
      periodStart,
      periodEnd,
      status:          "DRAFT",
      totalGross:      String(totalGross.toFixed(2)),
      totalDeductions: String(totalDeductions.toFixed(2)),
      totalNet:        String(totalNet.toFixed(2)),
      dtrVerified,
      processedBy:     user.id,
    })
    .returning({ id: payrollRuns.id });

  await db.insert(payrollLineItems).values(
    lineItems.map((item) => ({ payrollRunId: run.id, ...item })),
  );

  revalidatePath("/hr/payroll");
  return { success: true, payrollRunId: run.id, employeeCount: lineItems.length, totalNet: totalNet.toFixed(2), dtrVerified };
}
