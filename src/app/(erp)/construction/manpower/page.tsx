export const dynamic = "force-dynamic";

import { db } from "@/db";
import { projects, projectUnits, subcontractors } from "@/db/schema";
import { dailyProgressEntries } from "@/db/schema/construction";
import { eq, desc, sql } from "drizzle-orm";

const ACCENT = "#057a55";

function fmt(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default async function ManpowerPage() {
  // All daily progress entries with manpower data
  const rows = await db
    .select({
      id:             dailyProgressEntries.id,
      entryDate:      dailyProgressEntries.entryDate,
      actualManpower: dailyProgressEntries.actualManpower,
      status:         dailyProgressEntries.status,
      approvalStatus: dailyProgressEntries.approvalStatus,
      projectId:      dailyProgressEntries.projectId,
      projName:       projects.name,
      subName:        subcontractors.name,
      unitCode:       projectUnits.unitCode,
    })
    .from(dailyProgressEntries)
    .leftJoin(projects,       eq(dailyProgressEntries.projectId, projects.id))
    .leftJoin(subcontractors, eq(dailyProgressEntries.subconId,  subcontractors.id))
    .leftJoin(projectUnits,   eq(dailyProgressEntries.unitId,    projectUnits.id))
    .orderBy(desc(dailyProgressEntries.entryDate))
    .limit(500);

  // Aggregate by project
  const byProject = new Map<string, {
    projName: string;
    entries: typeof rows;
    bySubcon: Map<string, { subName: string; manpower: number; entries: number }>;
  }>();

  for (const r of rows) {
    const key = r.projectId;
    const pname = r.projName ?? "Unknown Project";
    if (!byProject.has(key)) {
      byProject.set(key, { projName: pname, entries: [], bySubcon: new Map() });
    }
    const proj = byProject.get(key)!;
    proj.entries.push(r);

    const skey = r.subName ?? "—";
    const existing = proj.bySubcon.get(skey) ?? { subName: skey, manpower: 0, entries: 0 };
    existing.manpower += Number(r.actualManpower);
    existing.entries += 1;
    proj.bySubcon.set(skey, existing);
  }

  const totalManpower = rows.reduce((s, r) => s + Number(r.actualManpower), 0);
  const totalEntries = rows.length;
  const approvedEntries = rows.filter((r) => r.approvalStatus === "APPROVED").length;
  const avgManpower = totalEntries === 0 ? 0 : Math.round(totalManpower / totalEntries);

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <style>{`
        details > summary { list-style: none; }
        details > summary::-webkit-details-marker { display: none; }
      `}</style>

      <div style={{ maxWidth: "1100px" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href="/construction" style={{ fontSize: "0.8rem", color: ACCENT, textDecoration: "none" }}>← Construction</a>
        </div>

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem", marginBottom: "1.5rem" }}>
          <div>
            <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827" }}>Manpower Tracking</h1>
            <p style={{ margin: 0, color: "#6b7280", fontSize: "0.9rem" }}>Headcount from daily progress entries per site, subcontractor, and date.</p>
          </div>
          <a href="/construction/log-progress" style={{
            padding: "0.55rem 1.1rem", borderRadius: "6px", background: ACCENT,
            color: "#fff", fontSize: "0.875rem", fontWeight: 600, textDecoration: "none",
          }}>+ Log Progress</a>
        </div>

        {/* KPIs */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem", marginBottom: "1.5rem" }}>
          {[
            { label: "Total Manpower Logged", value: totalManpower.toLocaleString(), color: ACCENT },
            { label: "Progress Entries", value: totalEntries, color: "#6366f1" },
            { label: "Avg Manpower / Entry", value: avgManpower, color: "#0891b2" },
            { label: "Approved Entries", value: approvedEntries, color: "#166534" },
          ].map((k) => (
            <div key={k.label} style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", padding: "1rem 1.25rem" }}>
              <div style={{ fontSize: "0.72rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.25rem" }}>{k.label}</div>
              <div style={{ fontSize: "1.75rem", fontWeight: 700, color: k.color }}>{k.value}</div>
            </div>
          ))}
        </div>

        {rows.length === 0 ? (
          <div style={{ padding: "3rem", background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", textAlign: "center", color: "#9ca3af" }}>
            No progress entries yet. <a href="/construction/log-progress" style={{ color: ACCENT }}>Log first entry →</a>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {Array.from(byProject.entries()).map(([projId, proj]) => {
              const projTotal = proj.entries.reduce((s, r) => s + Number(r.actualManpower), 0);
              const subcons = Array.from(proj.bySubcon.values()).sort((a, b) => b.manpower - a.manpower);

              return (
                <details key={projId} open style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden" }}>
                  <summary style={{ padding: "1rem 1.25rem", cursor: "pointer", display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap", borderBottom: "1px solid #e5e7eb" }}>
                    <span style={{ fontWeight: 700, fontSize: "1rem", color: "#111827", flex: 1 }}>{proj.projName}</span>
                    <span style={{ fontSize: "0.82rem", color: "#6b7280" }}>{proj.entries.length} entries</span>
                    <span style={{ fontWeight: 700, fontSize: "0.9rem", color: ACCENT }}>{projTotal.toLocaleString()} workers total</span>
                  </summary>

                  <div style={{ padding: "1rem 1.25rem" }}>
                    {/* Subcon breakdown */}
                    <div style={{ marginBottom: "1rem" }}>
                      <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.5rem" }}>By Subcontractor</div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                        {subcons.map((s) => (
                          <div key={s.subName} style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "6px", padding: "0.4rem 0.75rem", fontSize: "0.82rem" }}>
                            <span style={{ fontWeight: 600, color: "#111827" }}>{s.subName}</span>
                            <span style={{ color: "#6b7280", marginLeft: "0.4rem" }}>{s.manpower} workers · {s.entries} {s.entries === 1 ? "entry" : "entries"}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Entry table */}
                    <div style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem", minWidth: "680px" }}>
                        <thead>
                          <tr style={{ background: "#f9fafb" }}>
                            {["Date", "Unit", "Subcontractor", "Manpower", "Activity Status", "Approval"].map((h, i) => (
                              <th key={i} style={{ padding: "0.55rem 0.85rem", textAlign: "left", fontWeight: 600, color: "#374151", borderBottom: "1px solid #e5e7eb", whiteSpace: "nowrap", fontSize: "0.78rem" }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {proj.entries.map((r) => {
                            const apColor = r.approvalStatus === "APPROVED" ? "#166534" : r.approvalStatus === "REJECTED" ? "#b91c1c" : "#713f12";
                            const apBg = r.approvalStatus === "APPROVED" ? "#dcfce7" : r.approvalStatus === "REJECTED" ? "#fef2f2" : "#fef9c3";
                            return (
                              <tr key={r.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                                <td style={{ padding: "0.55rem 0.85rem", color: "#111827", fontWeight: 500, whiteSpace: "nowrap" }}>{fmt(r.entryDate)}</td>
                                <td style={{ padding: "0.55rem 0.85rem", fontFamily: "monospace", fontSize: "0.82rem", color: "#374151" }}>{r.unitCode ?? "—"}</td>
                                <td style={{ padding: "0.55rem 0.85rem", color: "#374151" }}>{r.subName ?? "—"}</td>
                                <td style={{ padding: "0.55rem 0.85rem", fontWeight: 700, color: "#111827" }}>{Number(r.actualManpower)}</td>
                                <td style={{ padding: "0.55rem 0.85rem", fontSize: "0.78rem", color: "#6b7280" }}>{r.status}</td>
                                <td style={{ padding: "0.55rem 0.85rem" }}>
                                  <span style={{ display: "inline-block", padding: "0.1rem 0.45rem", borderRadius: "999px", fontSize: "0.7rem", fontWeight: 600, background: apBg, color: apColor }}>
                                    {(r.approvalStatus ?? "PENDING_REVIEW").replace("_", " ")}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
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
