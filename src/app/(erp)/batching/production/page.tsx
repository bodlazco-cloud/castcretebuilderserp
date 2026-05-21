export const dynamic = "force-dynamic";

import { db } from "@/db";
import { batchingProductionLogs, mixDesigns, projects } from "@/db/schema";
import { eq, desc, sum, count, avg } from "drizzle-orm";

const ACCENT = "#7c3aed";

export default async function BatchingProductionPage() {
  const [logs, kpiRows] = await Promise.all([
    db
      .select({
        id:                  batchingProductionLogs.id,
        batchDate:           batchingProductionLogs.batchDate,
        shift:               batchingProductionLogs.shift,
        cementUsedBags:      batchingProductionLogs.cementUsedBags,
        sandUsedKg:          batchingProductionLogs.sandUsedKg,
        gravelUsedKg:        batchingProductionLogs.gravelUsedKg,
        volumeProducedM3:    batchingProductionLogs.volumeProducedM3,
        theoreticalYieldM3:  batchingProductionLogs.theoreticalYieldM3,
        yieldVariancePct:    batchingProductionLogs.yieldVariancePct,
        isProductionFlagged: batchingProductionLogs.isProductionFlagged,
        flagReason:          batchingProductionLogs.flagReason,
        mixCode:             mixDesigns.code,
        mixName:             mixDesigns.name,
        projName:            projects.name,
      })
      .from(batchingProductionLogs)
      .leftJoin(mixDesigns, eq(batchingProductionLogs.mixDesignId, mixDesigns.id))
      .leftJoin(projects, eq(batchingProductionLogs.projectId, projects.id))
      .orderBy(desc(batchingProductionLogs.batchDate), desc(batchingProductionLogs.createdAt))
      .limit(200),
    db
      .select({
        total:         count(),
        totalVolume:   sum(batchingProductionLogs.volumeProducedM3),
        totalTheory:   sum(batchingProductionLogs.theoreticalYieldM3),
        avgVariance:   avg(batchingProductionLogs.yieldVariancePct),
        flaggedCount:  count(batchingProductionLogs.isProductionFlagged),
      })
      .from(batchingProductionLogs),
  ]);

  const kpi = kpiRows[0];
  const totalBatches  = Number(kpi?.total ?? 0);
  const totalVolume   = Number(kpi?.totalVolume ?? 0);
  const totalTheory   = Number(kpi?.totalTheory ?? 0);
  const avgVariance   = Number(kpi?.avgVariance ?? 0);
  const flaggedCount  = logs.filter((l) => l.isProductionFlagged).length;

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "1100px" }}>
        <div style={{ marginBottom: "1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.75rem" }}>
          <a href="/batching" style={{ fontSize: "0.8rem", color: ACCENT, textDecoration: "none" }}>← Batching Plant</a>
          <a href="/batching/log-batch" style={{ padding: "0.45rem 0.9rem", background: ACCENT, color: "#fff", borderRadius: "7px", fontSize: "0.8rem", fontWeight: 600, textDecoration: "none" }}>
            + Log Batch
          </a>
        </div>

        <div style={{ marginBottom: "1.75rem" }}>
          <span style={{ fontSize: "0.72rem", fontWeight: 700, color: ACCENT, letterSpacing: "0.08em", textTransform: "uppercase" }}>Batching Plant</span>
          <h1 style={{ margin: "0.2rem 0 0.25rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827", borderLeft: `4px solid ${ACCENT}`, paddingLeft: "0.75rem" }}>
            Production Logs
          </h1>
          <p style={{ margin: "0 0 0 1rem", color: "#6b7280", fontSize: "0.875rem" }}>All batch production records — volume, yield, and variance tracking.</p>
        </div>

        {/* KPI Row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: "1rem", marginBottom: "1.75rem" }}>
          {[
            { label: "Total Batches", value: String(totalBatches), color: ACCENT },
            { label: "Total Volume (m³)", value: totalVolume.toFixed(2), color: ACCENT },
            { label: "Theoretical Yield (m³)", value: totalTheory.toFixed(2), color: "#374151" },
            { label: "Avg Yield Variance", value: `${avgVariance.toFixed(2)}%`, color: Math.abs(avgVariance) > 2 ? "#dc2626" : "#057a55" },
            { label: "Flagged Batches", value: String(flaggedCount), color: flaggedCount > 0 ? "#dc2626" : "#374151", bg: flaggedCount > 0 ? "#fef2f2" : undefined },
          ].map((k) => (
            <div key={k.label} style={{ background: k.bg ?? "#fff", borderRadius: "8px", padding: "1rem 1.25rem", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", borderTop: `3px solid ${k.color}` }}>
              <div style={{ fontSize: "1.55rem", fontWeight: 700, color: k.color }}>{k.value}</div>
              <div style={{ fontSize: "0.73rem", color: "#6b7280", marginTop: "0.2rem" }}>{k.label}</div>
            </div>
          ))}
        </div>

        {/* Log Table */}
        <div style={{ background: "#fff", borderRadius: "10px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden" }}>
          <div style={{ padding: "1rem 1.5rem", borderBottom: "1px solid #f3f4f6" }}>
            <h2 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700, color: "#374151" }}>
              Batch Log ({logs.length} records)
            </h2>
          </div>
          {logs.length === 0 ? (
            <div style={{ padding: "3rem", textAlign: "center", color: "#9ca3af" }}>
              No production records yet. <a href="/batching/log-batch" style={{ color: ACCENT }}>Log a batch →</a>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem", minWidth: "900px" }}>
                <thead>
                  <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                    {["Date", "Shift", "Project", "Mix", "Cement (bags)", "Sand (kg)", "Gravel (kg)", "Volume (m³)", "Theory (m³)", "Var %", ""].map((h, i) => (
                      <th key={i} style={{ padding: "0.65rem 0.85rem", textAlign: i >= 4 ? "right" : "left", fontWeight: 600, color: "#374151", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {logs.map((row, i) => {
                    const variance = row.yieldVariancePct !== null ? Number(row.yieldVariancePct) : null;
                    const varColor = variance === null ? "#374151" : Math.abs(variance) > 2 ? "#dc2626" : "#057a55";
                    return (
                      <tr key={row.id} style={{ borderBottom: "1px solid #f3f4f6", background: row.isProductionFlagged ? "#fef9f9" : i % 2 === 0 ? "#fff" : "#fafafa" }}>
                        <td style={{ padding: "0.55rem 0.85rem", whiteSpace: "nowrap", color: "#374151" }}>{row.batchDate}</td>
                        <td style={{ padding: "0.55rem 0.85rem" }}>
                          <span style={{ padding: "0.1rem 0.4rem", background: "#f3f4f6", borderRadius: "4px", fontSize: "0.68rem", fontWeight: 700, color: "#6b7280" }}>{row.shift}</span>
                        </td>
                        <td style={{ padding: "0.55rem 0.85rem", color: "#6b7280", fontSize: "0.75rem" }}>{row.projName ?? "—"}</td>
                        <td style={{ padding: "0.55rem 0.85rem" }}>
                          <div style={{ fontFamily: "monospace", fontWeight: 600, fontSize: "0.75rem", color: ACCENT }}>{row.mixCode ?? "—"}</div>
                          <div style={{ fontSize: "0.68rem", color: "#9ca3af" }}>{row.mixName ?? ""}</div>
                        </td>
                        <td style={{ padding: "0.55rem 0.85rem", textAlign: "right", fontFamily: "monospace" }}>{Number(row.cementUsedBags).toFixed(2)}</td>
                        <td style={{ padding: "0.55rem 0.85rem", textAlign: "right", fontFamily: "monospace" }}>{Number(row.sandUsedKg).toFixed(2)}</td>
                        <td style={{ padding: "0.55rem 0.85rem", textAlign: "right", fontFamily: "monospace" }}>{Number(row.gravelUsedKg).toFixed(2)}</td>
                        <td style={{ padding: "0.55rem 0.85rem", textAlign: "right", fontFamily: "monospace", fontWeight: 700 }}>{Number(row.volumeProducedM3).toFixed(2)}</td>
                        <td style={{ padding: "0.55rem 0.85rem", textAlign: "right", fontFamily: "monospace", color: "#6b7280" }}>{Number(row.theoreticalYieldM3).toFixed(2)}</td>
                        <td style={{ padding: "0.55rem 0.85rem", textAlign: "right", fontWeight: 600, color: varColor }}>
                          {variance !== null ? `${variance > 0 ? "+" : ""}${variance.toFixed(2)}%` : "—"}
                        </td>
                        <td style={{ padding: "0.55rem 0.5rem" }}>
                          {row.isProductionFlagged && (
                            <span title={row.flagReason ?? undefined} style={{ padding: "0.15rem 0.4rem", background: "#fef2f2", color: "#dc2626", borderRadius: "4px", fontSize: "0.65rem", fontWeight: 700, cursor: "help" }}>
                              FLAG
                            </span>
                          )}
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
