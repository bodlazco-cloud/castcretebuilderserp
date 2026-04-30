export const dynamic = "force-dynamic";
import { db } from "@/db";
import { dailyProgressEntries, projectUnits, subcontractors, projects, taskAssignments } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getAuthUser } from "@/lib/supabase-server";

const ACCENT = "#057a55";

export default async function DailyProgressPage() {
  await getAuthUser();

  const rows = await db
    .select({
      id:             dailyProgressEntries.id,
      entryDate:      dailyProgressEntries.entryDate,
      status:         dailyProgressEntries.status,
      actualManpower: dailyProgressEntries.actualManpower,
      delayType:      dailyProgressEntries.delayType,
      docGapFlagged:  dailyProgressEntries.docGapFlagged,
      createdAt:      dailyProgressEntries.createdAt,
      unitCode:       projectUnits.unitCode,
      unitModel:      projectUnits.unitModel,
      subName:        subcontractors.name,
      projName:       projects.name,
      ntpId:          taskAssignments.id,
    })
    .from(dailyProgressEntries)
    .leftJoin(projectUnits,   eq(dailyProgressEntries.unitId,            projectUnits.id))
    .leftJoin(subcontractors, eq(dailyProgressEntries.subconId,          subcontractors.id))
    .leftJoin(projects,       eq(dailyProgressEntries.projectId,         projects.id))
    .leftJoin(taskAssignments, eq(dailyProgressEntries.taskAssignmentId, taskAssignments.id))
    .orderBy(desc(dailyProgressEntries.entryDate));

  const flaggedCount = rows.filter((r) => r.docGapFlagged).length;

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "1100px" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href="/construction" style={{ fontSize: "0.8rem", color: ACCENT, textDecoration: "none" }}>← Construction</a>
        </div>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem", marginBottom: "1.5rem" }}>
          <div>
            <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827" }}>Daily Progress</h1>
            <p style={{ margin: 0, color: "#6b7280", fontSize: "0.9rem" }}>Progress logs across all sites. {flaggedCount > 0 && <span style={{ color: "#b91c1c", fontWeight: 600 }}>⚠ {flaggedCount} flagged</span>}</p>
          </div>
          <a href="/construction/log-progress" style={{
            padding: "0.55rem 1.1rem", borderRadius: "6px", background: ACCENT,
            color: "#fff", fontSize: "0.875rem", fontWeight: 600, textDecoration: "none",
          }}>+ Log Progress</a>
        </div>

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
                    {["Date", "Project", "Unit", "Subcontractor", "Manpower", "Delay", "Status", "Flagged", ""].map((h, i) => (
                      <th key={i} style={{ padding: "0.75rem 1rem", textAlign: "left", fontWeight: 600, color: "#374151", borderBottom: "1px solid #e5e7eb" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} style={{ borderBottom: "1px solid #f3f4f6", background: r.docGapFlagged ? "#fffbeb" : "transparent" }}>
                      <td style={{ padding: "0.65rem 1rem", fontWeight: 500, color: "#111827" }}>{r.entryDate}</td>
                      <td style={{ padding: "0.65rem 1rem", color: "#374151" }}>{r.projName ?? "—"}</td>
                      <td style={{ padding: "0.65rem 1rem" }}>
                        <span style={{ fontFamily: "monospace", fontSize: "0.82rem", fontWeight: 600, color: "#374151" }}>{r.unitCode ?? "—"}</span>
                      </td>
                      <td style={{ padding: "0.65rem 1rem", color: "#374151" }}>{r.subName ?? "—"}</td>
                      <td style={{ padding: "0.65rem 1rem", color: "#374151" }}>{r.actualManpower}</td>
                      <td style={{ padding: "0.65rem 1rem", color: "#6b7280", fontSize: "0.82rem" }}>{r.delayType ?? "—"}</td>
                      <td style={{ padding: "0.65rem 1rem", color: "#6b7280" }}>{r.status}</td>
                      <td style={{ padding: "0.65rem 1rem" }}>
                        {r.docGapFlagged
                          ? <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#b91c1c" }}>⚠ Yes</span>
                          : <span style={{ fontSize: "0.75rem", color: "#9ca3af" }}>—</span>}
                      </td>
                      <td style={{ padding: "0.65rem 1rem", textAlign: "right" }}>
                        <a href={`/construction/daily-progress/${r.id}`} style={{ color: ACCENT, textDecoration: "none", fontSize: "0.8rem", fontWeight: 600 }}>View →</a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
