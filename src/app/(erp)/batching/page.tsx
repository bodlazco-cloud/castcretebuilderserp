export const dynamic = "force-dynamic";
import { getAuthUser } from "@/lib/supabase-server";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, and, gte, count, desc, sum, sql, notInArray } from "drizzle-orm";

const ACCENT = "#7c3aed";

const IPO_STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  PENDING:       { bg: "#fef3c7", color: "#92400e" },
  ACCEPTED:      { bg: "#eff6ff", color: "#1e40af" },
  IN_PRODUCTION: { bg: "#e0f2fe", color: "#0369a1" },
  DELIVERED:     { bg: "#ecfdf5", color: "#065f46" },
  BILLED:        { bg: "#f3e8ff", color: "#6b21a8" },
};

function StatusPill({ status }: { status: string }) {
  const s = IPO_STATUS_STYLES[status] ?? { bg: "#f3f4f6", color: "#374151" };
  return (
    <span style={{
      display: "inline-block", padding: "0.15rem 0.5rem", borderRadius: "999px",
      fontSize: "0.65rem", fontWeight: 700, background: s.bg, color: s.color, whiteSpace: "nowrap",
    }}>
      {status.replace("_", " ")}
    </span>
  );
}

async function safe<T>(promise: Promise<T>, fallback: T): Promise<T> {
  return Promise.race([promise, new Promise<T>((res) => setTimeout(() => res(fallback), 6000))]);
}

export default async function BatchingPage() {
  const user = await getAuthUser();
  const displayName: string = user?.user_metadata?.full_name ?? user?.email ?? "Guest";
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const today = now.toISOString().slice(0, 10);

  // ── KPI counts ───────────────────────────────────────────────────────────────
  const [
    batchesThisMonthRows, flaggedBatchRows, flaggedDeliveryRows,
    activeMixRows, pendingIPORows, volumeTodayRows,
    pendingDeliveryRows, undispatchedRows,
    ipoByStatus,
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
      db.select({ value: count() }).from(schema.concreteDeliveryNotes)
        .where(notInArray(
          schema.concreteDeliveryNotes.id,
          db.select({ id: schema.concreteDeliveryReceipts.deliveryNoteId }).from(schema.concreteDeliveryReceipts),
        )),
      db.select({ value: count() }).from(schema.batchingProductionLogs)
        .where(notInArray(
          schema.batchingProductionLogs.id,
          db.select({ id: schema.concreteDeliveryNotes.productionLogId }).from(schema.concreteDeliveryNotes),
        )),
      db.select({ status: schema.internalPurchaseOrders.status, cnt: count() })
        .from(schema.internalPurchaseOrders)
        .groupBy(schema.internalPurchaseOrders.status),
    ]),
    [[{ value: 0 }], [{ value: 0 }], [{ value: 0 }], [{ value: 0 }],
     [{ value: 0 }], [{ value: null }], [{ value: 0 }], [{ value: 0 }],
     [] as { status: string; cnt: number }[]],
  );

  const batchesThisMonth   = Number(batchesThisMonthRows[0]?.value ?? 0);
  const flaggedBatches     = Number(flaggedBatchRows[0]?.value ?? 0);
  const flaggedDeliveries  = Number(flaggedDeliveryRows[0]?.value ?? 0);
  const activeMixDesigns   = Number(activeMixRows[0]?.value ?? 0);
  const pendingIPOs        = Number(pendingIPORows[0]?.value ?? 0);
  const volumeToday        = Number(volumeTodayRows[0]?.value ?? 0);
  const pendingDeliveries  = Number(pendingDeliveryRows[0]?.value ?? 0);
  const undispatched       = Number(undispatchedRows[0]?.value ?? 0);
  const totalAlerts = flaggedBatches + flaggedDeliveries + pendingIPOs + pendingDeliveries + undispatched;

  // IPO pipeline
  const ipoStatusMap = Object.fromEntries(ipoByStatus.map((r) => [r.status, Number(r.cnt)]));
  const ipoPending      = ipoStatusMap["PENDING"]       ?? 0;
  const ipoAccepted     = ipoStatusMap["ACCEPTED"]      ?? 0;
  const ipoInProduction = ipoStatusMap["IN_PRODUCTION"] ?? 0;
  const ipoDelivered    = ipoStatusMap["DELIVERED"]      ?? 0;
  const ipoBilled       = ipoStatusMap["BILLED"]         ?? 0;
  const ipoTotal = Math.max(ipoPending + ipoAccepted + ipoInProduction + ipoDelivered + ipoBilled, 1);

  const ipoPipelineStages = [
    { label: "Pending",       count: ipoPending,      pct: Math.round((ipoPending / ipoTotal) * 100),      color: "#fde68a", text: "#92400e" },
    { label: "Accepted",      count: ipoAccepted,     pct: Math.round((ipoAccepted / ipoTotal) * 100),     color: "#93c5fd", text: "#1e40af" },
    { label: "In Production", count: ipoInProduction, pct: Math.round((ipoInProduction / ipoTotal) * 100), color: "#67e8f9", text: "#0369a1" },
    { label: "Delivered",     count: ipoDelivered,    pct: Math.round((ipoDelivered / ipoTotal) * 100),    color: "#86efac", text: "#166534" },
    { label: "Billed",        count: ipoBilled,       pct: Math.round((ipoBilled / ipoTotal) * 100),       color: "#c4b5fd", text: "#6b21a8" },
  ];

  // ── Detail rows ──────────────────────────────────────────────────────────────
  const [recentBatches, flaggedBatchDetail, pendingIPODetail] = await safe(
    Promise.all([
      db.select({
        batchDate:           schema.batchingProductionLogs.batchDate,
        shift:               schema.batchingProductionLogs.shift,
        mixCode:             schema.mixDesigns.code,
        volumeProducedM3:    schema.batchingProductionLogs.volumeProducedM3,
        theoreticalYieldM3:  schema.batchingProductionLogs.theoreticalYieldM3,
        yieldVariancePct:    schema.batchingProductionLogs.yieldVariancePct,
        isProductionFlagged: schema.batchingProductionLogs.isProductionFlagged,
      })
        .from(schema.batchingProductionLogs)
        .leftJoin(schema.mixDesigns, eq(schema.batchingProductionLogs.mixDesignId, schema.mixDesigns.id))
        .orderBy(desc(schema.batchingProductionLogs.createdAt))
        .limit(10),

      db.select({
        id:               schema.batchingProductionLogs.id,
        batchDate:        schema.batchingProductionLogs.batchDate,
        shift:            schema.batchingProductionLogs.shift,
        mixCode:          schema.mixDesigns.code,
        yieldVariancePct: schema.batchingProductionLogs.yieldVariancePct,
        flagReason:       schema.batchingProductionLogs.flagReason,
      })
        .from(schema.batchingProductionLogs)
        .leftJoin(schema.mixDesigns, eq(schema.batchingProductionLogs.mixDesignId, schema.mixDesigns.id))
        .where(eq(schema.batchingProductionLogs.isProductionFlagged, true))
        .orderBy(desc(schema.batchingProductionLogs.createdAt))
        .limit(5),

      db.select({
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
        .where(eq(schema.internalPurchaseOrders.status, "PENDING"))
        .orderBy(desc(schema.internalPurchaseOrders.createdAt))
        .limit(5),
    ]),
    [[], [], []],
  );

  // ── KPI card definitions ─────────────────────────────────────────────────────
  const kpis = [
    { label: "Batches This Month", value: String(batchesThisMonth), sub: `${volumeToday.toFixed(1)} m³ produced today`,  accent: ACCENT },
    { label: "Active Mix Designs",  value: String(activeMixDesigns), sub: "recipe configurations",                         accent: "#1a56db" },
    { label: "Pending IPOs",        value: String(pendingIPOs),      sub: `${undispatched} ready to dispatch`,              accent: pendingIPOs > 0 ? "#dc2626" : "#057a55" },
    { label: "Pending Sign-offs",   value: String(pendingDeliveries), sub: `${flaggedBatches + flaggedDeliveries} flagged`, accent: pendingDeliveries > 0 ? "#e3a008" : "#057a55" },
  ];

  const card: React.CSSProperties = {
    background: "#fff", borderRadius: "10px", padding: "1.25rem 1.5rem",
    boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
  };

  return (
    <main style={{ background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif", padding: "2rem" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", flexWrap: "wrap", marginBottom: "1.5rem" }}>
          <div>
            <p style={{ marginBottom: "0.25rem" }}>
              <a href="/main-dashboard" style={{ fontSize: "0.8rem", color: ACCENT, textDecoration: "none" }}>
                ← Dashboard
              </a>
            </p>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#111827", margin: 0 }}>Batching Plant</h1>
            <p style={{ fontSize: "0.875rem", color: "#6b7280", marginTop: "0.25rem", marginBottom: 0 }}>
              Concrete production, IPOs, dispatch &amp; delivery tracking
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
            {totalAlerts > 0 && (
              <div style={{
                display: "flex", alignItems: "center", gap: "0.4rem",
                padding: "0.4rem 0.85rem", background: "#fef2f2",
                border: "1px solid #fecaca", borderRadius: "8px",
              }}>
                <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#dc2626" }}>
                  {totalAlerts} item{totalAlerts > 1 ? "s" : ""} need attention
                </span>
              </div>
            )}
            <a href="/batching/log-batch" style={{
              padding: "0.55rem 1.1rem", borderRadius: "6px", background: ACCENT,
              color: "#fff", fontSize: "0.875rem", fontWeight: 600, textDecoration: "none",
            }}>+ Log Batch</a>
          </div>
        </div>

        {/* KPI Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem", marginBottom: "1.5rem" }}>
          {kpis.map((kpi) => (
            <div key={kpi.label} style={{ ...card, borderTop: `3px solid ${kpi.accent}` }}>
              <div style={{ fontSize: "2rem", fontWeight: 700, color: "#111827", lineHeight: 1 }}>
                {kpi.value}
              </div>
              <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "#111827", marginTop: "0.3rem" }}>{kpi.label}</div>
              <div style={{ fontSize: "0.72rem", color: "#9ca3af", marginTop: "0.2rem" }}>{kpi.sub}</div>
            </div>
          ))}
        </div>

        {/* Cross-Department Flow */}
        <div style={{ ...card, marginBottom: "1.5rem", padding: "1rem 1.25rem", background: "#f5f3ff", border: `1px solid #ddd6fe` }}>
          <p style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: ACCENT, marginBottom: "0.6rem", marginTop: 0 }}>
            Batching Plant Production Flow
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap", fontSize: "0.78rem" }}>
            {[
              { step: "IPO Received", color: "#92400e", bg: "#fef3c7", href: "/batching/ipo" },
              { step: "→" },
              { step: "Accept & Explode BOM", color: "#1e40af", bg: "#dbeafe" },
              { step: "→" },
              { step: "Log Production", color: "#6b21a8", bg: "#f3e8ff", href: "/batching/log-batch" },
              { step: "→" },
              { step: "Dispatch to Site", color: "#0369a1", bg: "#e0f2fe", href: "/batching/dispatch" },
              { step: "→" },
              { step: "Site Sign-off", color: "#065f46", bg: "#d1fae5", href: "/batching/deliver" },
            ].map((s, i) =>
              "href" in s ? (
                <a key={i} href={s.href} style={{ padding: "0.25rem 0.6rem", borderRadius: "6px", background: s.bg, color: s.color, fontWeight: 600, fontSize: "0.75rem", textDecoration: "none", whiteSpace: "nowrap" }}>
                  {s.step}
                </a>
              ) : s.step === "→" ? (
                <span key={i} style={{ color: "#c4b5fd", fontWeight: 700 }}>→</span>
              ) : (
                <span key={i} style={{ padding: "0.25rem 0.6rem", borderRadius: "6px", background: s.bg, color: s.color, fontWeight: 600, fontSize: "0.75rem", whiteSpace: "nowrap" }}>
                  {s.step}
                </span>
              )
            )}
          </div>
        </div>

        {/* IPO Pipeline + Production Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>

          {/* IPO Pipeline */}
          <div style={card}>
            <p style={{ fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "#9ca3af", marginBottom: "0.75rem", marginTop: 0 }}>
              IPO Pipeline
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {ipoPipelineStages.map((stage) => (
                <div key={stage.label}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", marginBottom: "0.25rem" }}>
                    <span style={{ color: "#374151" }}>{stage.label}</span>
                    <span style={{ color: "#6b7280", fontFamily: "monospace" }}>{stage.count} · {stage.pct}%</span>
                  </div>
                  <div style={{ height: "8px", background: "#f3f4f6", borderRadius: "999px", overflow: "hidden" }}>
                    <div style={{ height: "100%", background: stage.color, borderRadius: "999px", width: `${stage.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.75rem", color: "#6b7280" }}>
              <span>{ipoTotal} total IPOs</span>
              <a href="/batching/ipo" style={{ color: "#1a56db", textDecoration: "none", fontWeight: 600 }}>View All IPOs →</a>
            </div>
          </div>

          {/* Quick Links */}
          <div style={card}>
            <p style={{ fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "#9ca3af", marginBottom: "0.75rem", marginTop: 0 }}>
              Quick Actions
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              {[
                { title: "Ready to Dispatch",    count: undispatched,      accent: "#0369a1", bg: "#e0f2fe", href: "/batching/dispatch" },
                { title: "Pending Deliveries",   count: pendingDeliveries, accent: "#92400e", bg: "#fef3c7", href: "/batching/deliver" },
                { title: "Flagged Batches",       count: flaggedBatches,    accent: "#dc2626", bg: "#fef2f2", href: "/batching/yield" },
                { title: "Flagged Deliveries",    count: flaggedDeliveries, accent: "#dc2626", bg: "#fef2f2", href: "/batching/deliver" },
              ].map((q) => (
                <a key={q.title} href={q.href} style={{ textDecoration: "none" }}>
                  <div style={{ background: q.bg, borderRadius: "8px", padding: "1rem" }}>
                    <div style={{ fontSize: "1.5rem", fontWeight: 700, color: q.accent, lineHeight: 1 }}>{q.count}</div>
                    <div style={{ fontSize: "0.72rem", color: "#6b7280", marginTop: "0.25rem" }}>{q.title}</div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Needs Attention + Pending IPOs */}
        {(flaggedBatchDetail.length > 0 || pendingIPODetail.length > 0) && (
          <div style={{ display: "grid", gridTemplateColumns: flaggedBatchDetail.length > 0 && pendingIPODetail.length > 0 ? "1fr 1fr" : "1fr", gap: "1rem", marginBottom: "1.5rem" }}>
            {/* Flagged batches */}
            {flaggedBatchDetail.length > 0 && (
              <div style={{ background: "#fff", borderRadius: "10px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden" }}>
                <div style={{ padding: "0.85rem 1.25rem", borderBottom: "1px solid #fecaca", background: "#fef2f2", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "0.88rem", fontWeight: 700, color: "#dc2626" }}>Flagged Batches</span>
                  <a href="/batching/yield" style={{ fontSize: "0.72rem", color: "#dc2626", textDecoration: "none", fontWeight: 600 }}>View All →</a>
                </div>
                {flaggedBatchDetail.map((b, i) => (
                  <div key={b.id} style={{ padding: "0.7rem 1.25rem", borderBottom: i < flaggedBatchDetail.length - 1 ? "1px solid #f3f4f6" : "none" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.2rem" }}>
                      <span style={{ fontFamily: "monospace", fontWeight: 700, fontSize: "0.78rem", color: "#374151" }}>
                        {b.batchDate} · {b.shift} · <span style={{ color: ACCENT }}>{b.mixCode ?? "—"}</span>
                      </span>
                      <span style={{ fontFamily: "monospace", fontWeight: 700, fontSize: "0.78rem", color: "#dc2626" }}>
                        {Number(b.yieldVariancePct ?? 0).toFixed(2)}%
                      </span>
                    </div>
                    {b.flagReason && (
                      <p style={{ margin: 0, fontSize: "0.7rem", color: "#9ca3af", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {b.flagReason}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Pending IPOs */}
            {pendingIPODetail.length > 0 && (
              <div style={{ background: "#fff", borderRadius: "10px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden" }}>
                <div style={{ padding: "0.85rem 1.25rem", borderBottom: "1px solid #fde68a", background: "#fffbeb", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "0.88rem", fontWeight: 700, color: "#92400e" }}>Pending IPOs</span>
                  <a href="/batching/ipo" style={{ fontSize: "0.72rem", color: "#92400e", textDecoration: "none", fontWeight: 600 }}>View All →</a>
                </div>
                {pendingIPODetail.map((ipo, i) => (
                  <a key={ipo.id} href={`/batching/ipo/${ipo.id}`} style={{ display: "block", padding: "0.7rem 1.25rem", borderBottom: i < pendingIPODetail.length - 1 ? "1px solid #f3f4f6" : "none", textDecoration: "none" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.15rem" }}>
                      <span style={{ fontFamily: "monospace", fontWeight: 700, fontSize: "0.78rem", color: ACCENT }}>{ipo.ipoNumber}</span>
                      <StatusPill status={ipo.status} />
                    </div>
                    <p style={{ margin: 0, fontSize: "0.7rem", color: "#9ca3af" }}>
                      {ipo.projName ?? "—"} · {ipo.mixCode ?? "—"} · {Number(ipo.requestedVolumeM3).toFixed(1)} m³
                    </p>
                  </a>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Recent Pour Log */}
        <div style={{ ...card, padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "1rem 1.5rem", borderBottom: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <p style={{ fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "#9ca3af", margin: 0 }}>
              Recent Pour Log
            </p>
            <a href="/batching/production" style={{ fontSize: "0.8rem", color: "#1a56db", textDecoration: "none", fontWeight: 600 }}>View All →</a>
          </div>
          {recentBatches.length === 0 ? (
            <div style={{ padding: "2.5rem", textAlign: "center", color: "#9ca3af", fontSize: "0.875rem" }}>No production records yet.</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem", minWidth: "560px" }}>
                <thead>
                  <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                    {["Date", "Shift", "Mix", "Produced (m³)", "Theoretical (m³)", "Variance %", ""].map((h, i) => (
                      <th key={i} style={{ padding: "0.6rem 0.9rem", textAlign: i >= 3 ? "right" : "left", fontWeight: 600, color: "#6b7280", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recentBatches.map((row, i) => {
                    const variance = row.yieldVariancePct !== null ? Number(row.yieldVariancePct) : null;
                    const varColor = variance === null ? "#374151" : Math.abs(variance) > 2 ? "#dc2626" : "#057a55";
                    return (
                      <tr key={i} style={{ borderBottom: "1px solid #f3f4f6", background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                        <td style={{ padding: "0.55rem 0.9rem", whiteSpace: "nowrap", color: "#374151" }}>{row.batchDate}</td>
                        <td style={{ padding: "0.55rem 0.9rem" }}>
                          <span style={{ padding: "0.1rem 0.4rem", background: "#f3f4f6", borderRadius: "4px", fontSize: "0.68rem", fontWeight: 700, color: "#6b7280" }}>
                            {row.shift}
                          </span>
                        </td>
                        <td style={{ padding: "0.55rem 0.9rem", fontFamily: "monospace", fontWeight: 700, fontSize: "0.75rem", color: ACCENT }}>
                          {row.mixCode ?? "—"}
                        </td>
                        <td style={{ padding: "0.55rem 0.9rem", textAlign: "right", fontFamily: "monospace", fontWeight: 700 }}>
                          {Number(row.volumeProducedM3).toFixed(2)}
                        </td>
                        <td style={{ padding: "0.55rem 0.9rem", textAlign: "right", fontFamily: "monospace", color: "#6b7280" }}>
                          {Number(row.theoreticalYieldM3).toFixed(2)}
                        </td>
                        <td style={{ padding: "0.55rem 0.9rem", textAlign: "right", fontWeight: 600, color: varColor }}>
                          {variance !== null ? `${variance > 0 ? "+" : ""}${variance.toFixed(2)}%` : "—"}
                        </td>
                        <td style={{ padding: "0.55rem 0.5rem", textAlign: "right" }}>
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
      </div>
    </main>
  );
}
