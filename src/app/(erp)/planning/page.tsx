export const dynamic = "force-dynamic";
import { getAuthUser } from "@/lib/supabase-server";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, count, sum, inArray } from "drizzle-orm";

const ACCENT = "#1a56db";

// ── Shared styles ─────────────────────────────────────────────────────────────
const card: React.CSSProperties = {
  background: "#fff",
  borderRadius: "8px",
  boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
  overflow: "hidden",
};

const sectionHead: React.CSSProperties = {
  padding: "0.85rem 1.25rem",
  borderBottom: "1px solid #e5e7eb",
  display: "flex",
  alignItems: "center",
  gap: "0.6rem",
};

// ── SVG donut helpers ─────────────────────────────────────────────────────────
type Seg = { value: number; color: string; label: string };

function DonutChart({ segs, cx = 64, cy = 64, r = 46, sw = 20 }: {
  segs: Seg[]; cx?: number; cy?: number; r?: number; sw?: number;
}) {
  const total = segs.reduce((s, g) => s + g.value, 0);
  const C = 2 * Math.PI * r;
  let cumDeg = -90;
  const arcs = total === 0 ? [] : segs
    .filter((s) => s.value > 0)
    .map((s) => {
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
  if (n >= 1_000_000) return `₱${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `₱${(n / 1_000).toFixed(0)}K`;
  return `₱${n.toFixed(0)}`;
}

function pct(num: number, den: number) {
  return den === 0 ? 0 : Math.round((num / den) * 100);
}

// ── Unit status config ────────────────────────────────────────────────────────
const UNIT_STATUSES: Record<string, { label: string; color: string; kpiLabel?: string }> = {
  PENDING:     { label: "Pending NTP",  color: "#9ca3af" },
  NTP_ISSUED:  { label: "NTP Issued",   color: "#1a56db", kpiLabel: "NTP Issued" },
  IN_PROGRESS: { label: "In Progress",  color: "#f59e0b", kpiLabel: "In Progress" },
  COMPLETED:   { label: "Completed",    color: "#10b981", kpiLabel: "Completed" },
  TURNED_OVER: { label: "Turned Over",  color: "#8b5cf6", kpiLabel: "Turned Over" },
};
const UNIT_STATUS_ORDER = ["PENDING", "NTP_ISSUED", "IN_PROGRESS", "COMPLETED", "TURNED_OVER"];

export default async function PlanningPage() {
  await getAuthUser();

  // ── Parallel data fetch (every query has .catch so the page never crashes) ─
  let [
    activeProjectRows,
    unitStatusRows,
    allActivityRows,
    bomCoverageRows,
    bomTotalCountRes,
    poSumRows,
    subconSummaryRows,
    inventoryRows,
    bomGrossRows,
  ] = await Promise.all([
    // 1. Active projects with budget
    db.select({
      id:            schema.projects.id,
      name:          schema.projects.name,
      contractValue: schema.projects.contractValue,
    })
      .from(schema.projects)
      .where(eq(schema.projects.status, "ACTIVE"))
      .orderBy(schema.projects.name)
      .catch(() => [] as { id: string; name: string; contractValue: string }[]),

    // 2. Unit counts by status (all projects)
    db.select({
      status:    schema.projectUnits.status,
      cnt:       count(),
    })
      .from(schema.projectUnits)
      .groupBy(schema.projectUnits.status)
      .catch(() => [] as { status: string; cnt: number }[]),

    // 3. All active activity definitions (for BOM coverage calc)
    db.select({
      id:        schema.activityDefinitions.id,
      projectId: schema.activityDefinitions.projectId,
    })
      .from(schema.activityDefinitions)
      .where(eq(schema.activityDefinitions.isActive, true))
      .catch(() => [] as { id: string; projectId: string }[]),

    // 4. Distinct activityDefIds that have an active BOM standard
    db.selectDistinct({
      activityDefId: schema.bomStandards.activityDefId,
      projectId:     schema.activityDefinitions.projectId,
    })
      .from(schema.bomStandards)
      .innerJoin(schema.activityDefinitions, eq(schema.bomStandards.activityDefId, schema.activityDefinitions.id))
      .where(eq(schema.bomStandards.isActive, true))
      .catch(() => [] as { activityDefId: string; projectId: string }[]),

    // 5. Total active BOM standards count
    db.select({ cnt: count() })
      .from(schema.bomStandards)
      .where(eq(schema.bomStandards.isActive, true))
      .catch(() => [{ cnt: 0 }]),

    // 6. Committed PO totals per project
    db.select({
      projectId:       schema.purchaseOrders.projectId,
      totalCommitted:  sum(schema.purchaseOrders.totalAmount),
    })
      .from(schema.purchaseOrders)
      .where(inArray(schema.purchaseOrders.status, [
        "BOD_APPROVED", "AWAITING_DELIVERY", "PARTIALLY_DELIVERED", "DELIVERED",
      ]))
      .groupBy(schema.purchaseOrders.projectId)
      .catch(() => [] as { projectId: string; totalCommitted: string | null }[]),

    // 7. Subcontractors by grade + stop-assignment
    db.select({
      performanceGrade: schema.subcontractors.performanceGrade,
      stopAssignment:   schema.subcontractors.stopAssignment,
      cnt:              count(),
    })
      .from(schema.subcontractors)
      .where(eq(schema.subcontractors.isActive, true))
      .groupBy(schema.subcontractors.performanceGrade, schema.subcontractors.stopAssignment)
      .catch(() => [] as { performanceGrade: "A" | "B" | "C"; stopAssignment: boolean; cnt: number }[]),

    // 8. Inventory stock (for MRP status)
    db.select({
      materialId:       schema.inventoryStock.materialId,
      projectId:        schema.inventoryStock.projectId,
      quantityOnHand:   schema.inventoryStock.quantityOnHand,
      quantityReserved: schema.inventoryStock.quantityReserved,
    })
      .from(schema.inventoryStock)
      .catch(() => [] as { materialId: string; projectId: string; quantityOnHand: string; quantityReserved: string }[]),

    // 9. Active BOM lines with qty_per_unit for MRP gross calc
    db.select({
      materialId:      schema.bomStandards.materialId,
      qtyPerUnit:      schema.bomStandards.quantityPerUnit,
      unitModel:       schema.bomStandards.unitModel,
      unitType:        schema.bomStandards.unitType,
      projectId:       schema.activityDefinitions.projectId,
    })
      .from(schema.bomStandards)
      .innerJoin(schema.activityDefinitions, eq(schema.bomStandards.activityDefId, schema.activityDefinitions.id))
      .where(eq(schema.bomStandards.isActive, true))
      .catch(() => [] as { materialId: string; qtyPerUnit: string; unitModel: string; unitType: string; projectId: string }[]),
  ]);

  // ── Unit counts ───────────────────────────────────────────────────────────
  const unitByStatus = new Map<string, number>();
  for (const row of unitStatusRows) unitByStatus.set(row.status, Number(row.cnt));
  const totalUnits    = Array.from(unitByStatus.values()).reduce((s, v) => s + v, 0);
  const ntpIssued     = unitByStatus.get("NTP_ISSUED")  ?? 0;
  const inProgress    = unitByStatus.get("IN_PROGRESS") ?? 0;
  const completed     = unitByStatus.get("COMPLETED")   ?? 0;
  const turnedOver    = unitByStatus.get("TURNED_OVER") ?? 0;
  const bomStdCount   = Number(bomTotalCountRes[0]?.cnt ?? 0);

  const donutSegs: Seg[] = UNIT_STATUS_ORDER
    .map((s) => ({
      value: unitByStatus.get(s) ?? 0,
      color: UNIT_STATUSES[s]?.color ?? "#e5e7eb",
      label: UNIT_STATUSES[s]?.label ?? s,
    }))
    .filter((s) => s.value > 0);

  // ── BOM coverage per project ──────────────────────────────────────────────
  const coveredActivities = new Set(bomCoverageRows.map((r) => r.activityDefId));
  type CoverageEntry = { total: number; covered: number };
  const coverageByProject = new Map<string, CoverageEntry>();
  for (const act of allActivityRows) {
    const e = coverageByProject.get(act.projectId) ?? { total: 0, covered: 0 };
    e.total++;
    if (coveredActivities.has(act.id)) e.covered++;
    coverageByProject.set(act.projectId, e);
  }

  // ── Budget vs Actual ──────────────────────────────────────────────────────
  const poByProject = new Map<string, number>();
  for (const row of poSumRows) {
    poByProject.set(row.projectId, Number(row.totalCommitted ?? 0));
  }
  const budgetRows = activeProjectRows.map((p) => ({
    id:         p.id,
    name:       p.name,
    budget:     Number(p.contractValue),
    committed:  poByProject.get(p.id) ?? 0,
  }));
  const maxBudget = Math.max(...budgetRows.map((r) => r.budget), 1);
  const totalBudget    = budgetRows.reduce((s, r) => s + r.budget, 0);
  const totalCommitted = budgetRows.reduce((s, r) => s + r.committed, 0);

  // ── Subcon capacity gate ──────────────────────────────────────────────────
  const gradeCount: Record<"A" | "B" | "C", { avail: number; stopped: number }> = {
    A: { avail: 0, stopped: 0 },
    B: { avail: 0, stopped: 0 },
    C: { avail: 0, stopped: 0 },
  };
  for (const row of subconSummaryRows) {
    const g = row.performanceGrade as "A" | "B" | "C";
    if (!gradeCount[g]) continue;
    if (row.stopAssignment) gradeCount[g].stopped += Number(row.cnt);
    else                    gradeCount[g].avail   += Number(row.cnt);
  }
  const totalSubcons  = Object.values(gradeCount).reduce((s, v) => s + v.avail + v.stopped, 0);
  const stoppedTotal  = Object.values(gradeCount).reduce((s, v) => s + v.stopped, 0);
  const availableTotal = totalSubcons - stoppedTotal;

  // ── MRP status summary ────────────────────────────────────────────────────
  // Unit counts per (projectId, unitModel, unitType) for active units
  const unitCountMap = new Map<string, number>();
  for (const row of unitStatusRows) {
    // We need per-project breakdown for MRP — use a simplified global approach here
  }

  // Simplified MRP: compare active BOM gross requirements vs inventory
  // Group inventory by materialId (across all projects)
  const globalStock = new Map<string, { onHand: number; reserved: number }>();
  for (const s of inventoryRows) {
    const k = s.materialId;
    const e = globalStock.get(k) ?? { onHand: 0, reserved: 0 };
    globalStock.set(k, {
      onHand:   e.onHand   + Number(s.quantityOnHand),
      reserved: e.reserved + Number(s.quantityReserved),
    });
  }

  // Distinct materials in active BOM
  const bomMaterials = new Set(bomGrossRows.map((r) => r.materialId));
  let mrpOrder = 0;
  let mrpLow   = 0;
  let mrpOk    = 0;
  for (const matId of bomMaterials) {
    const stock = globalStock.get(matId) ?? { onHand: 0, reserved: 0 };
    const avail = Math.max(0, stock.onHand - stock.reserved);
    if (avail === 0) mrpOrder++;
    else if (avail < stock.onHand * 0.2) mrpLow++;
    else mrpOk++;
  }

  // ── KPI values ────────────────────────────────────────────────────────────
  const kpiCards = [
    { label: "Active Projects",   value: activeProjectRows.length.toString(),  accent: ACCENT       },
    { label: "Total Units",       value: totalUnits.toLocaleString(),           accent: "#374151"    },
    { label: "NTP Issued",        value: ntpIssued.toLocaleString(),            accent: ACCENT       },
    { label: "In Progress",       value: inProgress.toLocaleString(),           accent: "#f59e0b"    },
    { label: "Completed",         value: completed.toLocaleString(),            accent: "#10b981"    },
    { label: "Turned Over",       value: turnedOver.toLocaleString(),           accent: "#8b5cf6"    },
    { label: "BOM Standards",     value: bomStdCount.toLocaleString(),          accent: "#0e7490"    },
  ];

  const GRADE_COLORS = { A: "#166534", B: "#92400e", C: "#b91c1c" } as const;
  const GRADE_BG     = { A: "#f0fdf4", B: "#fffbeb", C: "#fef2f2" } as const;

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "1300px" }}>

        {/* Back link */}
        <div style={{ marginBottom: "1.25rem" }}>
          <a href="/main-dashboard" style={{ fontSize: "0.8rem", color: ACCENT, textDecoration: "none" }}>
            ← Back to Dashboard
          </a>
        </div>

        {/* Page header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem", marginBottom: "1.75rem" }}>
          <div>
            <h1 style={{ margin: "0 0 0.2rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827" }}>
              Planning & Engineering
            </h1>
            <p style={{ margin: 0, color: "#6b7280", fontSize: "0.875rem" }}>
              BOM · MRP · Production Capacity · Budget vs Actual · Subcon Gate
            </p>
          </div>
          <div style={{ display: "flex", gap: "0.65rem", flexWrap: "wrap" }}>
            <a href="/planning/bom/new" style={{
              padding: "0.5rem 1rem", borderRadius: "6px", background: "#fff",
              color: ACCENT, fontSize: "0.8rem", fontWeight: 600, textDecoration: "none",
              border: `1px solid ${ACCENT}`,
            }}>+ BOM Entry</a>
            <a href="/planning/change-orders/new" style={{
              padding: "0.5rem 1rem", borderRadius: "6px", background: ACCENT,
              color: "#fff", fontSize: "0.8rem", fontWeight: 600, textDecoration: "none",
            }}>+ Change Order</a>
          </div>
        </div>

        {/* ── KPI row ─────────────────────────────────────────────────────── */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
          gap: "0.85rem",
          marginBottom: "1.75rem",
        }}>
          {kpiCards.map((k) => (
            <div key={k.label} style={{ ...card, padding: "1rem 1.1rem", borderTop: `3px solid ${k.accent}` }}>
              <div style={{ fontSize: "1.6rem", fontWeight: 700, color: "#111827", lineHeight: 1 }}>{k.value}</div>
              <div style={{ fontSize: "0.72rem", color: "#6b7280", marginTop: "0.35rem", lineHeight: 1.3 }}>{k.label}</div>
            </div>
          ))}
        </div>

        {/* ── Row 1: Unit Status Donut + BOM Coverage ──────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,5fr) minmax(0,7fr)", gap: "1.25rem", marginBottom: "1.25rem" }}>

          {/* Unit Status Donut */}
          <div style={card}>
            <div style={sectionHead}>
              <span style={{ width: "4px", height: "16px", background: ACCENT, borderRadius: "2px", display: "inline-block" }} />
              <span style={{ fontWeight: 600, fontSize: "0.9rem", color: "#111827" }}>Unit Status Summary</span>
              <span style={{ marginLeft: "auto", fontSize: "0.75rem", color: "#9ca3af" }}>{totalUnits} total</span>
            </div>
            <div style={{ padding: "1.25rem", display: "flex", alignItems: "center", gap: "1.5rem", flexWrap: "wrap" }}>
              {/* Donut */}
              <div style={{ position: "relative", flexShrink: 0 }}>
                <DonutChart segs={donutSegs} />
                <div style={{
                  position: "absolute", inset: 0,
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                  pointerEvents: "none",
                }}>
                  <span style={{ fontSize: "1.35rem", fontWeight: 700, color: "#111827", lineHeight: 1 }}>
                    {totalUnits.toLocaleString()}
                  </span>
                  <span style={{ fontSize: "0.65rem", color: "#9ca3af", marginTop: "0.1rem" }}>TOTAL</span>
                </div>
              </div>
              {/* Legend */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.55rem", flex: 1, minWidth: "130px" }}>
                {UNIT_STATUS_ORDER.map((s) => {
                  const cnt   = unitByStatus.get(s) ?? 0;
                  const meta  = UNIT_STATUSES[s];
                  const share = pct(cnt, totalUnits);
                  return (
                    <div key={s} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: meta.color, flexShrink: 0 }} />
                      <span style={{ fontSize: "0.78rem", color: "#374151", flex: 1 }}>{meta.label}</span>
                      <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#111827", minWidth: "28px", textAlign: "right" }}>
                        {cnt.toLocaleString()}
                      </span>
                      <span style={{ fontSize: "0.7rem", color: "#9ca3af", minWidth: "34px", textAlign: "right" }}>
                        {share}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* BOM Coverage per project */}
          <div style={card}>
            <div style={sectionHead}>
              <span style={{ width: "4px", height: "16px", background: "#0e7490", borderRadius: "2px", display: "inline-block" }} />
              <span style={{ fontWeight: 600, fontSize: "0.9rem", color: "#111827" }}>BOM Coverage</span>
              <span style={{ marginLeft: "auto", fontSize: "0.75rem", color: "#9ca3af" }}>
                activities with BOM defined
              </span>
            </div>
            <div style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "0.85rem" }}>
              {activeProjectRows.length === 0 ? (
                <p style={{ margin: 0, color: "#9ca3af", fontSize: "0.85rem" }}>No active projects.</p>
              ) : (
                activeProjectRows.map((proj) => {
                  const cov = coverageByProject.get(proj.id) ?? { total: 0, covered: 0 };
                  const p   = pct(cov.covered, cov.total);
                  const barColor = p === 100 ? "#10b981" : p >= 60 ? ACCENT : p >= 30 ? "#f59e0b" : "#ef4444";
                  return (
                    <div key={proj.id}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "0.3rem" }}>
                        <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "#374151", maxWidth: "260px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {proj.name}
                        </span>
                        <span style={{ fontSize: "0.75rem", color: "#6b7280", flexShrink: 0, marginLeft: "0.5rem" }}>
                          {cov.covered}/{cov.total} — <strong style={{ color: barColor }}>{p}%</strong>
                        </span>
                      </div>
                      <div style={{ height: "8px", background: "#f3f4f6", borderRadius: "999px", overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${p}%`, background: barColor, borderRadius: "999px", transition: "width 0.3s" }} />
                      </div>
                    </div>
                  );
                })
              )}
              {activeProjectRows.length > 0 && (
                <a href="/planning/bom" style={{ fontSize: "0.78rem", color: ACCENT, textDecoration: "none", marginTop: "0.25rem" }}>
                  View full BOM register →
                </a>
              )}
            </div>
          </div>
        </div>

        {/* ── Row 2: Budget vs Actual ───────────────────────────────────────── */}
        <div style={{ ...card, marginBottom: "1.25rem" }}>
          <div style={sectionHead}>
            <span style={{ width: "4px", height: "16px", background: "#8b5cf6", borderRadius: "2px", display: "inline-block" }} />
            <span style={{ fontWeight: 600, fontSize: "0.9rem", color: "#111827" }}>Budget vs Committed Spend</span>
            <div style={{ marginLeft: "auto", display: "flex", gap: "1.25rem", alignItems: "center" }}>
              <span style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.75rem", color: "#6b7280" }}>
                <span style={{ width: "10px", height: "10px", background: "#e0e7ff", borderRadius: "2px", display: "inline-block" }} />
                Contract Value
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.75rem", color: "#6b7280" }}>
                <span style={{ width: "10px", height: "10px", background: ACCENT, borderRadius: "2px", display: "inline-block" }} />
                Committed POs
              </span>
            </div>
          </div>

          {budgetRows.length === 0 ? (
            <div style={{ padding: "2rem", textAlign: "center", color: "#9ca3af", fontSize: "0.875rem" }}>
              No active projects with budget data.
            </div>
          ) : (
            <div style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
              {/* Total bar */}
              <div style={{ padding: "0.85rem 1rem", background: "#f9fafb", borderRadius: "6px", display: "flex", gap: "2rem", flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontSize: "0.68rem", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em" }}>Total Contract</div>
                  <div style={{ fontSize: "1rem", fontWeight: 700, color: "#111827" }}>{shortPHP(totalBudget)}</div>
                </div>
                <div>
                  <div style={{ fontSize: "0.68rem", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em" }}>Total Committed</div>
                  <div style={{ fontSize: "1rem", fontWeight: 700, color: ACCENT }}>{shortPHP(totalCommitted)}</div>
                </div>
                <div>
                  <div style={{ fontSize: "0.68rem", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em" }}>Utilisation</div>
                  <div style={{ fontSize: "1rem", fontWeight: 700, color: totalCommitted > totalBudget ? "#b91c1c" : "#166534" }}>
                    {pct(totalCommitted, totalBudget)}%
                  </div>
                </div>
              </div>

              {/* Per-project bars */}
              {budgetRows.map((r) => {
                const bPct = Math.min(pct(r.budget, maxBudget), 100);
                const cPct = r.budget > 0 ? Math.min(Math.round((r.committed / r.budget) * 100), 130) : 0;
                const overBudget = r.committed > r.budget;
                return (
                  <div key={r.id}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "0.35rem" }}>
                      <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "#374151", maxWidth: "280px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {r.name}
                      </span>
                      <div style={{ display: "flex", gap: "1rem", flexShrink: 0, marginLeft: "0.75rem" }}>
                        <span style={{ fontSize: "0.75rem", color: "#6b7280" }}>
                          Contract: <strong style={{ color: "#374151" }}>{shortPHP(r.budget)}</strong>
                        </span>
                        <span style={{ fontSize: "0.75rem", color: "#6b7280" }}>
                          Committed: <strong style={{ color: overBudget ? "#b91c1c" : ACCENT }}>{shortPHP(r.committed)}</strong>
                        </span>
                      </div>
                    </div>
                    {/* Contract value bar (scaled) */}
                    <div style={{ position: "relative", height: "22px", display: "flex", flexDirection: "column", gap: "3px" }}>
                      <div style={{ height: "9px", background: "#e0e7ff", borderRadius: "999px", overflow: "hidden", width: `${bPct}%` }}>
                        <div style={{ height: "100%", width: "100%", background: "#c7d2fe" }} />
                      </div>
                      <div style={{ height: "9px", background: "#f3f4f6", borderRadius: "999px", overflow: "hidden", width: `${bPct}%` }}>
                        <div style={{
                          height: "100%",
                          width: `${Math.min(cPct, 100)}%`,
                          background: overBudget ? "#ef4444" : ACCENT,
                          borderRadius: "999px",
                        }} />
                      </div>
                    </div>
                  </div>
                );
              })}
              <p style={{ margin: "0.25rem 0 0", fontSize: "0.72rem", color: "#9ca3af" }}>
                Committed = approved/delivered PO amounts. Actual cost reporting available in Finance → Reports.
              </p>
            </div>
          )}
        </div>

        {/* ── Row 3: Subcon Capacity Gate + MRP Status ─────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: "1.25rem" }}>

          {/* Subcon Capacity Gate */}
          <div style={card}>
            <div style={sectionHead}>
              <span style={{ width: "4px", height: "16px", background: "#f59e0b", borderRadius: "2px", display: "inline-block" }} />
              <span style={{ fontWeight: 600, fontSize: "0.9rem", color: "#111827" }}>Subcon Capacity Gate</span>
              <span style={{ marginLeft: "auto", fontSize: "0.75rem", color: "#9ca3af" }}>
                {totalSubcons} registered
              </span>
            </div>
            <div style={{ padding: "1.25rem" }}>
              {/* Summary pills */}
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

              {/* Grade breakdown */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
                {(["A", "B", "C"] as const).map((g) => {
                  const avail   = gradeCount[g].avail;
                  const stopped = gradeCount[g].stopped;
                  const total_g = avail + stopped;
                  const gColor  = GRADE_COLORS[g];
                  const gBg     = GRADE_BG[g];
                  return (
                    <div key={g} style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
                      <span style={{
                        width: "28px", height: "28px", borderRadius: "50%",
                        background: gBg, color: gColor,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: "0.8rem", fontWeight: 800, flexShrink: 0,
                        border: `2px solid ${gColor}33`,
                      }}>
                        {g}
                      </span>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.2rem" }}>
                          <span style={{ fontSize: "0.78rem", color: "#374151", fontWeight: 600 }}>
                            Grade {g} — {total_g} subcon{total_g !== 1 ? "s" : ""}
                          </span>
                          {stopped > 0 && (
                            <span style={{ fontSize: "0.68rem", color: "#b91c1c", fontWeight: 600 }}>
                              {stopped} stopped
                            </span>
                          )}
                        </div>
                        <div style={{ height: "6px", background: "#f3f4f6", borderRadius: "999px", overflow: "hidden" }}>
                          <div style={{
                            height: "100%",
                            width: total_g > 0 ? `${pct(avail, total_g)}%` : "0%",
                            background: gColor,
                            borderRadius: "999px",
                          }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <a href="/master-list/subcontractors" style={{ display: "inline-block", marginTop: "1rem", fontSize: "0.78rem", color: ACCENT, textDecoration: "none" }}>
                Manage subcontractors →
              </a>
            </div>
          </div>

          {/* MRP Status Summary */}
          <div style={card}>
            <div style={sectionHead}>
              <span style={{ width: "4px", height: "16px", background: "#ef4444", borderRadius: "2px", display: "inline-block" }} />
              <span style={{ fontWeight: 600, fontSize: "0.9rem", color: "#111827" }}>MRP Status</span>
              <span style={{ marginLeft: "auto", fontSize: "0.75rem", color: "#9ca3af" }}>
                {bomMaterials.size} material{bomMaterials.size !== 1 ? "s" : ""} in BOM
              </span>
            </div>
            <div style={{ padding: "1.25rem" }}>
              {/* MRP donut */}
              <div style={{ display: "flex", alignItems: "center", gap: "1.25rem", marginBottom: "1.25rem", flexWrap: "wrap" }}>
                <div style={{ position: "relative", flexShrink: 0 }}>
                  <DonutChart
                    segs={[
                      { value: mrpOrder, color: "#ef4444", label: "Order Now" },
                      { value: mrpLow,   color: "#f59e0b", label: "Low Stock" },
                      { value: mrpOk,    color: "#10b981", label: "Sufficient" },
                    ]}
                    cx={52} cy={52} r={38} sw={16}
                  />
                  <div style={{
                    position: "absolute", inset: 0,
                    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                    pointerEvents: "none",
                  }}>
                    <span style={{ fontSize: "1.1rem", fontWeight: 700, color: "#111827", lineHeight: 1 }}>
                      {bomMaterials.size}
                    </span>
                    <span style={{ fontSize: "0.6rem", color: "#9ca3af" }}>ITEMS</span>
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.55rem", flex: 1 }}>
                  {[
                    { label: "Order Now",  count: mrpOrder, color: "#b91c1c", bg: "#fef2f2", border: "#fecaca" },
                    { label: "Low Stock",  count: mrpLow,   color: "#92400e", bg: "#fffbeb", border: "#fde68a" },
                    { label: "Sufficient", count: mrpOk,    color: "#166534", bg: "#f0fdf4", border: "#bbf7d0" },
                  ].map((s) => (
                    <div key={s.label} style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "0.4rem 0.65rem", borderRadius: "6px",
                      background: s.bg, border: `1px solid ${s.border}`,
                    }}>
                      <span style={{ fontSize: "0.78rem", fontWeight: 600, color: s.color }}>{s.label}</span>
                      <span style={{ fontSize: "1rem", fontWeight: 800, color: s.color }}>{s.count}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: "flex", gap: "0.65rem", flexWrap: "wrap" }}>
                <a href="/planning/mrp-queue" style={{
                  padding: "0.45rem 0.85rem", borderRadius: "6px", fontSize: "0.78rem",
                  fontWeight: 600, textDecoration: "none",
                  background: mrpOrder > 0 ? "#fef2f2" : "#eff6ff",
                  color: mrpOrder > 0 ? "#b91c1c" : ACCENT,
                  border: `1px solid ${mrpOrder > 0 ? "#fecaca" : "#bfdbfe"}`,
                }}>
                  {mrpOrder > 0 ? `${mrpOrder} items to order →` : "View full MRP Queue →"}
                </a>
                <a href="/planning/bom" style={{
                  padding: "0.45rem 0.85rem", borderRadius: "6px", fontSize: "0.78rem",
                  fontWeight: 600, textDecoration: "none",
                  background: "#f9fafb", color: "#374151", border: "1px solid #e5e7eb",
                }}>
                  BOM Register →
                </a>
              </div>

              {/* BOM std count context */}
              <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid #f3f4f6" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", color: "#6b7280", marginBottom: "0.25rem" }}>
                  <span>Active BOM standards</span>
                  <strong style={{ color: "#111827" }}>{bomStdCount.toLocaleString()}</strong>
                </div>
                <p style={{ margin: 0, fontSize: "0.7rem", color: "#9ca3af" }}>
                  MRP stock status is global across all projects. Open the MRP Queue for per-project breakdown.
                </p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </main>
  );
}
