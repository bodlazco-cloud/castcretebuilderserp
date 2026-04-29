export const dynamic = "force-dynamic";
import { getAuthUser } from "@/lib/supabase-server";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";
import { SubmitWarForm } from "./SubmitWarForm";

export default async function SubmitWarPage() {
  const user = await getAuthUser();

  const [projects, units, assignments, milestones] = await Promise.all([
    db.select({ id: schema.projects.id, name: schema.projects.name })
      .from(schema.projects).orderBy(schema.projects.name),
    db.select({ id: schema.projectUnits.id, unitCode: schema.projectUnits.unitCode, projectId: schema.projectUnits.projectId })
      .from(schema.projectUnits).orderBy(schema.projectUnits.unitCode),
    db.select({
      id: schema.taskAssignments.id,
      unitId: schema.taskAssignments.unitId,
      subconName: schema.subcontractors.name,
      category: schema.taskAssignments.category,
    })
      .from(schema.taskAssignments)
      .leftJoin(schema.subcontractors, eq(schema.taskAssignments.subconId, schema.subcontractors.id))
      .where(eq(schema.taskAssignments.status, "ACTIVE")),
    db.select({
      id: schema.unitMilestones.id,
      unitId: schema.unitMilestones.unitId,
      milestoneName: schema.milestoneDefinitions.name,
      status: schema.unitMilestones.status,
    })
      .from(schema.unitMilestones)
      .leftJoin(schema.milestoneDefinitions, eq(schema.unitMilestones.milestoneDefId, schema.milestoneDefinitions.id))
      .where(eq(schema.unitMilestones.status, "PENDING")),
  ]);

  const ACCENT = "#057a55";

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
          <a href="/construction" style={{ fontSize: "0.85rem", color: ACCENT, textDecoration: "none" }}>← Back to Construction</a>
        </div>
        <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden" }}>
          <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid #e5e7eb", borderTop: `4px solid ${ACCENT}` }}>
            <h1 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 700 }}>Submit Work Accomplished Report (WAR)</h1>
            <p style={{ margin: "0.25rem 0 0", fontSize: "0.85rem", color: "#6b7280" }}>
              Triggers Accounting document checklist before advancing to Audit.
            </p>
          </div>
          <div style={{ padding: "1.5rem" }}>
            <SubmitWarForm
              projects={projects}
              units={units}
              assignments={assignments.map((a) => ({ ...a, subconName: a.subconName ?? "—", category: a.category ?? "" }))}
              milestones={milestones.map((m) => ({ ...m, milestoneName: m.milestoneName ?? "—" }))}
              userId={user?.id ?? ""}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
