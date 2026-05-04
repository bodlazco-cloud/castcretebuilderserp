"use server";

import { db } from "@/db";
import {
  bankAccounts, bankTransactions,
  bankStatementImports, bankStatementLines, bankReconciliationItems,
  bankReconciliations,
} from "@/db/schema";
import { eq, and, gte, lte, not, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getAuthUser } from "@/lib/supabase-server";
import type { StatementLine } from "@/lib/bank-csv-parser";

// ─── Import bank statement ────────────────────────────────────────────────────
const ImportSchema = z.object({
  bankAccountId:  z.string().uuid(),
  bankFormat:     z.enum(["BDO", "BPI", "METROBANK", "GENERIC"]),
  fileName:       z.string().max(255).optional(),
  periodStart:    z.string().date(),
  periodEnd:      z.string().date(),
  openingBalance: z.number(),
  closingBalance: z.number(),
  lines:          z.array(z.object({
    transactionDate: z.string(),
    valueDate:       z.string().nullable(),
    description:     z.string(),
    referenceNumber: z.string().nullable(),
    debitAmount:     z.number().min(0),
    creditAmount:    z.number().min(0),
    runningBalance:  z.number().nullable(),
  })).min(1),
});

export type ImportResult =
  | { success: true;  importId: string; lineCount: number }
  | { success: false; error: string };

export async function importBankStatement(
  input: z.infer<typeof ImportSchema>,
): Promise<ImportResult> {
  const parsed = ImportSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid input." };

  const user = await getAuthUser();
  if (!user) return { success: false, error: "Not authenticated." };

  const { bankAccountId, bankFormat, fileName, periodStart, periodEnd,
          openingBalance, closingBalance, lines } = parsed.data;

  const [account] = await db
    .select({ id: bankAccounts.id })
    .from(bankAccounts)
    .where(eq(bankAccounts.id, bankAccountId))
    .limit(1);
  if (!account) return { success: false, error: "Bank account not found." };

  const [imp] = await db
    .insert(bankStatementImports)
    .values({
      bankAccountId,
      bankFormat,
      fileName:       fileName ?? null,
      periodStart,
      periodEnd,
      openingBalance: String(openingBalance),
      closingBalance: String(closingBalance),
      lineCount:      lines.length,
      importedBy:     user.id,
    })
    .returning({ id: bankStatementImports.id });

  await db.insert(bankStatementLines).values(
    lines.map((l) => ({
      importId:        imp.id,
      bankAccountId,
      transactionDate: l.transactionDate,
      valueDate:       l.valueDate ?? null,
      description:     l.description,
      referenceNumber: l.referenceNumber ?? null,
      debitAmount:     String(l.debitAmount),
      creditAmount:    String(l.creditAmount),
      runningBalance:  l.runningBalance != null ? String(l.runningBalance) : null,
    })),
  );

  revalidatePath("/finance/banking/reconciliations");
  return { success: true, importId: imp.id, lineCount: lines.length };
}

// ─── Auto-match statement lines to ERP bank transactions ─────────────────────
// Match rule: same direction (debit↔DEBIT / credit↔CREDIT), same amount,
// transaction dates within ±3 days. Skips lines/ERP transactions already matched.
const AutoMatchSchema = z.object({ importId: z.string().uuid() });

export type AutoMatchResult =
  | { success: true;  matched: number; remaining: number }
  | { success: false; error: string };

export async function runAutoMatch(
  input: z.infer<typeof AutoMatchSchema>,
): Promise<AutoMatchResult> {
  const parsed = AutoMatchSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid input." };

  const user = await getAuthUser();
  if (!user) return { success: false, error: "Not authenticated." };

  const { importId } = parsed.data;

  const [imp] = await db
    .select({ bankAccountId: bankStatementImports.bankAccountId, periodStart: bankStatementImports.periodStart, periodEnd: bankStatementImports.periodEnd })
    .from(bankStatementImports)
    .where(eq(bankStatementImports.id, importId))
    .limit(1);
  if (!imp) return { success: false, error: "Import not found." };

  // Unmatched statement lines for this import
  const unmatchedLines = await db
    .select()
    .from(bankStatementLines)
    .where(and(
      eq(bankStatementLines.importId, importId),
      eq(bankStatementLines.isMatched, false),
    ));

  if (unmatchedLines.length === 0) return { success: true, matched: 0, remaining: 0 };

  // IDs of ERP transactions already used in a match for this account
  const usedErpRows = await db
    .select({ erpTransactionId: bankReconciliationItems.erpTransactionId })
    .from(bankReconciliationItems)
    .where(eq(bankReconciliationItems.importId, importId));
  const usedErpIds = new Set(usedErpRows.map((r) => r.erpTransactionId).filter(Boolean) as string[]);

  // ERP transactions for this account in the statement period (±3 day buffer)
  const bufferStart = new Date(imp.periodStart);
  bufferStart.setDate(bufferStart.getDate() - 3);
  const bufferEnd   = new Date(imp.periodEnd);
  bufferEnd.setDate(bufferEnd.getDate() + 3);

  const erpTxns = await db
    .select({
      id:              bankTransactions.id,
      transactionDate: bankTransactions.transactionDate,
      transactionType: bankTransactions.transactionType,
      amount:          bankTransactions.amount,
    })
    .from(bankTransactions)
    .where(and(
      eq(bankTransactions.bankAccountId, imp.bankAccountId),
      gte(bankTransactions.transactionDate, bufferStart.toISOString().split("T")[0]),
      lte(bankTransactions.transactionDate, bufferEnd.toISOString().split("T")[0]),
    ));

  const availableErp = erpTxns.filter((t) => !usedErpIds.has(t.id));

  const matchInserts: (typeof bankReconciliationItems.$inferInsert)[] = [];
  const matchedLineIds: string[] = [];
  const matchedErpIds  = new Set<string>();

  for (const line of unmatchedLines) {
    const lineAmount = Number(line.debitAmount) > 0 ? Number(line.debitAmount) : Number(line.creditAmount);
    const lineType   = Number(line.debitAmount) > 0 ? "DEBIT" : "CREDIT";
    const lineDate   = new Date(line.transactionDate).getTime();

    const match = availableErp.find((t) => {
      if (matchedErpIds.has(t.id)) return false;
      if (t.transactionType !== lineType) return false;
      if (Math.abs(Number(t.amount) - lineAmount) > 0.01) return false;
      const daysDiff = Math.abs(new Date(t.transactionDate).getTime() - lineDate) / 86_400_000;
      return daysDiff <= 3;
    });

    if (match) {
      matchedErpIds.add(match.id);
      matchedLineIds.push(line.id);
      matchInserts.push({
        importId,
        statementLineId:  line.id,
        erpTransactionId: match.id,
        matchType:        "MATCHED",
        statementAmount:  String(lineAmount),
        erpAmount:        match.amount,
        variance:         "0",
        matchedBy:        user.id,
        matchedAt:        new Date(),
        actionNote:       "AUTO_MATCH",
      });
    }
  }

  if (matchInserts.length > 0) {
    await db.insert(bankReconciliationItems).values(matchInserts);
    for (const id of matchedLineIds) {
      await db.update(bankStatementLines).set({ isMatched: true }).where(eq(bankStatementLines.id, id));
    }
  }

  const remaining = unmatchedLines.length - matchInserts.length;
  return { success: true, matched: matchInserts.length, remaining };
}

// ─── Manual match ─────────────────────────────────────────────────────────────
const ManualMatchSchema = z.object({
  importId:         z.string().uuid(),
  statementLineId:  z.string().uuid(),
  erpTransactionId: z.string().uuid(),
  note:             z.string().max(500).optional(),
});

export type ManualMatchResult =
  | { success: true }
  | { success: false; error: string };

export async function manualMatch(
  input: z.infer<typeof ManualMatchSchema>,
): Promise<ManualMatchResult> {
  const parsed = ManualMatchSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid input." };

  const user = await getAuthUser();
  if (!user) return { success: false, error: "Not authenticated." };

  const { importId, statementLineId, erpTransactionId, note } = parsed.data;

  const [line] = await db
    .select({ isMatched: bankStatementLines.isMatched, debitAmount: bankStatementLines.debitAmount, creditAmount: bankStatementLines.creditAmount })
    .from(bankStatementLines).where(eq(bankStatementLines.id, statementLineId)).limit(1);
  if (!line) return { success: false, error: "Statement line not found." };
  if (line.isMatched) return { success: false, error: "Statement line is already matched." };

  const [erpTxn] = await db
    .select({ amount: bankTransactions.amount })
    .from(bankTransactions).where(eq(bankTransactions.id, erpTransactionId)).limit(1);
  if (!erpTxn) return { success: false, error: "ERP transaction not found." };

  const stmtAmount = Number(line.debitAmount) > 0 ? Number(line.debitAmount) : Number(line.creditAmount);
  const erpAmount  = Number(erpTxn.amount);
  const variance   = Math.abs(stmtAmount - erpAmount);

  await db.insert(bankReconciliationItems).values({
    importId,
    statementLineId,
    erpTransactionId,
    matchType:       "MATCHED",
    statementAmount: String(stmtAmount),
    erpAmount:       String(erpAmount),
    variance:        String(variance.toFixed(2)),
    matchedBy:       user.id,
    matchedAt:       new Date(),
    actionNote:      note ? `MANUAL_MATCH: ${note}` : "MANUAL_MATCH",
  });

  await db.update(bankStatementLines).set({ isMatched: true }).where(eq(bankStatementLines.id, statementLineId));

  revalidatePath(`/finance/banking/reconcile/${importId}`);
  return { success: true };
}

// ─── Unmatch ──────────────────────────────────────────────────────────────────
const UnmatchSchema = z.object({ reconciliationItemId: z.string().uuid() });

export type UnmatchResult =
  | { success: true }
  | { success: false; error: string };

export async function unmatch(
  input: z.infer<typeof UnmatchSchema>,
): Promise<UnmatchResult> {
  const parsed = UnmatchSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid input." };

  const user = await getAuthUser();
  if (!user) return { success: false, error: "Not authenticated." };

  const { reconciliationItemId } = parsed.data;

  const [item] = await db
    .select({ importId: bankReconciliationItems.importId, statementLineId: bankReconciliationItems.statementLineId })
    .from(bankReconciliationItems)
    .where(eq(bankReconciliationItems.id, reconciliationItemId))
    .limit(1);
  if (!item) return { success: false, error: "Match record not found." };

  await db.delete(bankReconciliationItems).where(eq(bankReconciliationItems.id, reconciliationItemId));

  if (item.statementLineId) {
    await db.update(bankStatementLines).set({ isMatched: false }).where(eq(bankStatementLines.id, item.statementLineId));
  }

  revalidatePath(`/finance/banking/reconcile/${item.importId}`);
  return { success: true };
}

// ─── Finalize reconciliation ──────────────────────────────────────────────────
const FinalizeSchema = z.object({ importId: z.string().uuid() });

export type FinalizeResult =
  | { success: true;  matchedCount: number; unmatchedCount: number; variance: string }
  | { success: false; error: string };

export async function finalizeReconciliation(
  input: z.infer<typeof FinalizeSchema>,
): Promise<FinalizeResult> {
  const parsed = FinalizeSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid input." };

  const user = await getAuthUser();
  if (!user) return { success: false, error: "Not authenticated." };

  const { importId } = parsed.data;

  const [imp] = await db
    .select()
    .from(bankStatementImports)
    .where(eq(bankStatementImports.id, importId))
    .limit(1);
  if (!imp) return { success: false, error: "Import not found." };
  if (imp.status === "FINALIZED") return { success: false, error: "Already finalized." };

  const allLines = await db
    .select({ isMatched: bankStatementLines.isMatched })
    .from(bankStatementLines)
    .where(eq(bankStatementLines.importId, importId));

  const matchedCount   = allLines.filter((l) => l.isMatched).length;
  const unmatchedCount = allLines.filter((l) => !l.isMatched).length;

  // Compute book balance: sum of ERP transactions for account in period
  const [erpAgg] = await db
    .select({ bookBalance: sql<string>`COALESCE(SUM(CASE WHEN transaction_type = 'CREDIT' THEN amount::numeric ELSE -amount::numeric END), 0)` })
    .from(bankTransactions)
    .where(and(
      eq(bankTransactions.bankAccountId, imp.bankAccountId),
      gte(bankTransactions.transactionDate, imp.periodStart),
      lte(bankTransactions.transactionDate, imp.periodEnd),
    ));

  const statementNet = Number(imp.closingBalance) - Number(imp.openingBalance);
  const bookNet      = Number(erpAgg?.bookBalance ?? 0);
  const variance     = Math.abs(statementNet - bookNet);

  // Write to the bankReconciliations summary table
  await db.insert(bankReconciliations).values({
    bankAccountId:       imp.bankAccountId,
    reconciliationDate:  imp.periodEnd,
    statementBalance:    imp.closingBalance,
    bookBalance:         String(bookNet.toFixed(2)),
    variance:            String(variance.toFixed(2)),
    isReconciled:        variance < 1,  // < ₱1 variance treated as reconciled
    reconciledBy:        user.id,
  });

  await db.update(bankStatementImports).set({ status: "FINALIZED" }).where(eq(bankStatementImports.id, importId));

  revalidatePath("/finance/banking/reconciliations");
  return { success: true, matchedCount, unmatchedCount, variance: variance.toFixed(2) };
}
