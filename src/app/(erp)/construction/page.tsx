export const dynamic = "force-dynamic";

import { db } from "@/db";
import {
  taskAssignments, projectUnits, subcontractors, projects,
  workAccomplishedReports, dailyProgressEntries,
} from "@/db/schema";
import { phaseScopes, phaseActivities } from "@/db/schema/phases";
import { eq, count, and, desc, sql } from "drizzle-orm";
import { getAuthUser } from "@/lib/supabase-server";

const ACCENT = "#057a55";

function safe<T>(p: Promise<T>, fallback: T, ms = 6000): Promise<T> {
  return Promise.race([
    p.catch(() => fallback),
    new Promise<T>((r) => setTimeout(() => r(fallback), ms)),
  ]);
}

const STATUS_BADGE: Record<string, { bg: string; color: string }> = {
  DRAFT:              { bg: "#f3f4f6", color: "#374151" },
  ACTIVE:             { bg: "#dcfce7", color: "#166534" },
  EOT_PENDING:        { bg: "#fef9c3", color: "#713f12" },
  COMPLETED:          { bg: "#eff6ff", color: "#1e40af" },
  CANCELLED:          { bg: "#fef2f2", color: "#b91c1c" },
  PENDING_REVIEW:     { bg: "#fef9c3", color: "#713f12" },
  PENDING_AUDIT:      { bg: "#e0f2fe", color: "#0369a1" },
  READY_FOR_APPROVAL: { bg: "#ede9fe", color: "#5b21b6" },
  APPROVED:           { bg: "#dcfce7", color: "#166534" },
  REJECTED:           { bg: "#fef2f2", color: "#b91c1c" },
};

function Badge({ status }: { status: string }) {
  const s = STATUS_BADGE[status] ?? { bg: "#f3f4f6", color: "#6b7280" };
  return (
    <span style={{
      display: "inline-block", padding: "0.2rem 0.55rem", borderRadius: "999px",
      fontSize: "0.72rem", fontWeight: 600, background: s.bg, color: s.color,
    }}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

export default async function ConstructionPage() {
  let user = null;
  try { user = await getAuthUser(); } catch {}
  const displayName: string = user?.user_metadata?.full_name ?? user?.email ?? "Guest";
  const deptCode: string = user?.user_metadata?.dept_code ?? "";

  const [
    ntpByStatus,
    warByStatus,
    unitsInProgress,
    flaggedEntries,
    recentProgress,
    warReadyNtps,
    recentWars,
  ] = await Promise.all([
    safe(
      db.select({ status: taskAssignments.status, cnt: count() })
        .from(taskAssignments).groupBy(taskAssignments.status),
      [] as { status: string; cnt: number }[],
    ),
    safe(
      db.select({ status: workAccomplishedReports.status, cnt: count() })
        .from(workAccomplishedReports).groupBy(workAccomplishedReports.status),
      [] as { status: string; cnt: number }[],
    ),
    safe(
      db.select({ cnt: count() }).from(projectUnits).where(eq(projectUnits.status, "IN_PROGRESS"))
        .then((r) => Number(r[0]?.cnt ?? 0)),
      0,
    ),
    safe(
      db.select({ cnt: count() }).from(dailyProgressEntries)
        .where(eq(dailyProgressEntries.docGapFlagged, true))
        .then((r) => Number(r[0]?.cnt ?? 0)),
      0,
    ),
    safe(
      db.select({
        id:            dailyProgressEntries.id,
        entryDate:     dailyProgressEntries.entryDate,
        status:        dailyProgressEntries.status,
        actualManpower: dailyProgressEntries.actualManpower,
        delayType:     dailyProgressEntries.delayType,
        docGapFlagged: dailyProgressEntries.docGapFlagged,
        unitCode:      projectUnits.unitCode,
        subName:       subcontractors.name,
        projName:      projects.name,
      })
        .from(dailyProgressEntries)
        .leftJoin(projectUnits,   eq(dailyProgressEntries.unitId,    projectUnits.id))
        .leftJoin(subcontractors, eq(dailyProgressEntries.subconId,  subcontractors.id))
        .leftJoin(projects,       eq(dailyProgressEntries.projectId, projects.id))
        .orderBy(desc(dailyProgressEntries.createdAt))
        .limit(8),
      [] as {
        id: string; entryDate: string; status: string; actualManpower: number;
        delayType: string | null; docGapFlagged: boolean; unitCode: string | null;
        subName: string | null; projName: string | null;
      }[],
    ),
    // WAR-ready: ACTIVE NTPs with phaseScopeId where every phase_activity in the scope
    // has at least one COMPLETED daily_progress_entry.
    safe(
      db.execute(sql`
        SELECT ta.id, ta.start_date, ta.end_date,
               pu.unit_code, sc.name AS subcon_name, p.name AS project_name,
               ps.name AS scope_name,
               COUNT(DISTINCT pa.id)::int   AS total_activities,
               COUNT(DISTINCT dpe.phase_activity_id)::int AS done_activities
        FROM task_assignments ta
        JOIN project_units pu ON pu.id = ta.unit_id
        JOIN subcontractors sc ON sc.id = ta.subcon_id
        JOIN projects p ON p.id = ta.project_id
        JOIN phase_scopes ps ON ps.id = ta.phase_scope_id
        JOIN phase_activities pa ON pa.scope_id = ta.phase_scope_id AND pa.is_active = true
        LEFT JOIN daily_progress_entries dpe
          ON dpe.task_assignment_id = ta.id
          AND dpe.phase_activity_id = pa.id
          AND dpe.status = 'COMPLETED'
        WHERE ta.status = 'ACTIVE' AND ta.phase_scope_id IS NOT NULL
        GROUP BY ta.id, ta.start_date, ta.end_date,
                 pu.unit_code, sc.name, p.name, ps.name
        HAVING COUNT(DISTINCT pa.id) > 0
           AND COUNT(DISTINCT pa.id) = COUNT(DISTINCT dpe.phase_activity_id)
        ORDER BY ta.start_date
        LIMIT 20
      `) as Promise<{ rows: {
        id: string; start_date: string; end_date: string; unit_code: string;
        subcon_name: string; project_name: string; scope_name: string;
        total_activities: number; done_activities: number;
      }[] }>,
      { rows: [] },
    ).then((r) => r.rows ?? []),
    safe(
      db.select({
        id:             workAccomplishedReports.id,
        status:         workAccomplishedReports.status,
        grossAmount:    workAccomplishedReports.grossAccomplishment,
        submittedAt:    workAccomplishedReports.submittedAt,
        unitCode:       projectUnits.unitCode,
        projName:       projects.name,
      })
        .from(workAccomplishedReports)
        .leftJoin(projectUnits, eq(workAccomplishedReports.unitId, projectUnits.id))
        .leftJoin(projects,     eq(workAccomplishedReports.projectId, projects.id))
        .orderBy(desc(workAccomplishedReports.submittedAt))
        .limit(8),
      [] as {
        id: string; status: string; grossAmount: string; submittedAt: Date | null;
        unitCode: string | null; projName: string | null;
      }[],
    ),
  ]);

  const ntpMap  = Object.fromEntries(ntpByStatus.map((r) => [r.status, Number(r.cnt)]));
  const warMap  = Object.fromEntries(warByStatus.map((r) => [r.status, Number(r.cnt)]));

  const activeNtps      = ntpMap["ACTIVE"]      ?? 0;
  const draftNtps       = ntpMap["DRAFT"]        ?? 0;
  const completedNtps   = ntpMap["COMPLETED"]    ?? 0;
  const totalNtps       = Object.values(ntpMap).reduce((s, v) => s + v, 0);

  const warPending      = warMap["PENDING_REVIEW"]     ?? 0;
  const warAudit        = warMap["PENDING_AUDIT"]       ?? 0;
  const warReadyApprove = warMap["READY_FOR_APPROVAL"]  ?? 0;
  const warApproved     = warMap["APPROVED"]            ?? 0;
  const totalWars       = Object.values(warMap).reduce((s, v) => s + v, 0);

  const warReadyCount   = warReadyNtps.length;

  const kpis = [
    { label: "Active NTPs",         value: activeNtps,    sub: `${totalNtps} total`,            accent: ACCENT },
    { label: "Units In Progress",   value: unitsInProgress, sub: `${completedNtps} NTPs closed`, accent: "#1a56db" },
    { label: "WARs Pending Review", value: warPending,    sub: `${warAudit} in audit`,           accent: "#e3a008" },
    { label: "WAR Ready to Submit", value: warReadyCount, sub: "All activities complete",        accent: "#7e3af2" },
    { label: "Flagged Entries",     value: flaggedEntries, sub: "Doc gap / delay logged",        accent: "#e02424" },
    { label: "WARs Approved",       value: warApproved,   sub: `${warReadyApprove} pending BOD`, accent: "#057a55" },
  ];

  const ntpPipelineTotal = Math.max(totalNtps, 1);
  const ntpStages = [
    { label: "Draft",     count: draftNtps,     color: "#d1d5db", text: "#374151" },
    { label: "Active",    count: activeNtps,     color: "#86efac", text: "#166534" },
    { label: "Completed", count: completedNtps,  color: "#93c5fd", text: "#1e40af" },
  ];

  const warPipelineTotal = Math.max(totalWars, 1);
  const warStages = [
    { label: "Pending Review",      count: warPending,      color: "#fde68a", text: "#92400e" },
    { label: "Pending Audit",       count: warAudit,        color: "#bae6fd", text: "#0369a1" },
    { label: "Ready for Approval",  count: warReadyApprove, color: "#c4b5fd", text: "#5b21b6" },
    { label: "Approved",            count: warApproved,     color: "#86efac", text: "#166534" },
  ];

  const card: React.CSSProperties = {
    background: "#fff", borderRadius: "10px", padding: "1.25rem 1.5rem",
    boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
  };
  const th: React.CSSProperties = {
    padding: "0.6rem 1rem", textAlign: "left", fontSize: "0.72rem", fontWeight: 600,
    color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em",
    borderBottom: "1px solid #e5e7eb",
  };
  const td: React.CSSProperties = {
    padding: "0.65rem 1rem", fontSize: "0.875rem", color: "#374151",
    borderBottom: "1px solid #f3f4f6",
  };

  return (
    <main style={{ background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif", padding: "2rem" }}>
      <div style={{ maxWidth: "1280px", margin: "0 auto" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", flexWrap: "wrap", marginBottom: "1.5rem" }}>
          <div>
            <p style={{ marginBottom: "0.25rem" }}>
              <a href="/main-dashboard" style={{ fontSize: "0.8rem", color: "#1a56db", textDecoration: "none" }}>← Dashboard</a>
            </p>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#111827", margin: 0, borderLeft: `4px solid ${ACCENT}`, paddingLeft: "0.75rem" }}>
              Construction
            </h1>
            <p style={{ fontSize: "0.875rem", color: "#6b7280", marginTop: "0.25rem", marginBottom: 0, paddingLeft: "1.25rem" }}>
              NTPs · Daily Progress · Work Accomplished Reports
            </p>
          </div>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <a href="/construction/issue-ntp" style={{
              padding: "0.55rem 1.1rem", borderRadius: "6px", border: `1px solid ${ACCENT}`,
              color: ACCENT, background: "#fff", fontSize: "0.875rem", fontWeight: 600, textDecoration: "none",
            }}>+ Issue NTP</a>
            <a href="/construction/log-progress" style={{
              padding: "0.55rem 1.1rem", borderRadius: "6px",
              background: ACCENT, color: "#fff", fontSize: "0.875rem", fontWeight: 600, textDecoration: "none",
            }}>+ Log Progress</a>
            <a href="/construction/submit-war" style={{
              padding: "0.55rem 1.1rem", borderRadius: "6px", background: "#fff",
              color: "#374151", fontSize: "0.875rem", fontWeight: 600, textDecoration: "none",
              border: "1px solid #d1d5db",
            }}>Submit WAR</a>
          </div>
        </div>

        {/* KPI Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: "1rem", marginBottom: "1.5rem" }}>
          {kpis.map((kpi) => (
            <div key={kpi.label} style={{ ...card, borderTop: `3px solid ${kpi.accent}` }}>
              <div style={{ fontSize: "1.875rem", fontWeight: 700, color: "#111827", lineHeight: 1 }}>{kpi.value.toLocaleString()}</div>
              <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "#111827", marginTop: "0.3rem" }}>{kpi.label}</div>
              <div style={{ fontSize: "0.72rem", color: "#9ca3af", marginTop: "0.2rem" }}>{kpi.sub}</div>
            </div>
          ))}
        </div>

        {/* Workflow flow banner */}
        <div style={{ ...card, marginBottom: "1.5rem", padding: "1rem 1.25rem", background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
          <p style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#065f46", marginBottom: "0.6rem", marginTop: 0 }}>
            Construction Workflow
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap", fontSize: "0.78rem" }}>
            {[
              { step: "Issue NTP",        href: "/construction/issue-ntp", bg: "#d1fae5", color: "#065f46" },
              { step: "→" },
              { step: "Log Daily Progress", href: "/construction/log-progress", bg: "#d1fae5", color: "#065f46" },
              { step: "→" },
              { step: "All Activities Done", bg: "#c4b5fd", color: "#5b21b6" },
              { step: "→" },
              { step: "Submit WAR",       href: "/construction/submit-war", bg: "#fde68a", color: "#92400e" },
              { step: "→" },
              { step: "Accounting Review", bg: "#bae6fd", color: "#0369a1" },
              { step: "→" },
              { step: "Audit Gate", bg: "#fed7aa", color: "#9a3412" },
              { step: "→" },
              { step: "BOD Approval", bg: "#d1fae5", color: "#065f46" },
            ].map((s, i) =>
              "href" in s ? (
                <a key={i} href={s.href} style={{ padding: "0.25rem 0.6rem", borderRadius: "6px", background: s.bg, color: s.color, fontWeight: 600, fontSize: "0.75rem", textDecoration: "none", whiteSpace: "nowrap" }}>
                  {s.step}
                </a>
              ) : s.step === "→" ? (
                <span key={i} style={{ color: "#6ee7b7", fontWeight: 700 }}>→</span>
              ) : (
                <span key={i} style={{ padding: "0.25rem 0.6rem", borderRadius: "6px", background: s.bg, color: s.color, fontWeight: 600, fontSize: "0.75rem", whiteSpace: "nowrap" }}>
                  {s.step}
                </span>
              )
            )}
          </div>
        </div>

        {/* WAR Ready ToDo section */}
        {warReadyCount > 0 && (
          <div style={{ ...card, marginBottom: "1.5rem", border: "1px solid #c4b5fd", background: "#faf5ff" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
              <p style={{ fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "#5b21b6", margin: 0 }}>
                ✓ WAR Submission Ready — {warReadyCount} NTP{warReadyCount !== 1 ? "s" : ""}
              </p>
              <a href="/construction/submit-war" style={{ fontSize: "0.8rem", color: "#5b21b6", textDecoration: "none", fontWeight: 600 }}>Submit WAR →</a>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {warReadyNtps.slice(0, 5).map((ntp) => (
                <div key={ntp.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.65rem 1rem", background: "#fff", borderRadius: "8px", border: "1px solid #e9d5ff" }}>
                  <div>
                    <span style={{ fontFamily: "monospace", fontWeight: 700, color: "#111827", marginRight: "0.75rem" }}>{ntp.unit_code}</span>
                    <span style={{ fontSize: "0.8rem", color: "#374151" }}>{ntp.subcon_name}</span>
                    <span style={{ marginLeft: "0.5rem", fontSize: "0.75rem", background: "#ede9fe", color: "#5b21b6", padding: "0.1rem 0.4rem", borderRadius: "4px", fontWeight: 600 }}>
                      {ntp.scope_name}
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <span style={{ fontSize: "0.72rem", color: "#6b7280" }}>{ntp.done_activities}/{ntp.total_activities} activities</span>
                    <a href={`/construction/submit-war?ntpId=${ntp.id}`} style={{
                      padding: "0.3rem 0.75rem", borderRadius: "6px", background: "#7e3af2",
                      color: "#fff", fontSize: "0.78rem", fontWeight: 600, textDecoration: "none",
                    }}>Submit WAR</a>
                  </div>
                </div>
              ))}
              {warReadyCount > 5 && (
                <p style={{ fontSize: "0.78rem", color: "#6b7280", margin: 0 }}>…and {warReadyCount - 5} more</p>
              )}
            </div>
          </div>
        )}

        {/* NTP Pipeline + WAR Pipeline */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
          <div style={card}>
            <p style={{ fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "#9ca3af", marginBottom: "0.75rem", marginTop: 0 }}>
              NTP Status Breakdown
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "1rem" }}>
              {[
                { label: "Draft",     count: draftNtps,   bg: "#f3f4f6", color: "#374151" },
                { label: "Active",    count: activeNtps,   bg: "#dcfce7", color: "#166534" },
                { label: "Completed", count: completedNtps, bg: "#eff6ff", color: "#1e40af" },
                { label: "Total",     count: totalNtps,    bg: "#f0fdf4", color: "#065f46" },
              ].map((s) => (
                <div key={s.label} style={{ background: s.bg, borderRadius: "8px", padding: "0.85rem 1rem" }}>
                  <div style={{ fontSize: "1.5rem", fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.count}</div>
                  <div style={{ fontSize: "0.72rem", color: "#6b7280", marginTop: "0.2rem" }}>{s.label}</div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {ntpStages.map((st) => (
                <div key={st.label}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem", marginBottom: "0.2rem" }}>
                    <span style={{ color: "#374151" }}>{st.label}</span>
                    <span style={{ color: "#6b7280", fontFamily: "monospace" }}>{st.count}</span>
                  </div>
                  <div style={{ height: "7px", background: "#f3f4f6", borderRadius: "999px", overflow: "hidden" }}>
                    <div style={{ height: "100%", background: st.color, borderRadius: "999px", width: `${Math.round((st.count / ntpPipelineTotal) * 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: "1rem", paddingTop: "0.75rem", borderTop: "1px solid #e5e7eb", textAlign: "right" }}>
              <a href="/construction/ntp" style={{ fontSize: "0.8rem", color: ACCENT, textDecoration: "none", fontWeight: 600 }}>View NTP Register →</a>
            </div>
          </div>

          <div style={card}>
            <p style={{ fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "#9ca3af", marginBottom: "0.75rem", marginTop: 0 }}>
              WAR Approval Pipeline
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "1rem" }}>
              {[
                { label: "Pending Review",     count: warPending,      bg: "#fef9c3", color: "#713f12" },
                { label: "Pending Audit",      count: warAudit,        bg: "#e0f2fe", color: "#0369a1" },
                { label: "Ready for Approval", count: warReadyApprove, bg: "#ede9fe", color: "#5b21b6" },
                { label: "Approved",           count: warApproved,     bg: "#dcfce7", color: "#166534" },
              ].map((s) => (
                <div key={s.label} style={{ background: s.bg, borderRadius: "8px", padding: "0.85rem 1rem" }}>
                  <div style={{ fontSize: "1.5rem", fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.count}</div>
                  <div style={{ fontSize: "0.72rem", color: "#6b7280", marginTop: "0.2rem" }}>{s.label}</div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {warStages.map((st) => (
                <div key={st.label}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem", marginBottom: "0.2rem" }}>
                    <span style={{ color: "#374151" }}>{st.label}</span>
                    <span style={{ color: "#6b7280", fontFamily: "monospace" }}>{st.count}</span>
                  </div>
                  <div style={{ height: "7px", background: "#f3f4f6", borderRadius: "999px", overflow: "hidden" }}>
                    <div style={{ height: "100%", background: st.color, borderRadius: "999px", width: `${Math.round((st.count / warPipelineTotal) * 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: "1rem", paddingTop: "0.75rem", borderTop: "1px solid #e5e7eb", textAlign: "right" }}>
              <a href="/construction/war" style={{ fontSize: "0.8rem", color: ACCENT, textDecoration: "none", fontWeight: 600 }}>View WAR Register →</a>
            </div>
          </div>
        </div>

        {/* Recent Progress Entries */}
        <div style={{ ...card, padding: 0, overflow: "hidden", marginBottom: "1.5rem" }}>
          <div style={{ padding: "1rem 1.5rem", borderBottom: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <p style={{ fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "#9ca3af", margin: 0 }}>
              Recent Progress Entries
            </p>
            <a href="/construction/daily-progress" style={{ fontSize: "0.8rem", color: ACCENT, textDecoration: "none", fontWeight: 600 }}>View all →</a>
          </div>
          {recentProgress.length === 0 ? (
            <div style={{ padding: "3rem", textAlign: "center", color: "#6b7280", fontSize: "0.875rem" }}>
              No progress entries yet.{" "}
              <a href="/construction/log-progress" style={{ color: ACCENT, textDecoration: "none" }}>Log first entry →</a>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
                <thead>
                  <tr>
                    {["Date", "Project", "Unit", "Subcontractor", "Manpower", "Status", "Delay", "Flagged"].map((h) => (
                      <th key={h} style={th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recentProgress.map((row) => (
                    <tr key={row.id} style={{ background: row.docGapFlagged ? "#fffbeb" : "transparent" }}>
                      <td style={{ ...td, fontWeight: 500, color: "#111827" }}>{row.entryDate}</td>
                      <td style={td}>{row.projName ?? "—"}</td>
                      <td style={td}><span style={{ fontFamily: "monospace", fontWeight: 600 }}>{row.unitCode ?? "—"}</span></td>
                      <td style={td}>{row.subName ?? "—"}</td>
                      <td style={{ ...td, textAlign: "right" }}>{row.actualManpower}</td>
                      <td style={td}><Badge status={row.status} /></td>
                      <td style={{ ...td, fontSize: "0.78rem", color: "#6b7280" }}>{row.delayType ?? "—"}</td>
                      <td style={td}>
                        {row.docGapFlagged
                          ? <span style={{ fontSize: "0.72rem", fontWeight: 600, color: "#b91c1c" }}>⚠ Yes</span>
                          : <span style={{ fontSize: "0.72rem", color: "#9ca3af" }}>—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Recent WARs */}
        <div style={{ ...card, padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "1rem 1.5rem", borderBottom: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <p style={{ fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "#9ca3af", margin: 0 }}>
              Recent Work Accomplished Reports
            </p>
            <a href="/construction/war" style={{ fontSize: "0.8rem", color: ACCENT, textDecoration: "none", fontWeight: 600 }}>View all →</a>
          </div>
          {recentWars.length === 0 ? (
            <div style={{ padding: "3rem", textAlign: "center", color: "#6b7280", fontSize: "0.875rem" }}>
              No WARs submitted yet.
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
                <thead>
                  <tr>
                    {["Unit", "Project", "Gross Amount", "Status", "Submitted"].map((h) => (
                      <th key={h} style={h === "Gross Amount" ? { ...th, textAlign: "right" } : th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recentWars.map((row) => (
                    <tr key={row.id}>
                      <td style={{ ...td, fontFamily: "monospace", fontWeight: 600, color: "#111827" }}>{row.unitCode ?? "—"}</td>
                      <td style={td}>{row.projName ?? "—"}</td>
                      <td style={{ ...td, textAlign: "right", fontWeight: 500 }}>
                        PHP {Number(row.grossAmount).toLocaleString()}
                      </td>
                      <td style={td}><Badge status={row.status} /></td>
                      <td style={{ ...td, color: "#9ca3af", fontSize: "0.78rem" }}>
                        {row.submittedAt
                          ? new Date(row.submittedAt).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </main>
  );
}
