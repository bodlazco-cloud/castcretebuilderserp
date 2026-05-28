export const dynamic = "force-dynamic";

import { db } from "@/db";
import { batchingProductionLogs, mixDesigns, projects } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

function safe<T>(p: Promise<T>, fallback: T, ms = 6000): Promise<T> {
  return Promise.race([
    p.catch(() => fallback),
    new Promise<T>((r) => setTimeout(() => r(fallback), ms)),
  ]);
}

type MixStats = {
  mixId: string;
  code: string;
  name: string;
  batchCount: number;
  totalProduced: number;
  totalTheoretical: number;
  avgVariancePct: number;
  flaggedCount: number;
};

export default async function YieldReportPage() {
  const [logs, allMixDesigns] = await Promise.all([
    safe(
      db
        .select({
          mixDesignId: batchingProductionLogs.mixDesignId,
          projectId: batchingProductionLogs.projectId,
          volumeProducedM3: batchingProductionLogs.volumeProducedM3,
          theoreticalYieldM3: batchingProductionLogs.theoreticalYieldM3,
          yieldVariancePct: batchingProductionLogs.yieldVariancePct,
          isProductionFlagged: batchingProductionLogs.isProductionFlagged,
          batchDate: batchingProductionLogs.batchDate,
          projectName: projects.name,
        })
        .from(batchingProductionLogs)
        .leftJoin(projects, eq(batchingProductionLogs.projectId, projects.id))
        .orderBy(desc(batchingProductionLogs.batchDate))
        .limit(500),
      []
    ),
    safe(
      db
        .select({
          id: mixDesigns.id,
          code: mixDesigns.code,
          name: mixDesigns.name,
          cementBagsPerM3: mixDesigns.cementBagsPerM3,
        })
        .from(mixDesigns)
        .orderBy(mixDesigns.code),
      []
    ),
  ]);

  const mixCodeMap = new Map<string, { code: string; name: string }>();
  for (const m of allMixDesigns) {
    mixCodeMap.set(m.id, { code: m.code, name: m.name });
  }

  const mixMap = new Map<string, MixStats>();
  for (const row of logs) {
    const mid = row.mixDesignId ?? "unknown";
    const mixInfo = mixCodeMap.get(mid) ?? { code: mid, name: "Unknown" };
    if (!mixMap.has(mid)) {
      mixMap.set(mid, {
        mixId: mid,
        code: mixInfo.code,
        name: mixInfo.name,
        batchCount: 0,
        totalProduced: 0,
        totalTheoretical: 0,
        avgVariancePct: 0,
        flaggedCount: 0,
      });
    }
    const s = mixMap.get(mid)!;
    s.batchCount += 1;
    s.totalProduced += Number(row.volumeProducedM3 ?? 0);
    s.totalTheoretical += Number(row.theoreticalYieldM3 ?? 0);
    s.avgVariancePct += Number(row.yieldVariancePct ?? 0);
    if (row.isProductionFlagged) s.flaggedCount += 1;
  }
  for (const s of mixMap.values()) {
    s.avgVariancePct = s.batchCount > 0 ? s.avgVariancePct / s.batchCount : 0;
  }

  const mixStats = Array.from(mixMap.values()).sort((a, b) => a.code.localeCompare(b.code));

  const totalProduced = logs.reduce((acc, r) => acc + Number(r.volumeProducedM3 ?? 0), 0);
  const totalTheoretical = logs.reduce((acc, r) => acc + Number(r.theoreticalYieldM3 ?? 0), 0);
  const avgVariancePct =
    logs.length > 0
      ? logs.reduce((acc, r) => acc + Number(r.yieldVariancePct ?? 0), 0) / logs.length
      : 0;
  const flaggedTotal = logs.filter((r) => r.isProductionFlagged).length;

  const recentLogs = logs.slice(0, 20);

  const varAccentColor = Math.abs(avgVariancePct) > 3 ? "#dc2626" : "#0e9f6e";

  const thStyle = {
    padding: "0.6rem 0.9rem",
    textAlign: "left",
    fontSize: "0.72rem",
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    color: "#6b7280",
    borderBottom: "1px solid #e5e7eb",
    background: "#f9fafb",
    whiteSpace: "nowrap",
  };
  const tdStyle = {
    padding: "0.65rem 0.9rem",
    fontSize: "0.85rem",
    color: "#111827",
    borderBottom: "1px solid #f3f4f6",
    verticalAlign: "middle",
  };

  function varColor(v: number) {
    const abs = Math.abs(v);
    if (abs > 5) return "#dc2626";
    if (abs > 2) return "#d97706";
    return "#059669";
  }

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "1100px" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href="/batching" style={{ fontSize: "0.8rem", color: "#0e9f6e", textDecoration: "none" }}>
            ← Batching
          </a>
        </div>
        <h1 style={{ margin: "0 0 0.3rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827" }}>
          Yield Analysis
        </h1>
        <p style={{ margin: "0 0 2rem", color: "#6b7280", fontSize: "0.9rem" }}>
          Actual vs theoretical concrete volume per mix design.
        </p>

        {logs.length === 0 ? (
          <div style={{ padding: "3rem", background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", textAlign: "center", color: "#9ca3af" }}>
            No production log data available.
          </div>
        ) : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem", marginBottom: "1.5rem" }}>
              <div style={{ background: "#fff", borderRadius: "8px", padding: "1.2rem 1.4rem", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", borderTop: "3px solid #0e9f6e" }}>
                <div style={{ fontSize: "0.72rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "#6b7280", marginBottom: "0.4rem" }}>Total Batches</div>
                <div style={{ fontSize: "1.8rem", fontWeight: 700, color: "#0e9f6e" }}>{logs.length}</div>
              </div>
              <div style={{ background: "#fff", borderRadius: "8px", padding: "1.2rem 1.4rem", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", borderTop: "3px solid #1a56db" }}>
                <div style={{ fontSize: "0.72rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "#6b7280", marginBottom: "0.4rem" }}>Total Produced</div>
                <div style={{ fontSize: "1.8rem", fontWeight: 700, color: "#1a56db" }}>{totalProduced.toFixed(2)} m³</div>
              </div>
              <div style={{ background: "#fff", borderRadius: "8px", padding: "1.2rem 1.4rem", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", borderTop: `3px solid ${varAccentColor}` }}>
                <div style={{ fontSize: "0.72rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "#6b7280", marginBottom: "0.4rem" }}>Avg Yield Variance</div>
                <div style={{ fontSize: "1.8rem", fontWeight: 700, color: varAccentColor }}>±{Math.abs(avgVariancePct).toFixed(1)}%</div>
              </div>
              <div style={{ background: "#fff", borderRadius: "8px", padding: "1.2rem 1.4rem", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", borderTop: "3px solid #dc2626" }}>
                <div style={{ fontSize: "0.72rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "#6b7280", marginBottom: "0.4rem" }}>Flagged Batches</div>
                <div style={{ fontSize: "1.8rem", fontWeight: 700, color: "#dc2626" }}>{flaggedTotal}</div>
              </div>
            </div>

            <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", marginBottom: "1.5rem", overflow: "hidden" }}>
              <div style={{ padding: "1rem 1.2rem", borderBottom: "1px solid #e5e7eb" }}>
                <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 600, color: "#111827" }}>Yield by Mix Design</h2>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th style={thStyle}>Mix Code</th>
                      <th style={thStyle}>Mix Name</th>
                      <th style={{ ...thStyle, textAlign: "right" }}>Batches</th>
                      <th style={{ ...thStyle, textAlign: "right" }}>Total Produced (m³)</th>
                      <th style={{ ...thStyle, textAlign: "right" }}>Total Theoretical (m³)</th>
                      <th style={{ ...thStyle, textAlign: "right" }}>Avg Variance %</th>
                      <th style={{ ...thStyle, textAlign: "right" }}>Flagged</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mixStats.map((s) => (
                      <tr key={s.mixId} style={{ background: "#fff" }}>
                        <td style={tdStyle}>
                          <span style={{ fontFamily: "monospace", fontSize: "0.8rem", background: "#ecfdf5", color: "#065f46", padding: "0.15rem 0.5rem", borderRadius: "4px", fontWeight: 600 }}>
                            {s.code}
                          </span>
                        </td>
                        <td style={tdStyle}>{s.name}</td>
                        <td style={{ ...tdStyle, textAlign: "right" }}>{s.batchCount}</td>
                        <td style={{ ...tdStyle, textAlign: "right" }}>{s.totalProduced.toFixed(2)}</td>
                        <td style={{ ...tdStyle, textAlign: "right" }}>{s.totalTheoretical.toFixed(2)}</td>
                        <td style={{ ...tdStyle, textAlign: "right" }}>
                          <span style={{ color: varColor(s.avgVariancePct), fontWeight: 600 }}>
                            {s.avgVariancePct >= 0 ? "+" : ""}{s.avgVariancePct.toFixed(1)}%
                          </span>
                        </td>
                        <td style={{ ...tdStyle, textAlign: "right" }}>
                          {s.flaggedCount > 0 ? (
                            <span style={{ color: "#dc2626", fontWeight: 600 }}>{s.flaggedCount}</span>
                          ) : (
                            <span style={{ color: "#9ca3af" }}>—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden" }}>
              <div style={{ padding: "1rem 1.2rem", borderBottom: "1px solid #e5e7eb" }}>
                <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 600, color: "#111827" }}>Recent Batches</h2>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th style={thStyle}>Date</th>
                      <th style={thStyle}>Project</th>
                      <th style={thStyle}>Mix</th>
                      <th style={{ ...thStyle, textAlign: "right" }}>Produced (m³)</th>
                      <th style={{ ...thStyle, textAlign: "right" }}>Theoretical (m³)</th>
                      <th style={{ ...thStyle, textAlign: "right" }}>Variance %</th>
                      <th style={{ ...thStyle, textAlign: "center" }}>Flagged</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentLogs.map((row, i) => {
                      const mixInfo = mixCodeMap.get(row.mixDesignId ?? "") ?? { code: row.mixDesignId ?? "—", name: "" };
                      const variance = Number(row.yieldVariancePct ?? 0);
                      const dateStr = row.batchDate
                        ? new Date(row.batchDate).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" })
                        : "—";
                      return (
                        <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                          <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>{dateStr}</td>
                          <td style={tdStyle}>{row.projectName ?? <span style={{ color: "#9ca3af" }}>—</span>}</td>
                          <td style={tdStyle}>
                            <span style={{ fontFamily: "monospace", fontSize: "0.78rem", background: "#ecfdf5", color: "#065f46", padding: "0.1rem 0.4rem", borderRadius: "4px", fontWeight: 600 }}>
                              {mixInfo.code}
                            </span>
                          </td>
                          <td style={{ ...tdStyle, textAlign: "right" }}>{Number(row.volumeProducedM3 ?? 0).toFixed(2)}</td>
                          <td style={{ ...tdStyle, textAlign: "right" }}>{Number(row.theoreticalYieldM3 ?? 0).toFixed(2)}</td>
                          <td style={{ ...tdStyle, textAlign: "right" }}>
                            <span style={{ color: varColor(variance), fontWeight: 600 }}>
                              {variance >= 0 ? "+" : ""}{variance.toFixed(1)}%
                            </span>
                          </td>
                          <td style={{ ...tdStyle, textAlign: "center" }}>
                            {row.isProductionFlagged ? (
                              <span style={{ background: "#fef2f2", color: "#dc2626", fontSize: "0.72rem", fontWeight: 600, padding: "0.15rem 0.5rem", borderRadius: "4px" }}>
                                Yes
                              </span>
                            ) : (
                              <span style={{ color: "#9ca3af" }}>—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
