export const dynamic = "force-dynamic";
import { db } from "@/db";
import {
  invoices, payables, financialLedger, projects,
} from "@/db/schema";
import { eq, sql, inArray } from "drizzle-orm";
import { getAuthUser } from "@/lib/supabase-server";
import ExportButtons from "@/components/ExportButtons";

const ACCENT = "#ff5a1f";

export default async function ProfitAndLossPage() {
  await getAuthUser();

  const [invoiceData, payableData, ledgerData] = await Promise.all([
    // Revenue: collected invoices
    db.select({
      projName: projects.name,
      total:    sql<string>`sum(collection_amount::numeric)`.as("total"),
    })
      .from(invoices)
      .leftJoin(projects, eq(invoices.projectId, projects.id))
      .where(eq(invoices.status, "COLLECTED"))
      .groupBy(projects.name),

    // Cost: approved payables (subcon costs)
    db.select({
      projName: projects.name,
      total:    sql<string>`sum(net_payable::numeric)`.as("total"),
    })
      .from(payables)
      .leftJoin(projects, eq(payables.projectId, projects.id))
      .where(inArray(payables.status, ["APPROVED"]))
      .groupBy(projects.name),

    // Other outflows from ledger
    db.select({
      refType: financialLedger.referenceType,
      total:   sql<string>`sum(amount::numeric)`.as("total"),
    })
      .from(financialLedger)
      .where(eq(financialLedger.transactionType, "OUTFLOW"))
      .groupBy(financialLedger.referenceType),
  ]);

  // Aggregate by project
  const projMap = new Map<string, { revenue: number; cost: number }>();
  for (const r of invoiceData) {
    const k = r.projName ?? "—";
    if (!projMap.has(k)) projMap.set(k, { revenue: 0, cost: 0 });
    projMap.get(k)!.revenue += Number(r.total ?? 0);
  }
  for (const r of payableData) {
    const k = r.projName ?? "—";
    if (!projMap.has(k)) projMap.set(k, { revenue: 0, cost: 0 });
    projMap.get(k)!.cost += Number(r.total ?? 0);
  }
  const projRows = [...projMap.entries()].sort((a, b) => (b[1].revenue - b[1].cost) - (a[1].revenue - a[1].cost));

  const totalRevenue = projRows.reduce((s, [, p]) => s + p.revenue, 0);
  const totalCost    = projRows.reduce((s, [, p]) => s + p.cost, 0);
  const grossProfit  = totalRevenue - totalCost;

  // Operating expenses by reference type
  const opEx = ledgerData.map((r) => ({ type: r.refType, amount: Number(r.total ?? 0) })).sort((a, b) => b.amount - a.amount);
  const totalOpEx = opEx.reduce((s, e) => s + e.amount, 0);
  const netIncome = grossProfit - totalOpEx;

  const fmt = (v: number) => `PHP ${v.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;

  const ReportRow = ({ label, value, indent = false, total = false, highlight = false }: { label: string; value: number; indent?: boolean; total?: boolean; highlight?: boolean }) => (
    <tr style={{ borderBottom: total ? "2px solid #e5e7eb" : "1px solid #f3f4f6", background: total ? "#f9fafb" : "transparent" }}>
      <td style={{ padding: "0.65rem 1rem", paddingLeft: indent ? "2rem" : "1rem", color: total ? "#111827" : "#374151", fontWeight: total ? 700 : 400 }}>{label}</td>
      <td style={{ padding: "0.65rem 1rem", textAlign: "right", fontFamily: "monospace", fontWeight: total ? 700 : 400, color: highlight ? (value >= 0 ? "#057a55" : "#b91c1c") : "#374151" }}>
        {fmt(value)}
      </td>
    </tr>
  );

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "900px" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href="/finance" style={{ fontSize: "0.8rem", color: ACCENT, textDecoration: "none" }}>← Finance & Accounting</a>
        </div>

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem", marginBottom: "1.5rem" }}>
          <div>
            <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827" }}>Profit & Loss Statement</h1>
            <p style={{ margin: 0, color: "#6b7280", fontSize: "0.9rem" }}>Revenue from collected invoices vs subcon payables and ledger outflows.</p>
          </div>
          <ExportButtons excelHref="/api/export/pnl" filename="profit-and-loss" />
        </div>

        <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
            <thead>
              <tr style={{ background: "#f9fafb" }}>
                <th style={{ padding: "0.75rem 1rem", textAlign: "left", fontWeight: 600, color: "#374151", borderBottom: "1px solid #e5e7eb" }}>Account</th>
                <th style={{ padding: "0.75rem 1rem", textAlign: "right", fontWeight: 600, color: "#374151", borderBottom: "1px solid #e5e7eb" }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {/* Revenue */}
              <tr style={{ background: "#f0fdf4" }}>
                <td colSpan={2} style={{ padding: "0.6rem 1rem", fontWeight: 700, color: "#057a55", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Revenue</td>
              </tr>
              {projRows.map(([name, p]) => p.revenue > 0 && (
                <ReportRow key={`rev-${name}`} label={name} value={p.revenue} indent />
              ))}
              <ReportRow label="Total Revenue" value={totalRevenue} total />

              {/* Cost of Revenue */}
              <tr style={{ background: "#fef2f2" }}>
                <td colSpan={2} style={{ padding: "0.6rem 1rem", fontWeight: 700, color: "#b91c1c", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Cost of Revenue (Subcon Payables)</td>
              </tr>
              {projRows.map(([name, p]) => p.cost > 0 && (
                <ReportRow key={`cost-${name}`} label={name} value={p.cost} indent />
              ))}
              <ReportRow label="Total Cost of Revenue" value={totalCost} total />

              <tr style={{ background: "#eff6ff" }}>
                <td style={{ padding: "0.75rem 1rem", fontWeight: 700, color: "#1a56db" }}>Gross Profit</td>
                <td style={{ padding: "0.75rem 1rem", textAlign: "right", fontFamily: "monospace", fontWeight: 700, color: grossProfit >= 0 ? "#057a55" : "#b91c1c" }}>{fmt(grossProfit)}</td>
              </tr>

              {/* Operating Expenses */}
              {opEx.length > 0 && (
                <>
                  <tr style={{ background: "#fffbeb" }}>
                    <td colSpan={2} style={{ padding: "0.6rem 1rem", fontWeight: 700, color: "#b45309", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Operating Expenses (Ledger Outflows)</td>
                  </tr>
                  {opEx.map((e) => (
                    <ReportRow key={e.type} label={e.type} value={e.amount} indent />
                  ))}
                  <ReportRow label="Total Operating Expenses" value={totalOpEx} total />
                </>
              )}

              <tr style={{ background: netIncome >= 0 ? "#f0fdf4" : "#fef2f2", borderTop: "2px solid #111827" }}>
                <td style={{ padding: "0.85rem 1rem", fontWeight: 700, color: "#111827", fontSize: "1rem" }}>Net {netIncome >= 0 ? "Income" : "Loss"}</td>
                <td style={{ padding: "0.85rem 1rem", textAlign: "right", fontFamily: "monospace", fontWeight: 700, fontSize: "1.1rem", color: netIncome >= 0 ? "#057a55" : "#b91c1c" }}>{fmt(netIncome)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
