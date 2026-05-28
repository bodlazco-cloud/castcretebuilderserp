export const dynamic = "force-dynamic";
import { db } from "@/db";
import {
  resourceForecasts, masterBomEntries, projectUnits, projects,
} from "@/db/schema";
import { eq, desc } from "drizzle-orm";

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
  ISSUED:     { bg: "#dcfce7", color: "#166534",  label: "Deployed" },
};

export default async function MotorpoolNeedsPage() {
  const rows = await safe(
    db.select({
      id:            resourceForecasts.id,
      grossQty:      resourceForecasts.grossQuantity,
      status:        resourceForecasts.status,
      equipmentType: resourceForecasts.equipmentType,
      unitCode:      projectUnits.unitCode,
      unitModel:     projectUnits.unitModel,
      projectName:   projects.name,
    })
      .from(resourceForecasts)
      .leftJoin(masterBomEntries, eq(resourceForecasts.masterBomEntryId, masterBomEntries.id))
      .leftJoin(projectUnits,     eq(resourceForecasts.unitId,           projectUnits.id))
      .leftJoin(projects,         eq(resourceForecasts.projectId,        projects.id))
      .where(eq(resourceForecasts.forecastType, "EQUIPMENT"))
      .orderBy(desc(resourceForecasts.createdAt)),
    [] as {
      id: string; grossQty: string; status: string; equipmentType: string | null;
      unitCode: string | null; unitModel: string | null; projectName: string | null;
    }[],
  );

  const totalNeeded          = rows.length;
  const totalPending         = rows.filter((r) => r.status === "PENDING_PR").length;
  const uniqueEquipmentTypes = new Set(rows.map((r) => r.equipmentType).filter(Boolean)).size;

  const card: React.CSSProperties = {
    background: "#fff", borderRadius: "10px", padding: "1.25rem 1.5rem",
    boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
  };

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
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#111827", margin: 0 }}>Motorpool Needs</h1>
          <p style={{ fontSize: "0.875rem", color: "#6b7280", marginTop: "0.25rem", marginBottom: 0 }}>
            Equipment requirements from NTP-triggered BOM entries
          </p>
        </div>

        {/* KPI Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", marginBottom: "1.5rem" }}>
          {[
            { label: "Equipment Lines",    value: totalNeeded,          sub: "total demand lines",   accent: "#0694a2" },
            { label: "Pending Deployment", value: totalPending,         sub: "awaiting deployment",  accent: "#dc2626" },
            { label: "Equipment Types",    value: uniqueEquipmentTypes, sub: "distinct types needed", accent: "#7e3af2" },
          ].map((kpi) => (
            <div key={kpi.label} style={{ ...card, borderTop: `3px solid ${kpi.accent}` }}>
              <div style={{ fontSize: "2rem", fontWeight: 700, color: "#111827", lineHeight: 1 }}>
                {kpi.value.toLocaleString()}
              </div>
              <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "#111827", marginTop: "0.3rem" }}>{kpi.label}</div>
              <div style={{ fontSize: "0.72rem", color: "#9ca3af", marginTop: "0.2rem" }}>{kpi.sub}</div>
            </div>
          ))}
        </div>

        {/* Info callout */}
        <div style={{ background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: "8px", padding: "0.75rem 1rem", fontSize: "0.8rem", color: "#9a3412", marginBottom: "1.25rem" }}>
          Equipment needs are derived from BOM entries that have an <strong>Equipment Type</strong> specified.
          These are auto-generated when a project unit is NTP-issued.
          Equipment scheduling and deployment is managed in the Motorpool section.
        </div>

        {/* Table */}
        <div style={{ background: "#fff", borderRadius: "10px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden" }}>
          <div style={{ padding: "1rem 1.5rem", borderBottom: "1px solid #e5e7eb" }}>
            <p style={{ fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "#9ca3af", margin: 0 }}>
              Equipment Forecast Lines
            </p>
          </div>
          {rows.length === 0 ? (
            <div style={{ padding: "3rem", textAlign: "center", color: "#6b7280", fontSize: "0.875rem" }}>
              No equipment needs yet. Add equipment types to approved BOM entries, then issue NTPs to generate these lines.
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
                <thead>
                  <tr>
                    {["Project", "Unit Code", "Unit Model", "Equipment Type", "Qty", "Status"].map((h) => (
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
                    const s = STATUS_BADGE[row.status] ?? { bg: "#f3f4f6", color: "#6b7280", label: row.status };
                    return (
                      <tr key={row.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                        <td style={{ padding: "0.65rem 1rem", color: "#374151" }}>{row.projectName ?? "—"}</td>
                        <td style={{ padding: "0.65rem 1rem", fontFamily: "monospace", fontSize: "0.78rem", color: "#374151", fontWeight: 600 }}>{row.unitCode ?? "—"}</td>
                        <td style={{ padding: "0.65rem 1rem", color: "#6b7280" }}>{row.unitModel ?? "—"}</td>
                        <td style={{ padding: "0.65rem 1rem", color: "#111827", fontWeight: 600 }}>{row.equipmentType ?? "—"}</td>
                        <td style={{ padding: "0.65rem 1rem", fontFamily: "monospace", color: "#374151" }}>{Number(row.grossQty).toLocaleString("en-PH", { maximumFractionDigits: 2 })}</td>
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
