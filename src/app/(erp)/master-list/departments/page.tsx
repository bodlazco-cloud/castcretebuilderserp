export const dynamic = "force-dynamic";
import { db } from "@/db";
import { departments, costCenters } from "@/db/schema";
import { asc } from "drizzle-orm";
import { getAuthUser } from "@/lib/supabase-server";
import DepartmentsClient from "./DepartmentsClient";

export default async function DepartmentsPage() {
  await getAuthUser();

  const deptRows = await db
    .select({ id: departments.id, code: departments.code, name: departments.name })
    .from(departments)
    .orderBy(asc(departments.code));

  const ccRows = await db
    .select({ id: costCenters.id, code: costCenters.code, name: costCenters.name, deptId: costCenters.deptId, type: costCenters.type, isActive: costCenters.isActive })
    .from(costCenters)
    .orderBy(asc(costCenters.code));

  return <DepartmentsClient departments={deptRows} costCenters={ccRows} />;
}
