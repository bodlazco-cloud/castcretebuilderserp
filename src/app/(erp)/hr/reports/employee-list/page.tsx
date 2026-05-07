import { db } from "@/db";
import { employees, departments, leaveSchedules } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import EmployeeListReport from "./EmployeeListReport";

export default async function EmployeeListReportPage() {
  const depts = await db
    .select({ id: departments.id, name: departments.name })
    .from(departments)
    .orderBy(asc(departments.name));

  const rows = await db
    .select({
      id:             employees.id,
      employeeCode:   employees.employeeCode,
      fullName:       employees.fullName,
      position:       employees.position,
      employmentType: employees.employmentType,
      dailyRate:      employees.dailyRate,
      hireDate:       employees.hireDate,
      isActive:       employees.isActive,
      phone:          employees.phone,
      email:          employees.email,
      deptId:         employees.deptId,
      deptName:       departments.name,
    })
    .from(employees)
    .leftJoin(departments, eq(employees.deptId, departments.id))
    .orderBy(asc(employees.fullName));

  // Count approved leave days per employee grouped by type
  const leaves = await db
    .select({
      employeeId: leaveSchedules.employeeId,
      leaveType:  leaveSchedules.leaveType,
      daysCount:  leaveSchedules.daysCount,
    })
    .from(leaveSchedules)
    .where(eq(leaveSchedules.status, "APPROVED"));

  const leaveMap: Record<string, { absences: number; vacation: number }> = {};
  for (const l of leaves) {
    if (!leaveMap[l.employeeId]) leaveMap[l.employeeId] = { absences: 0, vacation: 0 };
    const days = Number(l.daysCount ?? 0);
    if (l.leaveType === "SICK" || l.leaveType === "EMERGENCY") {
      leaveMap[l.employeeId].absences += days;
    } else if (l.leaveType === "VACATION") {
      leaveMap[l.employeeId].vacation += days;
    }
  }

  const data = rows.map((r) => ({
    ...r,
    absences: leaveMap[r.id]?.absences ?? 0,
    vacation: leaveMap[r.id]?.vacation ?? 0,
  }));

  return <EmployeeListReport data={data} departments={depts} />;
}
