export const dynamic = "force-dynamic";
import { db } from "@/db";
import { bankAccounts, bankTransactions } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getAuthUser } from "@/lib/supabase-server";
import { AddBankAccountForm } from "./AddBankAccountForm";

const ACCENT = "#ff5a1f";

const TXN_STATUS: Record<string, { bg: string; color: string }> = {
  PENDING:        { bg: "#fffbeb", color: "#b45309" },
  FIRST_APPROVED: { bg: "#eff6ff", color: "#1a56db" },
  APPROVED:       { bg: "#f0fdf4", color: "#057a55" },
  REJECTED:       { bg: "#fef2f2", color: "#e02424" },
};

export default async function BankingPage() {
  await getAuthUser();

  const accounts = await db
    .select()
    .from(bankAccounts)
    .where(eq(bankAccounts.isActive, true));

  const recentTxns = await db
    .select({
      id:               bankTransactions.id,
      transactionDate:  bankTransactions.transactionDate,
      transactionType:  bankTransactions.transactionType,
      amount:           bankTransactions.amount,
      description:      bankTransactions.description,
      referenceNumber:  bankTransactions.referenceNumber,
      requiresDualAuth: bankTransactions.requiresDualAuth,
      status:           bankTransactions.status,
      bankName:         bankAccounts.bankName,
      accountName:      bankAccounts.accountName,
      accountNumber:    bankAccounts.accountNumber,
    })
    .from(bankTransactions)
    .leftJoin(bankAccounts, eq(bankTransactions.bankAccountId, bankAccounts.id))
    .orderBy(desc(bankTransactions.createdAt))
    .limit(50);

  const totalBalance = accounts.reduce((s, a) => s + Number(a.currentBalance), 0);
  const fmt = (v: string | number) =>
    `PHP ${Number(v).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "1200px" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href="/finance" style={{ fontSize: "0.8rem", color: ACCENT, textDecoration: "none" }}>← Finance & Accounting</a>
        </div>

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem", marginBottom: "1.5rem" }}>
          <div>
            <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827" }}>Banking</h1>
            <p style={{ margin: 0, color: "#6b7280", fontSize: "0.9rem" }}>
              {accounts.length} account{accounts.length !== 1 ? "s" : ""} · Total balance: {fmt(totalBalance)}
            </p>
          </div>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <AddBankAccountForm />
            <a href="/finance/banking/new-transaction" style={{
              padding: "0.55rem 1.1rem", borderRadius: "6px", background: ACCENT,
              color: "#fff", fontSize: "0.875rem", fontWeight: 600, textDecoration: "none",
            }}>+ New Transaction</a>
          </div>
        </div>

        {/* Account cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
          {accounts.length === 0 ? (
            <div style={{ padding: "2rem", background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", color: "#9ca3af", textAlign: "center", gridColumn: "1/-1" }}>
              No bank accounts yet. Add one to get started.
            </div>
          ) : accounts.map((acc) => (
            <div key={acc.id} style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", padding: "1.25rem 1.5rem", borderTop: `4px solid ${ACCENT}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
                <div>
                  <div style={{ fontWeight: 700, color: "#111827", fontSize: "0.95rem" }}>{acc.bankName}</div>
                  <div style={{ fontSize: "0.8rem", color: "#6b7280", marginTop: "0.15rem" }}>{acc.accountName}</div>
                </div>
                <span style={{ fontSize: "0.72rem", fontWeight: 600, padding: "0.15rem 0.4rem", borderRadius: "4px", background: "#f3f4f6", color: "#6b7280" }}>
                  {acc.accountType}
                </span>
              </div>
              <div style={{ fontFamily: "monospace", fontSize: "0.82rem", color: "#6b7280", marginBottom: "0.5rem" }}>{acc.accountNumber}</div>
              <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "#111827" }}>{fmt(acc.currentBalance)}</div>
              <div style={{ fontSize: "0.75rem", color: "#9ca3af", marginTop: "0.15rem" }}>Current Balance · {acc.currency}</div>
            </div>
          ))}
        </div>

        {/* Recent transactions */}
        <h2 style={{ margin: "0 0 0.75rem", fontSize: "1rem", fontWeight: 700, color: "#374151" }}>Recent Transactions</h2>

        {recentTxns.length === 0 ? (
          <div style={{ padding: "2rem", background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", textAlign: "center", color: "#9ca3af" }}>
            No transactions recorded yet.
          </div>
        ) : (
          <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem", minWidth: "780px" }}>
                <thead>
                  <tr style={{ background: "#f9fafb" }}>
                    {["Date", "Account", "Type", "Description", "Reference", "Amount", "Status"].map((h, i) => (
                      <th key={i} style={{ padding: "0.75rem 1rem", textAlign: i === 5 ? "right" : "left", fontWeight: 600, color: "#374151", borderBottom: "1px solid #e5e7eb" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recentTxns.map((t) => {
                    const st = TXN_STATUS[t.status] ?? TXN_STATUS.PENDING;
                    const isDebit = t.transactionType === "DEBIT";
                    return (
                      <tr key={t.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                        <td style={{ padding: "0.65rem 1rem", color: "#6b7280", fontSize: "0.82rem" }}>{t.transactionDate}</td>
                        <td style={{ padding: "0.65rem 1rem" }}>
                          <div style={{ fontWeight: 500, color: "#374151", fontSize: "0.85rem" }}>{t.bankName ?? "—"}</div>
                          <div style={{ fontSize: "0.75rem", color: "#9ca3af", fontFamily: "monospace" }}>{t.accountNumber ?? ""}</div>
                        </td>
                        <td style={{ padding: "0.65rem 1rem" }}>
                          <span style={{ fontSize: "0.72rem", fontWeight: 600, padding: "0.15rem 0.4rem", borderRadius: "4px", background: isDebit ? "#fef2f2" : "#f0fdf4", color: isDebit ? "#b91c1c" : "#057a55" }}>
                            {t.transactionType}
                          </span>
                          {t.requiresDualAuth && (
                            <span style={{ marginLeft: "0.3rem", fontSize: "0.68rem", fontWeight: 600, padding: "0.1rem 0.3rem", borderRadius: "3px", background: "#fef9c3", color: "#713f12" }}>DUAL AUTH</span>
                          )}
                        </td>
                        <td style={{ padding: "0.65rem 1rem", color: "#374151", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.description}</td>
                        <td style={{ padding: "0.65rem 1rem", fontFamily: "monospace", fontSize: "0.8rem", color: "#6b7280" }}>{t.referenceNumber ?? "—"}</td>
                        <td style={{ padding: "0.65rem 1rem", textAlign: "right", fontFamily: "monospace", fontWeight: 700, color: isDebit ? "#b91c1c" : "#057a55" }}>
                          {isDebit ? "−" : "+"}{fmt(t.amount)}
                        </td>
                        <td style={{ padding: "0.65rem 1rem" }}>
                          <span style={{ display: "inline-block", padding: "0.2rem 0.55rem", borderRadius: "999px", fontSize: "0.72rem", fontWeight: 600, background: st.bg, color: st.color }}>
                            {t.status.replace(/_/g, " ")}
                          </span>
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
