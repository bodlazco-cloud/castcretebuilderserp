export const dynamic = "force-dynamic";
import { db } from "@/db";
import { constructionManpowerLogs, projects, activityDefinitions, subcontractors } from "@/db/schema";
import { eq, desc, sum } from "drizzle-orm";
import { getAuthUser } from "@/lib/supabase-server";

const ACCENT = "#1a56db";

export default async function ResourceForecastingPage() {
  await getAuthUser();

  const rows = await db
    .select({
      id:               constructionManpowerLogs.id,
      logDate:          constructionManpowerLogs.logDate,
      subconHeadcount:  constructionManpowerLogs.subconHeadcount,
      directStaffCount: constructionManpowerLogs.directStaffCount,
      remarks:          constructionManpowerLogs.remarks,
      createdAt:        constructionManpowerLogs.createdAt,
      projName:         projects.name,
      projId:           projects.id,
      activityCode:     activityDefinitions.activityCode,
      activityName:     activityDefinitions.activityName,
      subconName:       subcontractors.name,
    })
    .from(constructionManpowerLogs)
    .leftJoin(projects,            eq(constructionManpowerLogs.projectId,     projects.id))
    .leftJoin(activityDefinitions, eq(constructionManpowerLogs.activityDefId, activityDefinitions.id))
    .leftJoin(subcontractors,      eq(constructionManpowerLogs.subconId,      subcontractors.id))
    .orderBy(desc(constructionManpowerLogs.logDate), desc(constructionManpowerLogs.createdAt));

  const totalSubcon = rows.reduce((sum, r) => sum + r.subconHeadcount,  0);
  const totalDirect = rows.reduce((sum, r) => sum + r.directStaffCount, 0);

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "1100px" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href="/planning" style={{ fontSize: "0.8rem", color: ACCENT, textDecoration: "none" }}>← Planning & Engineering</a>
        </div>

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem", marginBottom: "1.5rem" }}>
          <div>
            <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827" }}>Resource Forecasting</h1>
            <p style={{ margin: 0, color: "#6b7280", fontSize: "0.9rem" }}>
              {rows.length} manpower log{rows.length !== 1 ? "s" : ""} — {totalSubcon} subcon headcount, {totalDirect} direct staff (total)
            </p>
          </div>
          <a href="/planning/resource-forecasting/new" style={{
            padding: "0.55rem 1.1rem", borderRadius: "6px", background: ACCENT,
            color: "#fff", fontSize: "0.875rem", fontWeight: 600, textDecoration: "none",
          }}>+ Log Manpower</a>
        </div>

        {/* Summary KPI row */}
        {rows.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", marginBottom: "1.5rem" }}>
            {[
              { label: "Log Entries",       value: rows.length,  unit: "" },
              { label: "Subcon Headcount",  value: totalSubcon,  unit: " total" },
              { label: "Direct Staff",      value: totalDirect,  unit: " total" },
            ].map((kpi) => (
              <div key={kpi.label} style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", padding: "1.1rem 1.25rem" }}>
                <div style={{ fontSize: "0.78rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.35rem" }}>{kpi.label}</div>
                <div style={{ fontSize: "1.4rem", fontWeight: 700, color: "#111827" }}>{kpi.value.toLocaleString()}<span style={{ fontSize: "0.85rem", fontWeight: 400, color: "#6b7280" }}>{kpi.unit}</span></div>
              </div>
            ))}
          </div>
        )}

        {rows.length === 0 ? (
          <div style={{ padding: "3rem", background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", textAlign: "center", color: "#9ca3af" }}>
            No manpower logs yet. <a href="/planning/resource-forecasting/new" style={{ color: ACCENT }}>Log first entry →</a>
          </div>
        ) : (
          <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem", minWidth: "820px" }}>
                <thead>
                  <tr style={{ background: "#f9fafb" }}>
                    {["Date", "Project", "Activity", "Subcontractor", "Subcon HC", "Direct HC", "Remarks"].map((h, i) => (
                      <th key={i} style={{
                        padding: "0.75rem 1rem", textAlign: i >= 4 && i <= 5 ? "right" : "left",
                        fontWeight: 600, color: "#374151", borderBottom: "1px solid #e5e7eb",
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                      <td style={{ padding: "0.65rem 1rem", fontFamily: "monospace", fontSize: "0.82rem", color: "#374151", whiteSpace: "nowrap" }}>
                        {r.logDate}
                      </td>
                      <td style={{ padding: "0.65rem 1rem", color: "#374151" }}>
                        {r.projId
                          ? <a href={`/master-list/projects/${r.projId}`} style={{ color: "#6366f1", textDecoration: "none" }}>{r.projName}</a>
                          : (r.projName ?? "—")}
                      </td>
                      <td style={{ padding: "0.65rem 1rem" }}>
                        {r.activityCode
                          ? <><span style={{ fontFamily: "monospace", fontSize: "0.78rem", fontWeight: 600 }}>{r.activityCode}</span><div style={{ fontSize: "0.75rem", color: "#6b7280" }}>{r.activityName}</div></>
                          : <span style={{ color: "#9ca3af" }}>—</span>}
                      </td>
                      <td style={{ padding: "0.65rem 1rem", color: "#374151" }}>{r.subconName ?? <span style={{ color: "#9ca3af" }}>—</span>}</td>
                      <td style={{ padding: "0.65rem 1rem", textAlign: "right", fontWeight: 700, color: "#111827" }}>{r.subconHeadcount}</td>
                      <td style={{ padding: "0.65rem 1rem", textAlign: "right", fontWeight: 700, color: "#111827" }}>{r.directStaffCount}</td>
                      <td style={{ padding: "0.65rem 1rem", color: "#6b7280", fontSize: "0.82rem", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {r.remarks ?? <span style={{ color: "#d1d5db" }}>—</span>}
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
