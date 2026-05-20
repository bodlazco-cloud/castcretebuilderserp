export const dynamic = "force-dynamic";

import { db } from "@/db";
import { batchingProductionLogs, mixDesigns } from "@/db/schema";
import { eq, desc, avg, sum, count, and, sql } from "drizzle-orm";

const ACCENT = "#7c3aed";

export default async function YieldReportPage() {
  const [byMix, recentFlagged, allLogs] = await Promise.all([
    // Yield stats grouped by mix design
    db
      .select({
        mixId:        mixDesigns.id,
        mixCode:      mixDesigns.code,
        mixName:      mixDesigns.name,
        batchCount:   count(),
        totalVolume:  sum(batchingProductionLogs.volumeProducedM3),
        totalTheory:  sum(batchingProductionLogs.theoreticalYieldM3),
        avgVariance:  avg(batchingProductionLogs.yieldVariancePct),
        flaggedCount: sql<number>`SUM(CASE WHEN ${batchingProductionLogs.isProductionFlagged} THEN 1 ELSE 0 END)`,
      })
      .from(batchingProductionLogs)
      .leftJoin(mixDesigns, eq(batchingProductionLogs.mixDesignId, mixDesigns.id))
      .groupBy(mixDesigns.id, mixDesigns.code, mixDesigns.name)
      .orderBy(desc(count())),

    // Last 10 flagged batches
    db
      .select({
        id:               batchingProductionLogs.id,
        batchDate:        batchingProductionLogs.batchDate,
        shift:            batchingProductionLogs.shift,
        yieldVariancePct: batchingProductionLogs.yieldVariancePct,
        flagReason:       batchingProductionLogs.flagReason,
        mixCode:          mixDesigns.code,
      })
      .from(batchingProductionLogs)
      .leftJoin(mixDesigns, eq(batchingProductionLogs.mixDesignId, mixDesigns.id))
      .where(eq(batchingProductionLogs.isProductionFlagged, true))
      .orderBy(desc(batchingProductionLogs.batchDate))
      .limit(10),

    // Overall totals
    db
      .select({
        total:       count(),
        totalVol:    sum(batchingProductionLogs.volumeProducedM3),
        totalTheory: sum(batchingProductionLogs.theoreticalYieldM3),
        avgVar:      avg(batchingProductionLogs.yieldVariancePct),
      })
      .from(batchingProductionLogs),
  ]);

  const overall = allLogs[0];
  const totalBatches = Number(overall?.total ?? 0);
  const totalVol     = Number(overall?.totalVol ?? 0);
  const totalTheory  = Number(overall?.totalTheory ?? 0);
  const overallAvgVar = Number(overall?.avgVar ?? 0);
  const yieldEfficiency = totalTheory > 0 ? (totalVol / totalTheory) * 100 : 0;

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "1000px" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href="/batching" style={{ fontSize: "0.8rem", color: ACCENT, textDecoration: "none" }}>← Batching Plant</a>
        </div>

        <div style={{ marginBottom: "1.75rem" }}>
          <span style={{ fontSize: "0.72rem", fontWeight: 700, color: ACCENT, letterSpacing: "0.08em", textTransform: "uppercase" }}>Batching Plant</span>
          <h1 style={{ margin: "0.2rem 0 0.25rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827", borderLeft: `4px solid ${ACCENT}`, paddingLeft: "0.75rem" }}>
            Yield Analysis
          </h1>
          <p style={{ margin: "0 0 0 1rem", color: "#6b7280", fontSize: "0.875rem" }}>Concrete yield efficiency and variance tracking across all mix designs.</p>
        </div>

        {/* Overall KPIs */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: "1rem", marginBottom: "1.75rem" }}>
          {[
            { label: "Total Batches", value: String(totalBatches), color: ACCENT },
            { label: "Actual Volume (m³)", value: totalVol.toFixed(2), color: ACCENT },
            { label: "Theoretical Volume (m³)", value: totalTheory.toFixed(2), color: "#374151" },
            { label: "Yield Efficiency", value: `${yieldEfficiency.toFixed(1)}%`, color: yieldEfficiency >= 98 ? "#057a55" : yieldEfficiency >= 95 ? "#d97706" : "#dc2626" },
            { label: "Avg Variance", value: `${overallAvgVar > 0 ? "+" : ""}${overallAvgVar.toFixed(2)}%`, color: Math.abs(overallAvgVar) > 2 ? "#dc2626" : "#057a55" },
            { label: "Flagged Batches", value: String(recentFlagged.length), color: recentFlagged.length > 0 ? "#dc2626" : "#374151", bg: recentFlagged.length > 0 ? "#fef2f2" : undefined },
          ].map((k) => (
            <div key={k.label} style={{ background: k.bg ?? "#fff", borderRadius: "8px", padding: "1rem 1.25rem", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", borderTop: `3px solid ${k.color}` }}>
              <div style={{ fontSize: "1.55rem", fontWeight: 700, color: k.color }}>{k.value}</div>
              <div style={{ fontSize: "0.73rem", color: "#6b7280", marginTop: "0.2rem" }}>{k.label}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: "1.25rem", alignItems: "start" }}>
          {/* Per-mix yield table */}
          <div style={{ background: "#fff", borderRadius: "10px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden" }}>
            <div style={{ padding: "1rem 1.5rem", borderBottom: "1px solid #f3f4f6" }}>
              <h2 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700, color: "#374151" }}>Yield by Mix Design</h2>
            </div>
            {byMix.length === 0 ? (
              <div style={{ padding: "2.5rem", textAlign: "center", color: "#9ca3af", fontSize: "0.875rem" }}>No data yet</div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
                  <thead>
                    <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                      {["Mix", "Batches", "Actual (m³)", "Theory (m³)", "Avg Var %", "Flagged"].map((h, i) => (
                        <th key={i} style={{ padding: "0.6rem 0.85rem", textAlign: i >= 1 ? "right" : "left", fontWeight: 600, color: "#374151", whiteSpace: "nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {byMix.map((row, i) => {
                      const avgVar = Number(row.avgVariance ?? 0);
                      const varColor = Math.abs(avgVar) > 2 ? "#dc2626" : "#057a55";
                      return (
                        <tr key={row.mixId ?? i} style={{ borderBottom: "1px solid #f3f4f6" }}>
                          <td style={{ padding: "0.55rem 0.85rem" }}>
                            <div style={{ fontFamily: "monospace", fontWeight: 700, fontSize: "0.78rem", color: ACCENT }}>{row.mixCode ?? "—"}</div>
                            <div style={{ fontSize: "0.68rem", color: "#9ca3af" }}>{row.mixName ?? ""}</div>
                          </td>
                          <td style={{ padding: "0.55rem 0.85rem", textAlign: "right", fontFamily: "monospace" }}>{Number(row.batchCount)}</td>
                          <td style={{ padding: "0.55rem 0.85rem", textAlign: "right", fontFamily: "monospace", fontWeight: 600 }}>{Number(row.totalVolume ?? 0).toFixed(2)}</td>
                          <td style={{ padding: "0.55rem 0.85rem", textAlign: "right", fontFamily: "monospace", color: "#6b7280" }}>{Number(row.totalTheory ?? 0).toFixed(2)}</td>
                          <td style={{ padding: "0.55rem 0.85rem", textAlign: "right", fontWeight: 600, color: varColor }}>
                            {avgVar > 0 ? "+" : ""}{avgVar.toFixed(2)}%
                          </td>
                          <td style={{ padding: "0.55rem 0.85rem", textAlign: "right" }}>
                            {Number(row.flaggedCount) > 0
                              ? <span style={{ padding: "0.1rem 0.4rem", background: "#fef2f2", color: "#dc2626", borderRadius: "4px", fontSize: "0.68rem", fontWeight: 700 }}>{Number(row.flaggedCount)}</span>
                              : <span style={{ color: "#d1d5db", fontSize: "0.72rem" }}>—</span>
                            }
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Flagged batches */}
          <div style={{ background: "#fff", borderRadius: "10px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden" }}>
            <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid #f3f4f6" }}>
              <h2 style={{ margin: 0, fontSize: "0.9rem", fontWeight: 700, color: "#374151" }}>Recent Flagged Batches</h2>
            </div>
            {recentFlagged.length === 0 ? (
              <div style={{ padding: "2rem", textAlign: "center", color: "#9ca3af", fontSize: "0.8rem" }}>No flagged batches</div>
            ) : (
              <div>
                {recentFlagged.map((row) => {
                  const v = Number(row.yieldVariancePct ?? 0);
                  return (
                    <div key={row.id} style={{ padding: "0.75rem 1.25rem", borderBottom: "1px solid #f9fafb" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.1rem" }}>
                        <span style={{ fontFamily: "monospace", fontWeight: 700, fontSize: "0.78rem", color: ACCENT }}>{row.mixCode ?? "—"}</span>
                        <span style={{ fontWeight: 700, fontSize: "0.78rem", color: "#dc2626" }}>
                          {v > 0 ? "+" : ""}{v.toFixed(2)}%
                        </span>
                      </div>
                      <div style={{ fontSize: "0.72rem", color: "#6b7280" }}>{row.batchDate} · {row.shift}</div>
                      {row.flagReason && <div style={{ fontSize: "0.7rem", color: "#9ca3af", marginTop: "0.15rem" }}>{row.flagReason}</div>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div style={{ marginTop: "1.25rem", padding: "0.85rem 1rem", background: "#eff6ff", borderRadius: "7px", borderLeft: `3px solid ${ACCENT}`, fontSize: "0.78rem", color: "#1e40af" }}>
          <strong>Yield Flag Threshold:</strong> Batches where actual volume deviates more than ±2% from the theoretical yield are automatically flagged for Quality Audit review.
        </div>
      </div>
    </main>
  );
}
