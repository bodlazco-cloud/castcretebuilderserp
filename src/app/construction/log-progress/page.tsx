import { getAuthUser } from "@/lib/supabase-server";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";
import { LogProgressForm } from "./LogProgressForm";

export default async function LogProgressPage() {
  const user = await getAuthUser();

  const [projects, units, assignments, activities] = await Promise.all([
    db.select({ id: schema.projects.id, name: schema.projects.name })
      .from(schema.projects).orderBy(schema.projects.name),
    db.select({ id: schema.projectUnits.id, unitCode: schema.projectUnits.unitCode, projectId: schema.projectUnits.projectId })
      .from(schema.projectUnits).orderBy(schema.projectUnits.unitCode),
    db.select({
      id: schema.taskAssignments.id,
      unitId: schema.taskAssignments.unitId,
      subconId: schema.taskAssignments.subconId,
      subconName: schema.subcontractors.name,
      category: schema.taskAssignments.category,
    })
      .from(schema.taskAssignments)
      .leftJoin(schema.subcontractors, eq(schema.taskAssignments.subconId, schema.subcontractors.id))
      .where(eq(schema.taskAssignments.status, "ACTIVE")),
    db.select({
      id: schema.unitActivities.id,
      activityCode: schema.activityDefinitions.activityCode,
      activityName: schema.activityDefinitions.activityName,
      unitId: schema.unitActivities.unitId,
    })
      .from(schema.unitActivities)
      .leftJoin(schema.activityDefinitions, eq(schema.unitActivities.activityDefId, schema.activityDefinitions.id))
      .where(eq(schema.unitActivities.status, "PENDING")),
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
          <a href="/construction" style={{ fontSize: "0.85rem", color: ACCENT, textDecoration: "none" }}>
            ← Back to Construction
          </a>
        </div>
        <div style={{
          background: "#fff", borderRadius: "8px",
          boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden",
        }}>
          <div style={{
            padding: "1.25rem 1.5rem", borderBottom: "1px solid #e5e7eb",
            borderTop: `4px solid ${ACCENT}`,
          }}>
            <h1 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 700 }}>Log Daily Progress Entry</h1>
          </div>
          <div style={{ padding: "1.5rem" }}>
            <LogProgressForm
              projects={projects}
              units={units}
              assignments={assignments.map((a) => ({ ...a, subconName: a.subconName ?? "—", category: a.category ?? "" }))}
              activities={activities.map((a) => ({ ...a, activityCode: a.activityCode ?? "", activityName: a.activityName ?? "" }))}
              userId={user?.id ?? ""}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
