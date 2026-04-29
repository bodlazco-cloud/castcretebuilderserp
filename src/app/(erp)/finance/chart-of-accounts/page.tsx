export const dynamic = "force-dynamic";
import { db } from "@/db";
import { financialLedger, costCenters, departments, projects } from "@/db/schema";
import { eq, desc, count, sum } from "drizzle-orm";
import { getAuthUser } from "@/lib/supabase-server";

const ACCENT = "#ff5a1f";

const TXN_TYPE_STYLE: Record<string, { bg: string; color: string }> = {
  INFLOW:            { bg: "#f0fdf4", color: "#057a55" },
  OUTFLOW:           { bg: "#fef2f2", color: "#b91c1c" },
  INTERNAL_TRANSFER: { bg: "#eff6ff", color: "#1a56db" },
};

export default async function ChartOfAccountsPage() {
  await getAuthUser();

  // Ledger entries grouped by transactionType for overview
  const ledgerEntries = await db
    .select({
      id:              financialLedger.id,
      transactionType: financialLedger.transactionType,
      referenceType:   financialLedger.referenceType,
      amount:          financialLedger.amount,
      transactionDate: financialLedger.transactionDate,
      description:     financialLedger.description,
      resourceType:    financialLedger.resourceType,
      isExternal:      financialLedger.isExternal,
      projName:        projects.name,
      costCenterCode:  costCenters.code,
      costCenterName:  costCenters.name,
      deptCode:        departments.code,
    })
    .from(financialLedger)
    .leftJoin(projects,     eq(financialLedger.projectId,    projects.id))
    .leftJoin(costCenters,  eq(financialLedger.costCenterId, costCenters.id))
    .leftJoin(departments,  eq(financialLedger.deptId,       departments.id))
    .orderBy(desc(financialLedger.transactionDate))
    .limit(100);

  const totalInflow  = ledgerEntries.filter((e) => e.transactionType === "INFLOW").reduce((s, e) => s + Number(e.amount), 0);
  const totalOutflow = ledgerEntries.filter((e) => e.transactionType === "OUTFLOW").reduce((s, e) => s + Number(e.amount), 0);
  const netBalance   = totalInflow - totalOutflow;

  const fmt = (v: number) => `PHP ${v.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;

  // Group by referenceType to show account categories
  const byRef = new Map<string, number>();
  for (const e of ledgerEntries) {
    byRef.set(e.referenceType, (byRef.get(e.referenceType) ?? 0) + Number(e.amount));
  }
  const refTypes = [...byRef.entries()].sort((a, b) => b[1] - a[1]);

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "1200px" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href="/finance" style={{ fontSize: "0.8rem", color: ACCENT, textDecoration: "none" }}>← Finance & Accounting</a>
        </div>

        <div style={{ marginBottom: "1.5rem" }}>
          <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827" }}>General Ledger</h1>
          <p style={{ margin: 0, color: "#6b7280", fontSize: "0.9rem" }}>
            {ledgerEntries.length} entries · Inflow: {fmt(totalInflow)} · Outflow: {fmt(totalOutflow)}
          </p>
        </div>

        {/* KPI strip */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", marginBottom: "1.75rem" }}>
          <div style={{ background: "#fff", borderRadius: "8px", padding: "1rem 1.25rem", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", borderLeft: "4px solid #057a55" }}>
            <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "#057a55" }}>{fmt(totalInflow)}</div>
            <div style={{ fontSize: "0.78rem", color: "#6b7280", marginTop: "0.2rem" }}>Total Inflow</div>
          </div>
          <div style={{ background: "#fff", borderRadius: "8px", padding: "1rem 1.25rem", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", borderLeft: "4px solid #b91c1c" }}>
            <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "#b91c1c" }}>{fmt(totalOutflow)}</div>
            <div style={{ fontSize: "0.78rem", color: "#6b7280", marginTop: "0.2rem" }}>Total Outflow</div>
          </div>
          <div style={{ background: "#fff", borderRadius: "8px", padding: "1rem 1.25rem", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", borderLeft: `4px solid ${netBalance >= 0 ? "#057a55" : "#b91c1c"}` }}>
            <div style={{ fontSize: "1.2rem", fontWeight: 700, color: netBalance >= 0 ? "#057a55" : "#b91c1c" }}>{fmt(netBalance)}</div>
            <div style={{ fontSize: "0.78rem", color: "#6b7280", marginTop: "0.2rem" }}>Net Balance</div>
          </div>
        </div>

        {/* Account type summary */}
        {refTypes.length > 0 && (
          <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", padding: "1.25rem", marginBottom: "1.5rem" }}>
            <h2 style={{ margin: "0 0 0.75rem", fontSize: "0.9rem", fontWeight: 700, color: "#374151" }}>By Reference Type</h2>
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
              {refTypes.map(([type, amount]) => (
                <div key={type} style={{ padding: "0.5rem 1rem", background: "#f9fafb", borderRadius: "6px", border: "1px solid #e5e7eb" }}>
                  <div style={{ fontSize: "0.72rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase" }}>{type}</div>
                  <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "#111827", marginTop: "0.15rem" }}>{fmt(amount)}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {ledgerEntries.length === 0 ? (
          <div style={{ padding: "3rem", background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", textAlign: "center", color: "#9ca3af" }}>
            No ledger entries recorded yet.
          </div>
        ) : (
          <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem", minWidth: "900px" }}>
                <thead>
                  <tr style={{ background: "#f9fafb" }}>
                    {["Date", "Project", "Cost Center", "Dept", "Ref Type", "Resource", "Type", "Amount"].map((h, i) => (
                      <th key={i} style={{ padding: "0.75rem 1rem", textAlign: i === 7 ? "right" : "left", fontWeight: 600, color: "#374151", borderBottom: "1px solid #e5e7eb" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ledgerEntries.map((e) => {
                    const txSt = TXN_TYPE_STYLE[e.transactionType] ?? TXN_TYPE_STYLE.INFLOW;
                    return (
                      <tr key={e.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                        <td style={{ padding: "0.65rem 1rem", color: "#6b7280", fontSize: "0.82rem" }}>{e.transactionDate}</td>
                        <td style={{ padding: "0.65rem 1rem", color: "#374151", fontWeight: 500 }}>{e.projName ?? "—"}</td>
                        <td style={{ padding: "0.65rem 1rem", color: "#6b7280", fontSize: "0.82rem" }}>{e.costCenterCode ? `${e.costCenterCode} — ${e.costCenterName}` : "—"}</td>
                        <td style={{ padding: "0.65rem 1rem", color: "#6b7280", fontSize: "0.82rem" }}>{e.deptCode ?? "—"}</td>
                        <td style={{ padding: "0.65rem 1rem", fontSize: "0.75rem", fontWeight: 600, color: "#374151" }}>{e.referenceType}</td>
                        <td style={{ padding: "0.65rem 1rem" }}>
                          <span style={{ fontSize: "0.72rem", fontWeight: 600, padding: "0.1rem 0.35rem", borderRadius: "4px", background: "#f3f4f6", color: "#6b7280" }}>{e.resourceType}</span>
                          {!e.isExternal && <span style={{ marginLeft: "0.25rem", fontSize: "0.68rem", color: "#9ca3af" }}>internal</span>}
                        </td>
                        <td style={{ padding: "0.65rem 1rem" }}>
                          <span style={{ fontSize: "0.72rem", fontWeight: 600, padding: "0.15rem 0.4rem", borderRadius: "4px", background: txSt.bg, color: txSt.color }}>
                            {e.transactionType.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td style={{ padding: "0.65rem 1rem", textAlign: "right", fontFamily: "monospace", fontWeight: 700, color: e.transactionType === "OUTFLOW" ? "#b91c1c" : "#057a55" }}>
                          {e.transactionType === "OUTFLOW" ? "−" : "+"}{fmt(Number(e.amount))}
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
