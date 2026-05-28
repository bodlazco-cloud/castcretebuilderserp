export const dynamic = "force-dynamic";

import { db } from "@/db";
import { batchingProductionLogs, mixDesigns, projects, users } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

function safe<T>(p: Promise<T>, fallback: T, ms = 6000): Promise<T> {
  return Promise.race([
    p.catch(() => fallback),
    new Promise<T>((r) => setTimeout(() => r(fallback), ms)),
  ]);
}

const ACCENT = "#0e9f6e";

export default async function BatchingProductionPage() {
  const rows = await safe(
    db
      .select({
        id: batchingProductionLogs.id,
        batchDate: batchingProductionLogs.batchDate,
        shift: batchingProductionLogs.shift,
        cementUsedBags: batchingProductionLogs.cementUsedBags,
        sandUsedKg: batchingProductionLogs.sandUsedKg,
        gravelUsedKg: batchingProductionLogs.gravelUsedKg,
        volumeProducedM3: batchingProductionLogs.volumeProducedM3,
        theoreticalYieldM3: batchingProductionLogs.theoreticalYieldM3,
        yieldVariancePct: batchingProductionLogs.yieldVariancePct,
        isProductionFlagged: batchingProductionLogs.isProductionFlagged,
        flagReason: batchingProductionLogs.flagReason,
        mixCode: mixDesigns.code,
        mixName: mixDesigns.name,
        projectName: projects.name,
        operatorName: users.fullName,
      })
      .from(batchingProductionLogs)
      .leftJoin(mixDesigns, eq(batchingProductionLogs.mixDesignId, mixDesigns.id))
      .leftJoin(projects, eq(batchingProductionLogs.projectId, projects.id))
      .leftJoin(users, eq(batchingProductionLogs.operatorId, users.id))
      .orderBy(desc(batchingProductionLogs.batchDate))
      .limit(200),
    []
  );

  const totalBatches = rows.length;
  const totalVolume = rows.reduce((sum, r) => sum + (r.volumeProducedM3 ? Number(r.volumeProducedM3) : 0), 0);
  const flaggedCount = rows.filter((r) => r.isProductionFlagged).length;
  const varianceRows = rows.filter((r) => r.yieldVariancePct !== null && r.yieldVariancePct !== undefined);
  const avgVariance = varianceRows.length > 0
    ? varianceRows.reduce((sum, r) => sum + Number(r.yieldVariancePct), 0) / varianceRows.length
    : 0;

  const kpiCards = [
    { label: "Total Batches", value: String(totalBatches), accent: ACCENT },
    { label: "Total Volume", value: `${totalVolume.toFixed(2)} m³`, accent: "#1a56db" },
    { label: "Flagged", value: String(flaggedCount), accent: "#dc2626" },
    { label: "Avg Yield Variance", value: `±${avgVariance.toFixed(1)}%`, accent: flaggedCount > 0 ? "#e3a008" : ACCENT },
  ];

  function formatDate(d: string | Date | null): string {
    if (!d) return "—";
    const dt = typeof d === "string" ? new Date(d) : d;
    return dt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  function shiftBadge(shift: string | null) {
    if (!shift) return { bg: "#f3f4f6", color: "#6b7280" };
    if (shift === "AM") return { bg: "#eff6ff", color: "#1d4ed8" };
    if (shift === "PM") return { bg: "#fff7ed", color: "#c2410c" };
    return { bg: "#f5f3ff", color: "#7c3aed" };
  }

  function varianceColor(v: number | string | null): string {
    if (v === null || v === undefined) return "#6b7280";
    const n = Number(v);
    if (n > 5) return "#dc2626";
    if (n > 2) return "#e3a008";
    return ACCENT;
  }

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "1300px" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href="/batching" style={{ fontSize: "0.8rem", color: ACCENT, textDecoration: "none" }}>← Batching</a>
        </div>

        <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827" }}>Production Logs</h1>
        <p style={{ margin: "0 0 1.5rem", color: "#6b7280", fontSize: "0.9rem" }}>Concrete batching production records, volume output, and yield efficiency.</p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem", marginBottom: "1.5rem" }}>
          {kpiCards.map((k) => (
            <div key={k.label} style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", padding: "1.25rem 1.5rem", borderTop: `3px solid ${k.accent}` }}>
              <div style={{ fontSize: "0.78rem", color: "#6b7280", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "0.4rem" }}>{k.label}</div>
              <div style={{ fontSize: "1.6rem", fontWeight: 700, color: k.accent }}>{k.value}</div>
            </div>
          ))}
        </div>

        {flaggedCount > 0 && (
          <div style={{ padding: "0.85rem 1rem", background: "#fffbeb", border: "1px solid #fcd34d", borderRadius: "6px", fontSize: "0.875rem", color: "#92400e", marginBottom: "1.5rem" }}>
            ⚠ {flaggedCount} batch{flaggedCount !== 1 ? "es" : ""} flagged for abnormal yield — check Variance Audit.
          </div>
        )}

        {rows.length === 0 ? (
          <div style={{ padding: "3rem", background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", textAlign: "center", color: "#9ca3af" }}>
            No production logs found.
          </div>
        ) : (
          <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem", minWidth: "1100px" }}>
                <thead>
                  <tr style={{ background: "#f9fafb" }}>
                    {["Date", "Shift", "Project", "Mix", "Volume (m³)", "Theoretical (m³)", "Yield Var%", "Cement (bags)", "Sand (kg)", "Gravel (kg)", "Operator", "Flag"].map((h, i) => (
                      <th
                        key={i}
                        style={{
                          padding: "0.75rem 0.9rem",
                          textAlign: ["Volume (m³)", "Theoretical (m³)", "Yield Var%", "Cement (bags)", "Sand (kg)", "Gravel (kg)"].includes(h) ? "right" : "left",
                          fontWeight: 600,
                          color: "#374151",
                          borderBottom: "1px solid #e5e7eb",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const flagged = r.isProductionFlagged;
                    const sc = shiftBadge(r.shift);
                    const vc = varianceColor(r.yieldVariancePct);
                    return (
                      <tr key={r.id} style={{ borderBottom: "1px solid #f3f4f6", background: flagged ? "#fef2f2" : "transparent" }}>
                        <td style={{ padding: "0.65rem 0.9rem", whiteSpace: "nowrap", color: "#374151", fontWeight: 500 }}>{formatDate(r.batchDate)}</td>
                        <td style={{ padding: "0.65rem 0.9rem" }}>
                          {r.shift ? (
                            <span style={{ fontSize: "0.72rem", fontWeight: 700, padding: "0.15rem 0.5rem", borderRadius: "4px", background: sc.bg, color: sc.color }}>
                              {r.shift}
                            </span>
                          ) : <span style={{ color: "#9ca3af" }}>—</span>}
                        </td>
                        <td style={{ padding: "0.65rem 0.9rem", color: "#374151", maxWidth: "140px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.projectName ?? "—"}</td>
                        <td style={{ padding: "0.65rem 0.9rem" }}>
                          {r.mixCode ? (
                            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "nowrap" }}>
                              <span style={{ fontFamily: "monospace", fontSize: "0.75rem", fontWeight: 700, padding: "0.1rem 0.4rem", borderRadius: "4px", background: "#f0fdf4", color: ACCENT, whiteSpace: "nowrap" }}>
                                {r.mixCode}
                              </span>
                              <span style={{ color: "#6b7280", fontSize: "0.78rem", whiteSpace: "nowrap" }}>{r.mixName ?? ""}</span>
                            </div>
                          ) : <span style={{ color: "#9ca3af" }}>—</span>}
                        </td>
                        <td style={{ padding: "0.65rem 0.9rem", textAlign: "right", fontWeight: 700, color: "#111827", fontFamily: "monospace" }}>
                          {r.volumeProducedM3 !== null && r.volumeProducedM3 !== undefined ? Number(r.volumeProducedM3).toFixed(2) : "—"}
                        </td>
                        <td style={{ padding: "0.65rem 0.9rem", textAlign: "right", color: "#374151", fontFamily: "monospace" }}>
                          {r.theoreticalYieldM3 !== null && r.theoreticalYieldM3 !== undefined ? Number(r.theoreticalYieldM3).toFixed(2) : "—"}
                        </td>
                        <td style={{ padding: "0.65rem 0.9rem", textAlign: "right", fontWeight: 700, color: vc, fontFamily: "monospace" }}>
                          {r.yieldVariancePct !== null && r.yieldVariancePct !== undefined ? `${Number(r.yieldVariancePct).toFixed(1)}%` : "—"}
                        </td>
                        <td style={{ padding: "0.65rem 0.9rem", textAlign: "right", color: "#374151", fontFamily: "monospace" }}>
                          {r.cementUsedBags !== null && r.cementUsedBags !== undefined ? Number(r.cementUsedBags).toFixed(1) : "—"}
                        </td>
                        <td style={{ padding: "0.65rem 0.9rem", textAlign: "right", color: "#374151", fontFamily: "monospace" }}>
                          {r.sandUsedKg !== null && r.sandUsedKg !== undefined ? Number(r.sandUsedKg).toFixed(1) : "—"}
                        </td>
                        <td style={{ padding: "0.65rem 0.9rem", textAlign: "right", color: "#374151", fontFamily: "monospace" }}>
                          {r.gravelUsedKg !== null && r.gravelUsedKg !== undefined ? Number(r.gravelUsedKg).toFixed(1) : "—"}
                        </td>
                        <td style={{ padding: "0.65rem 0.9rem", color: "#6b7280", whiteSpace: "nowrap" }}>{r.operatorName ?? "—"}</td>
                        <td style={{ padding: "0.65rem 0.9rem", textAlign: "center" }}>
                          {flagged ? (
                            <span title={r.flagReason ?? "Flagged"} style={{ cursor: "default" }}>🚩</span>
                          ) : (
                            <span style={{ color: "#d1d5db" }}>—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
