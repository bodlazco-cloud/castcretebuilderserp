export const dynamic = "force-dynamic";
import { db } from "@/db";
import { financialLedger, projects, costCenters } from "@/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { getAuthUser } from "@/lib/supabase-server";

const ACCENT = "#ff5a1f";

export default async function CashFlowReportPage() {
  await getAuthUser();

  // Monthly cash flow from ledger
  const monthlyAgg = await db
    .select({
      month:  sql<string>`to_char(transaction_date, 'YYYY-MM')`.as("month"),
      type:   financialLedger.transactionType,
      total:  sql<string>`sum(amount::numeric)`.as("total"),
    })
    .from(financialLedger)
    .groupBy(sql`to_char(transaction_date, 'YYYY-MM')`, financialLedger.transactionType)
    .orderBy(sql`to_char(transaction_date, 'YYYY-MM')`);

  // Build month table
  const months = new Map<string, { inflow: number; outflow: number; transfer: number }>();
  for (const row of monthlyAgg) {
    if (!months.has(row.month)) months.set(row.month, { inflow: 0, outflow: 0, transfer: 0 });
    const m = months.get(row.month)!;
    if (row.type === "INFLOW")            m.inflow   += Number(row.total ?? 0);
    if (row.type === "OUTFLOW")           m.outflow  += Number(row.total ?? 0);
    if (row.type === "INTERNAL_TRANSFER") m.transfer += Number(row.total ?? 0);
  }

  const monthRows = [...months.entries()].reverse();

  // Project-level breakdown
  const projAgg = await db
    .select({
      projName: projects.name,
      type:     financialLedger.transactionType,
      total:    sql<string>`sum(amount::numeric)`.as("total"),
    })
    .from(financialLedger)
    .leftJoin(projects, eq(financialLedger.projectId, projects.id))
    .groupBy(projects.name, financialLedger.transactionType);

  const projMap = new Map<string, { inflow: number; outflow: number }>();
  for (const row of projAgg) {
    const k = row.projName ?? "—";
    if (!projMap.has(k)) projMap.set(k, { inflow: 0, outflow: 0 });
    const p = projMap.get(k)!;
    if (row.type === "INFLOW")  p.inflow  += Number(row.total ?? 0);
    if (row.type === "OUTFLOW") p.outflow += Number(row.total ?? 0);
  }
  const projRows = [...projMap.entries()].sort((a, b) => (b[1].inflow - b[1].outflow) - (a[1].inflow - a[1].outflow));

  const totalInflow  = projRows.reduce((s, [, p]) => s + p.inflow, 0);
  const totalOutflow = projRows.reduce((s, [, p]) => s + p.outflow, 0);
  const fmt = (v: number) => `PHP ${v.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "1200px" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href="/finance" style={{ fontSize: "0.8rem", color: ACCENT, textDecoration: "none" }}>← Finance & Accounting</a>
        </div>

        <div style={{ marginBottom: "1.5rem" }}>
          <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827" }}>Cash Flow Statement</h1>
          <p style={{ margin: 0, color: "#6b7280", fontSize: "0.9rem" }}>Inflow vs outflow aggregated from the financial ledger by month and project.</p>
        </div>

        {/* KPI */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", marginBottom: "1.75rem" }}>
          <div style={{ background: "#fff", borderRadius: "8px", padding: "1rem 1.25rem", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", borderLeft: "4px solid #057a55" }}>
            <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "#057a55" }}>{fmt(totalInflow)}</div>
            <div style={{ fontSize: "0.78rem", color: "#6b7280", marginTop: "0.2rem" }}>Total Cash In</div>
          </div>
          <div style={{ background: "#fff", borderRadius: "8px", padding: "1rem 1.25rem", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", borderLeft: "4px solid #b91c1c" }}>
            <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "#b91c1c" }}>{fmt(totalOutflow)}</div>
            <div style={{ fontSize: "0.78rem", color: "#6b7280", marginTop: "0.2rem" }}>Total Cash Out</div>
          </div>
          <div style={{ background: "#fff", borderRadius: "8px", padding: "1rem 1.25rem", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", borderLeft: `4px solid ${totalInflow - totalOutflow >= 0 ? "#057a55" : "#b91c1c"}` }}>
            <div style={{ fontSize: "1.2rem", fontWeight: 700, color: totalInflow - totalOutflow >= 0 ? "#057a55" : "#b91c1c" }}>{fmt(totalInflow - totalOutflow)}</div>
            <div style={{ fontSize: "0.78rem", color: "#6b7280", marginTop: "0.2rem" }}>Net Cash Flow</div>
          </div>
        </div>

        {/* Monthly table */}
        <h2 style={{ margin: "0 0 0.75rem", fontSize: "1rem", fontWeight: 700, color: "#374151" }}>Monthly Summary</h2>
        {monthRows.length === 0 ? (
          <div style={{ padding: "2rem", background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", textAlign: "center", color: "#9ca3af", marginBottom: "1.5rem" }}>
            No ledger data yet.
          </div>
        ) : (
          <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden", marginBottom: "1.5rem" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
              <thead>
                <tr style={{ background: "#f9fafb" }}>
                  {["Month", "Cash In", "Cash Out", "Transfers", "Net"].map((h, i) => (
                    <th key={i} style={{ padding: "0.75rem 1rem", textAlign: i === 0 ? "left" : "right", fontWeight: 600, color: "#374151", borderBottom: "1px solid #e5e7eb" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {monthRows.map(([month, m]) => {
                  const net = m.inflow - m.outflow;
                  return (
                    <tr key={month} style={{ borderBottom: "1px solid #f3f4f6" }}>
                      <td style={{ padding: "0.65rem 1rem", fontWeight: 600, color: "#111827" }}>{month}</td>
                      <td style={{ padding: "0.65rem 1rem", textAlign: "right", fontFamily: "monospace", color: "#057a55" }}>{fmt(m.inflow)}</td>
                      <td style={{ padding: "0.65rem 1rem", textAlign: "right", fontFamily: "monospace", color: "#b91c1c" }}>{fmt(m.outflow)}</td>
                      <td style={{ padding: "0.65rem 1rem", textAlign: "right", fontFamily: "monospace", color: "#6b7280" }}>{m.transfer > 0 ? fmt(m.transfer) : "—"}</td>
                      <td style={{ padding: "0.65rem 1rem", textAlign: "right", fontFamily: "monospace", fontWeight: 700, color: net >= 0 ? "#057a55" : "#b91c1c" }}>{fmt(net)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* By project */}
        <h2 style={{ margin: "0 0 0.75rem", fontSize: "1rem", fontWeight: 700, color: "#374151" }}>By Project</h2>
        {projRows.length === 0 ? (
          <div style={{ padding: "2rem", background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", textAlign: "center", color: "#9ca3af" }}>No data.</div>
        ) : (
          <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
              <thead>
                <tr style={{ background: "#f9fafb" }}>
                  {["Project", "Cash In", "Cash Out", "Net"].map((h, i) => (
                    <th key={i} style={{ padding: "0.75rem 1rem", textAlign: i === 0 ? "left" : "right", fontWeight: 600, color: "#374151", borderBottom: "1px solid #e5e7eb" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {projRows.map(([name, p]) => {
                  const net = p.inflow - p.outflow;
                  return (
                    <tr key={name} style={{ borderBottom: "1px solid #f3f4f6" }}>
                      <td style={{ padding: "0.65rem 1rem", fontWeight: 500, color: "#374151" }}>{name}</td>
                      <td style={{ padding: "0.65rem 1rem", textAlign: "right", fontFamily: "monospace", color: "#057a55" }}>{fmt(p.inflow)}</td>
                      <td style={{ padding: "0.65rem 1rem", textAlign: "right", fontFamily: "monospace", color: "#b91c1c" }}>{fmt(p.outflow)}</td>
                      <td style={{ padding: "0.65rem 1rem", textAlign: "right", fontFamily: "monospace", fontWeight: 700, color: net >= 0 ? "#057a55" : "#b91c1c" }}>{fmt(net)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
