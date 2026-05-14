export const dynamic = "force-dynamic";
import { getAuthUser } from "@/lib/supabase-server";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, count, sum, inArray } from "drizzle-orm";

const ACCENT = "#1a56db";

// ── Shared styles ─────────────────────────────────────────────────────────────
const card: React.CSSProperties = {
  background: "#fff", borderRadius: "8px",
  boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden",
};
const sectionHead: React.CSSProperties = {
  padding: "0.85rem 1.25rem", borderBottom: "1px solid #e5e7eb",
  display: "flex", alignItems: "center", gap: "0.6rem",
};

// ── SVG donut ─────────────────────────────────────────────────────────────────
type Seg = { value: number; color: string; label: string };
function DonutChart({ segs, cx = 64, cy = 64, r = 46, sw = 20 }: {
  segs: Seg[]; cx?: number; cy?: number; r?: number; sw?: number;
}) {
  const total = segs.reduce((s, g) => s + g.value, 0);
  const C = 2 * Math.PI * r;
  let cumDeg = -90;
  const arcs = total === 0 ? [] : segs.filter((s) => s.value > 0).map((s) => {
    const frac = s.value / total;
    const startDeg = cumDeg;
    cumDeg += frac * 360;
    return { ...s, dashLen: frac * C, startDeg };
  });
  return (
    <svg width={cx * 2} height={cy * 2} viewBox={`0 0 ${cx * 2} ${cy * 2}`} style={{ flexShrink: 0 }}>
      {arcs.length === 0
        ? <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e5e7eb" strokeWidth={sw} />
        : arcs.map((a, i) => (
          <circle key={i} cx={cx} cy={cy} r={r} fill="none"
            stroke={a.color} strokeWidth={sw}
            strokeDasharray={`${a.dashLen} ${C}`}
            transform={`rotate(${a.startDeg} ${cx} ${cy})`} />
        ))}
    </svg>
  );
}

// ── Formatting ────────────────────────────────────────────────────────────────
function shortPHP(n: number) {
  if (n >= 1_000_000_000) return `₱${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000)     return `₱${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)         return `₱${(n / 1_000).toFixed(0)}K`;
  return `₱${n.toFixed(0)}`;
}
function pct(num: number, den: number) { return den === 0 ? 0 : Math.round((num / den) * 100); }

// ── Unit status config ────────────────────────────────────────────────────────
const UNIT_STATUSES: Record<string, { label: string; color: string }> = {
  PENDING:     { label: "Pending NTP",  color: "#9ca3af" },
  NTP_ISSUED:  { label: "NTP Issued",   color: "#1a56db" },
  IN_PROGRESS: { label: "In Progress",  color: "#f59e0b" },
  COMPLETED:   { label: "Completed",    color: "#10b981" },
  TURNED_OVER: { label: "Turned Over",  color: "#8b5cf6" },
};
const UNIT_STATUS_ORDER = ["PENDING", "NTP_ISSUED", "IN_PROGRESS", "COMPLETED", "TURNED_OVER"];
const GRADE_COLORS = { A: "#166534", B: "#92400e", C: "#b91c1c" } as const;
const GRADE_BG     = { A: "#f0fdf4", B: "#fffbeb", C: "#fef2f2" } as const;

export default async function PlanningPage() {
  await getAuthUser();

  // ── All queries with .catch() so any missing table never crashes the page ──
  const [
    activeProjectRows,
    unitStatusRows,
    allActivityRows,
    bomCoverageRows,
    bomTotalCountRes,
    bomDraftCountRes,
    poSumRows,
    subconSummaryRows,
    inventoryRows,
    bomCostRows,       // for BOM budget computation
    unitCountRows,     // for BOM budget × unit count
  ] = await Promise.all([
    db.select({ id: schema.projects.id, name: schema.projects.name, contractValue: schema.projects.contractValue })
      .from(schema.projects).where(eq(schema.projects.status, "ACTIVE")).orderBy(schema.projects.name)
      .catch(() => [] as { id: string; name: string; contractValue: string }[]),

    db.select({ status: schema.projectUnits.status, cnt: count() })
      .from(schema.projectUnits).groupBy(schema.projectUnits.status)
      .catch(() => [] as { status: string; cnt: number }[]),

    db.select({ id: schema.activityDefinitions.id, projectId: schema.activityDefinitions.projectId })
      .from(schema.activityDefinitions).where(eq(schema.activityDefinitions.isActive, true))
      .catch(() => [] as { id: string; projectId: string }[]),

    db.selectDistinct({ activityDefId: schema.bomStandards.activityDefId, projectId: schema.activityDefinitions.projectId })
      .from(schema.bomStandards)
      .innerJoin(schema.activityDefinitions, eq(schema.bomStandards.activityDefId, schema.activityDefinitions.id))
      .where(eq(schema.bomStandards.isActive, true))
      .catch(() => [] as { activityDefId: string; projectId: string }[]),

    db.select({ cnt: count() }).from(schema.bomStandards).where(eq(schema.bomStandards.isActive, true))
      .catch(() => [{ cnt: 0 }]),

    db.select({ cnt: count() }).from(schema.bomStandards)
      .where(eq(schema.bomStandards.status, "DRAFT"))
      .catch(() => [{ cnt: 0 }]),

    db.select({ projectId: schema.purchaseOrders.projectId, total: sum(schema.purchaseOrders.totalAmount) })
      .from(schema.purchaseOrders)
      .where(inArray(schema.purchaseOrders.status, ["BOD_APPROVED", "AWAITING_DELIVERY", "PARTIALLY_DELIVERED", "DELIVERED"]))
      .groupBy(schema.purchaseOrders.projectId)
      .catch(() => [] as { projectId: string; total: string | null }[]),

    db.select({ performanceGrade: schema.subcontractors.performanceGrade, stopAssignment: schema.subcontractors.stopAssignment, cnt: count() })
      .from(schema.subcontractors).where(eq(schema.subcontractors.isActive, true))
      .groupBy(schema.subcontractors.performanceGrade, schema.subcontractors.stopAssignment)
      .catch(() => [] as { performanceGrade: "A" | "B" | "C"; stopAssignment: boolean; cnt: number }[]),

    db.select({ materialId: schema.inventoryStock.materialId, projectId: schema.inventoryStock.projectId, quantityOnHand: schema.inventoryStock.quantityOnHand, quantityReserved: schema.inventoryStock.quantityReserved })
      .from(schema.inventoryStock)
      .catch(() => [] as { materialId: string; projectId: string; quantityOnHand: string; quantityReserved: string }[]),

    // BOM cost data: qty_per_unit × admin_price per (projectId, materialId, unitModel, unitType)
    db.select({ projectId: schema.activityDefinitions.projectId, materialId: schema.bomStandards.materialId, unitModel: schema.bomStandards.unitModel, unitType: schema.bomStandards.unitType, qtyPerUnit: schema.bomStandards.quantityPerUnit, adminPrice: schema.materials.adminPrice })
      .from(schema.bomStandards)
      .innerJoin(schema.activityDefinitions, eq(schema.bomStandards.activityDefId, schema.activityDefinitions.id))
      .innerJoin(schema.materials, eq(schema.bomStandards.materialId, schema.materials.id))
      .where(eq(schema.bomStandards.isActive, true))
      .catch(() => [] as { projectId: string; materialId: string; unitModel: string; unitType: string; qtyPerUnit: string; adminPrice: string }[]),

    db.select({ projectId: schema.projectUnits.projectId, unitModel: schema.projectUnits.unitModel, unitType: schema.projectUnits.unitType, cnt: count() })
      .from(schema.projectUnits)
      .groupBy(schema.projectUnits.projectId, schema.projectUnits.unitModel, schema.projectUnits.unitType)
      .catch(() => [] as { projectId: string; unitModel: string; unitType: string; cnt: number }[]),
  ]);

  // ── Compute metrics ────────────────────────────────────────────────────────
  const unitByStatus = new Map<string, number>();
  for (const row of unitStatusRows) unitByStatus.set(row.status, Number(row.cnt));
  const totalUnits    = Array.from(unitByStatus.values()).reduce((s, v) => s + v, 0);
  const ntpIssued     = unitByStatus.get("NTP_ISSUED")  ?? 0;
  const inProgress    = unitByStatus.get("IN_PROGRESS") ?? 0;
  const completed     = unitByStatus.get("COMPLETED")   ?? 0;
  const turnedOver    = unitByStatus.get("TURNED_OVER") ?? 0;
  const completionPct = pct(completed + turnedOver, totalUnits);
  const bomStdCount   = Number(bomTotalCountRes[0]?.cnt ?? 0);
  const bomDraftCount = Number(bomDraftCountRes[0]?.cnt ?? 0);

  // BOM coverage per project
  const coveredActivities = new Set(bomCoverageRows.map((r) => r.activityDefId));
  const coverageByProject = new Map<string, { total: number; covered: number }>();
  for (const act of allActivityRows) {
    const e = coverageByProject.get(act.projectId) ?? { total: 0, covered: 0 };
    e.total++;
    if (coveredActivities.has(act.id)) e.covered++;
    coverageByProject.set(act.projectId, e);
  }

  // BOM budget per project: sum(qty_per_unit × admin_price × unit_count)
  const unitCountMap = new Map<string, number>();
  for (const uc of unitCountRows) {
    unitCountMap.set(`${uc.projectId}::${uc.unitModel}::${uc.unitType}`, Number(uc.cnt));
  }
  const bomBudgetByProject = new Map<string, number>();
  for (const row of bomCostRows) {
    const unitCount = unitCountMap.get(`${row.projectId}::${row.unitModel}::${row.unitType}`) ?? 0;
    if (unitCount === 0) continue;
    const lineCost = Number(row.qtyPerUnit) * Number(row.adminPrice) * unitCount;
    bomBudgetByProject.set(row.projectId, (bomBudgetByProject.get(row.projectId) ?? 0) + lineCost);
  }
  const poByProject = new Map<string, number>();
  for (const row of poSumRows) poByProject.set(row.projectId, Number(row.total ?? 0));

  const budgetChartRows = activeProjectRows.map((p) => ({
    id:        p.id,
    name:      p.name,
    bomBudget: bomBudgetByProject.get(p.id) ?? 0,
    actual:    poByProject.get(p.id) ?? 0,
  }));
  const maxBomBudget   = Math.max(...budgetChartRows.map((r) => r.bomBudget), 1);
  const totalBomBudget = budgetChartRows.reduce((s, r) => s + r.bomBudget, 0);
  const totalActual    = budgetChartRows.reduce((s, r) => s + r.actual, 0);

  // Subcon gate
  const gradeCount: Record<"A"|"B"|"C", { avail: number; stopped: number }> = {
    A: { avail: 0, stopped: 0 }, B: { avail: 0, stopped: 0 }, C: { avail: 0, stopped: 0 },
  };
  for (const row of subconSummaryRows) {
    const g = row.performanceGrade as "A"|"B"|"C";
    if (!gradeCount[g]) continue;
    if (row.stopAssignment) gradeCount[g].stopped += Number(row.cnt);
    else                    gradeCount[g].avail   += Number(row.cnt);
  }
  const totalSubcons   = Object.values(gradeCount).reduce((s, v) => s + v.avail + v.stopped, 0);
  const stoppedTotal   = Object.values(gradeCount).reduce((s, v) => s + v.stopped, 0);
  const availableTotal = totalSubcons - stoppedTotal;

  // MRP status
  const globalStock = new Map<string, { onHand: number; reserved: number }>();
  for (const s of inventoryRows) {
    const e = globalStock.get(s.materialId) ?? { onHand: 0, reserved: 0 };
    globalStock.set(s.materialId, { onHand: e.onHand + Number(s.quantityOnHand), reserved: e.reserved + Number(s.quantityReserved) });
  }
  const bomMaterials = new Set(bomCostRows.map((r) => r.materialId));
  let mrpOrder = 0, mrpLow = 0, mrpOk = 0;
  for (const matId of bomMaterials) {
    const stock = globalStock.get(matId) ?? { onHand: 0, reserved: 0 };
    const avail = Math.max(0, stock.onHand - stock.reserved);
    if (avail === 0)                        mrpOrder++;
    else if (avail < stock.onHand * 0.2)   mrpLow++;
    else                                    mrpOk++;
  }

  const donutSegs: Seg[] = UNIT_STATUS_ORDER
    .map((s) => ({ value: unitByStatus.get(s) ?? 0, color: UNIT_STATUSES[s]?.color ?? "#e5e7eb", label: UNIT_STATUSES[s]?.label ?? s }))
    .filter((s) => s.value > 0);

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "1300px" }}>

        {/* Back link + header */}
        <div style={{ marginBottom: "1.25rem" }}>
          <a href="/main-dashboard" style={{ fontSize: "0.8rem", color: ACCENT, textDecoration: "none" }}>← Back to Dashboard</a>
        </div>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem", marginBottom: "1.5rem" }}>
          <div>
            <h1 style={{ margin: "0 0 0.2rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827" }}>Planning & Engineering</h1>
            <p style={{ margin: 0, color: "#6b7280", fontSize: "0.875rem" }}>BOM · MRP · Production Capacity · Budget vs Actual · Subcon Gate</p>
          </div>
          <div style={{ display: "flex", gap: "0.65rem", flexWrap: "wrap" }}>
            <a href="/planning/bom/new" style={{ padding: "0.5rem 1rem", borderRadius: "6px", background: "#fff", color: ACCENT, fontSize: "0.8rem", fontWeight: 600, textDecoration: "none", border: `1px solid ${ACCENT}` }}>+ BOM Entry</a>
            <a href="/planning/change-orders/new" style={{ padding: "0.5rem 1rem", borderRadius: "6px", background: ACCENT, color: "#fff", fontSize: "0.8rem", fontWeight: 600, textDecoration: "none" }}>+ Change Order</a>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* HERO KPI SCORECARD                                                 */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <div style={{ ...card, marginBottom: "1.25rem", borderTop: `4px solid ${ACCENT}` }}>
          <div style={{ padding: "1.5rem 1.75rem" }}>

            {/* Title row */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem", flexWrap: "wrap", gap: "0.75rem" }}>
              <div>
                <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.2rem" }}>
                  Production Status Scorecard
                </div>
                <div style={{ fontSize: "0.9rem", color: "#374151" }}>
                  {activeProjectRows.length} active project{activeProjectRows.length !== 1 ? "s" : ""} · {totalUnits.toLocaleString()} total units
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "2.25rem", fontWeight: 800, color: completionPct >= 80 ? "#166534" : completionPct >= 50 ? ACCENT : "#92400e", lineHeight: 1 }}>
                  {completionPct}%
                </div>
                <div style={{ fontSize: "0.72rem", color: "#9ca3af" }}>Overall Completion</div>
              </div>
            </div>

            {/* Overall progress bar */}
            <div style={{ height: "10px", background: "#e5e7eb", borderRadius: "999px", overflow: "hidden", marginBottom: "1.5rem" }}>
              {UNIT_STATUS_ORDER.map((s) => {
                const v = unitByStatus.get(s) ?? 0;
                const w = pct(v, Math.max(totalUnits, 1));
                if (w === 0) return null;
                return <div key={s} style={{ height: "100%", width: `${w}%`, background: UNIT_STATUSES[s]?.color, display: "inline-block" }} />;
              })}
            </div>

            {/* Unit status counters */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: "0.85rem", marginBottom: "1.25rem" }}>
              {[
                { label: "Total Units",    value: totalUnits,   color: "#374151",  bg: "#f9fafb" },
                { label: "NTP Issued",     value: ntpIssued,    color: ACCENT,     bg: "#eff6ff" },
                { label: "In Progress",    value: inProgress,   color: "#92400e",  bg: "#fffbeb" },
                { label: "Completed",      value: completed,    color: "#166534",  bg: "#f0fdf4" },
                { label: "Turned Over",    value: turnedOver,   color: "#5b21b6",  bg: "#f5f3ff" },
              ].map((k) => (
                <div key={k.label} style={{ background: k.bg, borderRadius: "8px", padding: "0.9rem 1rem", border: "1px solid #e5e7eb" }}>
                  <div style={{ fontSize: "1.6rem", fontWeight: 800, color: k.color, lineHeight: 1 }}>{k.value.toLocaleString()}</div>
                  <div style={{ fontSize: "0.7rem", color: "#6b7280", marginTop: "0.3rem" }}>{k.label}</div>
                </div>
              ))}
            </div>

            {/* Second metrics row: BOM / MRP / Subcon */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: "0.85rem", paddingTop: "1rem", borderTop: "1px solid #f3f4f6" }}>
              {[
                { label: "BOM Material Budget", value: shortPHP(totalBomBudget), color: "#0e7490", sub: "planned material cost" },
                { label: "Actual PO Spend",      value: shortPHP(totalActual),    color: totalActual > totalBomBudget ? "#b91c1c" : "#166534", sub: "committed POs" },
                { label: "MRP Items to Order",   value: mrpOrder.toString(),      color: mrpOrder > 0 ? "#b91c1c" : "#166534", sub: "need procurement" },
                { label: "Subcons Available",    value: availableTotal.toString(), color: "#166534", sub: `${stoppedTotal} stop-flagged` },
                { label: "BOM Standards",        value: bomStdCount.toString(),   color: "#374151", sub: bomDraftCount > 0 ? `${bomDraftCount} pending approval` : "all approved" },
              ].map((k) => (
                <div key={k.label} style={{ padding: "0.75rem 1rem", borderRadius: "6px", background: "#f9fafb", border: "1px solid #e5e7eb" }}>
                  <div style={{ fontSize: "1.3rem", fontWeight: 800, color: k.color, lineHeight: 1 }}>{k.value}</div>
                  <div style={{ fontSize: "0.7rem", color: "#374151", marginTop: "0.2rem", fontWeight: 600 }}>{k.label}</div>
                  <div style={{ fontSize: "0.65rem", color: "#9ca3af", marginTop: "0.1rem" }}>{k.sub}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ─── Row 1: Unit Status Donut + BOM Coverage ──────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,5fr) minmax(0,7fr)", gap: "1.25rem", marginBottom: "1.25rem" }}>

          {/* Unit Status Donut */}
          <div style={card}>
            <div style={sectionHead}>
              <span style={{ width: "4px", height: "16px", background: ACCENT, borderRadius: "2px", display: "inline-block" }} />
              <span style={{ fontWeight: 600, fontSize: "0.9rem", color: "#111827" }}>Unit Status Summary</span>
              <span style={{ marginLeft: "auto", fontSize: "0.75rem", color: "#9ca3af" }}>{totalUnits} total</span>
            </div>
            <div style={{ padding: "1.25rem", display: "flex", alignItems: "center", gap: "1.5rem", flexWrap: "wrap" }}>
              <div style={{ position: "relative", flexShrink: 0 }}>
                <DonutChart segs={donutSegs} />
                <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
                  <span style={{ fontSize: "1.35rem", fontWeight: 700, color: "#111827", lineHeight: 1 }}>{totalUnits.toLocaleString()}</span>
                  <span style={{ fontSize: "0.65rem", color: "#9ca3af", marginTop: "0.1rem" }}>TOTAL</span>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.55rem", flex: 1, minWidth: "130px" }}>
                {UNIT_STATUS_ORDER.map((s) => {
                  const cnt = unitByStatus.get(s) ?? 0;
                  const meta = UNIT_STATUSES[s];
                  return (
                    <div key={s} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: meta.color, flexShrink: 0 }} />
                      <span style={{ fontSize: "0.78rem", color: "#374151", flex: 1 }}>{meta.label}</span>
                      <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#111827", minWidth: "28px", textAlign: "right" }}>{cnt.toLocaleString()}</span>
                      <span style={{ fontSize: "0.7rem", color: "#9ca3af", minWidth: "34px", textAlign: "right" }}>{pct(cnt, totalUnits)}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* BOM Coverage */}
          <div style={card}>
            <div style={sectionHead}>
              <span style={{ width: "4px", height: "16px", background: "#0e7490", borderRadius: "2px", display: "inline-block" }} />
              <span style={{ fontWeight: 600, fontSize: "0.9rem", color: "#111827" }}>BOM Coverage</span>
              <span style={{ marginLeft: "auto", fontSize: "0.75rem", color: "#9ca3af" }}>activities with BOM defined</span>
            </div>
            <div style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "0.85rem" }}>
              {activeProjectRows.length === 0
                ? <p style={{ margin: 0, color: "#9ca3af", fontSize: "0.85rem" }}>No active projects.</p>
                : activeProjectRows.map((proj) => {
                    const cov = coverageByProject.get(proj.id) ?? { total: 0, covered: 0 };
                    const p   = pct(cov.covered, cov.total);
                    const barColor = p === 100 ? "#10b981" : p >= 60 ? ACCENT : p >= 30 ? "#f59e0b" : "#ef4444";
                    return (
                      <div key={proj.id}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "0.3rem" }}>
                          <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "#374151", maxWidth: "260px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{proj.name}</span>
                          <span style={{ fontSize: "0.75rem", color: "#6b7280", flexShrink: 0, marginLeft: "0.5rem" }}>
                            {cov.covered}/{cov.total} — <strong style={{ color: barColor }}>{p}%</strong>
                          </span>
                        </div>
                        <div style={{ height: "8px", background: "#f3f4f6", borderRadius: "999px", overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${p}%`, background: barColor, borderRadius: "999px" }} />
                        </div>
                      </div>
                    );
                  })}
              {activeProjectRows.length > 0 && (
                <a href="/planning/bom" style={{ fontSize: "0.78rem", color: ACCENT, textDecoration: "none", marginTop: "0.25rem" }}>View full BOM register →</a>
              )}
            </div>
          </div>
        </div>

        {/* ─── Row 2: BOM Budget vs Actual ──────────────────────────────────── */}
        <div style={{ ...card, marginBottom: "1.25rem" }}>
          <div style={sectionHead}>
            <span style={{ width: "4px", height: "16px", background: "#8b5cf6", borderRadius: "2px", display: "inline-block" }} />
            <span style={{ fontWeight: 600, fontSize: "0.9rem", color: "#111827" }}>BOM Budget vs Actual Spend</span>
            <div style={{ marginLeft: "auto", display: "flex", gap: "1.25rem", alignItems: "center" }}>
              <span style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.75rem", color: "#6b7280" }}>
                <span style={{ width: "10px", height: "10px", background: "#c7d2fe", borderRadius: "2px", display: "inline-block" }} /> BOM Budget
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.75rem", color: "#6b7280" }}>
                <span style={{ width: "10px", height: "10px", background: ACCENT, borderRadius: "2px", display: "inline-block" }} /> Actual (POs)
              </span>
            </div>
          </div>
          <div style={{ padding: "1.25rem" }}>
            {/* Totals strip */}
            <div style={{ display: "flex", gap: "2rem", padding: "0.85rem 1rem", background: "#f9fafb", borderRadius: "6px", marginBottom: "1.25rem", flexWrap: "wrap" }}>
              {[
                { label: "Total BOM Budget",  value: shortPHP(totalBomBudget), color: "#374151" },
                { label: "Total Actual Spend", value: shortPHP(totalActual),   color: totalActual > totalBomBudget ? "#b91c1c" : ACCENT },
                { label: "Utilisation",        value: `${pct(totalActual, totalBomBudget)}%`, color: totalActual > totalBomBudget ? "#b91c1c" : "#166534" },
                { label: "Remaining Budget",   value: shortPHP(Math.max(0, totalBomBudget - totalActual)), color: "#166534" },
              ].map((s) => (
                <div key={s.label}>
                  <div style={{ fontSize: "0.68rem", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em" }}>{s.label}</div>
                  <div style={{ fontSize: "1.1rem", fontWeight: 700, color: s.color }}>{s.value}</div>
                </div>
              ))}
            </div>
            {/* Per-project bars */}
            {budgetChartRows.length === 0
              ? <p style={{ margin: 0, color: "#9ca3af", fontSize: "0.85rem", textAlign: "center" }}>No active projects.</p>
              : <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  {budgetChartRows.map((r) => {
                    const budgetW = maxBomBudget > 0 ? Math.min(pct(r.bomBudget, maxBomBudget), 100) : 0;
                    const actualW = r.bomBudget > 0 ? Math.min(Math.round((r.actual / r.bomBudget) * 100), 130) : 0;
                    const over    = r.actual > r.bomBudget;
                    return (
                      <div key={r.id}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "0.35rem" }}>
                          <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "#374151", maxWidth: "280px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</span>
                          <div style={{ display: "flex", gap: "1rem", flexShrink: 0, marginLeft: "0.75rem" }}>
                            <span style={{ fontSize: "0.75rem", color: "#6b7280" }}>Budget: <strong style={{ color: "#374151" }}>{shortPHP(r.bomBudget)}</strong></span>
                            <span style={{ fontSize: "0.75rem", color: "#6b7280" }}>Actual: <strong style={{ color: over ? "#b91c1c" : ACCENT }}>{shortPHP(r.actual)}</strong></span>
                          </div>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                          <div style={{ height: "9px", background: "#e0e7ff", borderRadius: "999px", overflow: "hidden", width: `${budgetW}%` }} />
                          <div style={{ height: "9px", background: "#f3f4f6", borderRadius: "999px", overflow: "hidden", width: `${budgetW}%` }}>
                            <div style={{ height: "100%", width: `${Math.min(actualW, 100)}%`, background: over ? "#ef4444" : ACCENT, borderRadius: "999px" }} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>}
            <p style={{ margin: "0.75rem 0 0", fontSize: "0.72rem", color: "#9ca3af" }}>
              BOM Budget = material qty × admin price × unit count (from BOM standards). Actual = approved/delivered PO amounts.
            </p>
          </div>
        </div>

        {/* ─── Row 3: Subcon Gate + MRP Status ──────────────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: "1.25rem", marginBottom: "1.75rem" }}>

          {/* Subcon Capacity Gate */}
          <div style={card}>
            <div style={sectionHead}>
              <span style={{ width: "4px", height: "16px", background: "#f59e0b", borderRadius: "2px", display: "inline-block" }} />
              <span style={{ fontWeight: 600, fontSize: "0.9rem", color: "#111827" }}>Subcon Capacity Gate</span>
              <span style={{ marginLeft: "auto", fontSize: "0.75rem", color: "#9ca3af" }}>{totalSubcons} registered</span>
            </div>
            <div style={{ padding: "1.25rem" }}>
              <div style={{ display: "flex", gap: "0.65rem", marginBottom: "1.25rem", flexWrap: "wrap" }}>
                <div style={{ padding: "0.5rem 1rem", borderRadius: "6px", background: "#f0fdf4", border: "1px solid #bbf7d0", textAlign: "center" }}>
                  <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "#166534" }}>{availableTotal}</div>
                  <div style={{ fontSize: "0.68rem", color: "#166534" }}>Available</div>
                </div>
                <div style={{ padding: "0.5rem 1rem", borderRadius: "6px", background: "#fef2f2", border: "1px solid #fecaca", textAlign: "center" }}>
                  <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "#b91c1c" }}>{stoppedTotal}</div>
                  <div style={{ fontSize: "0.68rem", color: "#b91c1c" }}>Stop Flagged</div>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
                {(["A", "B", "C"] as const).map((g) => {
                  const avail = gradeCount[g].avail, stopped = gradeCount[g].stopped, total_g = avail + stopped;
                  return (
                    <div key={g} style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
                      <span style={{ width: "28px", height: "28px", borderRadius: "50%", background: GRADE_BG[g], color: GRADE_COLORS[g], display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.8rem", fontWeight: 800, flexShrink: 0, border: `2px solid ${GRADE_COLORS[g]}33` }}>{g}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.2rem" }}>
                          <span style={{ fontSize: "0.78rem", color: "#374151", fontWeight: 600 }}>Grade {g} — {total_g}</span>
                          {stopped > 0 && <span style={{ fontSize: "0.68rem", color: "#b91c1c", fontWeight: 600 }}>{stopped} stopped</span>}
                        </div>
                        <div style={{ height: "6px", background: "#f3f4f6", borderRadius: "999px", overflow: "hidden" }}>
                          <div style={{ height: "100%", width: total_g > 0 ? `${pct(avail, total_g)}%` : "0%", background: GRADE_COLORS[g], borderRadius: "999px" }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <a href="/master-list/subcontractors" style={{ display: "inline-block", marginTop: "1rem", fontSize: "0.78rem", color: ACCENT, textDecoration: "none" }}>Manage subcontractors →</a>
            </div>
          </div>

          {/* MRP Status */}
          <div style={card}>
            <div style={sectionHead}>
              <span style={{ width: "4px", height: "16px", background: "#ef4444", borderRadius: "2px", display: "inline-block" }} />
              <span style={{ fontWeight: 600, fontSize: "0.9rem", color: "#111827" }}>MRP Status</span>
              <span style={{ marginLeft: "auto", fontSize: "0.75rem", color: "#9ca3af" }}>{bomMaterials.size} material{bomMaterials.size !== 1 ? "s" : ""} in BOM</span>
            </div>
            <div style={{ padding: "1.25rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "1.25rem", marginBottom: "1.25rem", flexWrap: "wrap" }}>
                <div style={{ position: "relative", flexShrink: 0 }}>
                  <DonutChart segs={[{ value: mrpOrder, color: "#ef4444", label: "Order Now" }, { value: mrpLow, color: "#f59e0b", label: "Low Stock" }, { value: mrpOk, color: "#10b981", label: "Sufficient" }]} cx={52} cy={52} r={38} sw={16} />
                  <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
                    <span style={{ fontSize: "1.1rem", fontWeight: 700, color: "#111827", lineHeight: 1 }}>{bomMaterials.size}</span>
                    <span style={{ fontSize: "0.6rem", color: "#9ca3af" }}>ITEMS</span>
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.55rem", flex: 1 }}>
                  {[
                    { label: "Order Now",  count: mrpOrder, color: "#b91c1c", bg: "#fef2f2", border: "#fecaca" },
                    { label: "Low Stock",  count: mrpLow,   color: "#92400e", bg: "#fffbeb", border: "#fde68a" },
                    { label: "Sufficient", count: mrpOk,    color: "#166534", bg: "#f0fdf4", border: "#bbf7d0" },
                  ].map((s) => (
                    <div key={s.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.4rem 0.65rem", borderRadius: "6px", background: s.bg, border: `1px solid ${s.border}` }}>
                      <span style={{ fontSize: "0.78rem", fontWeight: 600, color: s.color }}>{s.label}</span>
                      <span style={{ fontSize: "1rem", fontWeight: 800, color: s.color }}>{s.count}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ display: "flex", gap: "0.65rem", flexWrap: "wrap" }}>
                <a href="/planning/mrp-queue" style={{ padding: "0.45rem 0.85rem", borderRadius: "6px", fontSize: "0.78rem", fontWeight: 600, textDecoration: "none", background: mrpOrder > 0 ? "#fef2f2" : "#eff6ff", color: mrpOrder > 0 ? "#b91c1c" : ACCENT, border: `1px solid ${mrpOrder > 0 ? "#fecaca" : "#bfdbfe"}` }}>
                  {mrpOrder > 0 ? `${mrpOrder} items to order →` : "View full MRP Queue →"}
                </a>
                <a href="/planning/bom" style={{ padding: "0.45rem 0.85rem", borderRadius: "6px", fontSize: "0.78rem", fontWeight: 600, textDecoration: "none", background: "#f9fafb", color: "#374151", border: "1px solid #e5e7eb" }}>
                  BOM Register →
                </a>
              </div>
              {bomDraftCount > 0 && (
                <div style={{ marginTop: "0.85rem", padding: "0.5rem 0.75rem", borderRadius: "6px", background: "#fffbeb", border: "1px solid #fde68a", fontSize: "0.75rem", color: "#92400e" }}>
                  ⚠ {bomDraftCount} BOM standard{bomDraftCount !== 1 ? "s" : ""} pending BOD approval
                  {" — "}<a href="/planning/bom" style={{ color: "#92400e", fontWeight: 600 }}>review →</a>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* SUPPORTING DETAIL CARDS (moved to bottom)                         */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: "1.25rem" }}>
          <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.85rem" }}>
            Supporting Metrics
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(145px, 1fr))", gap: "0.75rem" }}>
            {[
              { label: "Active Projects",     value: activeProjectRows.length, accent: ACCENT   },
              { label: "Total Units",          value: totalUnits,               accent: "#374151" },
              { label: "NTP Issued",           value: ntpIssued,                accent: ACCENT   },
              { label: "In Progress",          value: inProgress,               accent: "#f59e0b" },
              { label: "Completed",            value: completed,                accent: "#10b981" },
              { label: "Turned Over",          value: turnedOver,               accent: "#8b5cf6" },
              { label: "BOM Standards",        value: bomStdCount,              accent: "#0e7490" },
            ].map((k) => (
              <div key={k.label} style={{ ...card, padding: "0.9rem 1rem", borderTop: `3px solid ${k.accent}` }}>
                <div style={{ fontSize: "1.4rem", fontWeight: 700, color: "#111827", lineHeight: 1 }}>{k.value.toLocaleString()}</div>
                <div style={{ fontSize: "0.7rem", color: "#6b7280", marginTop: "0.3rem" }}>{k.label}</div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </main>
  );
}
