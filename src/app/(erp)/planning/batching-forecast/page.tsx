export const dynamic = "force-dynamic";
import { db } from "@/db";
import {
  resourceForecasts, masterBomEntries, materials, projectUnits, projects,
} from "@/db/schema";
import { eq, desc } from "drizzle-orm";

function safe<T>(p: Promise<T>, fallback: T, ms = 6000): Promise<T> {
  return Promise.race([
    p.catch(() => fallback),
    new Promise<T>((r) => setTimeout(() => r(fallback), ms)),
  ]);
}

const STATUS_BADGE: Record<string, { bg: string; color: string; label: string }> = {
  PENDING_PR: { bg: "#fef2f2", color: "#b91c1c",  label: "Pending PR" },
  PR_CREATED: { bg: "#fef9c3", color: "#713f12",  label: "PR Created" },
  PO_ISSUED:  { bg: "#eff6ff", color: "#1e40af",  label: "PO Issued" },
  ISSUED:     { bg: "#dcfce7", color: "#166534",  label: "Issued" },
};

export default async function BatchingForecastPage() {
  const rows = await safe(
    db.select({
      id:           resourceForecasts.id,
      grossQty:     resourceForecasts.grossQuantity,
      consumed:     resourceForecasts.quantityConsumed,
      status:       resourceForecasts.status,
      unitCode:     projectUnits.unitCode,
      unitModel:    projectUnits.unitModel,
      matName:      materials.name,
      matUnit:      materials.unit,
      projectName:  projects.name,
    })
      .from(resourceForecasts)
      .leftJoin(masterBomEntries, eq(resourceForecasts.masterBomEntryId, masterBomEntries.id))
      .leftJoin(materials,        eq(masterBomEntries.materialId,        materials.id))
      .leftJoin(projectUnits,     eq(resourceForecasts.unitId,           projectUnits.id))
      .leftJoin(projects,         eq(resourceForecasts.projectId,        projects.id))
      .where(eq(resourceForecasts.forecastType, "CONCRETE"))
      .orderBy(desc(resourceForecasts.createdAt)),
    [] as {
      id: string; grossQty: string; consumed: string; status: string;
      unitCode: string | null; unitModel: string | null; matName: string | null; matUnit: string | null; projectName: string | null;
    }[],
  );

  const totalGross   = rows.reduce((a, r) => a + Number(r.grossQty), 0);
  const totalIssued  = rows.filter((r) => r.status === "ISSUED").reduce((a, r) => a + Number(r.grossQty), 0);
  const totalPending = rows.filter((r) => r.status === "PENDING_PR").length;

  const card: React.CSSProperties = {
    background: "#fff", borderRadius: "10px", padding: "1.25rem 1.5rem",
    boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
  };

  const kpis = [
    { label: "Total Lines",    value: rows.length,                                                                           sub: "concrete forecast lines", accent: "#e3a008" },
    { label: "Total Volume",   value: totalGross.toLocaleString("en-PH", { maximumFractionDigits: 2 }),                      sub: "gross units",             accent: "#0694a2" },
    { label: "Issued Volume",  value: totalIssued.toLocaleString("en-PH", { maximumFractionDigits: 2 }),                     sub: "units issued",            accent: "#057a55" },
    { label: "Pending PR",     value: totalPending,                                                                           sub: "awaiting procurement",    accent: "#dc2626" },
  ];

  return (
    <main style={{ background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif", padding: "2rem" }}>
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
          Concrete forecasts are auto-generated when a project unit status is set to <strong>NTP_ISSUED</strong>.
          Materials with category <strong>CONCRETE</strong> in the approved Master BOM trigger these forecast lines.
          Production planning is managed in the Batching Plant section.
        </div>

        {/* Table */}
        <div style={{ background: "#fff", borderRadius: "10px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden" }}>
          <div style={{ padding: "1rem 1.5rem", borderBottom: "1px solid #e5e7eb" }}>
            <p style={{ fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "#9ca3af", margin: 0 }}>
              Concrete Forecast Lines
            </p>
          </div>
          {rows.length === 0 ? (
            <div style={{ padding: "3rem", textAlign: "center", color: "#6b7280", fontSize: "0.875rem" }}>
              No concrete forecast lines yet. Approve BOM entries with concrete materials, then issue NTPs to generate forecasts.
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
                <thead>
                  <tr>
                    {["Project", "Unit Code", "Concrete Mix / Material", "Unit", "Gross Volume", "Consumed", "Remaining", "Status"].map((h) => (
                      <th key={h} style={{
                        background: "#f9fafb", borderBottom: "1px solid #e5e7eb",
                        fontSize: "0.75rem", fontWeight: 600, color: "#6b7280",
                        textTransform: "uppercase", letterSpacing: "0.05em",
                        padding: "0.75rem 1rem", textAlign: "left", whiteSpace: "nowrap",
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const gross     = Number(row.grossQty);
                    const consumed  = Number(row.consumed);
                    const remaining = gross - consumed;
                    const s = STATUS_BADGE[row.status] ?? { bg: "#f3f4f6", color: "#6b7280", label: row.status };
                    return (
                      <tr key={row.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                        <td style={{ padding: "0.65rem 1rem", color: "#374151" }}>{row.projectName ?? "—"}</td>
                        <td style={{ padding: "0.65rem 1rem", fontFamily: "monospace", fontSize: "0.78rem", color: "#374151", fontWeight: 600 }}>{row.unitCode ?? "—"}</td>
                        <td style={{ padding: "0.65rem 1rem", color: "#111827", fontWeight: 600 }}>{row.matName ?? "—"}</td>
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
          )}
        </div>
      </div>
    </main>
  );
}
