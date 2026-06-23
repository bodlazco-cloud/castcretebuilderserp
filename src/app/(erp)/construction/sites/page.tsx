export const dynamic = "force-dynamic";
import { db } from "@/db";
import { projects, developers, blocks, projectUnits } from "@/db/schema";
import { taskAssignments, dailyProgressEntries } from "@/db/schema/construction";
import { eq, count, and, sql } from "drizzle-orm";
import { getAuthUser } from "@/lib/supabase-server";

const ACCENT = "#057a55";

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  ACTIVE:    { bg: "#dcfce7", color: "#166534" },
  BIDDING:   { bg: "#eff6ff", color: "#1e40af" },
  ON_HOLD:   { bg: "#fef9c3", color: "#713f12" },
  COMPLETED: { bg: "#f0fdf4", color: "#166534" },
  CANCELLED: { bg: "#fef2f2", color: "#b91c1c" },
};

export default async function SitesPage() {
  await getAuthUser();

  const projectRows = await db
    .select({
      id:            projects.id,
      name:          projects.name,
      status:        projects.status,
      startDate:     projects.startDate,
      endDate:       projects.endDate,
      bodApprovedAt: projects.bodApprovedAt,
      devName:       developers.name,
    })
    .from(projects)
    .leftJoin(developers, eq(projects.developerId, developers.id))
    .orderBy(projects.name);

  // Blocks with their unit counts
  const blockRows = await db
    .select({
      id:        blocks.id,
      projectId: blocks.projectId,
      blockName: blocks.blockName,
      totalLots: blocks.totalLots,
    })
    .from(blocks)
    .orderBy(blocks.blockName);

  // Unit counts per block
  const unitBlockCounts = await db
    .select({ blockId: projectUnits.blockId, total: count() })
    .from(projectUnits)
    .groupBy(projectUnits.blockId);

  // Active NTP counts per project
  const activeNtpCounts = await db
    .select({ projectId: taskAssignments.projectId, active: count() })
    .from(taskAssignments)
    .where(eq(taskAssignments.status, "ACTIVE"))
    .groupBy(taskAssignments.projectId);

  // Total manpower logged per project (from daily progress)
  const manpowerRows = await db
    .select({
      projectId: dailyProgressEntries.projectId,
      total: sql<number>`SUM(${dailyProgressEntries.actualManpower})::int`,
    })
    .from(dailyProgressEntries)
    .groupBy(dailyProgressEntries.projectId);

  // Completed activities count per project
  const completedRows = await db
    .select({ projectId: dailyProgressEntries.projectId, cnt: count() })
    .from(dailyProgressEntries)
    .where(eq(dailyProgressEntries.status, "COMPLETED"))
    .groupBy(dailyProgressEntries.projectId);

  // Pending DPE approvals per project
  const pendingApprovalRows = await db
    .select({ projectId: dailyProgressEntries.projectId, cnt: count() })
    .from(dailyProgressEntries)
    .where(and(
      sql`${dailyProgressEntries.approvalStatus} = 'PENDING_REVIEW'`,
    ))
    .groupBy(dailyProgressEntries.projectId);

  // Units per project
  const unitProjectCounts = await db
    .select({ projectId: projectUnits.projectId, total: count() })
    .from(projectUnits)
    .groupBy(projectUnits.projectId);

  // Build maps
  const unitBlockMap = Object.fromEntries(unitBlockCounts.map((r) => [r.blockId, Number(r.total)]));
  const activeNtpMap = Object.fromEntries(activeNtpCounts.map((r) => [r.projectId, Number(r.active)]));
  const manpowerMap = Object.fromEntries(manpowerRows.map((r) => [r.projectId, Number(r.total)]));
  const completedMap = Object.fromEntries(completedRows.map((r) => [r.projectId, Number(r.cnt)]));
  const pendingApprMap = Object.fromEntries(pendingApprovalRows.map((r) => [r.projectId, Number(r.cnt)]));
  const unitProjMap = Object.fromEntries(unitProjectCounts.map((r) => [r.projectId, Number(r.total)]));

  // Group blocks by project
  const blocksByProject: Record<string, typeof blockRows> = {};
  for (const b of blockRows) {
    if (!blocksByProject[b.projectId]) blocksByProject[b.projectId] = [];
    blocksByProject[b.projectId].push(b);
  }

  // KPIs
  const totalSites = projectRows.length;
  const activeSites = projectRows.filter((p) => p.status === "ACTIVE").length;
  const totalActiveNtps = Object.values(activeNtpMap).reduce((a, b) => a + b, 0);
  const totalPendingAppr = Object.values(pendingApprMap).reduce((a, b) => a + b, 0);

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "1100px" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href="/construction" style={{ fontSize: "0.8rem", color: ACCENT, textDecoration: "none" }}>← Construction</a>
        </div>

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem", marginBottom: "1.5rem" }}>
          <div>
            <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827" }}>Sites</h1>
            <p style={{ margin: 0, color: "#6b7280", fontSize: "0.9rem" }}>Active and completed construction sites with block-level progress.</p>
          </div>
          <a href="/master-list/projects/new" style={{
            padding: "0.55rem 1.1rem", borderRadius: "6px", background: "#6366f1",
            color: "#fff", fontSize: "0.875rem", fontWeight: 600, textDecoration: "none",
          }}>+ Add Project</a>
        </div>

        {/* KPI Row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem", marginBottom: "1.5rem" }}>
          {[
            { label: "Total Sites", value: totalSites, color: "#6366f1" },
            { label: "Active Sites", value: activeSites, color: ACCENT },
            { label: "Active NTPs", value: totalActiveNtps, color: "#0891b2" },
            { label: "Pending DPE Approval", value: totalPendingAppr, color: "#d97706" },
          ].map((k) => (
            <div key={k.label} style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", padding: "1rem 1.25rem" }}>
              <div style={{ fontSize: "0.72rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.25rem" }}>{k.label}</div>
              <div style={{ fontSize: "1.75rem", fontWeight: 700, color: k.color }}>{k.value}</div>
            </div>
          ))}
        </div>

        {projectRows.length === 0 ? (
          <div style={{ padding: "3rem", background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", textAlign: "center", color: "#9ca3af" }}>
            No projects yet. <a href="/master-list/projects/new" style={{ color: "#6366f1" }}>Add first project →</a>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            {projectRows.map((p) => {
              const sc = STATUS_STYLE[p.status] ?? { bg: "#f3f4f6", color: "#6b7280" };
              const projBlocks = blocksByProject[p.id] ?? [];
              const totalUnits = unitProjMap[p.id] ?? 0;
              const activeNtps = activeNtpMap[p.id] ?? 0;
              const manpower = manpowerMap[p.id] ?? 0;
              const completed = completedMap[p.id] ?? 0;
              const pendingAppr = pendingApprMap[p.id] ?? 0;

              return (
                <details key={p.id} open={p.status === "ACTIVE"} style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden" }}>
                  <summary style={{ padding: "1rem 1.25rem", cursor: "pointer", listStyle: "none", display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
                    <span style={{ fontWeight: 700, fontSize: "1rem", color: "#111827", flex: 1 }}>{p.name}</span>
                    <span style={{ fontSize: "0.75rem", color: "#6b7280" }}>{p.devName ?? "—"}</span>
                    <span style={{ display: "inline-block", padding: "0.18rem 0.55rem", borderRadius: "999px", fontSize: "0.72rem", fontWeight: 600, background: sc.bg, color: sc.color }}>
                      {p.status}
                    </span>
                    {p.bodApprovedAt
                      ? <span style={{ fontSize: "0.72rem", fontWeight: 600, color: "#166534" }}>✓ BOD Approved</span>
                      : <span style={{ fontSize: "0.72rem", fontWeight: 600, color: "#b91c1c" }}>BOD Pending</span>}
                    {pendingAppr > 0 && (
                      <span style={{ padding: "0.15rem 0.5rem", borderRadius: "999px", fontSize: "0.7rem", fontWeight: 600, background: "#fef9c3", color: "#713f12" }}>
                        ⏳ {pendingAppr} DPE pending
                      </span>
                    )}
                  </summary>

                  <div style={{ borderTop: "1px solid #f3f4f6", padding: "1rem 1.25rem" }}>
                    {/* Site-level metrics */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "0.75rem", marginBottom: "1.25rem" }}>
                      {[
                        { label: "Total Units", value: totalUnits },
                        { label: "Active NTPs", value: activeNtps },
                        { label: "Manpower Logged", value: manpower.toLocaleString() },
                        { label: "Completed Activities", value: completed },
                        { label: "Blocks", value: projBlocks.length },
                      ].map((m) => (
                        <div key={m.label} style={{ background: "#f9fafb", borderRadius: "6px", padding: "0.6rem 0.85rem" }}>
                          <div style={{ fontSize: "0.68rem", fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.04em" }}>{m.label}</div>
                          <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#111827" }}>{m.value}</div>
                        </div>
                      ))}
                    </div>

                    {/* Dates */}
                    <div style={{ display: "flex", gap: "1.5rem", marginBottom: "1.25rem", fontSize: "0.82rem", color: "#6b7280" }}>
                      <span>Start: <strong style={{ color: "#374151" }}>{p.startDate ?? "—"}</strong></span>
                      <span>End: <strong style={{ color: "#374151" }}>{p.endDate ?? "—"}</strong></span>
                    </div>

                    {/* Block breakdown */}
                    {projBlocks.length > 0 && (
                      <div>
                        <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.5rem" }}>
                          Block Breakdown
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "0.5rem" }}>
                          {projBlocks.map((b) => {
                            const unitsInBlock = unitBlockMap[b.id] ?? 0;
                            const pct = b.totalLots > 0 ? Math.round((unitsInBlock / b.totalLots) * 100) : 0;
                            return (
                              <div key={b.id} style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "6px", padding: "0.65rem 0.85rem" }}>
                                <div style={{ fontWeight: 600, fontSize: "0.85rem", color: "#111827", marginBottom: "0.2rem" }}>{b.blockName}</div>
                                <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>{unitsInBlock} / {b.totalLots} lots</div>
                                <div style={{ marginTop: "0.35rem", height: "4px", background: "#e5e7eb", borderRadius: "2px", overflow: "hidden" }}>
                                  <div style={{ height: "100%", width: `${pct}%`, background: ACCENT, borderRadius: "2px" }} />
                                </div>
                                <div style={{ fontSize: "0.68rem", color: "#9ca3af", marginTop: "0.15rem" }}>{pct}% populated</div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div style={{ display: "flex", gap: "0.75rem", marginTop: "1rem", flexWrap: "wrap" }}>
                      <a href={`/master-list/projects/${p.id}`} style={{ fontSize: "0.8rem", color: "#6366f1", fontWeight: 600, textDecoration: "none" }}>
                        Manage Project →
                      </a>
                      <a href={`/construction/ntp?project=${p.id}`} style={{ fontSize: "0.8rem", color: ACCENT, fontWeight: 600, textDecoration: "none" }}>
                        View NTPs →
                      </a>
                      <a href={`/construction/daily-progress?project=${p.id}`} style={{ fontSize: "0.8rem", color: "#0891b2", fontWeight: 600, textDecoration: "none" }}>
                        Progress Entries →
                      </a>
                    </div>
                  </div>
                </details>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
