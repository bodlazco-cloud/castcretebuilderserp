export const dynamic = "force-dynamic";

import { db } from "@/db";
import { batchingInternalSales, projects, projectUnits } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

function safe<T>(p: Promise<T>, fallback: T, ms = 6000): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

export default async function InternalSalesPage() {
  const rows = await safe(
    db
      .select({
        id: batchingInternalSales.id,
        transactionDate: batchingInternalSales.transactionDate,
        volumeM3: batchingInternalSales.volumeM3,
        internalRatePerM3: batchingInternalSales.internalRatePerM3,
        totalInternalRevenue: batchingInternalSales.totalInternalRevenue,
        projectName: projects.name,
        projectId: batchingInternalSales.projectId,
        unitCode: projectUnits.unitCode,
        unitModel: projectUnits.unitModel,
      })
      .from(batchingInternalSales)
      .leftJoin(projects, eq(batchingInternalSales.projectId, projects.id))
      .leftJoin(projectUnits, eq(batchingInternalSales.unitId, projectUnits.id))
      .orderBy(desc(batchingInternalSales.transactionDate))
      .limit(200),
    []
  );

  const totalRevenue = rows.reduce((sum, r) => sum + Number(r.totalInternalRevenue ?? 0), 0);
  const totalVolume = rows.reduce((sum, r) => sum + Number(r.volumeM3), 0);

  const projectMap = new Map<string, { projectName: string; rows: typeof rows; projectTotal: number }>();
  for (const row of rows) {
    const key = row.projectId;
    if (!projectMap.has(key)) {
      projectMap.set(key, { projectName: row.projectName ?? "Unknown Project", rows: [], projectTotal: 0 });
    }
    const entry = projectMap.get(key)!;
    entry.rows.push(row);
    entry.projectTotal += Number(row.totalInternalRevenue ?? 0);
  }

  function formatDate(d: string | null): string {
    if (!d) return "—";
    const dt = new Date(d + "T00:00:00");
    return dt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  const ACCENT = "#0e9f6e";

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <style>{`
        details > summary { list-style: none; cursor: pointer; }
        details > summary::-webkit-details-marker { display: none; }
        details > summary .chevron { display: inline-block; transition: transform 0.2s ease; margin-right: 0.5rem; }
        details[open] > summary .chevron { transform: rotate(90deg); }
      `}</style>

      <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href="/batching" style={{ fontSize: "0.8rem", color: ACCENT, textDecoration: "none", fontWeight: 500 }}>
            ← Batching
          </a>
        </div>

        <h1 style={{ margin: "0 0 0.3rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827", borderLeft: `4px solid ${ACCENT}`, paddingLeft: "0.75rem" }}>
          Internal Sales
        </h1>
        <p style={{ margin: "0 0 1.75rem 1rem", color: "#6b7280", fontSize: "0.9rem" }}>
          Concrete billed from the batching plant to internal construction units.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", marginBottom: "2rem" }}>
          <div style={{ background: "#fff", borderRadius: "8px", padding: "1.25rem 1.5rem", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", borderTop: `3px solid ${ACCENT}` }}>
            <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#111" }}>{rows.length}</div>
            <div style={{ fontSize: "0.8rem", color: "#6b7280", marginTop: "0.25rem" }}>Total Transactions</div>
          </div>
          <div style={{ background: "#fff", borderRadius: "8px", padding: "1.25rem 1.5rem", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", borderTop: "3px solid #1a56db" }}>
            <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#111" }}>{totalVolume.toFixed(2)} m³</div>
            <div style={{ fontSize: "0.8rem", color: "#6b7280", marginTop: "0.25rem" }}>Total Volume</div>
          </div>
          <div style={{ background: "#fff", borderRadius: "8px", padding: "1.25rem 1.5rem", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", borderTop: "3px solid #7e3af2" }}>
            <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#111" }}>
              ₱{totalRevenue.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
            </div>
            <div style={{ fontSize: "0.8rem", color: "#6b7280", marginTop: "0.25rem" }}>Total Revenue</div>
          </div>
        </div>

        {rows.length === 0 ? (
          <div style={{ background: "#fff", borderRadius: "8px", padding: "3rem", textAlign: "center", color: "#9ca3af", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
            No internal sales recorded yet.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {Array.from(projectMap.entries()).map(([projectId, group]) => (
              <details key={projectId} style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden" }}>
                <summary style={{
                  padding: "1rem 1.25rem",
                  borderBottom: "1px solid #e5e7eb",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  fontWeight: 600,
                  fontSize: "0.92rem",
                  color: "#111827",
                  userSelect: "none",
                }}>
                  <span className="chevron" style={{ color: ACCENT, fontSize: "0.8rem" }}>▶</span>
                  <span style={{ flex: 1 }}>{group.projectName}</span>
                  <span style={{ fontSize: "0.8rem", fontWeight: 400, color: "#6b7280" }}>
                    {group.rows.length} transaction{group.rows.length !== 1 ? "s" : ""}
                  </span>
                  <span style={{ fontSize: "0.8rem", fontWeight: 400, color: "#6b7280", margin: "0 0.5rem" }}>·</span>
                  <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#7e3af2" }}>
                    ₱{group.projectTotal.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                  </span>
                  <span style={{ fontSize: "0.8rem", fontWeight: 400, color: "#6b7280", margin: "0 0.5rem" }}>·</span>
                  <span style={{ fontSize: "0.85rem", fontWeight: 500, color: "#1a56db" }}>
                    {group.rows.reduce((s, r) => s + Number(r.volumeM3), 0).toFixed(2)} m³
                  </span>
                </summary>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
                    <thead>
                      <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                        {["Date", "Unit", "Volume (m³)", "Rate (₱/m³)", "Revenue"].map((h) => (
                          <th key={h} style={{ padding: "0.65rem 1rem", textAlign: "left", fontWeight: 600, color: "#374151", whiteSpace: "nowrap" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {group.rows.map((row, i) => (
                        <tr key={row.id} style={{ borderBottom: "1px solid #f3f4f6", background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                          <td style={{ padding: "0.65rem 1rem", whiteSpace: "nowrap", color: "#374151" }}>
                            {formatDate(row.transactionDate)}
                          </td>
                          <td style={{ padding: "0.65rem 1rem", whiteSpace: "nowrap", color: "#374151" }}>
                            {row.unitCode && row.unitModel
                              ? `${row.unitCode} · ${row.unitModel}`
                              : row.unitCode ?? "—"}
                          </td>
                          <td style={{ padding: "0.65rem 1rem", whiteSpace: "nowrap", color: "#374151" }}>
                            {Number(row.volumeM3).toFixed(2)} m³
                          </td>
                          <td style={{ padding: "0.65rem 1rem", whiteSpace: "nowrap", color: "#374151" }}>
                            ₱{Number(row.internalRatePerM3).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                          </td>
                          <td style={{ padding: "0.65rem 1rem", whiteSpace: "nowrap", fontWeight: 700, color: "#111827" }}>
                            ₱{Number(row.totalInternalRevenue ?? 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
