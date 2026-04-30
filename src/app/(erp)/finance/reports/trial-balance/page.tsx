export const dynamic = "force-dynamic";
import { db } from "@/db";
import { financialLedger, costCenters } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { getAuthUser } from "@/lib/supabase-server";

const ACCENT = "#ff5a1f";

export default async function TrialBalancePage() {
  await getAuthUser();

  // Trial balance: debit (outflow) and credit (inflow) per cost center
  const rows = await db
    .select({
      costCenterId:   financialLedger.costCenterId,
      costCenterCode: costCenters.code,
      costCenterName: costCenters.name,
      type:           financialLedger.transactionType,
      total:          sql<string>`sum(amount::numeric)`.as("total"),
    })
    .from(financialLedger)
    .leftJoin(costCenters, eq(financialLedger.costCenterId, costCenters.id))
    .groupBy(financialLedger.costCenterId, costCenters.code, costCenters.name, financialLedger.transactionType);

  const ccMap = new Map<string, { code: string; name: string; debit: number; credit: number }>();
  for (const row of rows) {
    const k = row.costCenterId;
    if (!ccMap.has(k)) ccMap.set(k, { code: row.costCenterCode ?? "—", name: row.costCenterName ?? "Unknown", debit: 0, credit: 0 });
    const e = ccMap.get(k)!;
    if (row.type === "OUTFLOW") e.debit  += Number(row.total ?? 0);
    if (row.type === "INFLOW")  e.credit += Number(row.total ?? 0);
  }

  const ccRows = [...ccMap.values()].sort((a, b) => a.code.localeCompare(b.code));
  const totalDebit  = ccRows.reduce((s, r) => s + r.debit, 0);
  const totalCredit = ccRows.reduce((s, r) => s + r.credit, 0);
  const isBalanced  = Math.abs(totalDebit - totalCredit) < 0.01;

  const fmt = (v: number) => `PHP ${v.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "900px" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href="/finance" style={{ fontSize: "0.8rem", color: ACCENT, textDecoration: "none" }}>← Finance & Accounting</a>
        </div>

        <div style={{ marginBottom: "1.5rem" }}>
          <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827" }}>Trial Balance</h1>
          <p style={{ margin: "0 0 0.5rem", color: "#6b7280", fontSize: "0.9rem" }}>
            Debit (outflow) and credit (inflow) totals per cost center from the financial ledger.
          </p>
          {ccRows.length > 0 && (
            <span style={{ display: "inline-block", padding: "0.2rem 0.6rem", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 600, background: isBalanced ? "#f0fdf4" : "#fef2f2", color: isBalanced ? "#057a55" : "#b91c1c" }}>
              {isBalanced ? "✓ Balanced" : "⚠ Imbalanced — review ledger entries"}
            </span>
          )}
        </div>

        {ccRows.length === 0 ? (
          <div style={{ padding: "3rem", background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", textAlign: "center", color: "#9ca3af" }}>
            No ledger entries to display.
          </div>
        ) : (
          <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
              <thead>
                <tr style={{ background: "#f9fafb" }}>
                  {["Cost Center", "Name", "Debit (Outflow)", "Credit (Inflow)", "Balance"].map((h, i) => (
                    <th key={i} style={{ padding: "0.75rem 1rem", textAlign: i >= 2 ? "right" : "left", fontWeight: 600, color: "#374151", borderBottom: "1px solid #e5e7eb" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ccRows.map((r) => {
                  const balance = r.credit - r.debit;
                  return (
                    <tr key={r.code} style={{ borderBottom: "1px solid #f3f4f6" }}>
                      <td style={{ padding: "0.65rem 1rem", fontFamily: "monospace", fontWeight: 600, color: "#111827" }}>{r.code}</td>
                      <td style={{ padding: "0.65rem 1rem", color: "#374151" }}>{r.name}</td>
                      <td style={{ padding: "0.65rem 1rem", textAlign: "right", fontFamily: "monospace", color: "#b91c1c" }}>{r.debit > 0 ? fmt(r.debit) : "—"}</td>
                      <td style={{ padding: "0.65rem 1rem", textAlign: "right", fontFamily: "monospace", color: "#057a55" }}>{r.credit > 0 ? fmt(r.credit) : "—"}</td>
                      <td style={{ padding: "0.65rem 1rem", textAlign: "right", fontFamily: "monospace", fontWeight: 700, color: balance >= 0 ? "#057a55" : "#b91c1c" }}>{fmt(balance)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ background: "#f9fafb", borderTop: "2px solid #e5e7eb" }}>
                  <td colSpan={2} style={{ padding: "0.75rem 1rem", fontWeight: 700, color: "#111827" }}>TOTALS</td>
                  <td style={{ padding: "0.75rem 1rem", textAlign: "right", fontFamily: "monospace", fontWeight: 700, color: "#b91c1c" }}>{fmt(totalDebit)}</td>
                  <td style={{ padding: "0.75rem 1rem", textAlign: "right", fontFamily: "monospace", fontWeight: 700, color: "#057a55" }}>{fmt(totalCredit)}</td>
                  <td style={{ padding: "0.75rem 1rem", textAlign: "right", fontFamily: "monospace", fontWeight: 700, color: isBalanced ? "#057a55" : "#b91c1c" }}>
                    {fmt(totalCredit - totalDebit)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
