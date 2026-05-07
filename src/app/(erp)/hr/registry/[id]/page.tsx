import { db } from "@/db";
import { employees, employeeDocuments, departments, costCenters } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { notFound } from "next/navigation";
import EmployeeProfileClient from "./EmployeeProfileClient";

export default async function EmployeeProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [emp] = await db
    .select({
      id:                     employees.id,
      employeeCode:           employees.employeeCode,
      fullName:               employees.fullName,
      position:               employees.position,
      employmentType:         employees.employmentType,
      hireDate:               employees.hireDate,
      tinNumber:              employees.tinNumber,
      separationDate:         employees.separationDate,
      isActive:               employees.isActive,
      dailyRate:              employees.dailyRate,
      sssContribution:        employees.sssContribution,
      philhealthContribution: employees.philhealthContribution,
      pagibigContribution:    employees.pagibigContribution,
      phone:                  employees.phone,
      email:                  employees.email,
      address:                employees.address,
      birthday:               employees.birthday,
      civilStatus:            employees.civilStatus,
      gender:                 employees.gender,
      emergencyContactName:   employees.emergencyContactName,
      emergencyContactPhone:  employees.emergencyContactPhone,
      deptId:                 employees.deptId,
      costCenterId:           employees.costCenterId,
      deptName:               departments.name,
      costCenterName:         costCenters.name,
    })
    .from(employees)
    .leftJoin(departments, eq(employees.deptId, departments.id))
    .leftJoin(costCenters, eq(employees.costCenterId, costCenters.id))
    .where(eq(employees.id, id));

  if (!emp) notFound();

  const docs = await db
    .select()
    .from(employeeDocuments)
    .where(eq(employeeDocuments.employeeId, id))
    .orderBy(asc(employeeDocuments.createdAt));

  return <EmployeeProfileClient employee={emp} documents={docs} />;
}
