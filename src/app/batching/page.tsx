export const dynamic = "force-dynamic";
import { getAuthUser } from "@/lib/supabase-server";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, and, gte, count, desc } from "drizzle-orm";

export default async function BatchingPage() {
  const user = await getAuthUser();
  const deptCode: string = user?.user_metadata?.dept_code ?? "";
  const displayName: string = user?.user_metadata?.full_name ?? user?.email ?? "Guest";

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);

  const [batchesThisMonthRows, flaggedBatchRows, flaggedDeliveryRows, activeMixRows] = await Promise.all([
    db
      .select({ value: count() })
      .from(schema.batchingProductionLogs)
      .where(gte(schema.batchingProductionLogs.batchDate, monthStart)),
    db
      .select({ value: count() })
      .from(schema.batchingProductionLogs)
      .where(eq(schema.batchingProductionLogs.isProductionFlagged, true)),
    db
      .select({ value: count() })
      .from(schema.concreteDeliveryReceipts)
      .where(eq(schema.concreteDeliveryReceipts.isDeliveryFlagged, true)),
    db
      .select({ value: count() })
      .from(schema.mixDesigns)
      .where(eq(schema.mixDesigns.isActive, true)),
  ]);

  const batchesThisMonth = batchesThisMonthRows[0]?.value ?? 0;
  const flaggedBatches = flaggedBatchRows[0]?.value ?? 0;
  const flaggedDeliveries = flaggedDeliveryRows[0]?.value ?? 0;
  const activeMixDesigns = activeMixRows[0]?.value ?? 0;

  const batchRows = await db
    .select({
      batchDate: schema.batchingProductionLogs.batchDate,
      shift: schema.batchingProductionLogs.shift,
      mixName: schema.mixDesigns.name,
      cementUsedBags: schema.batchingProductionLogs.cementUsedBags,
      volumeProducedM3: schema.batchingProductionLogs.volumeProducedM3,
      theoreticalYieldM3: schema.batchingProductionLogs.theoreticalYieldM3,
      yieldVariancePct: schema.batchingProductionLogs.yieldVariancePct,
      isProductionFlagged: schema.batchingProductionLogs.isProductionFlagged,
      createdAt: schema.batchingProductionLogs.createdAt,
    })
    .from(schema.batchingProductionLogs)
    .leftJoin(schema.mixDesigns, eq(schema.batchingProductionLogs.mixDesignId, schema.mixDesigns.id))
    .orderBy(desc(schema.batchingProductionLogs.batchDate), desc(schema.batchingProductionLogs.createdAt))
    .limit(20);

  const ACCENT = "#e02424";

  const kpis = [
    { label: "Total Batches (This Month)", value: String(batchesThisMonth) },
    { label: "Flagged Batches", value: String(flaggedBatches) },
    { label: "Flagged Deliveries", value: String(flaggedDeliveries) },
    { label: "Mix Designs Active", value: String(activeMixDesigns) },
  ];

  return (
    <main style={{ minHeight: "100vh", background: "#f9fafb" }}>
      <nav style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 2rem", height: "56px",
        background: "#fff", borderBottom: "1px solid #e5e7eb",
        position: "sticky", top: 0, zIndex: 10,
      }}>
        <span style={{ fontWeight: 700, fontSize: "1.1rem" }}>Castcrete 360</span>
        {user && (
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <span style={{ fontSize: "0.875rem", color: "#6b7280" }}>
              {displayName}
              {deptCode && (
                <span style={{
                  marginLeft: "0.5rem", padding: "0.15rem 0.5rem",
                  background: "#e0e7ff", color: "#3730a3",
                  borderRadius: "999px", fontSize: "0.75rem", fontWeight: 600,
                }}>
                  {deptCode}
                </span>
              )}
            </span>
            <form method="POST" action="/auth/logout" style={{ margin: 0 }}>
              <button type="submit" style={{
                padding: "0.4rem 0.85rem", fontSize: "0.8rem",
                background: "transparent", border: "1px solid #d1d5db",
                borderRadius: "6px", cursor: "pointer", color: "#374151",
              }}>
                Sign out
              </button>
            </form>
          </div>
        )}
      </nav>

      <div style={{ padding: "2rem" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href="/dashboard" style={{ fontSize: "0.875rem", color: "#1a56db", textDecoration: "none" }}>
            ← Back to Dashboard
          </a>
        </div>

        <header style={{ marginBottom: "1.5rem", display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.5rem", fontWeight: 700, borderLeft: `4px solid ${ACCENT}`, paddingLeft: "0.75rem" }}>
              Batching Plant
            </h1>
            <p style={{ margin: "0 0 0 1rem", color: "#6b7280", fontSize: "0.9rem" }}>
              Mix Design · Yield · Internal Sales
            </p>
          </div>
          <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
            <a href="/batching/log-batch" style={{
              padding: "0.55rem 1rem", borderRadius: "6px",
              background: ACCENT, color: "#fff", fontSize: "0.82rem", fontWeight: 600, textDecoration: "none",
            }}>+ Log Batch</a>
          </div>
        </header>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
          {kpis.map((k) => (
            <div key={k.label} style={{
              background: "#fff", borderRadius: "8px", padding: "1.25rem 1.5rem",
              boxShadow: "0 1px 4px rgba(0,0,0,0.07)", borderTop: `3px solid ${ACCENT}`,
            }}>
              <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#111" }}>{k.value}</div>
              <div style={{ fontSize: "0.8rem", color: "#6b7280", marginTop: "0.25rem" }}>{k.label}</div>
            </div>
          ))}
        </div>

        <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden" }}>
          <div style={{ padding: "1rem 1.5rem", borderBottom: "1px solid #e5e7eb" }}>
            <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 600 }}>Production Logs</h2>
          </div>
          {batchRows.length === 0 ? (
            <div style={{ padding: "2rem", textAlign: "center", color: "#6b7280" }}>No records yet</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
                <thead>
                  <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                    {["Date", "Shift", "Mix Design", "Cement Used", "Volume Produced (m³)", "Theoretical Yield (m³)", "Variance %", "Flagged"].map((h) => (
                      <th key={h} style={{ padding: "0.75rem 1rem", textAlign: "left", fontWeight: 600, color: "#374151", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {batchRows.map((row, i) => {
                    const variance = row.yieldVariancePct !== null ? Number(row.yieldVariancePct) : null;
                    const varianceColor = variance === null ? "#374151" : variance > 2 ? "#dc2626" : "#065f46";
                    return (
                      <tr key={i} style={{ borderBottom: "1px solid #f3f4f6", background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                        <td style={{ padding: "0.75rem 1rem", whiteSpace: "nowrap" }}>{row.batchDate}</td>
                        <td style={{ padding: "0.75rem 1rem" }}>{row.shift}</td>
                        <td style={{ padding: "0.75rem 1rem", whiteSpace: "nowrap" }}>{row.mixName ?? "—"}</td>
                        <td style={{ padding: "0.75rem 1rem", whiteSpace: "nowrap" }}>{Number(row.cementUsedBags).toLocaleString()} bags</td>
                        <td style={{ padding: "0.75rem 1rem" }}>{Number(row.volumeProducedM3).toLocaleString()}</td>
                        <td style={{ padding: "0.75rem 1rem" }}>{Number(row.theoreticalYieldM3).toLocaleString()}</td>
                        <td style={{ padding: "0.75rem 1rem", color: varianceColor, fontWeight: 600 }}>
                          {variance !== null ? `${variance.toFixed(2)}%` : "—"}
                        </td>
                        <td style={{ padding: "0.75rem 1rem" }}>
                          {row.isProductionFlagged ? (
                            <span style={{
                              padding: "0.2rem 0.6rem", borderRadius: "4px", fontSize: "0.75rem", fontWeight: 700,
                              background: "#fef2f2", color: "#dc2626",
                            }}>
                              FLAGGED
                            </span>
                          ) : null}
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
