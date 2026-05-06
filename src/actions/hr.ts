"use server";

import { db } from "@/db";
import { employees, dailyTimeRecords, leaveSchedules, payrollRecords } from "@/db/schema";
import { eq, and, gte, lte, sum } from "drizzle-orm";
import { z } from "zod";
import { revalidatePath } from "next/cache";

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

// ─── Generate Payroll Run ─────────────────────────────────────────────────────

const GeneratePayrollSchema = z.object({
  periodStart: z.string().date(),
  periodEnd:   z.string().date(),
});

export type GeneratePayrollResult =
  | { success: true; created: number }
  | { success: false; error: string };

export async function generatePayrollRun(
  input: z.infer<typeof GeneratePayrollSchema>,
): Promise<GeneratePayrollResult> {
  const parsed = GeneratePayrollSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid period dates." };
  const { periodStart, periodEnd } = parsed.data;

  if (periodEnd < periodStart) {
    return { success: false, error: "Period end must be on or after period start." };
  }

  const activeEmployees = await db
    .select({
      id:                     employees.id,
      costCenterId:           employees.costCenterId,
      dailyRate:              employees.dailyRate,
      sssContribution:        employees.sssContribution,
      philhealthContribution: employees.philhealthContribution,
      pagibigContribution:    employees.pagibigContribution,
    })
    .from(employees)
    .where(eq(employees.isActive, true));

  if (activeEmployees.length === 0) return { success: false, error: "No active employees found." };

  let created = 0;
  for (const emp of activeEmployees) {
    const existing = await db
      .select({ id: payrollRecords.id })
      .from(payrollRecords)
      .where(and(
        eq(payrollRecords.employeeId, emp.id),
        eq(payrollRecords.periodStart, periodStart),
        eq(payrollRecords.periodEnd, periodEnd),
      ))
      .limit(1);
    if (existing.length > 0) continue;

    const dtrRows = await db
      .select({ hoursWorked: dailyTimeRecords.hoursWorked, overtimeHours: dailyTimeRecords.overtimeHours })
      .from(dailyTimeRecords)
      .where(and(
        eq(dailyTimeRecords.employeeId, emp.id),
        gte(dailyTimeRecords.workDate, periodStart),
        lte(dailyTimeRecords.workDate, periodEnd),
      ));

    const daysWorked = dtrRows.reduce((s, r) => {
      const h = Number(r.hoursWorked ?? 0);
      return s + (h >= 8 ? 1 : h / 8);
    }, 0);
    const otHours = dtrRows.reduce((s, r) => s + Number(r.overtimeHours ?? 0), 0);
    const rate = Number(emp.dailyRate);
    const grossPay = daysWorked * rate + otHours * (rate / 8) * 1.25;
    const sss = Number(emp.sssContribution);
    const ph = Number(emp.philhealthContribution);
    const pagibig = Number(emp.pagibigContribution);
    const netPay = grossPay - sss - ph - pagibig;

    await db.insert(payrollRecords).values({
      employeeId:          emp.id,
      costCenterId:        emp.costCenterId,
      periodStart,
      periodEnd,
      daysWorked:          String(Math.round(daysWorked * 100) / 100),
      overtimeHours:       String(Math.round(otHours * 100) / 100),
      grossPay:            String(Math.round(grossPay * 100) / 100),
      sssDeduction:        String(sss),
      philhealthDeduction: String(ph),
      pagibigDeduction:    String(pagibig),
      netPay:              String(Math.round(netPay * 100) / 100),
      status:              "DRAFT",
    });
    created++;
  }

  revalidatePath("/hr/payroll");
  return { success: true, created };
}

// ─── Approve / Release Payroll ────────────────────────────────────────────────

export async function approvePayroll(id: string): Promise<{ success: boolean; error?: string }> {
  const [rec] = await db.select({ id: payrollRecords.id, status: payrollRecords.status })
    .from(payrollRecords).where(eq(payrollRecords.id, id));
  if (!rec) return { success: false, error: "Record not found." };
  if (rec.status !== "DRAFT") return { success: false, error: "Only DRAFT payrolls can be approved." };

  await db.update(payrollRecords).set({ status: "APPROVED", approvedAt: new Date() }).where(eq(payrollRecords.id, id));
  revalidatePath("/hr/payroll");
  return { success: true };
}

export async function releasePayroll(id: string): Promise<{ success: boolean; error?: string }> {
  const [rec] = await db.select({ id: payrollRecords.id, status: payrollRecords.status })
    .from(payrollRecords).where(eq(payrollRecords.id, id));
  if (!rec) return { success: false, error: "Record not found." };
  if (rec.status !== "APPROVED") return { success: false, error: "Only APPROVED payrolls can be released." };

  await db.update(payrollRecords).set({ status: "RELEASED", paidAt: new Date() }).where(eq(payrollRecords.id, id));
  revalidatePath("/hr/payroll");
  return { success: true };
}
