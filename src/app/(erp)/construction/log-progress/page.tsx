export const dynamic = "force-dynamic";
import { getAuthUser } from "@/lib/supabase-server";
import { db } from "@/db";
import { taskAssignments, subcontractors, projects, projectUnits } from "@/db/schema";
import { eq } from "drizzle-orm";
import { phaseActivities, phaseScopes } from "@/db/schema/phases";
import { LogProgressForm } from "./LogProgressForm";

const ACCENT = "#057a55";

export default async function LogProgressPage() {
  const user = await getAuthUser();

  // Load all ACTIVE NTPs with full context
  const ntps = await db
    .select({
      id:           taskAssignments.id,
      projectId:    taskAssignments.projectId,
      unitId:       taskAssignments.unitId,
      subconId:     taskAssignments.subconId,
      category:     taskAssignments.category,
      phaseScopeId: taskAssignments.phaseScopeId,
      subconName:   subcontractors.name,
      subconCode:   subcontractors.code,
      projName:     projects.name,
      unitCode:     projectUnits.unitCode,
      unitModel:    projectUnits.unitModel,
      unitType:     projectUnits.unitType,
      blockId:      projectUnits.blockId,
      scopeName:    phaseScopes.name,
    })
    .from(taskAssignments)
    .leftJoin(subcontractors, eq(taskAssignments.subconId,     subcontractors.id))
    .leftJoin(projects,       eq(taskAssignments.projectId,    projects.id))
    .leftJoin(projectUnits,   eq(taskAssignments.unitId,       projectUnits.id))
    .leftJoin(phaseScopes,    eq(taskAssignments.phaseScopeId, phaseScopes.id))
    .where(eq(taskAssignments.status, "ACTIVE"))
    .orderBy(projects.name, projectUnits.unitCode);

  // Activities indexed by scopeId
  const activities = await db
    .select({
      id:      phaseActivities.id,
      code:    phaseActivities.code,
      name:    phaseActivities.name,
      scopeId: phaseActivities.scopeId,
      weight:  phaseActivities.weightInScopePct,
      order:   phaseActivities.sequenceOrder,
    })
    .from(phaseActivities)
    .where(eq(phaseActivities.isActive, true))
    .orderBy(phaseActivities.sequenceOrder);

  return (
    <main style={{ minHeight: "100vh", background: "#f9fafb", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ padding: "2rem", maxWidth: "800px", margin: "0 auto" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href="/construction" style={{ fontSize: "0.85rem", color: ACCENT, textDecoration: "none" }}>
            ← Back to Construction
          </a>
        </div>
        <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden" }}>
          <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid #e5e7eb", borderTop: `4px solid ${ACCENT}` }}>
            <h1 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 700 }}>Log Daily Progress Entry</h1>
            <p style={{ margin: "0.25rem 0 0", fontSize: "0.85rem", color: "#6b7280" }}>
              Select an NTP first — units, scope, and activities will populate automatically.
            </p>
          </div>
          <div style={{ padding: "1.5rem" }}>
            <LogProgressForm
              ntps={ntps.map((n) => ({
                id:           n.id,
                projectId:    n.projectId,
                unitId:       n.unitId,
                subconId:     n.subconId,
                category:     n.category ?? "",
                phaseScopeId: n.phaseScopeId ?? null,
                subconName:   n.subconName ?? "—",
                subconCode:   n.subconCode ?? "",
                projName:     n.projName ?? "—",
                unitCode:     n.unitCode ?? "—",
                unitModel:    n.unitModel ?? "",
                unitType:     n.unitType ?? "",
                blockId:      n.blockId ?? "",
                scopeName:    n.scopeName ?? null,
              }))}
              activities={activities.map((a) => ({ ...a, weight: String(a.weight) }))}
              userId={user?.id ?? ""}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
