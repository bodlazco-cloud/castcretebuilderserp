export const dynamic = "force-dynamic";
import { db } from "@/db";
import { financialLedger, departments, costCenters } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { getAuthUser } from "@/lib/supabase-server";

const ACCENT = "#ff5a1f";

export default async function PnlByDeptPage() {
  await getAuthUser();

  // Aggregate inflow / outflow per department
  const deptAgg = await db
    .select({
      deptId:          financialLedger.deptId,
      deptCode:        departments.code,
      deptName:        departments.name,
      transactionType: financialLedger.transactionType,
      total:           sql<string>`sum(amount::numeric)`.as("total"),
    })
    .from(financialLedger)
    .leftJoin(departments, eq(financialLedger.deptId, departments.id))
    .groupBy(financialLedger.deptId, departments.code, departments.name, financialLedger.transactionType);

  // Build dept map
  const deptMap = new Map<string, { code: string; name: string; inflow: number; outflow: number }>();
  for (const row of deptAgg) {
    const key = row.deptId;
    if (!deptMap.has(key)) {
      deptMap.set(key, { code: row.deptCode ?? "—", name: row.deptName ?? "Unknown", inflow: 0, outflow: 0 });
    }
    const entry = deptMap.get(key)!;
    if (row.transactionType === "INFLOW")  entry.inflow  += Number(row.total ?? 0);
    if (row.transactionType === "OUTFLOW") entry.outflow += Number(row.total ?? 0);
  }

  const depts = [...deptMap.values()].sort((a, b) => (b.inflow - b.outflow) - (a.inflow - a.outflow));

  const totalInflow  = depts.reduce((s, d) => s + d.inflow, 0);
  const totalOutflow = depts.reduce((s, d) => s + d.outflow, 0);
  const netTotal     = totalInflow - totalOutflow;

  const fmt = (v: number) => `PHP ${v.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "1100px" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href="/finance" style={{ fontSize: "0.8rem", color: ACCENT, textDecoration: "none" }}>← Finance & Accounting</a>
        </div>

        <div style={{ marginBottom: "1.5rem" }}>
          <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827" }}>P&L by Department</h1>
          <p style={{ margin: 0, color: "#6b7280", fontSize: "0.9rem" }}>Inflow vs outflow aggregated from the general ledger by department.</p>
        </div>

        {/* Totals */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", marginBottom: "1.75rem" }}>
          <div style={{ background: "#fff", borderRadius: "8px", padding: "1rem 1.25rem", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", borderLeft: "4px solid #057a55" }}>
            <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "#057a55" }}>{fmt(totalInflow)}</div>
            <div style={{ fontSize: "0.78rem", color: "#6b7280", marginTop: "0.2rem" }}>Total Revenue (Inflow)</div>
          </div>
          <div style={{ background: "#fff", borderRadius: "8px", padding: "1rem 1.25rem", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", borderLeft: "4px solid #b91c1c" }}>
            <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "#b91c1c" }}>{fmt(totalOutflow)}</div>
            <div style={{ fontSize: "0.78rem", color: "#6b7280", marginTop: "0.2rem" }}>Total Expenses (Outflow)</div>
          </div>
          <div style={{ background: "#fff", borderRadius: "8px", padding: "1rem 1.25rem", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", borderLeft: `4px solid ${netTotal >= 0 ? "#057a55" : "#b91c1c"}` }}>
            <div style={{ fontSize: "1.2rem", fontWeight: 700, color: netTotal >= 0 ? "#057a55" : "#b91c1c" }}>{fmt(netTotal)}</div>
            <div style={{ fontSize: "0.78rem", color: "#6b7280", marginTop: "0.2rem" }}>Net {netTotal >= 0 ? "Profit" : "Loss"}</div>
          </div>
        </div>

        {depts.length === 0 ? (
          <div style={{ padding: "3rem", background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", textAlign: "center", color: "#9ca3af" }}>
            No ledger entries to aggregate yet.
          </div>
        ) : (
          <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
                <thead>
                  <tr style={{ background: "#f9fafb" }}>
                    {["Department", "Revenue (Inflow)", "Expenses (Outflow)", "Net", "Margin"].map((h, i) => (
                      <th key={i} style={{ padding: "0.75rem 1rem", textAlign: i === 0 ? "left" : "right", fontWeight: 600, color: "#374151", borderBottom: "1px solid #e5e7eb" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {depts.map((d) => {
                    const net    = d.inflow - d.outflow;
                    const margin = d.inflow > 0 ? ((net / d.inflow) * 100).toFixed(1) : null;
                    return (
                      <tr key={d.code} style={{ borderBottom: "1px solid #f3f4f6" }}>
                        <td style={{ padding: "0.75rem 1rem", fontWeight: 600, color: "#111827" }}>
                          {d.code}
                          {d.name !== d.code && <span style={{ marginLeft: "0.5rem", fontWeight: 400, color: "#6b7280", fontSize: "0.82rem" }}>{d.name}</span>}
                        </td>
                        <td style={{ padding: "0.75rem 1rem", textAlign: "right", fontFamily: "monospace", color: "#057a55" }}>{fmt(d.inflow)}</td>
                        <td style={{ padding: "0.75rem 1rem", textAlign: "right", fontFamily: "monospace", color: "#b91c1c" }}>{fmt(d.outflow)}</td>
                        <td style={{ padding: "0.75rem 1rem", textAlign: "right", fontFamily: "monospace", fontWeight: 700, color: net >= 0 ? "#057a55" : "#b91c1c" }}>{fmt(net)}</td>
                        <td style={{ padding: "0.75rem 1rem", textAlign: "right", color: margin !== null && Number(margin) >= 0 ? "#057a55" : "#b91c1c" }}>
                          {margin !== null ? `${margin}%` : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr style={{ background: "#f9fafb", borderTop: "2px solid #e5e7eb" }}>
                    <td style={{ padding: "0.75rem 1rem", fontWeight: 700, color: "#111827" }}>TOTAL</td>
                    <td style={{ padding: "0.75rem 1rem", textAlign: "right", fontFamily: "monospace", fontWeight: 700, color: "#057a55" }}>{fmt(totalInflow)}</td>
                    <td style={{ padding: "0.75rem 1rem", textAlign: "right", fontFamily: "monospace", fontWeight: 700, color: "#b91c1c" }}>{fmt(totalOutflow)}</td>
                    <td style={{ padding: "0.75rem 1rem", textAlign: "right", fontFamily: "monospace", fontWeight: 700, color: netTotal >= 0 ? "#057a55" : "#b91c1c" }}>{fmt(netTotal)}</td>
                    <td style={{ padding: "0.75rem 1rem", textAlign: "right", fontWeight: 700, color: netTotal >= 0 ? "#057a55" : "#b91c1c" }}>
                      {totalInflow > 0 ? `${((netTotal / totalInflow) * 100).toFixed(1)}%` : "—"}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
