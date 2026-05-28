export const dynamic = "force-dynamic";

import { db } from "@/db";
import { constructionManpowerLogs, projects, subcontractors } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

function safe<T>(p: Promise<T>, fallback: T, ms = 6000): Promise<T> {
  return Promise.race([
    p.catch(() => fallback),
    new Promise<T>((r) => setTimeout(() => r(fallback), ms)),
  ]);
}

type Row = {
  id: string;
  logDate: string;
  subconHeadcount: number;
  directStaffCount: number;
  remarks: string | null;
  projectName: string | null;
  subconName: string | null;
};

function formatDate(d: string): string {
  const dt = new Date(d + "T00:00:00");
  return dt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default async function ManpowerLogsPage() {
  const rows = await safe<Row[]>(
    db.select({
      id: constructionManpowerLogs.id,
      logDate: constructionManpowerLogs.logDate,
      subconHeadcount: constructionManpowerLogs.subconHeadcount,
      directStaffCount: constructionManpowerLogs.directStaffCount,
      remarks: constructionManpowerLogs.remarks,
      projectName: projects.name,
      subconName: subcontractors.name,
    })
      .from(constructionManpowerLogs)
      .leftJoin(projects, eq(constructionManpowerLogs.projectId, projects.id))
      .leftJoin(subcontractors, eq(constructionManpowerLogs.subconId, subcontractors.id))
      .orderBy(desc(constructionManpowerLogs.logDate))
      .limit(200),
    []
  );

  const totalSubconHeadcount = rows.reduce((s, r) => s + Number(r.subconHeadcount), 0);
  const totalDirectStaff = rows.reduce((s, r) => s + Number(r.directStaffCount), 0);
  const avgDailyManpower = rows.length === 0 ? 0 : (totalSubconHeadcount + totalDirectStaff) / rows.length;

  const grouped = new Map<string, Row[]>();
  for (const r of rows) {
    const key = r.projectName ?? "Unknown Project";
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(r);
  }

  const kpis = [
    { label: "Total Log Entries", value: rows.length, accent: "#1a56db" },
    { label: "Total Subcon Headcount", value: totalSubconHeadcount, accent: "#e3a008" },
    { label: "Total Direct Staff", value: totalDirectStaff, accent: "#7e3af2" },
    { label: "Avg Daily (total/entry)", value: Math.round(avgDailyManpower), accent: "#0694a2" },
  ];

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <style>{`
        details > summary { list-style: none; cursor: pointer; }
        details > summary::-webkit-details-marker { display: none; }
        details > summary::before {
          content: "▶";
          display: inline-block;
          margin-right: 0.5rem;
          font-size: 0.7rem;
          transition: transform 0.2s;
          color: #6b7280;
        }
        details[open] > summary::before { transform: rotate(90deg); }
      `}</style>

      <div style={{ maxWidth: "1100px" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href="/construction" style={{ fontSize: "0.8rem", color: "#1a56db", textDecoration: "none" }}>← Construction</a>
        </div>

        <div style={{ marginBottom: "1.5rem" }}>
          <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827" }}>Manpower Logs</h1>
          <p style={{ margin: 0, color: "#6b7280", fontSize: "0.9rem" }}>Construction manpower logs per project</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem", marginBottom: "2rem" }}>
          {kpis.map((k) => (
            <div key={k.label} style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", padding: "1.25rem", borderTop: `3px solid ${k.accent}` }}>
              <div style={{ fontSize: "0.75rem", color: "#6b7280", fontWeight: 500, marginBottom: "0.5rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>{k.label}</div>
              <div style={{ fontSize: "1.75rem", fontWeight: 700, color: k.accent }}>{k.value.toLocaleString()}</div>
            </div>
          ))}
        </div>

        {rows.length === 0 ? (
          <div style={{ padding: "3rem", background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", textAlign: "center", color: "#9ca3af", fontSize: "0.95rem" }}>
            No manpower logs found.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {Array.from(grouped.entries()).map(([projectName, prows]) => {
              const pSubcon = prows.reduce((s, r) => s + Number(r.subconHeadcount), 0);
              const pDirect = prows.reduce((s, r) => s + Number(r.directStaffCount), 0);
              return (
                <details key={projectName} open style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden" }}>
                  <summary style={{ padding: "1rem 1.25rem", fontWeight: 600, color: "#111827", fontSize: "0.95rem", userSelect: "none", display: "flex", alignItems: "center", borderBottom: "1px solid #e5e7eb" }}>
                    <span style={{ flex: 1 }}>{projectName}</span>
                    <span style={{ fontWeight: 400, fontSize: "0.82rem", color: "#6b7280", marginLeft: "1rem" }}>
                      {prows.length} {prows.length === 1 ? "entry" : "entries"}&nbsp;·&nbsp;
                      <span style={{ color: "#e3a008" }}>{pSubcon} subcon</span>&nbsp;·&nbsp;
                      <span style={{ color: "#7e3af2" }}>{pDirect} direct staff</span>
                    </span>
                  </summary>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem", minWidth: "750px" }}>
                      <thead>
                        <tr style={{ background: "#f9fafb" }}>
                          {["Date", "Subcontractor", "Subcon Headcount", "Direct Staff", "Total", "Remarks"].map((h, i) => (
                            <th key={i} style={{ padding: "0.65rem 1rem", textAlign: "left", fontWeight: 600, color: "#374151", borderBottom: "1px solid #e5e7eb", whiteSpace: "nowrap" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {prows.map((r) => {
                          const total = Number(r.subconHeadcount) + Number(r.directStaffCount);
                          const remarks = r.remarks ?? "";
                          const truncated = remarks.length > 60 ? remarks.slice(0, 60) + "…" : remarks;
                          return (
                            <tr key={r.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                              <td style={{ padding: "0.65rem 1rem", color: "#111827", fontWeight: 500, whiteSpace: "nowrap" }}>{formatDate(r.logDate)}</td>
                              <td style={{ padding: "0.65rem 1rem", color: "#374151" }}>{r.subconName ?? "—"}</td>
                              <td style={{ padding: "0.65rem 1rem", fontWeight: 700, color: "#374151" }}>{Number(r.subconHeadcount)}</td>
                              <td style={{ padding: "0.65rem 1rem", fontWeight: 700, color: "#374151" }}>{Number(r.directStaffCount)}</td>
                              <td style={{ padding: "0.65rem 1rem" }}>
                                <span style={{ fontWeight: 700, color: "#fff", background: "#1a56db", borderRadius: "4px", padding: "0.15rem 0.55rem", fontSize: "0.82rem" }}>{total}</span>
                              </td>
                              <td style={{ padding: "0.65rem 1rem", color: "#6b7280", fontSize: "0.82rem" }}>
                                {truncated ? <span title={remarks}>{truncated}</span> : "—"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
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
