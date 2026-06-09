export const dynamic = "force-dynamic";
import { db } from "@/db";
import { dailyProgressEntries, projectUnits, subcontractors, projects, taskAssignments } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getAuthUser, canApproveProgressEntries } from "@/lib/supabase-server";
import { DpeBulkApprove } from "./DpeBulkApprove";

const ACCENT = "#057a55";

const AP_STYLE: Record<string, { bg: string; color: string }> = {
  PENDING_REVIEW: { bg: "#fef9c3", color: "#713f12" },
  APPROVED:       { bg: "#dcfce7", color: "#166534" },
  REJECTED:       { bg: "#fef2f2", color: "#b91c1c" },
};

export default async function DailyProgressPage() {
  const user = await getAuthUser();
  const canApprove = await canApproveProgressEntries();
  const userId = user?.id ?? "";

  const rows = await db
    .select({
      id:             dailyProgressEntries.id,
      entryDate:      dailyProgressEntries.entryDate,
      status:         dailyProgressEntries.status,
      approvalStatus: dailyProgressEntries.approvalStatus,
      actualManpower: dailyProgressEntries.actualManpower,
      delayType:      dailyProgressEntries.delayType,
      docGapFlagged:  dailyProgressEntries.docGapFlagged,
      createdAt:      dailyProgressEntries.createdAt,
      unitCode:       projectUnits.unitCode,
      subName:        subcontractors.name,
      projName:       projects.name,
      ntpId:          taskAssignments.id,
    })
    .from(dailyProgressEntries)
    .leftJoin(projectUnits,    eq(dailyProgressEntries.unitId,            projectUnits.id))
    .leftJoin(subcontractors,  eq(dailyProgressEntries.subconId,          subcontractors.id))
    .leftJoin(projects,        eq(dailyProgressEntries.projectId,         projects.id))
    .leftJoin(taskAssignments, eq(dailyProgressEntries.taskAssignmentId,  taskAssignments.id))
    .orderBy(desc(dailyProgressEntries.entryDate));

  const flaggedCount  = rows.filter((r) => r.docGapFlagged).length;
  const pendingCount  = rows.filter((r) => (r.approvalStatus ?? "PENDING_REVIEW") === "PENDING_REVIEW").length;
  const pendingIds    = rows
    .filter((r) => (r.approvalStatus ?? "PENDING_REVIEW") === "PENDING_REVIEW")
    .map((r) => r.id);

  const thStyle: React.CSSProperties = {
    padding: "0.6rem 1rem", textAlign: "left", fontWeight: 600, color: "#374151",
    borderBottom: "1px solid #e5e7eb", fontSize: "0.78rem", whiteSpace: "nowrap",
  };
  const tdStyle: React.CSSProperties = {
    padding: "0.65rem 1rem", fontSize: "0.875rem", color: "#374151", borderBottom: "1px solid #f3f4f6",
  };

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "1200px" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href="/construction" style={{ fontSize: "0.8rem", color: ACCENT, textDecoration: "none" }}>← Construction</a>
        </div>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem", marginBottom: "1.5rem" }}>
          <div>
            <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827" }}>Daily Progress</h1>
            <p style={{ margin: 0, color: "#6b7280", fontSize: "0.9rem" }}>
              Progress logs across all sites.{" "}
              {flaggedCount > 0 && <span style={{ color: "#b91c1c", fontWeight: 600 }}>⚠ {flaggedCount} flagged</span>}
              {pendingCount > 0 && <span style={{ color: "#713f12", fontWeight: 600, marginLeft: "0.5rem" }}>· {pendingCount} pending approval</span>}
            </p>
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            {canApprove && pendingCount > 0 && (
              <DpeBulkApprove entryIds={pendingIds} userId={userId} count={pendingCount} />
            )}
            <a href="/construction/log-progress" style={{
              padding: "0.55rem 1.1rem", borderRadius: "6px", background: ACCENT,
              color: "#fff", fontSize: "0.875rem", fontWeight: 600, textDecoration: "none",
            }}>+ Log Progress</a>
          </div>
        </div>

        {canApprove && pendingCount > 0 && (
          <div style={{ marginBottom: "1rem", padding: "0.85rem 1.1rem", background: "#fef9c3", border: "1px solid #fde047", borderRadius: "8px", fontSize: "0.875rem", color: "#713f12", fontWeight: 500 }}>
            ⚡ {pendingCount} progress entr{pendingCount !== 1 ? "ies" : "y"} pending your approval. Use "Approve All Pending" or approve individually.
          </div>
        )}

        {rows.length === 0 ? (
          <div style={{ padding: "3rem", background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", textAlign: "center", color: "#9ca3af" }}>
            No progress entries yet. <a href="/construction/log-progress" style={{ color: ACCENT }}>Log first entry →</a>
          </div>
        ) : (
          <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem", minWidth: "900px" }}>
                <thead>
                  <tr style={{ background: "#f9fafb" }}>
                    {["Date", "Project", "Unit", "Subcontractor", "Manpower", "Status", "Approval", "Delay", "Flagged", ""].map((h, i) => (
                      <th key={i} style={thStyle}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const apStatus = r.approvalStatus ?? "PENDING_REVIEW";
                    const ap = AP_STYLE[apStatus] ?? AP_STYLE["PENDING_REVIEW"];
                    return (
                      <tr key={r.id} style={{ borderBottom: "1px solid #f3f4f6", background: r.docGapFlagged ? "#fffbeb" : "transparent" }}>
                        <td style={{ ...tdStyle, fontWeight: 500, color: "#111827" }}>{r.entryDate}</td>
                        <td style={tdStyle}>{r.projName ?? "—"}</td>
                        <td style={tdStyle}><span style={{ fontFamily: "monospace", fontSize: "0.82rem", fontWeight: 600 }}>{r.unitCode ?? "—"}</span></td>
                        <td style={tdStyle}>{r.subName ?? "—"}</td>
                        <td style={tdStyle}>{r.actualManpower}</td>
                        <td style={{ ...tdStyle, fontSize: "0.78rem", color: "#6b7280" }}>{r.status}</td>
                        <td style={tdStyle}>
                          <span style={{ display: "inline-block", padding: "0.15rem 0.45rem", borderRadius: "999px", fontSize: "0.7rem", fontWeight: 600, background: ap.bg, color: ap.color }}>
                            {apStatus.replace("_", " ")}
                          </span>
                        </td>
                        <td style={{ ...tdStyle, fontSize: "0.78rem", color: "#6b7280" }}>{r.delayType ?? "—"}</td>
                        <td style={tdStyle}>
                          {r.docGapFlagged
                            ? <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#b91c1c" }}>⚠ Yes</span>
                            : <span style={{ fontSize: "0.75rem", color: "#9ca3af" }}>—</span>}
                        </td>
                        <td style={{ ...tdStyle, textAlign: "right" }}>
                          <a href={`/construction/daily-progress/${r.id}`} style={{ color: ACCENT, textDecoration: "none", fontSize: "0.8rem", fontWeight: 600 }}>View →</a>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
