export const dynamic = "force-dynamic";
import { db } from "@/db";
import { bankStatementImports, bankStatementLines, bankAccounts } from "@/db/schema";
import { eq, sql, desc } from "drizzle-orm";
import { getAuthUser } from "@/lib/supabase-server";

const ACCENT = "#ff5a1f";

const fmt = (n: string | number) =>
  `₱${Number(n).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default async function ReconciliationsPage() {
  await getAuthUser();

  const imports = await db
    .select({
      id:             bankStatementImports.id,
      bankAccountId:  bankStatementImports.bankAccountId,
      bankFormat:     bankStatementImports.bankFormat,
      fileName:       bankStatementImports.fileName,
      periodStart:    bankStatementImports.periodStart,
      periodEnd:      bankStatementImports.periodEnd,
      openingBalance: bankStatementImports.openingBalance,
      closingBalance: bankStatementImports.closingBalance,
      lineCount:      bankStatementImports.lineCount,
      status:         bankStatementImports.status,
      createdAt:      bankStatementImports.createdAt,
      bankName:       bankAccounts.bankName,
      accountName:    bankAccounts.accountName,
      accountNumber:  bankAccounts.accountNumber,
    })
    .from(bankStatementImports)
    .leftJoin(bankAccounts, eq(bankStatementImports.bankAccountId, bankAccounts.id))
    .orderBy(desc(bankStatementImports.createdAt))
    .limit(100);

  // Match counts per import
  const matchCounts = await db
    .select({
      importId:      bankStatementLines.importId,
      matched:       sql<number>`COUNT(*) FILTER (WHERE ${bankStatementLines.isMatched} = true)`,
      total:         sql<number>`COUNT(*)`,
    })
    .from(bankStatementLines)
    .groupBy(bankStatementLines.importId);

  const matchMap = new Map(matchCounts.map((r) => [r.importId, r]));

  const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
    PENDING:   { bg: "#fffbeb", color: "#b45309" },
    FINALIZED: { bg: "#f0fdf4", color: "#057a55" },
  };

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "1200px" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href="/finance/banking" style={{ fontSize: "0.8rem", color: ACCENT, textDecoration: "none" }}>← Banking</a>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem", marginBottom: "2rem" }}>
          <div>
            <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827", borderLeft: `4px solid ${ACCENT}`, paddingLeft: "0.75rem" }}>
              Bank Reconciliations
            </h1>
            <p style={{ margin: 0, color: "#6b7280", fontSize: "0.875rem", paddingLeft: "1.25rem" }}>
              {imports.length} statement import{imports.length !== 1 ? "s" : ""}
            </p>
          </div>
          <a href="/finance/banking/import" style={{
            padding: "0.55rem 1.1rem", borderRadius: "6px", background: ACCENT,
            color: "#fff", fontSize: "0.875rem", fontWeight: 600, textDecoration: "none",
          }}>
            + Import Statement
          </a>
        </div>

        {imports.length === 0 ? (
          <div style={{ padding: "3rem", background: "#fff", borderRadius: "10px", textAlign: "center", color: "#9ca3af", border: "1px solid #e5e7eb" }}>
            No bank statements imported yet.{" "}
            <a href="/finance/banking/import" style={{ color: ACCENT, textDecoration: "none", fontWeight: 600 }}>Import one now →</a>
          </div>
        ) : (
          <div style={{ background: "#fff", borderRadius: "10px", border: "1px solid #e5e7eb", overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem", minWidth: "850px" }}>
                <thead>
                  <tr style={{ background: "#f9fafb" }}>
                    {["Account", "Format", "Period", "Opening", "Closing", "Match Rate", "Status", ""].map((h, i) => (
                      <th key={i} style={{ padding: "0.75rem 1rem", textAlign: i >= 3 && i <= 5 ? "right" : "left", fontWeight: 600, color: "#374151", borderBottom: "1px solid #e5e7eb", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {imports.map((imp) => {
                    const mc      = matchMap.get(imp.id);
                    const matched = Number(mc?.matched ?? 0);
                    const total   = Number(mc?.total ?? imp.lineCount);
                    const pct     = total > 0 ? Math.round((matched / total) * 100) : 0;
                    const st      = STATUS_STYLE[imp.status] ?? STATUS_STYLE.PENDING;

                    return (
                      <tr key={imp.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                        <td style={{ padding: "0.75rem 1rem" }}>
                          <div style={{ fontWeight: 600, color: "#111827", fontSize: "0.88rem" }}>{imp.bankName ?? "—"}</div>
                          <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>{imp.accountName}</div>
                          {imp.fileName && (
                            <div style={{ fontSize: "0.7rem", color: "#9ca3af", marginTop: "0.1rem" }}>{imp.fileName}</div>
                          )}
                        </td>
                        <td style={{ padding: "0.75rem 1rem" }}>
                          <span style={{ fontSize: "0.75rem", fontWeight: 600, padding: "0.15rem 0.5rem", borderRadius: "4px", background: "#f3f4f6", color: "#374151" }}>
                            {imp.bankFormat}
                          </span>
                        </td>
                        <td style={{ padding: "0.75rem 1rem", fontSize: "0.82rem", color: "#6b7280", whiteSpace: "nowrap" }}>
                          {imp.periodStart} → {imp.periodEnd}
                        </td>
                        <td style={{ padding: "0.75rem 1rem", textAlign: "right", fontFamily: "monospace", fontSize: "0.82rem", color: "#6b7280" }}>
                          {fmt(imp.openingBalance)}
                        </td>
                        <td style={{ padding: "0.75rem 1rem", textAlign: "right", fontFamily: "monospace", fontSize: "0.82rem", fontWeight: 600, color: "#111827" }}>
                          {fmt(imp.closingBalance)}
                        </td>
                        <td style={{ padding: "0.75rem 1rem", textAlign: "right" }}>
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.25rem" }}>
                            <span style={{ fontSize: "0.82rem", fontWeight: 700, color: pct === 100 ? "#057a55" : pct >= 80 ? "#1a56db" : "#b45309" }}>
                              {matched}/{total} ({pct}%)
                            </span>
                            <div style={{ width: "80px", height: "5px", background: "#e5e7eb", borderRadius: "999px", overflow: "hidden" }}>
                              <div style={{ height: "100%", width: `${pct}%`, background: pct === 100 ? "#057a55" : pct >= 80 ? "#1a56db" : "#f59e0b", borderRadius: "999px" }} />
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: "0.75rem 1rem" }}>
                          <span style={{ display: "inline-block", padding: "0.2rem 0.55rem", borderRadius: "999px", fontSize: "0.72rem", fontWeight: 700, background: st.bg, color: st.color }}>
                            {imp.status}
                          </span>
                        </td>
                        <td style={{ padding: "0.75rem 1rem" }}>
                          <a href={`/finance/banking/reconcile/${imp.id}`} style={{
                            padding: "0.35rem 0.75rem", borderRadius: "6px", fontSize: "0.8rem", fontWeight: 600,
                            background: imp.status === "FINALIZED" ? "#f3f4f6" : ACCENT,
                            color: imp.status === "FINALIZED" ? "#6b7280" : "#fff",
                            textDecoration: "none", whiteSpace: "nowrap",
                          }}>
                            {imp.status === "FINALIZED" ? "View" : "Reconcile →"}
                          </a>
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
