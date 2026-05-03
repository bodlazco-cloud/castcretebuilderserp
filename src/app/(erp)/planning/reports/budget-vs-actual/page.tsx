export const dynamic = "force-dynamic";
import type React from "react";
import { db } from "@/db";
import { projects } from "@/db/schema";
import { sql, eq } from "drizzle-orm";
import { getAuthUser } from "@/lib/supabase-server";

const ACCENT = "#1a56db";

type MrpRow = {
  material_id:       string;
  material_name:     string;
  unit_of_measure:   string;
  ntp_count:         string;
  baseline_qty:      string;
  already_issued_qty: string;
  unit_rate_php:     string | null;
};

export default async function BudgetVsActualPage({
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

  let bvaRows: MrpRow[] = [];
  let selectedProject = projectRows.find((p) => p.id === projectId) ?? null;

  if (projectId) {
    bvaRows = await db.execute<MrpRow>(
      sql`SELECT material_id, material_name, unit_of_measure, ntp_count,
                 baseline_qty, already_issued_qty, unit_rate_php
            FROM mrp_queue
           WHERE project_id = ${projectId}
           ORDER BY material_name`,
    );
  }

  const overCount  = bvaRows.filter((r) => Number(r.already_issued_qty) > Number(r.baseline_qty)).length;
  const pendCount  = bvaRows.filter((r) => Number(r.already_issued_qty) === 0).length;

  const fmtQty = (v: string) =>
    Number(v).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 4 });

  const fmtPhp = (v: number) =>
    `${v < 0 ? "(" : ""}PHP ${Math.abs(v).toLocaleString("en-PH", { minimumFractionDigits: 2 })}${v < 0 ? ")" : ""}`;

  const thStyle: React.CSSProperties = {
    padding: "0.65rem 1rem", textAlign: "left", fontWeight: 600,
    fontSize: "0.75rem", color: "#6b7280", textTransform: "uppercase" as const,
    letterSpacing: "0.05em", borderBottom: "1px solid #e5e7eb", whiteSpace: "nowrap",
  };
  const tdStyle: React.CSSProperties = {
    padding: "0.7rem 1rem", fontSize: "0.875rem", color: "#374151",
    borderBottom: "1px solid #f3f4f6",
  };

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "1200px" }}>
        <div style={{ marginBottom: "1.25rem" }}>
          <a href="/planning" style={{ fontSize: "0.8rem", color: ACCENT, textDecoration: "none" }}>← Planning & Engineering</a>
        </div>

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem", marginBottom: "1.5rem" }}>
          <div>
            <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827", borderLeft: `4px solid ${ACCENT}`, paddingLeft: "0.75rem" }}>
              Budget vs. Actual — Material Variance
            </h1>
            <p style={{ margin: 0, color: "#6b7280", fontSize: "0.9rem", paddingLeft: "1.25rem" }}>
              BOM baseline (active NTPs, no buffers) vs. actual issued quantities from site.
              Rates are admin-locked — never overridden.
            </p>
          </div>
          {selectedProject && (
            <button
              onClick={() => typeof window !== "undefined" && window.print()}
              style={{
                padding: "0.5rem 1rem", borderRadius: "6px", border: "1px solid #d1d5db",
                background: "#fff", color: "#374151", fontSize: "0.875rem", cursor: "pointer",
              }}
            >
              Print / Export
            </button>
          )}
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
            View Report
          </button>
        </form>

        {!projectId && (
          <div style={{ padding: "3rem", background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", textAlign: "center", color: "#9ca3af" }}>
            Select a project above to view its material variance report.
          </div>
        )}

        {projectId && bvaRows.length === 0 && (
          <div style={{ padding: "3rem", background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", textAlign: "center", color: "#9ca3af" }}>
            No active NTPs with BOM standards found for this project.
          </div>
        )}

        {bvaRows.length > 0 && (
          <>
            {/* Summary badges */}
            <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1rem", flexWrap: "wrap" }}>
              <span style={{ padding: "0.3rem 0.75rem", borderRadius: "999px", fontSize: "0.78rem", fontWeight: 700, background: "#fef2f2", color: "#b91c1c" }}>
                {overCount} Over-Budget
              </span>
              <span style={{ padding: "0.3rem 0.75rem", borderRadius: "999px", fontSize: "0.78rem", fontWeight: 700, background: "#fffbeb", color: "#b45309" }}>
                {pendCount} Not Yet Issued
              </span>
              <span style={{ padding: "0.3rem 0.75rem", borderRadius: "999px", fontSize: "0.78rem", fontWeight: 700, background: "#f0fdf4", color: "#166534" }}>
                {bvaRows.length - overCount - pendCount} On-Budget
              </span>
            </div>

            <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden" }}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "860px" }}>
                  <thead>
                    <tr style={{ background: "#f9fafb" }}>
                      <th style={thStyle}>Material</th>
                      <th style={{ ...thStyle, textAlign: "right" }}>Budget Qty</th>
                      <th style={{ ...thStyle, textAlign: "right" }}>Actual Issued</th>
                      <th style={{ ...thStyle, textAlign: "right" }}>Variance Qty</th>
                      <th style={{ ...thStyle, textAlign: "right" }}>Cost Variance (PHP)</th>
                      <th style={thStyle}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bvaRows.map((r) => {
                      const budget   = Number(r.baseline_qty);
                      const actual   = Number(r.already_issued_qty);
                      const rate     = Number(r.unit_rate_php ?? 0);
                      const varQty   = actual - budget;
                      const varCost  = varQty * rate;
                      const isOver   = varQty > 0;
                      const isPend   = actual === 0;

                      const statusLabel = isPend ? "Pending" : isOver ? "Over-Budget" : "On-Budget";
                      const statusStyle: React.CSSProperties = isPend
                        ? { background: "#fffbeb", color: "#b45309" }
                        : isOver
                          ? { background: "#fef2f2", color: "#b91c1c" }
                          : { background: "#f0fdf4", color: "#166534" };

                      return (
                        <tr key={r.material_id}>
                          <td style={tdStyle}>
                            <span style={{ fontWeight: 600, color: "#111827" }}>{r.material_name}</span>
                            <span style={{ display: "block", fontSize: "0.75rem", color: "#6b7280" }}>
                              {r.unit_of_measure} · {r.ntp_count} active NTP{Number(r.ntp_count) !== 1 ? "s" : ""}
                            </span>
                          </td>
                          <td style={{ ...tdStyle, textAlign: "right", fontFamily: "monospace" }}>
                            {fmtQty(r.baseline_qty)}
                          </td>
                          <td style={{ ...tdStyle, textAlign: "right", fontFamily: "monospace", fontWeight: isOver ? 700 : 400, color: isOver ? "#b91c1c" : "#374151" }}>
                            {fmtQty(r.already_issued_qty)}
                          </td>
                          <td style={{ ...tdStyle, textAlign: "right", fontFamily: "monospace", color: isOver ? "#b91c1c" : isPend ? "#6b7280" : "#166534" }}>
                            {varQty > 0 ? "+" : ""}{fmtQty(String(varQty))}
                          </td>
                          <td style={{ ...tdStyle, textAlign: "right", fontFamily: "monospace", fontWeight: isOver ? 700 : 400, color: isOver ? "#b91c1c" : "#166534" }}>
                            {rate > 0 ? fmtPhp(varCost) : "—"}
                          </td>
                          <td style={{ ...tdStyle }}>
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
              Budget = BOM baseline qty for all active NTPs (no BEG/END buffer). Actual = cumulative issued per <code>resource_forecasts.actual_issued_qty</code>.
              Rates sourced from admin-locked <code>bom_standards.base_rate_php</code> or <code>materials.admin_price</code>.
            </p>
          </>
        )}
      </div>
    </main>
  );
}
