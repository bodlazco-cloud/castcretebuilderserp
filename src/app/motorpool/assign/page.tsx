import { getAuthUser } from "@/lib/supabase-server";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";
import { AssignEquipmentForm } from "./AssignEquipmentForm";

export default async function AssignEquipmentPage() {
  await getAuthUser();

  const [equipmentRows, projectRows, costCenterRows, unitRows, employeeRows] = await Promise.all([
    db
      .select({ id: schema.equipment.id, code: schema.equipment.code, name: schema.equipment.name, type: schema.equipment.type })
      .from(schema.equipment)
      .where(eq(schema.equipment.status, "AVAILABLE"))
      .orderBy(schema.equipment.code),
    db
      .select({ id: schema.projects.id, name: schema.projects.name })
      .from(schema.projects)
      .orderBy(schema.projects.name),
    db
      .select({ id: schema.costCenters.id, code: schema.costCenters.code, name: schema.costCenters.name })
      .from(schema.costCenters)
      .where(eq(schema.costCenters.isActive, true))
      .orderBy(schema.costCenters.code),
    db
      .select({ id: schema.projectUnits.id, unitCode: schema.projectUnits.unitCode, projectId: schema.projectUnits.projectId })
      .from(schema.projectUnits)
      .orderBy(schema.projectUnits.unitCode),
    db
      .select({ id: schema.employees.id, fullName: schema.employees.fullName, employeeCode: schema.employees.employeeCode })
      .from(schema.employees)
      .where(eq(schema.employees.isActive, true))
      .orderBy(schema.employees.fullName),
  ]);

  const ACCENT = "#0694a2";

  return (
    <main style={{ minHeight: "100vh", background: "#f9fafb" }}>
      <nav style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 2rem", height: "56px",
        background: "#fff", borderBottom: "1px solid #e5e7eb",
        position: "sticky", top: 0, zIndex: 10,
      }}>
        <span style={{ fontWeight: 700, fontSize: "1.1rem" }}>Castcrete 360</span>
      </nav>

      <div style={{ padding: "2rem", maxWidth: "720px", margin: "0 auto" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href="/motorpool" style={{ fontSize: "0.875rem", color: "#1a56db", textDecoration: "none" }}>
            ← Back to Motorpool
          </a>
        </div>

        <header style={{ marginBottom: "1.75rem" }}>
          <h1 style={{
            margin: "0 0 0.25rem", fontSize: "1.4rem", fontWeight: 700,
            borderLeft: `4px solid ${ACCENT}`, paddingLeft: "0.75rem",
          }}>
            Assign Equipment
          </h1>
          <p style={{ margin: "0 0 0 1.25rem", color: "#6b7280", fontSize: "0.9rem" }}>
            Deploy available equipment to a project site
          </p>
        </header>

        <div style={{
          background: "#fff", borderRadius: "8px",
          boxShadow: "0 1px 4px rgba(0,0,0,0.07)", padding: "1.75rem",
        }}>
          <AssignEquipmentForm
            equipment={equipmentRows}
            projects={projectRows}
            costCenters={costCenterRows}
            units={unitRows}
            operators={employeeRows}
          />
        </div>
      </div>
    </main>
  );
}
