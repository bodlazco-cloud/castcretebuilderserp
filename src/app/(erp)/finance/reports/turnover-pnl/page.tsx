export const dynamic = "force-dynamic";
import { db } from "@/db";
import { projectUnits, unitTurnovers, projects, payables, invoices } from "@/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { getAuthUser } from "@/lib/supabase-server";

const ACCENT = "#1a56db";

const fmtPhp = (n: number) =>
  `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function pctBar(value: number, total: number, color: string) {
  const pct = total > 0 ? Math.min((value / total) * 100, 100) : 0;
  return { pct: pct.toFixed(1), bar: Math.round(pct), color };
}

export default async function TurnoverPnlPage() {
  await getAuthUser();

  // ── All projects with units ──────────────────────────────────────────────
  const projectList = await db
    .select({ id: projects.id, name: projects.name })
    .from(projects)
    .orderBy(projects.name);

  // ── Unit counts by category ──────────────────────────────────────────────
  const unitCounts = await db
    .select({
      projectId:       projectUnits.projectId,
      currentCategory: projectUnits.currentCategory,
      count:           sql<number>`COUNT(*)`,
    })
    .from(projectUnits)
    .groupBy(projectUnits.projectId, projectUnits.currentCategory);

  // ── Turnover events ──────────────────────────────────────────────────────
  const turnovers = await db
    .select({
      id:            unitTurnovers.id,
      projectId:     unitTurnovers.projectId,
      turnoverDate:  unitTurnovers.turnoverDate,
      cipCost:       unitTurnovers.cipCost,
      contractPrice: unitTurnovers.contractPrice,
      unitCode:      unitTurnovers.unitCode,
    })
    .from(unitTurnovers)
    .orderBy(desc(unitTurnovers.turnoverDate))
    .limit(200);

  // ── Invoice collections ──────────────────────────────────────────────────
  const invoiceAgg = await db
    .select({
      projectId:      invoices.projectId,
      totalCollected: sql<string>`COALESCE(SUM(CASE WHEN collected_at IS NOT NULL THEN collection_amount::numeric ELSE 0 END), 0)`,
      totalBilled:    sql<string>`COALESCE(SUM(CASE WHEN submitted_at IS NOT NULL THEN gross_accomplishment::numeric ELSE 0 END), 0)`,
    })
    .from(invoices)
    .groupBy(invoices.projectId);

  // ── Certified payables (total project costs) ────────────────────────────
  const payableAgg = await db
    .select({
      projectId:  payables.projectId,
      totalCost:  sql<string>`COALESCE(SUM(COALESCE(net_payable, gross_amount)::numeric), 0)`,
    })
    .from(payables)
    .where(eq(payables.status, "APPROVED"))
    .groupBy(payables.projectId);

  // ── Build per-project P&L ────────────────────────────────────────────────
  type ProjectPnl = {
    id: string; name: string;
    totalUnits: number; turnedOver: number; inProgress: number;
    turnoverRatio: number;
    recognizedRevenue: number; deferredRevenue: number;
    cogs: number; cipAsset: number;
    grossProfit: number; grossMarginPct: number;
  };

  type InvRow = { totalCollected: string; totalBilled: string };
  type PayRow = { totalCost: string };
  const invMap = new Map<string, InvRow>(invoiceAgg.map((r) => [String(r.projectId), r as unknown as InvRow]));
  const payMap = new Map<string, PayRow>(payableAgg.map((r) => [String(r.projectId), r as unknown as PayRow]));

  // unit counts keyed by [projectId][category]
  const countMap = new Map<string, Record<string, number>>();
  for (const row of unitCounts) {
    if (!countMap.has(row.projectId)) countMap.set(row.projectId, {});
    countMap.get(row.projectId)![row.currentCategory] = Number(row.count);
  }

  // COGS keyed by projectId (sum of cipCost from unitTurnovers)
  const cogsMap = new Map<string, number>();
  for (const t of turnovers) {
    cogsMap.set(t.projectId, (cogsMap.get(t.projectId) ?? 0) + Number(t.cipCost));
  }

  const projectPnls: ProjectPnl[] = [];
  let grandRecognized = 0, grandDeferred = 0, grandCogs = 0, grandCip = 0, grandBilled = 0;

  for (const proj of projectList) {
    const cats        = countMap.get(proj.id) ?? {};
    const turnedOver  = cats["TURNOVER"] ?? 0;
    const totalUnits  = Object.values(cats).reduce((s, c) => s + c, 0);
    const inProgress  = totalUnits - turnedOver;
    const ratio       = totalUnits > 0 ? turnedOver / totalUnits : 0;

    const inv         = invMap.get(proj.id);
    const totalColl   = Number(inv?.totalCollected ?? 0);
    const totalBilled = Number(inv?.totalBilled    ?? 0);

    const recognized  = totalColl * ratio;
    const deferred    = totalColl * (1 - ratio);

    const cogs        = cogsMap.get(proj.id) ?? 0;
    const totalCost   = Number(payMap.get(proj.id)?.totalCost ?? 0);
    const cipAsset    = totalCost * (1 - ratio);

    const grossProfit    = recognized - cogs;
    const grossMarginPct = recognized > 0 ? (grossProfit / recognized) * 100 : 0;

    if (totalUnits === 0) continue;

    grandRecognized += recognized;
    grandDeferred   += deferred;
    grandCogs       += cogs;
    grandCip        += cipAsset;
    grandBilled     += totalBilled;

    projectPnls.push({
      id: proj.id, name: proj.name,
      totalUnits, turnedOver, inProgress,
      turnoverRatio: ratio * 100,
      recognizedRevenue: recognized, deferredRevenue: deferred,
      cogs, cipAsset,
      grossProfit, grossMarginPct,
    });
  }

  const grandGrossProfit    = grandRecognized - grandCogs;
  const grandGrossMarginPct = grandRecognized > 0 ? (grandGrossProfit / grandRecognized) * 100 : 0;

  const runDate = new Date().toISOString().split("T")[0];

  // Recent turnover events
  const recentTurnovers = turnovers.slice(0, 15);

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "1200px" }}>

        {/* Header */}
        <div style={{ marginBottom: "1.5rem" }}>
          <a href="/finance" style={{ fontSize: "0.8rem", color: ACCENT, textDecoration: "none" }}>← Finance & Accounting</a>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem", marginBottom: "2rem" }}>
          <div>
            <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827", borderLeft: `4px solid ${ACCENT}`, paddingLeft: "0.75rem" }}>
              Architectural Turnover — Board P&L
            </h1>
            <p style={{ margin: 0, color: "#6b7280", fontSize: "0.875rem", paddingLeft: "1.25rem" }}>
              CIP Asset → COGS · Deferred Revenue → Recognized Revenue · Net Profit by project
            </p>
          </div>
          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
            <a href="/construction/architectural-turnover" style={{
              padding: "0.5rem 1rem", borderRadius: "6px", background: ACCENT,
              color: "#fff", textDecoration: "none", fontWeight: 600, fontSize: "0.85rem",
            }}>
              + Record Turnover
            </a>
            <span style={{ fontSize: "0.78rem", color: "#9ca3af", fontFamily: "monospace" }}>Run Date: {runDate}</span>
          </div>
        </div>

        {/* Grand total summary */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
          {[
            { label: "Recognized Revenue",  value: grandRecognized,   color: "#057a55", sub: "Turned-over units" },
            { label: "Deferred Revenue",     value: grandDeferred,     color: "#d97706", sub: "Liability — not yet turned over" },
            { label: "COGS",                 value: grandCogs,         color: "#b91c1c", sub: "CIP moved to expense" },
            { label: "CIP Asset Balance",    value: grandCip,          color: "#1a56db", sub: "Remaining construction asset" },
            { label: "Gross Profit",         value: grandGrossProfit,  color: grandGrossProfit >= 0 ? "#057a55" : "#b91c1c", sub: `${grandGrossMarginPct.toFixed(1)}% margin` },
          ].map(({ label, value, color, sub }) => (
            <div key={label} style={{ background: "#fff", borderRadius: "10px", border: "1px solid #e5e7eb", padding: "1.25rem", borderTop: `4px solid ${color}` }}>
              <div style={{ fontSize: "0.7rem", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.3rem" }}>{label}</div>
              <div style={{ fontWeight: 700, fontSize: "1.05rem", color }}>{fmtPhp(value)}</div>
              <div style={{ fontSize: "0.7rem", color: "#9ca3af", marginTop: "0.2rem" }}>{sub}</div>
            </div>
          ))}
        </div>

        {/* Per-project P&L table */}
        {projectPnls.length === 0 ? (
          <div style={{ padding: "3rem", background: "#fff", borderRadius: "10px", border: "1px solid #e5e7eb", textAlign: "center", color: "#9ca3af" }}>
            No units found. <a href="/construction/architectural-turnover" style={{ color: ACCENT, textDecoration: "none", fontWeight: 600 }}>Record a turnover →</a>
          </div>
        ) : (
          <>
            {projectPnls.map((p) => {
              const prog = pctBar(p.turnedOver, p.totalUnits, "#057a55");
              return (
                <div key={p.id} style={{ background: "#fff", borderRadius: "10px", border: "1px solid #e5e7eb", marginBottom: "1.25rem", overflow: "hidden" }}>
                  {/* Project header */}
                  <div style={{ padding: "1rem 1.5rem", background: ACCENT, color: "#fff", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>{p.name}</div>
                      <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.7)", marginTop: "0.15rem" }}>
                        {p.turnedOver} of {p.totalUnits} units turned over ({prog.pct}%)
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: "2rem", fontSize: "0.8rem" }}>
                      {[
                        { label: "Gross Profit",  value: fmtPhp(p.grossProfit),    bold: true },
                        { label: "Margin",        value: `${p.grossMarginPct.toFixed(1)}%` },
                        { label: "CIP Asset",     value: fmtPhp(p.cipAsset) },
                        { label: "Deferred Rev.", value: fmtPhp(p.deferredRevenue) },
                      ].map(({ label, value, bold }) => (
                        <div key={label} style={{ textAlign: "right" }}>
                          <div style={{ color: "rgba(255,255,255,0.65)", fontSize: "0.67rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
                          <div style={{ fontWeight: bold ? 700 : 500, fontSize: "0.85rem" }}>{value}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Progress + P&L detail */}
                  <div style={{ padding: "1.25rem 1.5rem" }}>
                    {/* Turnover progress bar */}
                    <div style={{ marginBottom: "1.25rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.3rem" }}>
                        <span>Units Turned Over</span>
                        <span style={{ fontWeight: 600, color: "#374151" }}>{p.turnedOver} / {p.totalUnits}</span>
                      </div>
                      <div style={{ width: "100%", height: "8px", background: "#f1f5f9", borderRadius: "999px", overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${prog.bar}%`, background: "#057a55", borderRadius: "999px" }} />
                      </div>
                    </div>

                    {/* Income statement mini-table */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                      {/* Revenue side */}
                      <div>
                        <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.6rem" }}>Revenue</div>
                        {[
                          { label: "Recognized Revenue", value: p.recognizedRevenue, color: "#057a55" },
                          { label: "Deferred Revenue (liability)", value: p.deferredRevenue, color: "#d97706" },
                        ].map(({ label, value, color }) => (
                          <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "0.4rem 0", borderBottom: "1px solid #f3f4f6", fontSize: "0.83rem" }}>
                            <span style={{ color: "#6b7280" }}>{label}</span>
                            <span style={{ fontFamily: "monospace", fontWeight: 600, color }}>{fmtPhp(value)}</span>
                          </div>
                        ))}
                      </div>
                      {/* Cost side */}
                      <div>
                        <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.6rem" }}>Cost & Asset</div>
                        {[
                          { label: "COGS (from CIP)",     value: p.cogs,     color: "#b91c1c" },
                          { label: "CIP Asset (remaining)", value: p.cipAsset, color: "#1a56db" },
                        ].map(({ label, value, color }) => (
                          <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "0.4rem 0", borderBottom: "1px solid #f3f4f6", fontSize: "0.83rem" }}>
                            <span style={{ color: "#6b7280" }}>{label}</span>
                            <span style={{ fontFamily: "monospace", fontWeight: 600, color }}>{fmtPhp(value)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Gross profit footer */}
                    <div style={{ marginTop: "1rem", padding: "0.75rem 1rem", background: p.grossProfit >= 0 ? "#f0fdf4" : "#fef2f2", borderRadius: "8px", border: `1px solid ${p.grossProfit >= 0 ? "#a7f3d0" : "#fecaca"}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontWeight: 700, fontSize: "0.875rem", color: p.grossProfit >= 0 ? "#065f46" : "#7f1d1d" }}>
                        Gross Profit
                      </span>
                      <div style={{ textAlign: "right" }}>
                        <span style={{ fontFamily: "monospace", fontWeight: 700, fontSize: "1rem", color: p.grossProfit >= 0 ? "#057a55" : "#b91c1c" }}>
                          {fmtPhp(p.grossProfit)}
                        </span>
                        <span style={{ marginLeft: "0.75rem", fontSize: "0.8rem", color: p.grossProfit >= 0 ? "#057a55" : "#b91c1c" }}>
                          ({p.grossMarginPct.toFixed(1)}%)
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </>
        )}

        {/* Recent turnover log */}
        {recentTurnovers.length > 0 && (
          <div style={{ background: "#fff", borderRadius: "10px", border: "1px solid #e5e7eb", overflow: "hidden", marginTop: "2rem" }}>
            <div style={{ padding: "0.85rem 1.5rem", borderBottom: "1px solid #e5e7eb", fontWeight: 700, fontSize: "0.9rem", color: "#374151" }}>
              Recent Turnover Events
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem", minWidth: "600px" }}>
                <thead>
                  <tr style={{ background: "#f9fafb" }}>
                    {["Date", "Unit Code", "CIP Cost (COGS)", "Contract Price (Revenue)", "Margin"].map((h, i) => (
                      <th key={i} style={{ padding: "0.6rem 1rem", textAlign: i >= 2 ? "right" : "left", fontWeight: 600, color: "#374151", borderBottom: "1px solid #e5e7eb", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recentTurnovers.map((t) => {
                    const cip      = Number(t.cipCost);
                    const rev      = Number(t.contractPrice);
                    const margin   = rev - cip;
                    const marginPct = rev > 0 ? (margin / rev) * 100 : 0;
                    return (
                      <tr key={t.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                        <td style={{ padding: "0.6rem 1rem", color: "#6b7280", fontFamily: "monospace", fontSize: "0.78rem" }}>{t.turnoverDate}</td>
                        <td style={{ padding: "0.6rem 1rem", fontWeight: 600, color: "#111827", fontFamily: "monospace" }}>{t.unitCode}</td>
                        <td style={{ padding: "0.6rem 1rem", textAlign: "right", fontFamily: "monospace", color: "#b91c1c" }}>{fmtPhp(cip)}</td>
                        <td style={{ padding: "0.6rem 1rem", textAlign: "right", fontFamily: "monospace", color: "#057a55" }}>{fmtPhp(rev)}</td>
                        <td style={{ padding: "0.6rem 1rem", textAlign: "right", fontFamily: "monospace", fontWeight: 600, color: margin >= 0 ? "#057a55" : "#b91c1c" }}>
                          {fmtPhp(margin)} <span style={{ fontWeight: 400, color: "#9ca3af", fontSize: "0.75rem" }}>({marginPct.toFixed(1)}%)</span>
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
