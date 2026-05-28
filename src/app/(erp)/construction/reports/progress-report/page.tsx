import { db } from "@/db";
import { dailyProgressEntries, projects, projectUnits, subcontractors } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    const result = await Promise.race([
      fn(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), 6000)
      ),
    ]);
    return result;
  } catch {
    return fallback;
  }
}

function formatDate(val: string | Date | null): string {
  if (!val) return "—";
  const d = typeof val === "string" ? new Date(val) : val;
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function statusBadge(status: string | null) {
  let bg = "#f3f4f6", color = "#6b7280";
  if (status === "STARTED") { bg = "#eff6ff"; color = "#1e40af"; }
  else if (status === "IN_PROGRESS") { bg = "#fef9c3"; color = "#713f12"; }
  else if (status === "COMPLETED") { bg = "#dcfce7"; color = "#166534"; }
  return (
    <span style={{ background: bg, color, padding: "2px 10px", borderRadius: 9999, fontSize: 12, fontWeight: 600 }}>
      {status ?? "—"}
    </span>
  );
}

function delayBadge(delayType: string | null) {
  if (!delayType) return <span style={{ color: "#9ca3af" }}>—</span>;
  return (
    <span style={{ background: "#fff7ed", color: "#9a3412", padding: "2px 10px", borderRadius: 9999, fontSize: 12, fontWeight: 600 }}>
      {delayType}
    </span>
  );
}

export default async function Page() {
  const rows = await safe(
    () =>
      db
        .select({
          id: dailyProgressEntries.id,
          entryDate: dailyProgressEntries.entryDate,
          status: dailyProgressEntries.status,
          actualManpower: dailyProgressEntries.actualManpower,
          delayType: dailyProgressEntries.delayType,
          issuesDetails: dailyProgressEntries.issuesDetails,
          docGapFlagged: dailyProgressEntries.docGapFlagged,
          projectName: projects.name,
          unitCode: projectUnits.unitCode,
          unitModel: projectUnits.unitModel,
          subconName: subcontractors.name,
        })
        .from(dailyProgressEntries)
        .leftJoin(projects, eq(dailyProgressEntries.projectId, projects.id))
        .leftJoin(projectUnits, eq(dailyProgressEntries.unitId, projectUnits.id))
        .leftJoin(subcontractors, eq(dailyProgressEntries.subconId, subcontractors.id))
        .orderBy(desc(dailyProgressEntries.entryDate))
        .limit(300),
    []
  );

  const totalEntries = rows.length;
  const flaggedDocs = rows.filter((r) => r.docGapFlagged).length;
  const delayedCount = rows.filter((r) => r.delayType != null).length;
  const totalManpower = rows.reduce((sum, r) => sum + (r.actualManpower ?? 0), 0);

  const grouped: Record<string, typeof rows> = {};
  for (const row of rows) {
    const key = row.projectName ?? "Unknown Project";
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(row);
  }

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", background: "#f9fafb", minHeight: "100vh", padding: "32px 24px" }}>
      <style>{`
        details > summary { list-style: none; cursor: pointer; }
        details > summary::-webkit-details-marker { display: none; }
        details > summary .chevron { display: inline-block; transition: transform 0.2s; }
        details[open] > summary .chevron { transform: rotate(90deg); }
      `}</style>

      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ marginBottom: 8 }}>
          <a href="/construction" style={{ color: "#1a56db", textDecoration: "none", fontSize: 14, fontWeight: 500 }}>
            ← Construction
          </a>
        </div>

        <h1 style={{ fontSize: 26, fontWeight: 700, color: "#111827", margin: "0 0 4px 0" }}>
          Progress Report
        </h1>
        <p style={{ color: "#6b7280", fontSize: 14, margin: "0 0 28px 0" }}>
          Daily construction progress entries per project
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 32 }}>
          {[
            { label: "Total Entries", value: totalEntries, accent: "#1a56db" },
            { label: "Doc Gaps Flagged", value: flaggedDocs, accent: "#dc2626" },
            { label: "With Delays", value: delayedCount, accent: "#e3a008" },
            { label: "Total Manpower", value: totalManpower, accent: "#0694a2" },
          ].map((kpi) => (
            <div
              key={kpi.label}
              style={{
                background: "#fff",
                borderRadius: 12,
                padding: "20px 24px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                borderTop: `4px solid ${kpi.accent}`,
              }}
            >
              <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 6 }}>{kpi.label}</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: kpi.accent }}>{kpi.value.toLocaleString()}</div>
            </div>
          ))}
        </div>

        {totalEntries === 0 ? (
          <div
            style={{
              background: "#fff",
              borderRadius: 12,
              padding: "60px 24px",
              textAlign: "center",
              color: "#9ca3af",
              boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
            }}
          >
            <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: "#6b7280" }}>No progress entries found</div>
            <div style={{ fontSize: 13, marginTop: 4 }}>Daily progress entries will appear here once recorded.</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {Object.entries(grouped).map(([projectName, entries]) => {
              const projectDelays = entries.filter((e) => e.delayType != null).length;
              return (
                <details key={projectName} open style={{ background: "#fff", borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.08)", overflow: "hidden" }}>
                  <summary
                    style={{
                      padding: "16px 20px",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      borderBottom: "1px solid #e5e7eb",
                      userSelect: "none",
                    }}
                  >
                    <span className="chevron" style={{ color: "#9ca3af", fontSize: 14 }}>▶</span>
                    <span style={{ fontWeight: 700, fontSize: 15, color: "#111827" }}>{projectName}</span>
                    <span style={{ marginLeft: 8, background: "#eff6ff", color: "#1e40af", borderRadius: 9999, padding: "2px 10px", fontSize: 12, fontWeight: 600 }}>
                      {entries.length} {entries.length === 1 ? "entry" : "entries"}
                    </span>
                    {projectDelays > 0 && (
                      <span style={{ background: "#fff7ed", color: "#9a3412", borderRadius: 9999, padding: "2px 10px", fontSize: 12, fontWeight: 600 }}>
                        {projectDelays} {projectDelays === 1 ? "delay" : "delays"}
                      </span>
                    )}
                  </summary>

                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                      <thead>
                        <tr style={{ background: "#f9fafb" }}>
                          {["Date", "Unit", "Subcon", "Manpower", "Delay", "Status", "Doc Gap"].map((col) => (
                            <th
                              key={col}
                              style={{
                                padding: "10px 16px",
                                textAlign: "left",
                                fontWeight: 600,
                                color: "#374151",
                                borderBottom: "1px solid #e5e7eb",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {entries.map((row) => (
                          <tr
                            key={row.id}
                            style={{
                              background: row.docGapFlagged ? "#fef2f2" : "transparent",
                              borderBottom: "1px solid #f3f4f6",
                            }}
                          >
                            <td style={{ padding: "10px 16px", whiteSpace: "nowrap", color: "#374151" }}>
                              {formatDate(row.entryDate)}
                            </td>
                            <td style={{ padding: "10px 16px", color: "#374151" }}>
                              {row.unitCode
                                ? `${row.unitCode}${row.unitModel ? " · " + row.unitModel : ""}`
                                : "—"}
                            </td>
                            <td style={{ padding: "10px 16px", color: "#374151" }}>
                              {row.subconName ?? "—"}
                            </td>
                            <td style={{ padding: "10px 16px", color: "#111827", fontWeight: 700 }}>
                              {row.actualManpower ?? "—"}
                            </td>
                            <td style={{ padding: "10px 16px", whiteSpace: "nowrap" }}>
                              {delayBadge(row.delayType)}
                            </td>
                            <td style={{ padding: "10px 16px", whiteSpace: "nowrap" }}>
                              {statusBadge(row.status)}
                            </td>
                            <td style={{ padding: "10px 16px", whiteSpace: "nowrap" }}>
                              {row.docGapFlagged ? (
                                <span style={{ color: "#dc2626", fontWeight: 600 }}>⚠ Gap</span>
                              ) : (
                                <span style={{ color: "#9ca3af" }}>—</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
