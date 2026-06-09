export const dynamic = "force-dynamic";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { taskAssignments, dailyProgressEntries, workAccomplishedReports } from "@/db/schema/construction";
import { phaseActivities, phaseScopes } from "@/db/schema/phases";
import { eq, and, sql, count } from "drizzle-orm";
import { getAuthUser } from "@/lib/supabase-server";
import { SubmitWarForm } from "./SubmitWarForm";

const ACCENT = "#057a55";

export default async function SubmitWarPage() {
  const user = await getAuthUser();

  const [projects, units, allAssignments, milestones] = await Promise.all([
    db.select({ id: schema.projects.id, name: schema.projects.name })
      .from(schema.projects).orderBy(schema.projects.name),

    db.select({ id: schema.projectUnits.id, unitCode: schema.projectUnits.unitCode, projectId: schema.projectUnits.projectId })
      .from(schema.projectUnits).orderBy(schema.projectUnits.unitCode),

    db.select({
      id:            taskAssignments.id,
      unitId:        taskAssignments.unitId,
      projectId:     taskAssignments.projectId,
      subconName:    schema.subcontractors.name,
      category:      taskAssignments.category,
      phaseScopeId:  taskAssignments.phaseScopeId,
      scopeName:     phaseScopes.name,
      status:        taskAssignments.status,
    })
      .from(taskAssignments)
      .leftJoin(schema.subcontractors, eq(taskAssignments.subconId, schema.subcontractors.id))
      .leftJoin(phaseScopes, eq(taskAssignments.phaseScopeId, phaseScopes.id))
      .where(eq(taskAssignments.status, "ACTIVE")),

    db.select({
      id:            schema.unitMilestones.id,
      unitId:        schema.unitMilestones.unitId,
      milestoneName: schema.milestoneDefinitions.name,
      status:        schema.unitMilestones.status,
    })
      .from(schema.unitMilestones)
      .leftJoin(schema.milestoneDefinitions, eq(schema.unitMilestones.milestoneDefId, schema.milestoneDefinitions.id))
      .where(eq(schema.unitMilestones.status, "PENDING")),
  ]);

  // Detect WAR-ready NTPs: all phaseActivities for its scope are COMPLETED in daily progress
  type WarReady = {
    ntpId: string;
    unitId: string;
    projId: string;
    projName: string;
    unitCode: string;
    subconName: string;
    scopeName: string;
    totalActivities: number;
    completedActivities: number;
  };

  let warReadyNtps: WarReady[] = [];
  try {
    // For each ACTIVE NTP with a phaseScopeId, check if all phaseActivities in that scope
    // have at least one COMPLETED daily_progress_entry for this unit
    const activeNtpsWithScope = allAssignments.filter((a) => a.phaseScopeId);

    if (activeNtpsWithScope.length > 0) {
      // Get activity counts per scope
      const scopeActivityCounts = await db
        .select({ scopeId: phaseActivities.scopeId, cnt: count() })
        .from(phaseActivities)
        .groupBy(phaseActivities.scopeId);
      const scopeActMap = Object.fromEntries(scopeActivityCounts.map((r) => [r.scopeId, Number(r.cnt)]));

      // Get COMPLETED entry counts per (taskAssignmentId, phaseActivityId)
      const completedCounts = await db
        .select({
          taskAssignmentId: dailyProgressEntries.taskAssignmentId,
          phaseActivityId:  dailyProgressEntries.phaseActivityId,
          cnt: count(),
        })
        .from(dailyProgressEntries)
        .where(eq(dailyProgressEntries.status, "COMPLETED"))
        .groupBy(dailyProgressEntries.taskAssignmentId, dailyProgressEntries.phaseActivityId);

      // Group completed by taskAssignmentId → Set of phaseActivityIds
      const completedByNtp: Record<string, Set<string>> = {};
      for (const r of completedCounts) {
        if (!r.taskAssignmentId || !r.phaseActivityId) continue;
        if (!completedByNtp[r.taskAssignmentId]) completedByNtp[r.taskAssignmentId] = new Set();
        completedByNtp[r.taskAssignmentId].add(r.phaseActivityId);
      }

      // Get activities per scope
      const actsByScope = await db
        .select({ scopeId: phaseActivities.scopeId, actId: phaseActivities.id })
        .from(phaseActivities);
      const actsByScopeMap: Record<string, string[]> = {};
      for (const a of actsByScope) {
        if (!actsByScopeMap[a.scopeId]) actsByScopeMap[a.scopeId] = [];
        actsByScopeMap[a.scopeId].push(a.actId);
      }

      // Get project names
      const projMap = Object.fromEntries(projects.map((p) => [p.id, p.name]));
      const unitMap = Object.fromEntries(units.map((u) => [u.id, u.unitCode]));

      for (const ntp of activeNtpsWithScope) {
        const scopeId = ntp.phaseScopeId!;
        const scopeActs = actsByScopeMap[scopeId] ?? [];
        const total = scopeActs.length;
        if (total === 0) continue;

        const completedSet = completedByNtp[ntp.id] ?? new Set();
        const completed = scopeActs.filter((actId) => completedSet.has(actId)).length;

        if (completed >= total) {
          warReadyNtps.push({
            ntpId: ntp.id,
            unitId: ntp.unitId,
            projId: ntp.projectId,
            projName: projMap[ntp.projectId] ?? "—",
            unitCode: unitMap[ntp.unitId] ?? "—",
            subconName: ntp.subconName ?? "—",
            scopeName: ntp.scopeName ?? "—",
            totalActivities: total,
            completedActivities: completed,
          });
        }
      }
    }
  } catch {
    warReadyNtps = [];
  }

  const assignments = allAssignments.map((a) => ({
    id: a.id,
    unitId: a.unitId,
    subconName: a.subconName ?? "—",
    category: a.category ?? "",
    scopeName: a.scopeName ?? "",
  }));

  return (
    <main style={{ minHeight: "100vh", background: "#f9fafb", fontFamily: "system-ui, sans-serif", padding: "2rem" }}>
      <div style={{ maxWidth: "760px" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href="/construction" style={{ fontSize: "0.8rem", color: ACCENT, textDecoration: "none" }}>← Construction</a>
        </div>

        <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827" }}>Submit WAR</h1>
        <p style={{ margin: "0 0 1.5rem", color: "#6b7280", fontSize: "0.9rem" }}>
          Work Accomplished Report triggers Accounting document checklist before advancing to Audit.
        </p>

        {/* WAR-Ready NTPs banner */}
        {warReadyNtps.length > 0 && (
          <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "8px", padding: "1rem 1.25rem", marginBottom: "1.5rem" }}>
            <div style={{ fontWeight: 700, color: "#166534", fontSize: "0.9rem", marginBottom: "0.5rem" }}>
              ✅ {warReadyNtps.length} NTP{warReadyNtps.length !== 1 ? "s" : ""} ready for WAR submission
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              {warReadyNtps.map((n) => (
                <div key={n.ntpId} style={{ fontSize: "0.82rem", color: "#374151" }}>
                  <strong>{n.unitCode}</strong> · {n.projName} · {n.subconName} · <span style={{ color: "#6b7280" }}>{n.scopeName} ({n.completedActivities}/{n.totalActivities} activities)</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden" }}>
          <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid #e5e7eb", borderTop: `4px solid ${ACCENT}` }}>
            <h2 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700 }}>WAR Details</h2>
          </div>
          <div style={{ padding: "1.5rem" }}>
            <SubmitWarForm
              projects={projects}
              units={units}
              assignments={assignments}
              milestones={milestones.map((m) => ({ ...m, milestoneName: m.milestoneName ?? "—" }))}
              userId={user?.id ?? ""}
              warReadyNtpIds={warReadyNtps.map((n) => n.ntpId)}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
