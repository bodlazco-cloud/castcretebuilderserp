export const dynamic = "force-dynamic";
import { getAuthUser } from "@/lib/supabase-server";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";
import { LogFuelForm } from "./LogFuelForm";

export default async function LogFuelPage() {
  const user = await getAuthUser();

  const [equipment, assignments] = await Promise.all([
    db.select({ id: schema.equipment.id, code: schema.equipment.code, name: schema.equipment.name })
      .from(schema.equipment)
      .where(eq(schema.equipment.status, "DEPLOYED"))
      .orderBy(schema.equipment.code),
    db.select({
      id: schema.equipmentAssignments.id,
      equipmentId: schema.equipmentAssignments.equipmentId,
      projectName: schema.projects.name,
      assignedDate: schema.equipmentAssignments.assignedDate,
    })
      .from(schema.equipmentAssignments)
      .leftJoin(schema.projects, eq(schema.equipmentAssignments.projectId, schema.projects.id))
      .where(eq(schema.equipmentAssignments.status, "ACTIVE")),
  ]);

  const ACCENT = "#d97706";

  return (
    <main style={{ minHeight: "100vh", background: "#f9fafb", fontFamily: "system-ui, sans-serif" }}>
      <nav style={{
        display: "flex", alignItems: "center", padding: "0 2rem", height: "56px",
        background: "#fff", borderBottom: "1px solid #e5e7eb", position: "sticky", top: 0, zIndex: 10,
      }}>
        <span style={{ fontWeight: 700, fontSize: "1.1rem" }}>Castcrete 360</span>
      </nav>
      <div style={{ padding: "2rem", maxWidth: "720px", margin: "0 auto" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href="/motorpool" style={{ fontSize: "0.85rem", color: ACCENT, textDecoration: "none" }}>← Back to Motorpool</a>
        </div>
        <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden" }}>
          <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid #e5e7eb", borderTop: `4px solid ${ACCENT}` }}>
            <h1 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 700 }}>Log Fuel Consumption</h1>
            <p style={{ margin: "0.25rem 0 0", fontSize: "0.85rem", color: "#6b7280" }}>
              Variance &gt;20% vs. standard will auto-flag for review.
            </p>
          </div>
          <div style={{ padding: "1.5rem" }}>
            <LogFuelForm
              equipment={equipment}
              assignments={assignments.map((a) => ({ ...a, projectName: a.projectName ?? "—" }))}
              userId={user?.id ?? ""}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
