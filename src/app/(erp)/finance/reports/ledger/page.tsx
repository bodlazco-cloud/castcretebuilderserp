export const dynamic = "force-dynamic";
import { db } from "@/db";
import { financialLedger, projects, costCenters, departments } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getAuthUser } from "@/lib/supabase-server";

const ACCENT = "#ff5a1f";

const TXN_STYLE: Record<string, { bg: string; color: string }> = {
  INFLOW:            { bg: "#f0fdf4", color: "#057a55" },
  OUTFLOW:           { bg: "#fef2f2", color: "#b91c1c" },
  INTERNAL_TRANSFER: { bg: "#eff6ff", color: "#1a56db" },
};

export default async function LedgerPage() {
  await getAuthUser();

  const entries = await db
    .select({
      id:              financialLedger.id,
      transactionDate: financialLedger.transactionDate,
      transactionType: financialLedger.transactionType,
      referenceType:   financialLedger.referenceType,
      referenceId:     financialLedger.referenceId,
      resourceType:    financialLedger.resourceType,
      amount:          financialLedger.amount,
      description:     financialLedger.description,
      isExternal:      financialLedger.isExternal,
      createdAt:       financialLedger.createdAt,
      projName:        projects.name,
      costCenterCode:  costCenters.code,
      deptCode:        departments.code,
    })
    .from(financialLedger)
    .leftJoin(projects,    eq(financialLedger.projectId,    projects.id))
    .leftJoin(costCenters, eq(financialLedger.costCenterId, costCenters.id))
    .leftJoin(departments, eq(financialLedger.deptId,       departments.id))
    .orderBy(desc(financialLedger.transactionDate), desc(financialLedger.createdAt))
    .limit(200);

  let runningBalance = 0;
  const withBalance = [...entries].reverse().map((e) => {
    if (e.transactionType === "INFLOW")  runningBalance += Number(e.amount);
    if (e.transactionType === "OUTFLOW") runningBalance -= Number(e.amount);
    return { ...e, runningBalance };
  }).reverse();

  const fmt = (v: number) => `PHP ${v.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "1400px" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href="/finance" style={{ fontSize: "0.8rem", color: ACCENT, textDecoration: "none" }}>← Finance & Accounting</a>
        </div>

        <div style={{ marginBottom: "1.5rem" }}>
          <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827" }}>General Ledger</h1>
          <p style={{ margin: 0, color: "#6b7280", fontSize: "0.9rem" }}>
            {entries.length} entries (most recent 200)
          </p>
        </div>

        {entries.length === 0 ? (
          <div style={{ padding: "3rem", background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", textAlign: "center", color: "#9ca3af" }}>
            No ledger entries yet.
          </div>
        ) : (
          <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem", minWidth: "1100px" }}>
                <thead>
                  <tr style={{ background: "#f9fafb" }}>
                    {["Date", "Project", "CC", "Dept", "Ref Type", "Resource", "Ext?", "Type", "Debit", "Credit", "Balance", "Description"].map((h, i) => (
                      <th key={i} style={{ padding: "0.65rem 0.875rem", textAlign: [8, 9, 10].includes(i) ? "right" : "left", fontWeight: 600, color: "#374151", borderBottom: "1px solid #e5e7eb", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {withBalance.map((e) => {
                    const txSt = TXN_STYLE[e.transactionType] ?? TXN_STYLE.INFLOW;
                    const isOut = e.transactionType === "OUTFLOW";
                    return (
                      <tr key={e.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                        <td style={{ padding: "0.55rem 0.875rem", color: "#6b7280", whiteSpace: "nowrap" }}>{e.transactionDate}</td>
                        <td style={{ padding: "0.55rem 0.875rem", color: "#374151", maxWidth: "140px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.projName ?? "—"}</td>
                        <td style={{ padding: "0.55rem 0.875rem", fontFamily: "monospace", color: "#6b7280" }}>{e.costCenterCode ?? "—"}</td>
                        <td style={{ padding: "0.55rem 0.875rem", color: "#6b7280" }}>{e.deptCode ?? "—"}</td>
                        <td style={{ padding: "0.55rem 0.875rem", fontWeight: 600, color: "#374151" }}>{e.referenceType}</td>
                        <td style={{ padding: "0.55rem 0.875rem" }}>
                          <span style={{ fontSize: "0.68rem", fontWeight: 600, padding: "0.1rem 0.3rem", borderRadius: "3px", background: "#f3f4f6", color: "#6b7280" }}>{e.resourceType}</span>
                        </td>
                        <td style={{ padding: "0.55rem 0.875rem", color: e.isExternal ? "#374151" : "#9ca3af" }}>{e.isExternal ? "Y" : "N"}</td>
                        <td style={{ padding: "0.55rem 0.875rem" }}>
                          <span style={{ fontSize: "0.68rem", fontWeight: 600, padding: "0.1rem 0.3rem", borderRadius: "3px", background: txSt.bg, color: txSt.color }}>
                            {e.transactionType.replace("_", " ")}
                          </span>
                        </td>
                        <td style={{ padding: "0.55rem 0.875rem", textAlign: "right", fontFamily: "monospace", color: "#b91c1c" }}>
                          {isOut ? fmt(Number(e.amount)) : ""}
                        </td>
                        <td style={{ padding: "0.55rem 0.875rem", textAlign: "right", fontFamily: "monospace", color: "#057a55" }}>
                          {!isOut ? fmt(Number(e.amount)) : ""}
                        </td>
                        <td style={{ padding: "0.55rem 0.875rem", textAlign: "right", fontFamily: "monospace", fontWeight: 700, color: e.runningBalance >= 0 ? "#057a55" : "#b91c1c" }}>
                          {fmt(e.runningBalance)}
                        </td>
                        <td style={{ padding: "0.55rem 0.875rem", color: "#6b7280", maxWidth: "160px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.description ?? "—"}</td>
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
