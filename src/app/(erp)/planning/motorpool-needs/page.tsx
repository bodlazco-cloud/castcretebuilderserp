export const dynamic = "force-dynamic";

import { db } from "@/db";
import { resourceForecasts, masterBomEntries, projectUnits, projects } from "@/db/schema";
import { eq, count } from "drizzle-orm";
import { RequestDeploymentButton } from "./RequestDeploymentButton";

function safe<T>(p: Promise<T>, fallback: T, ms = 6000): Promise<T> {
  return Promise.race([
    p.catch(() => fallback),
    new Promise<T>((r) => setTimeout(() => r(fallback), ms)),
  ]);
}

const STATUS_BADGE: Record<string, { bg: string; color: string; label: string }> = {
  PENDING_PR: { bg: "#fef2f2", color: "#b91c1c",  label: "Pending" },
  PR_CREATED: { bg: "#fef9c3", color: "#713f12",  label: "Requested" },
  PO_ISSUED:  { bg: "#eff6ff", color: "#1e40af",  label: "Scheduled" },
  ISSUED:     { bg: "#dcfce7", color: "#166534",  label: "Deployed" },
};

type EquipRow = {
  id: string; grossQty: string; status: string; equipmentType: string | null;
  unitCode: string | null; unitModel: string | null; unitType: string | null;
  projId: string | null; projName: string | null;
};

export default async function MotorpoolNeedsPage() {
  const [rows, statusCounts] = await Promise.all([
    safe(
      db.select({
          id:            resourceForecasts.id,
          grossQty:      resourceForecasts.grossQuantity,
          status:        resourceForecasts.status,
          equipmentType: resourceForecasts.equipmentType,
          unitCode:      projectUnits.unitCode,
          unitModel:     projectUnits.unitModel,
          unitType:      projectUnits.unitType,
          projId:        projects.id,
          projName:      projects.name,
        })
        .from(resourceForecasts)
        .leftJoin(masterBomEntries, eq(resourceForecasts.masterBomEntryId, masterBomEntries.id))
        .leftJoin(projectUnits,     eq(resourceForecasts.unitId,           projectUnits.id))
        .leftJoin(projects,         eq(resourceForecasts.projectId,        projects.id))
        .where(eq(resourceForecasts.forecastType, "EQUIPMENT"))
        .orderBy(projects.name, projectUnits.unitCode),
      [] as EquipRow[],
    ),
    safe(
      db.select({ status: resourceForecasts.status, cnt: count() })
        .from(resourceForecasts)
        .where(eq(resourceForecasts.forecastType, "EQUIPMENT"))
        .groupBy(resourceForecasts.status),
      [] as { status: string; cnt: number }[],
    ),
  ]);

  const statusMap  = Object.fromEntries(statusCounts.map((r) => [r.status, Number(r.cnt)]));
  const pending    = statusMap["PENDING_PR"] ?? 0;
  const requested  = statusMap["PR_CREATED"] ?? 0;
  const scheduled  = statusMap["PO_ISSUED"]  ?? 0;
  const deployed   = statusMap["ISSUED"]     ?? 0;
  const uniqueTypes = new Set(rows.map((r) => r.equipmentType).filter(Boolean)).size;

  // Group by project
  type ProjectGroup = { projId: string; projName: string; rows: EquipRow[] };
  const projectMap = new Map<string, ProjectGroup>();
  for (const row of rows) {
    const pid = row.projId ?? "unknown";
    if (!projectMap.has(pid)) {
      projectMap.set(pid, { projId: pid, projName: row.projName ?? "Unknown Project", rows: [] });
    }
    projectMap.get(pid)!.rows.push(row);
  }

  const card: React.CSSProperties = { background: "#fff", borderRadius: "10px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" };
  const kpis = [
    { label: "Pending",   value: pending,   accent: "#dc2626" },
    { label: "Requested", value: requested, accent: "#e3a008" },
    { label: "Scheduled", value: scheduled, accent: "#1a56db" },
    { label: "Deployed",  value: deployed,  accent: "#057a55" },
  ];

  return (
    <main style={{ background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif", padding: "2rem" }}>
      <style>{`
        details.mp-group > summary { list-style: none; cursor: pointer; }
        details.mp-group > summary::-webkit-details-marker { display: none; }
        details.mp-group > summary .mp-chevron { transition: transform 0.2s; display: inline-block; }
        details.mp-group[open] > summary .mp-chevron { transform: rotate(180deg); }
      `}</style>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>

        {/* Header */}
        <div style={{ marginBottom: "1.5rem" }}>
          <p style={{ marginBottom: "0.25rem" }}>
            <a href="/planning" style={{ fontSize: "0.8rem", color: "#1a56db", textDecoration: "none" }}>← Planning &amp; Engineering</a>
          </p>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#111827", margin: 0 }}>Motorpool Needs</h1>
          <p style={{ fontSize: "0.875rem", color: "#6b7280", marginTop: "0.25rem", marginBottom: 0 }}>
            Equipment requirements from NTP-triggered BOM entries. Click <strong>Request Deployment</strong> to notify the Motorpool section.
          </p>
        </div>

        {/* Cross-dept flow callout */}
        <div style={{ background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: "8px", padding: "0.75rem 1rem", fontSize: "0.8rem", color: "#9a3412", marginBottom: "1.25rem", display: "flex", alignItems: "flex-start", gap: "0.5rem" }}>
          <span>🚛</span>
          <div>
            <strong>Flow:</strong> BOM entry with Equipment Type → NTP issued → Equipment forecast generated here →
            <strong> Request Deployment</strong> → Motorpool schedules and dispatches → marks Deployed.
            {uniqueTypes > 0 && <span> · {uniqueTypes} equipment type{uniqueTypes !== 1 ? "s" : ""} needed.</span>}
          </div>
        </div>

        {/* KPI Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem", marginBottom: "1.5rem" }}>
          {kpis.map((kpi) => (
            <div key={kpi.label} style={{ ...card, padding: "1.25rem 1.5rem", borderTop: `3px solid ${kpi.accent}` }}>
              <div style={{ fontSize: "2rem", fontWeight: 700, color: "#111827", lineHeight: 1 }}>{kpi.value.toLocaleString()}</div>
              <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "#111827", marginTop: "0.3rem" }}>{kpi.label}</div>
              <div style={{ fontSize: "0.72rem", color: "#9ca3af", marginTop: "0.2rem" }}>equipment lines</div>
            </div>
          ))}
        </div>

        {projectMap.size === 0 ? (
          <div style={{ ...card, padding: "3rem", textAlign: "center" }}>
            <p style={{ color: "#6b7280", fontSize: "0.875rem", marginBottom: "0.5rem" }}>No equipment needs yet.</p>
            <p style={{ color: "#9ca3af", fontSize: "0.78rem" }}>Add an Equipment Type to BOM lines, then issue NTPs to generate equipment forecasts.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {Array.from(projectMap.values()).map((proj) => {
              const projPending = proj.rows.filter((r) => r.status === "PENDING_PR").length;
              const projDeployed = proj.rows.filter((r) => r.status === "ISSUED").length;
              return (
                <details key={proj.projId} className="mp-group" open style={{ ...card, overflow: "hidden" }}>
                  <summary>
                    <div style={{ padding: "0.75rem 1.25rem", background: "#f9fafb", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
                      <span className="mp-chevron" style={{ color: "#9ca3af", fontSize: "0.8rem" }}>▾</span>
                      <span style={{ fontWeight: 700, color: "#111827" }}>{proj.projName}</span>
                      <span style={{ fontSize: "0.75rem", color: "#9ca3af" }}>{proj.rows.length} line{proj.rows.length !== 1 ? "s" : ""}</span>
                      {projPending > 0 && (
                        <span style={{ fontSize: "0.72rem", background: "#fef2f2", color: "#b91c1c", padding: "0.2rem 0.55rem", borderRadius: "999px", fontWeight: 600 }}>
                          {projPending} pending request
                        </span>
                      )}
                      {projDeployed > 0 && (
                        <span style={{ fontSize: "0.72rem", background: "#dcfce7", color: "#166534", padding: "0.2rem 0.55rem", borderRadius: "999px", fontWeight: 600 }}>
                          {projDeployed} deployed
                        </span>
                      )}
                    </div>
                  </summary>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
                      <thead>
                        <tr>
                          {["Unit Code", "Model / Type", "Equipment Type", "Qty", "Status", "Action"].map((h) => (
                            <th key={h} style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb", fontSize: "0.75rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", padding: "0.75rem 1rem", textAlign: "left", whiteSpace: "nowrap" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {proj.rows.map((row) => {
                          const s = STATUS_BADGE[row.status] ?? { bg: "#f3f4f6", color: "#6b7280", label: row.status };
                          return (
                            <tr key={row.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                              <td style={{ padding: "0.65rem 1rem", fontFamily: "monospace", fontSize: "0.78rem", color: "#374151", fontWeight: 600 }}>{row.unitCode ?? "—"}</td>
                              <td style={{ padding: "0.65rem 1rem", whiteSpace: "nowrap" }}>
                                <span style={{ color: "#374151", fontSize: "0.82rem" }}>{row.unitModel ?? "—"}</span>
                                {row.unitType && (
                                  <span style={{ marginLeft: "0.4rem", fontSize: "0.72rem", background: "#eff6ff", color: "#1e40af", padding: "0.15rem 0.4rem", borderRadius: "4px", fontWeight: 600 }}>{row.unitType}</span>
                                )}
                              </td>
                              <td style={{ padding: "0.65rem 1rem", color: "#111827", fontWeight: 600 }}>
                                <span style={{ background: "#fff7ed", color: "#9a3412", padding: "0.2rem 0.5rem", borderRadius: "4px", fontSize: "0.78rem", fontFamily: "monospace" }}>
                                  {row.equipmentType ?? "—"}
                                </span>
                              </td>
                              <td style={{ padding: "0.65rem 1rem", fontFamily: "monospace", color: "#374151", fontSize: "0.82rem" }}>
                                {Number(row.grossQty).toLocaleString("en-PH", { maximumFractionDigits: 2 })}
                              </td>
                              <td style={{ padding: "0.65rem 1rem" }}>
                                <span style={{ display: "inline-block", padding: "0.2rem 0.55rem", borderRadius: "999px", fontSize: "0.72rem", fontWeight: 600, background: s.bg, color: s.color }}>
                                  {s.label}
                                </span>
                              </td>
                              <td style={{ padding: "0.65rem 1rem" }}>
                                {row.status === "PENDING_PR" ? (
                                  <RequestDeploymentButton forecastId={row.id} />
                                ) : row.status === "ISSUED" ? (
                                  <span style={{ color: "#9ca3af", fontSize: "0.78rem" }}>Deployed ✓</span>
                                ) : (
                                  <a href="/motorpool" style={{ color: "#1a56db", textDecoration: "none", fontWeight: 600, fontSize: "0.78rem" }}>View in Motorpool →</a>
                                )}
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
