export const dynamic = "force-dynamic";
import { getAuthUser } from "@/lib/supabase-server";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, and, gte, count, desc, sum, sql, notInArray } from "drizzle-orm";

const ACCENT = "#1a56db";

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
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const today = now.toISOString().slice(0, 10);

  // ── KPI counts ───────────────────────────────────────────────────────────────
  const [
    batchesThisMonthRows, flaggedBatchRows, flaggedDeliveryRows,
    activeMixRows, pendingIPORows, volumeTodayRows,
    pendingDeliveryRows, undispatchedRows,
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
      // Delivery notes without receipts
      db.select({ value: count() }).from(schema.concreteDeliveryNotes)
        .where(notInArray(
          schema.concreteDeliveryNotes.id,
          db.select({ id: schema.concreteDeliveryReceipts.deliveryNoteId }).from(schema.concreteDeliveryReceipts),
        )),
      // Production logs without delivery notes
      db.select({ value: count() }).from(schema.batchingProductionLogs)
        .where(notInArray(
          schema.batchingProductionLogs.id,
          db.select({ id: schema.concreteDeliveryNotes.productionLogId }).from(schema.concreteDeliveryNotes),
        )),
    ]),
    [[{ value: 0 }], [{ value: 0 }], [{ value: 0 }], [{ value: 0 }],
     [{ value: 0 }], [{ value: null }], [{ value: 0 }], [{ value: 0 }]],
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
    { label: "Batches This Month", value: batchesThisMonth, href: "/batching/production", alert: false },
    { label: "Volume Today (m³)", value: volumeToday.toFixed(2), href: "/batching/production", alert: false },
    { label: "Active Mix Designs", value: activeMixDesigns, href: "/batching/recipes", alert: false },
    { label: "Pending IPOs", value: pendingIPOs, href: "/batching/ipo", alert: pendingIPOs > 0 },
    { label: "Batches Ready to Dispatch", value: undispatched, href: "/batching/dispatch", alert: undispatched > 0 },
    { label: "Pending Site Sign-offs", value: pendingDeliveries, href: "/batching/deliver", alert: pendingDeliveries > 0 },
    { label: "Flagged Batches", value: flaggedBatches, href: "/batching/yield", alert: flaggedBatches > 0 },
    { label: "Flagged Deliveries", value: flaggedDeliveries, href: "/batching/deliver", alert: flaggedDeliveries > 0 },
  ];

  return (
    <main style={{ minHeight: "100vh", background: "#f9fafb", fontFamily: "system-ui, sans-serif" }}>
      <nav style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 2rem", height: "56px",
        background: "#fff", borderBottom: "1px solid #e5e7eb",
        position: "sticky", top: 0, zIndex: 10,
      }}>
        <span style={{ fontWeight: 700, fontSize: "1rem", color: "#111827" }}>Castcrete 360</span>
      </nav>

      <div style={{ padding: "2rem", maxWidth: "1200px", margin: "0 auto" }}>
        <div style={{ marginBottom: "1.25rem" }}>
          <a href="/main-dashboard" style={{ fontSize: "0.8rem", color: ACCENT, textDecoration: "none" }}>
            ← Back to Dashboard
          </a>
        </div>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "1.75rem", flexWrap: "wrap", gap: "0.75rem" }}>
          <div>
            <span style={{ fontSize: "0.7rem", fontWeight: 700, color: ACCENT, letterSpacing: "0.08em", textTransform: "uppercase" }}>Department</span>
            <h1 style={{ margin: "0.2rem 0 0.25rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827", borderLeft: `4px solid ${ACCENT}`, paddingLeft: "0.75rem" }}>
              Batching Plant
            </h1>
            <p style={{ margin: "0 0 0 1rem", color: "#6b7280", fontSize: "0.85rem" }}>
              {now.toLocaleDateString("en-PH", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </p>
          </div>
          {totalAlerts > 0 && (
            <div style={{
              display: "flex", alignItems: "center", gap: "0.5rem",
              padding: "0.5rem 1rem", background: "#fef2f2",
              border: "1px solid #fecaca", borderRadius: "8px",
            }}>
              <span style={{ fontSize: "1rem" }}>⚠</span>
              <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#dc2626" }}>
                {totalAlerts} item{totalAlerts > 1 ? "s" : ""} need attention
              </span>
            </div>
          )}
        </div>

        {/* KPI Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
          {kpis.map((k) => (
            <a key={k.label} href={k.href} style={{ textDecoration: "none" }}>
              <div style={{
                background: k.alert ? "#fef2f2" : "#fff",
                borderRadius: "10px", padding: "1.1rem 1.25rem",
                boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
                borderLeft: `4px solid ${k.alert ? "#dc2626" : ACCENT}`,
                cursor: "pointer", transition: "box-shadow 0.15s",
              }}>
                <div style={{ fontSize: "1.65rem", fontWeight: 700, color: k.alert ? "#dc2626" : "#111827" }}>
                  {k.value}
                </div>
                <div style={{ fontSize: "0.72rem", color: k.alert ? "#b91c1c" : "#6b7280", marginTop: "0.2rem", fontWeight: k.alert ? 600 : 400 }}>
                  {k.label}
                </div>
              </div>
            </a>
          ))}
        </div>

        {/* Needs Attention + Pending IPOs */}
        {(flaggedBatchDetail.length > 0 || pendingIPODetail.length > 0) && (
          <div style={{ display: "grid", gridTemplateColumns: flaggedBatchDetail.length > 0 && pendingIPODetail.length > 0 ? "1fr 1fr" : "1fr", gap: "1.25rem", marginBottom: "1.5rem" }}>
            {/* Flagged batches */}
            {flaggedBatchDetail.length > 0 && (
              <div style={{ background: "#fff", borderRadius: "10px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden" }}>
                <div style={{ padding: "0.85rem 1.25rem", borderBottom: "1px solid #fecaca", background: "#fef2f2", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "0.88rem", fontWeight: 700, color: "#dc2626" }}>⚠ Flagged Batches</span>
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
                  <span style={{ fontSize: "0.88rem", fontWeight: 700, color: "#92400e" }}>⏳ Pending IPOs</span>
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
        <div style={{ background: "#fff", borderRadius: "10px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden" }}>
          <div style={{ padding: "0.85rem 1.25rem", borderBottom: "1px solid #f3f4f6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2 style={{ margin: 0, fontSize: "0.92rem", fontWeight: 700, color: "#374151" }}>Recent Pour Log</h2>
            <a href="/batching/log-batch" style={{ fontSize: "0.75rem", color: ACCENT, textDecoration: "none", fontWeight: 600 }}>+ Log Batch</a>
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
