export const dynamic = "force-dynamic";

import { db } from "@/db";
import {
  resourceForecasts, masterBomEntries, materials, projectUnits, projects, standardMixes, mixDesigns,
} from "@/db/schema";
import { eq, desc, count } from "drizzle-orm";

function safe<T>(p: Promise<T>, fallback: T, ms = 6000): Promise<T> {
  return Promise.race([
    p.catch(() => fallback),
    new Promise<T>((r) => setTimeout(() => r(fallback), ms)),
  ]);
}

const STATUS_BADGE: Record<string, { bg: string; color: string; label: string }> = {
  PENDING_PR: { bg: "#fef2f2", color: "#b91c1c",  label: "Pending" },
  PR_CREATED: { bg: "#fef9c3", color: "#713f12",  label: "PR Created" },
  PO_ISSUED:  { bg: "#eff6ff", color: "#1e40af",  label: "PO Issued" },
  ISSUED:     { bg: "#dcfce7", color: "#166534",  label: "Issued" },
};

type ForecastRow = {
  id: string;
  grossQty: string;
  consumed: string;
  status: string;
  unitCode: string | null;
  unitModel: string | null;
  unitType: string | null;
  matName: string | null;
  matUnit: string | null;
  projectId: string | null;
  projectName: string | null;
  mixCode: string | null;
  mixName: string | null;
  volumePerUnitM3: string | null;
};

export default async function BatchingForecastPage() {
  const [rows, standardMixRows, statusCounts] = await Promise.all([
    safe(
      db.select({
        id:           resourceForecasts.id,
        grossQty:     resourceForecasts.grossQuantity,
        consumed:     resourceForecasts.quantityConsumed,
        status:       resourceForecasts.status,
        unitCode:     projectUnits.unitCode,
        unitModel:    projectUnits.unitModel,
        unitType:     projectUnits.unitType,
        matName:      materials.name,
        matUnit:      materials.unit,
        projectId:    projects.id,
        projectName:  projects.name,
        mixCode:      mixDesigns.code,
        mixName:      mixDesigns.name,
        volumePerUnitM3: standardMixes.volumePerUnitM3,
      })
        .from(resourceForecasts)
        .leftJoin(masterBomEntries, eq(resourceForecasts.masterBomEntryId, masterBomEntries.id))
        .leftJoin(materials,        eq(masterBomEntries.materialId,        materials.id))
        .leftJoin(projectUnits,     eq(resourceForecasts.unitId,           projectUnits.id))
        .leftJoin(projects,         eq(resourceForecasts.projectId,        projects.id))
        .leftJoin(
          standardMixes,
          eq(standardMixes.projectId, resourceForecasts.projectId),
        )
        .leftJoin(mixDesigns, eq(standardMixes.mixDesignId, mixDesigns.id))
        .where(eq(resourceForecasts.forecastType, "CONCRETE"))
        .orderBy(projects.name, desc(resourceForecasts.createdAt)),
      [] as ForecastRow[],
    ),
    safe(
      db.select({
        projectId:       standardMixes.projectId,
        unitModel:       standardMixes.unitModel,
        unitType:        standardMixes.unitType,
        volumePerUnitM3: standardMixes.volumePerUnitM3,
        mixCode:         mixDesigns.code,
        mixName:         mixDesigns.name,
      })
        .from(standardMixes)
        .leftJoin(mixDesigns, eq(standardMixes.mixDesignId, mixDesigns.id))
        .where(eq(standardMixes.isActive, true)),
      [] as { projectId: string; unitModel: string | null; unitType: string; volumePerUnitM3: string | null; mixCode: string | null; mixName: string | null }[],
    ),
    safe(
      db.select({ status: resourceForecasts.status, cnt: count() })
        .from(resourceForecasts)
        .where(eq(resourceForecasts.forecastType, "CONCRETE"))
        .groupBy(resourceForecasts.status),
      [] as { status: string; cnt: number }[],
    ),
  ]);

  const totalGross   = rows.reduce((a, r) => a + Number(r.grossQty), 0);
  const totalIssued  = rows.filter((r) => r.status === "ISSUED").reduce((a, r) => a + Number(r.grossQty), 0);
  const totalPending = rows.filter((r) => r.status === "PENDING_PR").length;
  const totalPrCreated = rows.filter((r) => r.status === "PR_CREATED").length;

  // Group by project
  type ProjectGroup = { projectId: string; projectName: string; rows: ForecastRow[] };
  const projectMap = new Map<string, ProjectGroup>();
  for (const row of rows) {
    const pid = row.projectId ?? "unknown";
    if (!projectMap.has(pid)) {
      projectMap.set(pid, { projectId: pid, projectName: row.projectName ?? "Unknown Project", rows: [] });
    }
    projectMap.get(pid)!.rows.push(row);
  }

  const card: React.CSSProperties = {
    background: "#fff", borderRadius: "10px", padding: "1.25rem 1.5rem",
    boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
  };

  const kpis = [
    { label: "Total Volume",  value: totalGross.toLocaleString("en-PH", { maximumFractionDigits: 2 }),       sub: "gross m³ / units", accent: "#0694a2" },
    { label: "Pending",       value: totalPending,                                                             sub: "awaiting PR",      accent: "#dc2626" },
    { label: "PR Created",    value: totalPrCreated,                                                           sub: "procurement queue", accent: "#e3a008" },
    { label: "Issued",        value: totalIssued.toLocaleString("en-PH", { maximumFractionDigits: 2 }),       sub: "units fulfilled",  accent: "#057a55" },
  ];

  return (
    <main style={{ background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif", padding: "2rem" }}>
      <style>{`
        details.bf-group > summary { list-style: none; cursor: pointer; }
        details.bf-group > summary::-webkit-details-marker { display: none; }
        details.bf-group > summary .bf-chevron { transition: transform 0.2s; display: inline-block; }
        details.bf-group[open] > summary .bf-chevron { transform: rotate(180deg); }
      `}</style>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>

        {/* Header */}
        <div style={{ marginBottom: "1.5rem" }}>
          <p style={{ marginBottom: "0.25rem" }}>
            <a href="/planning" style={{ fontSize: "0.8rem", color: "#1a56db", textDecoration: "none" }}>
              ← Planning &amp; Engineering
            </a>
          </p>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#111827", margin: 0 }}>Batching Forecast</h1>
          <p style={{ fontSize: "0.875rem", color: "#6b7280", marginTop: "0.25rem", marginBottom: 0 }}>
            Concrete volume requirements derived from NTP-triggered BOM entries
          </p>
        </div>

        {/* KPI Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem", marginBottom: "1.5rem" }}>
          {kpis.map((kpi) => (
            <div key={kpi.label} style={{ ...card, borderTop: `3px solid ${kpi.accent}` }}>
              <div style={{ fontSize: "2rem", fontWeight: 700, color: "#111827", lineHeight: 1 }}>
                {typeof kpi.value === "number" ? kpi.value.toLocaleString() : kpi.value}
              </div>
              <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "#111827", marginTop: "0.3rem" }}>{kpi.label}</div>
              <div style={{ fontSize: "0.72rem", color: "#9ca3af", marginTop: "0.2rem" }}>{kpi.sub}</div>
            </div>
          ))}
        </div>

        {/* Info callout */}
        <div style={{ background: "#ecfdf5", border: "1px solid #a7f3d0", borderRadius: "8px", padding: "0.75rem 1rem", fontSize: "0.8rem", color: "#065f46", marginBottom: "1.25rem" }}>
          <strong>Flow:</strong> Concrete forecasts auto-generate when NTP is issued for a unit with approved BOM entries containing <em>CONCRETE</em>-category materials.
          The Batching Plant section manages production scheduling, delivery notes, and yield variance.
          {standardMixRows.length > 0 && (
            <span> · {standardMixRows.length} standard mix design{standardMixRows.length !== 1 ? "s" : ""} registered.</span>
          )}
        </div>

        {/* Standard Mixes Summary (if any) */}
        {standardMixRows.length > 0 && (
          <details className="bf-group" open style={{ ...card, marginBottom: "1rem", overflow: "hidden", padding: 0 }}>
            <summary>
              <div style={{ padding: "0.75rem 1.25rem", background: "#f9fafb", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <span className="bf-chevron" style={{ color: "#9ca3af", fontSize: "0.8rem" }}>▾</span>
                <span style={{ fontWeight: 700, color: "#111827", fontSize: "0.875rem" }}>Standard Mix Designs</span>
                <span style={{ fontSize: "0.75rem", color: "#9ca3af" }}>{standardMixRows.length} registered</span>
                <span style={{ fontSize: "0.72rem", background: "#d1fae5", color: "#065f46", padding: "0.15rem 0.5rem", borderRadius: "999px", fontWeight: 600 }}>Reference</span>
              </div>
            </summary>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
                <thead>
                  <tr>
                    {["Mix Code", "Mix Name", "Unit Model", "Type", "Volume / Unit (m³)"].map((h) => (
                      <th key={h} style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb", fontSize: "0.75rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", padding: "0.65rem 1rem", textAlign: "left", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {standardMixRows.map((mx, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid #f3f4f6" }}>
                      <td style={{ padding: "0.55rem 1rem", fontFamily: "monospace", fontSize: "0.78rem", color: "#1e40af", fontWeight: 600 }}>{mx.mixCode ?? "—"}</td>
                      <td style={{ padding: "0.55rem 1rem", color: "#374151" }}>{mx.mixName ?? "—"}</td>
                      <td style={{ padding: "0.55rem 1rem", fontFamily: "monospace", fontSize: "0.8rem", color: "#374151" }}>{mx.unitModel ?? "—"}</td>
                      <td style={{ padding: "0.55rem 1rem" }}>
                        {mx.unitType && (
                          <span style={{ fontSize: "0.72rem", background: "#eff6ff", color: "#1e40af", padding: "0.15rem 0.4rem", borderRadius: "4px", fontWeight: 600 }}>{mx.unitType}</span>
                        )}
                      </td>
                      <td style={{ padding: "0.55rem 1rem", fontFamily: "monospace", color: "#374151", fontWeight: 600 }}>
                        {mx.volumePerUnitM3 ? Number(mx.volumePerUnitM3).toLocaleString("en-PH", { maximumFractionDigits: 4 }) : <span style={{ color: "#9ca3af" }}>—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        )}

        {/* Forecast lines grouped by project */}
        {projectMap.size === 0 ? (
          <div style={{ ...card, padding: "3rem", textAlign: "center" }}>
            <p style={{ color: "#6b7280", fontSize: "0.875rem", marginBottom: "0.5rem" }}>No concrete forecast lines yet.</p>
            <p style={{ color: "#9ca3af", fontSize: "0.78rem" }}>Approve BOM entries with concrete materials, then issue NTPs to generate forecasts.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {Array.from(projectMap.values()).map((proj) => {
              const projGross   = proj.rows.reduce((a, r) => a + Number(r.grossQty), 0);
              const projIssued  = proj.rows.filter((r) => r.status === "ISSUED").reduce((a, r) => a + Number(r.grossQty), 0);
              const projPending = proj.rows.filter((r) => r.status === "PENDING_PR").length;
              const pct = projGross > 0 ? Math.round((projIssued / projGross) * 100) : 0;

              return (
                <details key={proj.projectId} className="bf-group" open style={{ background: "#fff", borderRadius: "10px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden" }}>
                  <summary>
                    <div style={{ padding: "0.75rem 1.25rem", background: "#f9fafb", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
                      <span className="bf-chevron" style={{ color: "#9ca3af", fontSize: "0.8rem" }}>▾</span>
                      <span style={{ fontWeight: 700, color: "#111827" }}>{proj.projectName}</span>
                      <span style={{ fontSize: "0.78rem", color: "#374151", fontFamily: "monospace" }}>
                        {projGross.toLocaleString("en-PH", { maximumFractionDigits: 2 })} total
                      </span>
                      <span style={{ fontSize: "0.72rem", background: "#d1fae5", color: "#065f46", padding: "0.15rem 0.5rem", borderRadius: "999px", fontWeight: 600 }}>
                        {pct}% fulfilled
                      </span>
                      {projPending > 0 && (
                        <span style={{ fontSize: "0.72rem", background: "#fef2f2", color: "#b91c1c", padding: "0.2rem 0.55rem", borderRadius: "999px", fontWeight: 600 }}>
                          {projPending} pending
                        </span>
                      )}
                    </div>
                  </summary>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
                      <thead>
                        <tr>
                          {["Unit Code", "Model / Type", "Concrete Mix / Material", "Unit", "Gross Volume", "Consumed", "Remaining", "Status"].map((h) => (
                            <th key={h} style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb", fontSize: "0.75rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", padding: "0.75rem 1rem", textAlign: "left", whiteSpace: "nowrap" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {proj.rows.map((row) => {
                          const gross     = Number(row.grossQty);
                          const consumed  = Number(row.consumed);
                          const remaining = gross - consumed;
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
                                {row.mixCode && (
                                  <span style={{ fontFamily: "monospace", fontSize: "0.72rem", background: "#ecfdf5", color: "#065f46", padding: "0.15rem 0.4rem", borderRadius: "4px", marginRight: "0.35rem", fontWeight: 600 }}>
                                    {row.mixCode}
                                  </span>
                                )}
                                {row.matName ?? "—"}
                              </td>
                              <td style={{ padding: "0.65rem 1rem", color: "#6b7280", fontSize: "0.82rem" }}>{row.matUnit ?? "—"}</td>
                              <td style={{ padding: "0.65rem 1rem", fontFamily: "monospace", color: "#374151", fontWeight: 600 }}>{gross.toLocaleString("en-PH", { maximumFractionDigits: 4 })}</td>
                              <td style={{ padding: "0.65rem 1rem", fontFamily: "monospace", color: "#9ca3af" }}>{consumed.toLocaleString("en-PH", { maximumFractionDigits: 4 })}</td>
                              <td style={{ padding: "0.65rem 1rem", fontFamily: "monospace", fontWeight: 600, color: remaining <= 0 ? "#057a55" : "#111827" }}>
                                {remaining.toLocaleString("en-PH", { maximumFractionDigits: 4 })}
                              </td>
                              <td style={{ padding: "0.65rem 1rem" }}>
                                <span style={{ display: "inline-block", padding: "0.2rem 0.55rem", borderRadius: "999px", fontSize: "0.72rem", fontWeight: 600, background: s.bg, color: s.color }}>
                                  {s.label}
                                </span>
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
