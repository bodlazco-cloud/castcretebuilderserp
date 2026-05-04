export const dynamic = "force-dynamic";
import { db } from "@/db";
import {
  bankStatementImports, bankStatementLines, bankReconciliationItems,
  bankTransactions, bankAccounts,
} from "@/db/schema";
import { eq, and, not, inArray } from "drizzle-orm";
import { getAuthUser } from "@/lib/supabase-server";
import { notFound } from "next/navigation";
import ReconcileClient from "./ReconcileClient";

export default async function ReconcilePage({
  params,
}: {
  params: Promise<{ importId: string }>;
}) {
  await getAuthUser();
  const { importId } = await params;

  const [imp] = await db
    .select({
      id:           bankStatementImports.id,
      bankAccountId: bankStatementImports.bankAccountId,
      periodStart:  bankStatementImports.periodStart,
      periodEnd:    bankStatementImports.periodEnd,
      status:       bankStatementImports.status,
    })
    .from(bankStatementImports)
    .where(eq(bankStatementImports.id, importId))
    .limit(1);
  if (!imp) notFound();

  const [account] = await db
    .select({ bankName: bankAccounts.bankName, accountName: bankAccounts.accountName })
    .from(bankAccounts)
    .where(eq(bankAccounts.id, imp.bankAccountId))
    .limit(1);

  // Unmatched statement lines
  const unmatchedLines = await db
    .select({
      id:              bankStatementLines.id,
      transactionDate: bankStatementLines.transactionDate,
      description:     bankStatementLines.description,
      referenceNumber: bankStatementLines.referenceNumber,
      debitAmount:     bankStatementLines.debitAmount,
      creditAmount:    bankStatementLines.creditAmount,
    })
    .from(bankStatementLines)
    .where(and(
      eq(bankStatementLines.importId, importId),
      eq(bankStatementLines.isMatched, false),
    ));

  // Matched reconciliation items with both sides' descriptions
  const rawMatched = await db
    .select({
      id:               bankReconciliationItems.id,
      statementLineId:  bankReconciliationItems.statementLineId,
      erpTransactionId: bankReconciliationItems.erpTransactionId,
      matchType:        bankReconciliationItems.matchType,
      statementAmount:  bankReconciliationItems.statementAmount,
      erpAmount:        bankReconciliationItems.erpAmount,
      variance:         bankReconciliationItems.variance,
      actionNote:       bankReconciliationItems.actionNote,
      stmtDesc:         bankStatementLines.description,
      stmtDate:         bankStatementLines.transactionDate,
      erpDesc:          bankTransactions.description,
      erpDate:          bankTransactions.transactionDate,
    })
    .from(bankReconciliationItems)
    .leftJoin(bankStatementLines,  eq(bankReconciliationItems.statementLineId,  bankStatementLines.id))
    .leftJoin(bankTransactions,    eq(bankReconciliationItems.erpTransactionId, bankTransactions.id))
    .where(eq(bankReconciliationItems.importId, importId));

  // IDs of ERP transactions already matched
  const usedErpIds = rawMatched.map((m) => m.erpTransactionId).filter(Boolean) as string[];

  // Buffer dates for ERP query (±3 days)
  const bufferStart = new Date(imp.periodStart); bufferStart.setDate(bufferStart.getDate() - 3);
  const bufferEnd   = new Date(imp.periodEnd);   bufferEnd.setDate(bufferEnd.getDate() + 3);

  // Available ERP transactions (not yet matched for this account in the period)
  let availableErp: {
    id: string; transactionDate: string; transactionType: string;
    amount: string; description: string; referenceNumber: string | null;
  }[] = [];

  const baseQuery = db
    .select({
      id:              bankTransactions.id,
      transactionDate: bankTransactions.transactionDate,
      transactionType: bankTransactions.transactionType,
      amount:          bankTransactions.amount,
      description:     bankTransactions.description,
      referenceNumber: bankTransactions.referenceNumber,
    })
    .from(bankTransactions)
    .where(
      usedErpIds.length > 0
        ? and(
            eq(bankTransactions.bankAccountId, imp.bankAccountId),
            not(inArray(bankTransactions.id, usedErpIds)),
          )
        : eq(bankTransactions.bankAccountId, imp.bankAccountId),
    )
    .limit(200);

  availableErp = await baseQuery;

  const matchedItems = rawMatched.map((m) => ({
    id:               m.id,
    statementLineId:  m.statementLineId,
    erpTransactionId: m.erpTransactionId,
    matchType:        m.matchType,
    statementAmount:  m.statementAmount,
    erpAmount:        m.erpAmount,
    variance:         m.variance,
    actionNote:       m.actionNote,
    stmtDesc:         m.stmtDesc ?? "",
    stmtDate:         m.stmtDate ?? "",
    erpDesc:          m.erpDesc ?? "",
    erpDate:          m.erpDate ?? "",
  }));

  const accountName = account ? `${account.bankName} – ${account.accountName}` : imp.bankAccountId;

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <ReconcileClient
        importId={importId}
        accountName={accountName}
        periodStart={imp.periodStart}
        periodEnd={imp.periodEnd}
        status={imp.status}
        unmatchedLines={unmatchedLines.map((l) => ({
          ...l,
          debitAmount:  l.debitAmount  ?? "0",
          creditAmount: l.creditAmount ?? "0",
        }))}
        availableErp={availableErp.map((t) => ({
          ...t,
          amount: t.amount ?? "0",
        }))}
        matchedItems={matchedItems}
      />
    </main>
  );
}
