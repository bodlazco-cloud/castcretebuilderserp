export const dynamic = "force-dynamic";
import type React from "react";
import { db } from "@/db";
import { projects } from "@/db/schema";
import { sql } from "drizzle-orm";
import { getAuthUser } from "@/lib/supabase-server";

const ACCENT = "#1a56db";

type MrpRow = {
  material_id:        string;
  material_name:      string;
  unit_of_measure:    string;
  ntp_count:          string;
  baseline_qty:       string;
  already_issued_qty: string;
  unit_rate_php:      string | null;
  stock_on_hand:      string;
  stock_reserved:     string;
};

const fmtQty = (v: string | number) =>
  Number(v).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 4 });

const fmtPhp = (v: number) =>
  `${v < 0 ? "(" : ""}PHP ${Math.abs(v).toLocaleString("en-PH", { minimumFractionDigits: 2 })}${v < 0 ? ")" : ""}`;

const thStyle: React.CSSProperties = {
  padding: "0.65rem 1rem", fontWeight: 600, fontSize: "0.75rem",
  color: "#374151", textTransform: "uppercase" as const,
  letterSpacing: "0.04em", borderBottom: "1px solid #e5e7eb", whiteSpace: "nowrap",
};
const tdStyle: React.CSSProperties = {
  padding: "0.7rem 1rem", fontSize: "0.875rem", borderBottom: "1px solid #f3f4f6",
};

export default async function MrpQueuePage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string }>;
}) {
  await getAuthUser();
  const { project: projectId } = await searchParams;

  const projectRows = await db
    .select({ id: projects.id, name: projects.name })
    .from(projects)
    .orderBy(projects.name);

  let rows: MrpRow[] = [];

  if (projectId) {
    rows = await db.execute<MrpRow>(sql`
      SELECT
        mq.material_id,
        mq.material_name,
        mq.unit_of_measure,
        mq.ntp_count,
        mq.baseline_qty,
        mq.already_issued_qty,
        mq.unit_rate_php,
        COALESCE(ist.quantity_on_hand,  0) AS stock_on_hand,
        COALESCE(ist.quantity_reserved, 0) AS stock_reserved
      FROM mrp_queue mq
      LEFT JOIN inventory_stock ist
             ON ist.material_id = mq.material_id
            AND ist.project_id  = ${projectId}
      WHERE mq.project_id = ${projectId}
      ORDER BY mq.material_name
    `);
  }

  // Derived totals
  const summaryItems = rows.map((r) => {
    const baseline   = Number(r.baseline_qty);
    const issued     = Number(r.already_issued_qty);
    const available  = Math.max(0, Number(r.stock_on_hand) - Number(r.stock_reserved));
    const net        = Math.max(0, baseline - issued - available);
    const rate       = Number(r.unit_rate_php ?? 0);
    return { baseline, issued, available, net, cost: net > 0 && rate > 0 ? net * rate : 0 };
  });

  const shortCount      = summaryItems.filter((s) => s.net > 0).length;
  const coveredCount    = summaryItems.filter((s) => s.net === 0 && s.baseline > 0).length;
  const notStartedCount = summaryItems.filter((s) => s.issued === 0 && s.available === 0).length;
  const totalNetCost    = summaryItems.reduce((sum, s) => sum + s.cost, 0);

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "1300px" }}>
        <div style={{ marginBottom: "1.25rem" }}>
          <a href="/planning" style={{ fontSize: "0.8rem", color: ACCENT, textDecoration: "none" }}>
            ← Planning & Engineering
          </a>
        </div>

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem", marginBottom: "1.5rem" }}>
          <div>
            <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827", borderLeft: `4px solid ${ACCENT}`, paddingLeft: "0.75rem" }}>
              MRP Queue
            </h1>
            <p style={{ margin: 0, color: "#6b7280", fontSize: "0.9rem", paddingLeft: "1.25rem" }}>
              Gross BOM demand (active NTPs) − issued − stock on hand = net to purchase
            </p>
          </div>
          <a
            href="/procurement/pr"
            style={{
              padding: "0.55rem 1.1rem", borderRadius: "6px", border: `1px solid ${ACCENT}`,
              color: ACCENT, fontSize: "0.875rem", fontWeight: 600, textDecoration: "none",
            }}
          >
            View Purchase Requisitions →
          </a>
        </div>

        {/* Chain of Necessity notice */}
        <div style={{
          display: "flex", alignItems: "flex-start", gap: "0.75rem",
          padding: "0.9rem 1.1rem", marginBottom: "1.5rem",
          background: "#eff6ff", borderLeft: "4px solid #3b82f6",
        }}>
          <p style={{ margin: 0, fontSize: "0.82rem", color: "#1e40af" }}>
            <strong>Chain of Necessity:</strong> PRs are raised per-unit when a task assignment is confirmed —
            each material line traces to a specific unit and NTP. Use{" "}
            <a href="/procurement/pr" style={{ color: "#1d4ed8" }}>Procurement → PRs</a> to convert
            MRP demand into requisitions. This view is read-only aggregate demand.
          </p>
        </div>

        {/* Project selector */}
        <form method="GET" style={{ marginBottom: "1.5rem", display: "flex", gap: "0.75rem", alignItems: "center" }}>
          <select
            name="project"
            defaultValue={projectId ?? ""}
            style={{
              padding: "0.55rem 0.9rem", border: "1px solid #d1d5db", borderRadius: "6px",
              fontSize: "0.875rem", minWidth: "260px", background: "#fff",
            }}
          >
            <option value="">Select project…</option>
            {projectRows.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <button
            type="submit"
            style={{
              padding: "0.55rem 1.1rem", borderRadius: "6px", background: ACCENT,
              color: "#fff", fontSize: "0.875rem", fontWeight: 600, border: "none", cursor: "pointer",
            }}
          >
            View Queue
          </button>
        </form>

        {!projectId && (
          <div style={{ padding: "3rem", background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", textAlign: "center", color: "#9ca3af" }}>
            Select a project above to view its material requirements queue.
          </div>
        )}

        {projectId && rows.length === 0 && (
          <div style={{ padding: "3rem", background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", textAlign: "center", color: "#9ca3af" }}>
            No active NTPs with BOM standards found for this project.
          </div>
        )}

        {rows.length > 0 && (
          <>
            {/* Summary badges */}
            <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1rem", flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ padding: "0.3rem 0.75rem", borderRadius: "999px", fontSize: "0.78rem", fontWeight: 700, background: "#fef2f2", color: "#b91c1c" }}>
                {shortCount} Short
              </span>
              <span style={{ padding: "0.3rem 0.75rem", borderRadius: "999px", fontSize: "0.78rem", fontWeight: 700, background: "#fffbeb", color: "#b45309" }}>
                {notStartedCount} Not Started
              </span>
              <span style={{ padding: "0.3rem 0.75rem", borderRadius: "999px", fontSize: "0.78rem", fontWeight: 700, background: "#f0fdf4", color: "#166534" }}>
                {coveredCount} Covered
              </span>
              {totalNetCost > 0 && (
                <span style={{ marginLeft: "auto", fontSize: "0.82rem", fontWeight: 700, color: "#111827", fontFamily: "monospace" }}>
                  Net procurement exposure: {fmtPhp(totalNetCost)}
                </span>
              )}
            </div>

            <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden" }}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "1000px" }}>
                  <thead>
                    <tr style={{ background: "#f9fafb" }}>
                      <th style={thStyle}>Material</th>
                      <th style={{ ...thStyle, textAlign: "right" }}>NTPs</th>
                      <th style={{ ...thStyle, textAlign: "right" }}>Gross Demand</th>
                      <th style={{ ...thStyle, textAlign: "right" }}>Issued</th>
                      <th style={{ ...thStyle, textAlign: "right" }}>Stock on Hand</th>
                      <th style={{ ...thStyle, textAlign: "right", color: ACCENT }}>Net to Purchase</th>
                      <th style={{ ...thStyle, textAlign: "right" }}>Net Cost</th>
                      <th style={thStyle}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, idx) => {
                      const s = summaryItems[idx];
                      const availStock = s.available;

                      const isCovered    = s.net === 0 && s.baseline > 0;
                      const isNotStarted = s.issued === 0 && availStock === 0;
                      const isShort      = s.net > 0;

                      const statusLabel = isCovered ? "Covered" : isNotStarted ? "Not Started" : isShort ? "Short" : "Partial";
                      const statusStyle: React.CSSProperties = isCovered
                        ? { background: "#f0fdf4", color: "#166534" }
                        : isNotStarted
                          ? { background: "#fffbeb", color: "#b45309" }
                          : isShort
                            ? { background: "#fef2f2", color: "#b91c1c" }
                            : { background: "#eff6ff", color: "#1d4ed8" };

                      return (
                        <tr key={r.material_id}>
                          <td style={tdStyle}>
                            <span style={{ fontWeight: 600, color: "#111827" }}>{r.material_name}</span>
                            <span style={{ display: "block", fontSize: "0.72rem", color: "#6b7280" }}>
                              {r.unit_of_measure}
                            </span>
                          </td>
                          <td style={{ ...tdStyle, textAlign: "right", fontFamily: "monospace" }}>
                            {r.ntp_count}
                          </td>
                          <td style={{ ...tdStyle, textAlign: "right", fontFamily: "monospace" }}>
                            {fmtQty(r.baseline_qty)}
                          </td>
                          <td style={{ ...tdStyle, textAlign: "right", fontFamily: "monospace", color: s.issued > 0 ? "#111827" : "#9ca3af" }}>
                            {fmtQty(r.already_issued_qty)}
                          </td>
                          <td style={{ ...tdStyle, textAlign: "right", fontFamily: "monospace", color: availStock > 0 ? "#1d4ed8" : "#9ca3af" }}>
                            {availStock > 0 ? fmtQty(String(availStock)) : "—"}
                          </td>
                          <td style={{ ...tdStyle, textAlign: "right", fontFamily: "monospace", fontWeight: isShort ? 700 : 400, color: isShort ? "#b91c1c" : "#166534" }}>
                            {s.net > 0 ? fmtQty(String(s.net)) : "—"}
                          </td>
                          <td style={{ ...tdStyle, textAlign: "right", fontFamily: "monospace", fontWeight: s.cost > 0 ? 700 : 400, color: s.cost > 0 ? "#b91c1c" : "#9ca3af" }}>
                            {s.cost > 0 ? fmtPhp(s.cost) : "—"}
                          </td>
                          <td style={tdStyle}>
                            <span style={{
                              display: "inline-block", padding: "0.2rem 0.6rem", borderRadius: "999px",
                              fontSize: "0.72rem", fontWeight: 700, ...statusStyle,
                            }}>
                              {statusLabel}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <p style={{ marginTop: "0.75rem", fontSize: "0.75rem", color: "#9ca3af" }}>
              Gross Demand = <code>mrp_queue.baseline_qty</code> (Admin BOM × active NTPs, BEG/END buffers applied).
              Stock on Hand = <code>inventory_stock.quantity_on_hand − quantity_reserved</code> for this project.
              Net = Demand − Issued − Available Stock. Rates admin-locked via <code>bom_standards</code> or <code>materials.admin_price</code>.
            </p>
          </>
        )}
      </div>
    </main>
  );
}
