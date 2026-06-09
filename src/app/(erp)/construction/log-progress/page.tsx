export const dynamic = "force-dynamic";
import { getAuthUser } from "@/lib/supabase-server";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";
import { phaseActivities, phaseScopes } from "@/db/schema/phases";
import { LogProgressForm } from "./LogProgressForm";

const ACCENT = "#057a55";

export default async function LogProgressPage() {
  const user = await getAuthUser();

  const [projectsList, blocks, units, assignments, allSubcons, activities] = await Promise.all([
    db.select({ id: schema.projects.id, name: schema.projects.name })
      .from(schema.projects).orderBy(schema.projects.name),
    db.select({
      id: schema.blocks.id, blockName: schema.blocks.blockName,
      projectId: schema.blocks.projectId,
    }).from(schema.blocks).orderBy(schema.blocks.blockName),
    db.select({
      id: schema.projectUnits.id,
      unitCode: schema.projectUnits.unitCode,
      projectId: schema.projectUnits.projectId,
      blockId: schema.projectUnits.blockId,
      unitModel: schema.projectUnits.unitModel,
      unitType: schema.projectUnits.unitType,
    }).from(schema.projectUnits).orderBy(schema.projectUnits.unitCode),
    db.select({
      id:             schema.taskAssignments.id,
      unitId:         schema.taskAssignments.unitId,
      subconId:       schema.taskAssignments.subconId,
      subconName:     schema.subcontractors.name,
      category:       schema.taskAssignments.category,
      phaseScopeId:   schema.taskAssignments.phaseScopeId,
      scopeName:      phaseScopes.name,
    })
      .from(schema.taskAssignments)
      .leftJoin(schema.subcontractors, eq(schema.taskAssignments.subconId, schema.subcontractors.id))
      .leftJoin(phaseScopes, eq(schema.taskAssignments.phaseScopeId, phaseScopes.id))
      .where(eq(schema.taskAssignments.status, "ACTIVE")),
    db.select({ id: schema.subcontractors.id, name: schema.subcontractors.name, code: schema.subcontractors.code })
      .from(schema.subcontractors)
      .where(eq(schema.subcontractors.isActive, true))
      .orderBy(schema.subcontractors.name),
    db.select({
      id:       phaseActivities.id,
      code:     phaseActivities.code,
      name:     phaseActivities.name,
      scopeId:  phaseActivities.scopeId,
      weight:   phaseActivities.weightInScopePct,
      order:    phaseActivities.sequenceOrder,
    })
      .from(phaseActivities)
      .where(eq(phaseActivities.isActive, true))
      .orderBy(phaseActivities.sequenceOrder),
  ]);

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
              Record daily site progress. Activities are filtered by the selected NTP's scope.
            </p>
          </div>
          <div style={{ padding: "1.5rem" }}>
            <LogProgressForm
              projects={projectsList}
              blocks={blocks}
              units={units.map((u) => ({ ...u, blockId: u.blockId ?? "" }))}
              assignments={assignments.map((a) => ({
                ...a,
                subconName:   a.subconName ?? "—",
                category:     a.category ?? "",
                phaseScopeId: a.phaseScopeId ?? null,
                scopeName:    a.scopeName ?? null,
              }))}
              allSubcons={allSubcons}
              activities={activities.map((a) => ({ ...a, weight: String(a.weight) }))}
              userId={user?.id ?? ""}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
