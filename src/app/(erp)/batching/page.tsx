export const dynamic = "force-dynamic";
import { getAuthUser } from "@/lib/supabase-server";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, and, gte, count, desc, sum, sql } from "drizzle-orm";

const ACCENT = "#1a56db";

const IPO_STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  PENDING:       { bg: "#fef3c7", color: "#92400e" },
  ACCEPTED:      { bg: "#eff6ff", color: "#1e40af" },
  IN_PRODUCTION: { bg: "#e0f2fe", color: "#0369a1" },
  DELIVERED:     { bg: "#ecfdf5", color: "#065f46" },
  BILLED:        { bg: "#f3e8ff", color: "#6b21a8" },
};

function StatusPill({ status, label }: { status: string; label?: string }) {
  const s = IPO_STATUS_STYLES[status] ?? { bg: "#f3f4f6", color: "#374151" };
  return (
    <span style={{
      display: "inline-block", padding: "0.2rem 0.55rem", borderRadius: "999px",
      fontSize: "0.68rem", fontWeight: 700, background: s.bg, color: s.color,
      whiteSpace: "nowrap",
    }}>
      {label ?? status.replace("_", " ")}
    </span>
  );
}

async function safe<T>(promise: Promise<T>, fallback: T): Promise<T> {
  return Promise.race([promise, new Promise<T>((res) => setTimeout(() => res(fallback), 6000))]);
}

export default async function BatchingPage() {
  const user = await getAuthUser();
  const deptCode: string = user?.user_metadata?.dept_code ?? "";
  const displayName: string = user?.user_metadata?.full_name ?? user?.email ?? "Guest";

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const today = now.toISOString().slice(0, 10);

  const [
    batchesThisMonthRows,
    flaggedBatchRows,
    flaggedDeliveryRows,
    activeMixRows,
    pendingIPORows,
    volumeTodayRows,
  ] = await safe(
    Promise.all([
      db.select({ value: count() }).from(schema.batchingProductionLogs)
        .where(gte(schema.batchingProductionLogs.batchDate, monthStart)),
      db.select({ value: count() }).from(schema.batchingProductionLogs)
        .where(eq(schema.batchingProductionLogs.isProductionFlagged, true)),
      db.select({ value: count() }).from(schema.concreteDeliveryReceipts)
        .where(eq(schema.concreteDeliveryReceipts.isDeliveryFlagged, true)),
      db.select({ value: count() }).from(schema.mixDesigns)
        .where(eq(schema.mixDesigns.isActive, true)),
      db.select({ value: count() }).from(schema.internalPurchaseOrders)
        .where(eq(schema.internalPurchaseOrders.status, "PENDING")),
      db.select({ value: sum(schema.batchingProductionLogs.volumeProducedM3) })
        .from(schema.batchingProductionLogs)
        .where(eq(schema.batchingProductionLogs.batchDate, today)),
    ]),
    [
      [{ value: 0 }], [{ value: 0 }], [{ value: 0 }],
      [{ value: 0 }], [{ value: 0 }], [{ value: null }],
    ],
  );

  const batchesThisMonth  = Number(batchesThisMonthRows[0]?.value ?? 0);
  const flaggedBatches    = Number(flaggedBatchRows[0]?.value ?? 0);
  const flaggedDeliveries = Number(flaggedDeliveryRows[0]?.value ?? 0);
  const activeMixDesigns  = Number(activeMixRows[0]?.value ?? 0);
  const pendingIPOs       = Number(pendingIPORows[0]?.value ?? 0);
  const volumeToday       = Number(volumeTodayRows[0]?.value ?? 0);

  const [batchRows, mixRegisterRows, recentIPORows] = await safe(
    Promise.all([
      db
        .select({
          batchDate:           schema.batchingProductionLogs.batchDate,
          shift:               schema.batchingProductionLogs.shift,
          mixName:             schema.mixDesigns.name,
          mixCode:             schema.mixDesigns.code,
          volumeProducedM3:    schema.batchingProductionLogs.volumeProducedM3,
          theoreticalYieldM3:  schema.batchingProductionLogs.theoreticalYieldM3,
          yieldVariancePct:    schema.batchingProductionLogs.yieldVariancePct,
          isProductionFlagged: schema.batchingProductionLogs.isProductionFlagged,
        })
        .from(schema.batchingProductionLogs)
        .leftJoin(schema.mixDesigns, eq(schema.batchingProductionLogs.mixDesignId, schema.mixDesigns.id))
        .orderBy(desc(schema.batchingProductionLogs.batchDate), desc(schema.batchingProductionLogs.createdAt))
        .limit(15),
      db
        .select({
          id:       schema.mixDesigns.id,
          code:     schema.mixDesigns.code,
          name:     schema.mixDesigns.name,
          isActive: schema.mixDesigns.isActive,
        })
        .from(schema.mixDesigns)
        .orderBy(schema.mixDesigns.code)
        .limit(10),
      db
        .select({
          id:                schema.internalPurchaseOrders.id,
          ipoNumber:         schema.internalPurchaseOrders.ipoNumber,
          status:            schema.internalPurchaseOrders.status,
          requestedVolumeM3: schema.internalPurchaseOrders.requestedVolumeM3,
          mixCode:           schema.mixDesigns.code,
          projName:          schema.projects.name,
          createdAt:         schema.internalPurchaseOrders.createdAt,
        })
        .from(schema.internalPurchaseOrders)
        .leftJoin(schema.mixDesigns, eq(schema.internalPurchaseOrders.mixDesignId, schema.mixDesigns.id))
        .leftJoin(schema.projects, eq(schema.internalPurchaseOrders.projectId, schema.projects.id))
        .orderBy(desc(schema.internalPurchaseOrders.createdAt))
        .limit(5),
    ]),
    [[], [], []],
  );

  const kpis = [
    { label: "Batches This Month", value: String(batchesThisMonth), accent: ACCENT },
    { label: "Volume Today (m³)", value: volumeToday.toFixed(2), accent: ACCENT },
    { label: "Active Mix Designs", value: String(activeMixDesigns), accent: ACCENT },
    { label: "Pending IPOs", value: String(pendingIPOs), accent: pendingIPOs > 0 ? "#92400e" : ACCENT, bg: pendingIPOs > 0 ? "#fffbeb" : undefined },
    { label: "Flagged Batches", value: String(flaggedBatches), accent: flaggedBatches > 0 ? "#dc2626" : ACCENT, bg: flaggedBatches > 0 ? "#fef2f2" : undefined },
    { label: "Flagged Deliveries", value: String(flaggedDeliveries), accent: flaggedDeliveries > 0 ? "#dc2626" : ACCENT, bg: flaggedDeliveries > 0 ? "#fef2f2" : undefined },
  ];

  const navLinks = [
    { href: "/batching/recipes", label: "Recipe BOM", icon: "🧪" },
    { href: "/batching/ipo", label: "IPO Queue", icon: "📋", badge: pendingIPOs > 0 ? String(pendingIPOs) : undefined },
    { href: "/batching/log-batch", label: "Log Batch", icon: "⚗️" },
    { href: "/batching/mix-designs", label: "Standard Mixes", icon: "📐" },
    { href: "/batching/internal-sales", label: "Internal Sales", icon: "💰" },
    { href: "/batching/yield", label: "Yield Analysis", icon: "📊" },
    { href: "/batching/production", label: "Production", icon: "🏭" },
    { href: "/batching/reports", label: "Reports", icon: "📄" },
  ];

  return (
    <main style={{ minHeight: "100vh", background: "#f9fafb", fontFamily: "system-ui, sans-serif" }}>
      {/* Top nav */}
      <nav style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 2rem", height: "56px",
        background: "#fff", borderBottom: "1px solid #e5e7eb",
        position: "sticky", top: 0, zIndex: 10,
      }}>
        <span style={{ fontWeight: 700, fontSize: "1rem", color: "#111827" }}>Castcrete 360</span>
        {user && (
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <span style={{ fontSize: "0.82rem", color: "#6b7280" }}>
              {displayName}
              {deptCode && (
                <span style={{
                  marginLeft: "0.5rem", padding: "0.15rem 0.5rem",
                  background: "#eff6ff", color: "#1e40af",
                  borderRadius: "999px", fontSize: "0.7rem", fontWeight: 600,
                }}>
                  {deptCode}
                </span>
              )}
            </span>
            <form method="POST" action="/auth/logout" style={{ margin: 0 }}>
              <button type="submit" style={{
                padding: "0.35rem 0.8rem", fontSize: "0.78rem",
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
        <div style={{ marginBottom: "1.25rem" }}>
          <a href="/main-dashboard" style={{ fontSize: "0.8rem", color: ACCENT, textDecoration: "none" }}>
            ← Back to Dashboard
          </a>
        </div>

        {/* Header */}
        <header style={{ marginBottom: "1.5rem" }}>
          <span style={{ fontSize: "0.72rem", fontWeight: 700, color: ACCENT, letterSpacing: "0.08em", textTransform: "uppercase" }}>
            Department
          </span>
          <h1 style={{ margin: "0.2rem 0 0.2rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827", borderLeft: `4px solid ${ACCENT}`, paddingLeft: "0.75rem" }}>
            Batching Plant
          </h1>
          <p style={{ margin: "0 0 0 1rem", color: "#6b7280", fontSize: "0.875rem" }}>
            Mix Design · Recipe BOM · Production · IPO Queue · Internal Sales
          </p>
        </header>

        {/* Module nav */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "1.75rem" }}>
          {navLinks.map((l) => (
            <a
              key={l.href}
              href={l.href}
              style={{
                display: "inline-flex", alignItems: "center", gap: "0.35rem",
                padding: "0.45rem 0.85rem",
                background: "#fff", border: "1px solid #e5e7eb",
                borderRadius: "7px", fontSize: "0.78rem", fontWeight: 500,
                color: "#374151", textDecoration: "none",
                boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
              }}
            >
              <span>{l.icon}</span>
              {l.label}
              {l.badge && (
                <span style={{
                  padding: "0.1rem 0.4rem", background: "#fef3c7", color: "#92400e",
                  borderRadius: "999px", fontSize: "0.65rem", fontWeight: 700,
                }}>
                  {l.badge}
                </span>
              )}
            </a>
          ))}
        </div>

        {/* KPI Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(175px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
          {kpis.map((k) => (
            <div key={k.label} style={{
              background: k.bg ?? "#fff",
              borderRadius: "8px", padding: "1.1rem 1.25rem",
              boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
              borderTop: `3px solid ${k.accent}`,
            }}>
              <div style={{ fontSize: "1.65rem", fontWeight: 700, color: k.accent }}>{k.value}</div>
              <div style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: "0.2rem" }}>{k.label}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1.25rem", alignItems: "start" }}>
          {/* Daily Pour Log */}
          <div style={{ background: "#fff", borderRadius: "10px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden" }}>
            <div style={{ padding: "1rem 1.5rem", borderBottom: "1px solid #f3f4f6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700, color: "#374151" }}>Recent Pour Log</h2>
              <a href="/batching/log-batch" style={{ fontSize: "0.75rem", color: ACCENT, textDecoration: "none", fontWeight: 600 }}>+ Log Batch</a>
            </div>
            {batchRows.length === 0 ? (
              <div style={{ padding: "2.5rem", textAlign: "center", color: "#9ca3af", fontSize: "0.875rem" }}>No production records yet</div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem", minWidth: "600px" }}>
                  <thead>
                    <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                      {["Date", "Shift", "Mix", "Volume (m³)", "Yield (m³)", "Var %", ""].map((h, i) => (
                        <th key={i} style={{ padding: "0.6rem 0.85rem", textAlign: i >= 3 && i <= 5 ? "right" : "left", fontWeight: 600, color: "#6b7280", whiteSpace: "nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {batchRows.map((row, i) => {
                      const variance = row.yieldVariancePct !== null ? Number(row.yieldVariancePct) : null;
                      const varColor = variance === null ? "#374151" : Math.abs(variance) > 2 ? "#dc2626" : "#057a55";
                      return (
                        <tr key={i} style={{ borderBottom: "1px solid #f3f4f6", background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                          <td style={{ padding: "0.55rem 0.85rem", whiteSpace: "nowrap", color: "#374151" }}>{row.batchDate}</td>
                          <td style={{ padding: "0.55rem 0.85rem" }}>
                            <span style={{ padding: "0.1rem 0.4rem", background: "#f3f4f6", borderRadius: "4px", fontSize: "0.68rem", fontWeight: 700, color: "#6b7280" }}>
                              {row.shift}
                            </span>
                          </td>
                          <td style={{ padding: "0.55rem 0.85rem" }}>
                            <div style={{ fontFamily: "monospace", fontWeight: 600, fontSize: "0.75rem", color: ACCENT }}>{row.mixCode ?? "—"}</div>
                          </td>
                          <td style={{ padding: "0.55rem 0.85rem", textAlign: "right", fontFamily: "monospace", fontWeight: 700 }}>
                            {Number(row.volumeProducedM3).toFixed(2)}
                          </td>
                          <td style={{ padding: "0.55rem 0.85rem", textAlign: "right", fontFamily: "monospace", color: "#6b7280" }}>
                            {Number(row.theoreticalYieldM3).toFixed(2)}
                          </td>
                          <td style={{ padding: "0.55rem 0.85rem", textAlign: "right", fontWeight: 600, color: varColor }}>
                            {variance !== null ? `${variance.toFixed(2)}%` : "—"}
                          </td>
                          <td style={{ padding: "0.55rem 0.5rem" }}>
                            {row.isProductionFlagged && (
                              <span style={{ padding: "0.15rem 0.4rem", background: "#fef2f2", color: "#dc2626", borderRadius: "4px", fontSize: "0.65rem", fontWeight: 700 }}>
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

          {/* Right column: Mix Register + IPO Preview */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {/* Mix Design Register */}
            <div style={{ background: "#fff", borderRadius: "10px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden" }}>
              <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid #f3f4f6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h2 style={{ margin: 0, fontSize: "0.9rem", fontWeight: 700, color: "#374151" }}>Mix Designs</h2>
                <a href="/batching/recipes" style={{ fontSize: "0.72rem", color: ACCENT, textDecoration: "none", fontWeight: 600 }}>View All →</a>
              </div>
              {mixRegisterRows.length === 0 ? (
                <div style={{ padding: "1.5rem", textAlign: "center", color: "#9ca3af", fontSize: "0.8rem" }}>None defined</div>
              ) : (
                <div>
                  {mixRegisterRows.map((m) => (
                    <a
                      key={m.id}
                      href={`/batching/recipes/${m.id}`}
                      style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.65rem 1.25rem", borderBottom: "1px solid #f9fafb", textDecoration: "none" }}
                    >
                      <div>
                        <div style={{ fontFamily: "monospace", fontWeight: 700, fontSize: "0.8rem", color: "#111827" }}>{m.code}</div>
                        <div style={{ fontSize: "0.7rem", color: "#9ca3af" }}>{m.name}</div>
                      </div>
                      <span style={{
                        padding: "0.15rem 0.4rem", borderRadius: "999px", fontSize: "0.65rem", fontWeight: 700,
                        background: m.isActive ? "#ecfdf5" : "#f3f4f6",
                        color: m.isActive ? "#057a55" : "#9ca3af",
                      }}>
                        {m.isActive ? "ACTIVE" : "OFF"}
                      </span>
                    </a>
                  ))}
                </div>
              )}
            </div>

            {/* Recent IPOs */}
            <div style={{ background: "#fff", borderRadius: "10px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden" }}>
              <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid #f3f4f6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h2 style={{ margin: 0, fontSize: "0.9rem", fontWeight: 700, color: "#374151" }}>Recent IPOs</h2>
                <a href="/batching/ipo" style={{ fontSize: "0.72rem", color: ACCENT, textDecoration: "none", fontWeight: 600 }}>
                  View All {pendingIPOs > 0 && <span style={{ marginLeft: "0.25rem", padding: "0.05rem 0.35rem", background: "#fef3c7", color: "#92400e", borderRadius: "999px", fontSize: "0.65rem", fontWeight: 700 }}>{pendingIPOs} pending</span>}
                </a>
              </div>
              {recentIPORows.length === 0 ? (
                <div style={{ padding: "1.5rem", textAlign: "center", color: "#9ca3af", fontSize: "0.8rem" }}>No IPOs yet</div>
              ) : (
                <div>
                  {recentIPORows.map((ipo) => (
                    <div key={ipo.id} style={{ padding: "0.65rem 1.25rem", borderBottom: "1px solid #f9fafb" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.15rem" }}>
                        <span style={{ fontFamily: "monospace", fontWeight: 700, fontSize: "0.78rem", color: ACCENT }}>{ipo.ipoNumber}</span>
                        <StatusPill status={ipo.status} />
                      </div>
                      <div style={{ fontSize: "0.7rem", color: "#6b7280" }}>
                        {ipo.projName ?? "—"} · {ipo.mixCode ?? "—"} · {Number(ipo.requestedVolumeM3).toFixed(1)} m³
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
