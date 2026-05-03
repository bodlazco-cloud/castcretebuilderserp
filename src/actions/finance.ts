"use server";

import { db } from "@/db";
import {
  invoices, payables, requestsForPayment,
  bankTransactions, workAccomplishedReports,
  manualVouchers, bankAccounts, paymentRequests,
} from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { getAuthUser } from "@/lib/supabase-server";
import {
  notifyInvoiceSubmitted, notifyInvoiceCollected,
  notifyPayableApproved, notifyPayableRejected,
  notifyRfpFirstApproved, notifyRfpFinalApproved, notifyRfpRejected,
} from "@/lib/notifications";

type SimpleResult = { success: boolean; error?: string };

// ─── INVOICES ─────────────────────────────────────────────────────────────────

export async function generateInvoice(input: {
  warId: string;
  lessDpRecovery?: string;
  lessOsmDeduction?: string;
  lessRetention?: string;
}): Promise<{ success: boolean; id?: string; error?: string }> {
  const user = await getAuthUser();
  if (!user) return { success: false, error: "Not authenticated." };

  const [war] = await db
    .select()
    .from(workAccomplishedReports)
    .where(eq(workAccomplishedReports.id, input.warId));

  if (!war) return { success: false, error: "WAR not found." };
  if (war.status !== "APPROVED")
    return { success: false, error: "WAR must be APPROVED before generating an invoice." };

  const [inserted] = await db
    .insert(invoices)
    .values({
      projectId:           war.projectId,
      warId:               war.id,
      unitMilestoneId:     war.unitMilestoneId,
      grossAccomplishment: war.grossAccomplishment,
      lessDpRecovery:      input.lessDpRecovery  ?? "0",
      lessOsmDeduction:    input.lessOsmDeduction ?? "0",
      lessRetention:       input.lessRetention    ?? "0",
      status:              "DRAFT",
    })
    .returning({ id: invoices.id });

  return { success: true, id: inserted.id };
}

export async function submitInvoice(id: string): Promise<SimpleResult> {
  const user = await getAuthUser();
  if (!user) return { success: false, error: "Not authenticated." };

  const [inv] = await db.select().from(invoices).where(eq(invoices.id, id));
  if (!inv) return { success: false, error: "Invoice not found." };
  if (inv.status !== "DRAFT")
    return { success: false, error: "Only DRAFT invoices can be submitted." };

  await db
    .update(invoices)
    .set({ status: "SUBMITTED", submittedAt: new Date() })
    .where(eq(invoices.id, id));

  void notifyInvoiceSubmitted(id);
  return { success: true };
}

export async function recordCollection(
  id: string,
  amount: string,
): Promise<SimpleResult> {
  const user = await getAuthUser();
  if (!user) return { success: false, error: "Not authenticated." };

  const [inv] = await db.select().from(invoices).where(eq(invoices.id, id));
  if (!inv) return { success: false, error: "Invoice not found." };
  if (inv.status !== "SUBMITTED")
    return { success: false, error: "Only SUBMITTED invoices can be collected." };

  await db
    .update(invoices)
    .set({ status: "COLLECTED", collectedAt: new Date(), collectionAmount: amount })
    .where(eq(invoices.id, id));

  void notifyInvoiceCollected(id);
  return { success: true };
}

// ─── PAYABLES ─────────────────────────────────────────────────────────────────

export async function submitPayable(id: string): Promise<SimpleResult> {
  const user = await getAuthUser();
  if (!user) return { success: false, error: "Not authenticated." };

  const [p] = await db.select().from(payables).where(eq(payables.id, id));
  if (!p) return { success: false, error: "Payable not found." };
  if (p.status !== "DRAFT")
    return { success: false, error: "Only DRAFT payables can be submitted." };

  await db.update(payables).set({ status: "PENDING_REVIEW" }).where(eq(payables.id, id));
  return { success: true };
}

export async function approvePayable(id: string): Promise<SimpleResult> {
  const user = await getAuthUser();
  if (!user) return { success: false, error: "Not authenticated." };

  const [p] = await db.select().from(payables).where(eq(payables.id, id));
  if (!p) return { success: false, error: "Payable not found." };
  if (p.status !== "PENDING_REVIEW")
    return { success: false, error: "Payable must be PENDING_REVIEW to approve." };

  await db
    .update(payables)
    .set({ status: "APPROVED", bodApprovedBy: user.id, bodApprovedAt: new Date() })
    .where(eq(payables.id, id));

  void notifyPayableApproved(id);
  return { success: true };
}

export async function rejectPayable(id: string, reason: string): Promise<SimpleResult> {
  const user = await getAuthUser();
  if (!user) return { success: false, error: "Not authenticated." };

  const [p] = await db.select().from(payables).where(eq(payables.id, id));
  if (!p) return { success: false, error: "Payable not found." };
  if (p.status !== "PENDING_REVIEW")
    return { success: false, error: "Cannot reject at this stage." };

  await db
    .update(payables)
    .set({ status: "REJECTED", rejectionReason: reason })
    .where(eq(payables.id, id));

  void notifyPayableRejected(id);
  return { success: true };
}

export async function markPayablePaid(id: string): Promise<SimpleResult> {
  const user = await getAuthUser();
  if (!user) return { success: false, error: "Not authenticated." };

  const [p] = await db.select().from(payables).where(eq(payables.id, id));
  if (!p) return { success: false, error: "Payable not found." };
  if (p.status !== "APPROVED")
    return { success: false, error: "Payable must be APPROVED to mark as paid." };

  await db.update(payables).set({ paidAt: new Date() }).where(eq(payables.id, id));
  return { success: true };
}

// ─── RFP ──────────────────────────────────────────────────────────────────────

export async function createRfp(input: {
  bankAccountId?: string;
  amount: string;
  payeeName: string;
  purpose: string;
  sourceDocumentUrl: string;
  costCenterId?: string;
}): Promise<{ success: boolean; id?: string; error?: string }> {
  const user = await getAuthUser();
  if (!user) return { success: false, error: "Not authenticated." };

  const [inserted] = await db
    .insert(requestsForPayment)
    .values({
      bankAccountId:     input.bankAccountId     || null,
      amount:            input.amount,
      payeeName:         input.payeeName,
      purpose:           input.purpose,
      sourceDocumentUrl: input.sourceDocumentUrl,
      costCenterId:      input.costCenterId       || null,
      status:            "PENDING",
      submittedBy:       user.id,
    })
    .returning({ id: requestsForPayment.id });

  return { success: true, id: inserted.id };
}

export async function firstApproveRfp(id: string): Promise<SimpleResult> {
  const user = await getAuthUser();
  if (!user) return { success: false, error: "Not authenticated." };

  const [rfp] = await db
    .select()
    .from(requestsForPayment)
    .where(eq(requestsForPayment.id, id));
  if (!rfp) return { success: false, error: "RFP not found." };
  if (rfp.status !== "PENDING")
    return { success: false, error: "RFP must be PENDING for first approval." };

  await db
    .update(requestsForPayment)
    .set({ status: "FIRST_APPROVED", firstApprovalBy: user.id, firstApprovalAt: new Date() })
    .where(eq(requestsForPayment.id, id));

  void notifyRfpFirstApproved(id);
  return { success: true };
}

export async function finalApproveRfp(id: string): Promise<SimpleResult> {
  const user = await getAuthUser();
  if (!user) return { success: false, error: "Not authenticated." };

  const [rfp] = await db
    .select()
    .from(requestsForPayment)
    .where(eq(requestsForPayment.id, id));
  if (!rfp) return { success: false, error: "RFP not found." };
  if (rfp.status !== "FIRST_APPROVED")
    return { success: false, error: "RFP must have first approval before final approval." };

  await db
    .update(requestsForPayment)
    .set({ status: "APPROVED", finalApprovalBy: user.id, finalApprovalAt: new Date() })
    .where(eq(requestsForPayment.id, id));

  void notifyRfpFinalApproved(id);
  return { success: true };
}

export async function rejectRfp(id: string, reason: string): Promise<SimpleResult> {
  const user = await getAuthUser();
  if (!user) return { success: false, error: "Not authenticated." };

  await db
    .update(requestsForPayment)
    .set({ status: "REJECTED", rejectionReason: reason })
    .where(eq(requestsForPayment.id, id));

  void notifyRfpRejected(id);
  return { success: true };
}

// ─── BANK TRANSACTIONS ────────────────────────────────────────────────────────

export async function createBankTransaction(input: {
  bankAccountId: string;
  transactionDate: string;
  transactionType: "DEBIT" | "CREDIT";
  amount: string;
  description: string;
  referenceNumber?: string;
  requiresDualAuth?: boolean;
}): Promise<{ success: boolean; id?: string; error?: string }> {
  const user = await getAuthUser();
  if (!user) return { success: false, error: "Not authenticated." };

  const [inserted] = await db
    .insert(bankTransactions)
    .values({
      bankAccountId:    input.bankAccountId,
      transactionDate:  input.transactionDate,
      transactionType:  input.transactionType,
      amount:           input.amount,
      description:      input.description,
      referenceNumber:  input.referenceNumber ?? null,
      requiresDualAuth: input.requiresDualAuth ?? false,
      status:           "PENDING",
      enteredBy:        user.id,
    })
    .returning({ id: bankTransactions.id });

  return { success: true, id: inserted.id };
}

export async function firstApproveBankTxn(id: string): Promise<SimpleResult> {
  const user = await getAuthUser();
  if (!user) return { success: false, error: "Not authenticated." };

  await db
    .update(bankTransactions)
    .set({ firstApprovalBy: user.id, firstApprovalAt: new Date(), status: "FIRST_APPROVED" })
    .where(eq(bankTransactions.id, id));

  return { success: true };
}

export async function finalApproveBankTxn(id: string): Promise<SimpleResult> {
  const user = await getAuthUser();
  if (!user) return { success: false, error: "Not authenticated." };

  await db
    .update(bankTransactions)
    .set({ secondApprovalBy: user.id, secondApprovalAt: new Date(), status: "APPROVED" })
    .where(eq(bankTransactions.id, id));

  return { success: true };
}

// ─── Voucher Payment Release (Zero-Trust Gate) ────────────────────────────────
// Gemini: authorizePaymentRelease(voucher_id, authorizer_id)
// Fixed:  authorizer_id resolved server-side via getAuthUser() — never trusted from client.
//         execute_financial_finalization RPC replaced with:
//           1. DB transaction: update voucher + insert bankTransaction + decrement balance
//           2. requiresDualAuth flag set when amount >= ₱50,000 (audit trail)

export type AuthorizeReleaseResult =
  | { success: true; requiresDualAuth: boolean }
  | { success: false; error: string };

export async function authorizePaymentRelease(
  voucherId:     string,
  bankAccountId: string,
): Promise<AuthorizeReleaseResult> {
  const user = await getAuthUser();
  if (!user) return { success: false, error: "Not authenticated." };

  // ── Fetch voucher ─────────────────────────────────────────────────────────
  const [voucher] = await db
    .select({
      amount:           manualVouchers.amount,
      supportingDocUrl: manualVouchers.supportingDocUrl,
      preparedBy:       manualVouchers.preparedBy,
      paymentStatus:    manualVouchers.paymentStatus,
      projectId:        manualVouchers.projectId,
      costCenterId:     manualVouchers.costCenterId,
      description:      manualVouchers.description,
    })
    .from(manualVouchers)
    .where(eq(manualVouchers.id, voucherId))
    .limit(1);

  if (!voucher) return { success: false, error: "Voucher not found." };

  // ── Zero-Trust Gate 1: attachment required ────────────────────────────────
  if (!voucher.supportingDocUrl) {
    return { success: false, error: "Zero-Trust Violation: No source document attached. Upload a PDF or photo before releasing." };
  }

  // ── Zero-Trust Gate 2: segregation of duties ──────────────────────────────
  if (voucher.preparedBy === user.id) {
    return { success: false, error: "Segregation of Duties Violation: The voucher preparer cannot authorize the release." };
  }

  // ── Gate 3: prevent double-release ───────────────────────────────────────
  if (voucher.paymentStatus === "RELEASED") {
    return { success: false, error: "Voucher has already been released." };
  }

  const amount        = Number(voucher.amount);
  const requiresDualAuth = amount >= 50_000;

  // ── Atomic transaction: release + bank debit + balance update ────────────
  await db.transaction(async (tx) => {
    // 1. Mark voucher RELEASED
    await tx.update(manualVouchers).set({
      paymentStatus:  "RELEASED",
      authorizedBy:   user.id,
      paidAt:         new Date(),
      requiresDualAuth,
      bankAccountId,
    }).where(eq(manualVouchers.id, voucherId));

    // 2. Create bank DEBIT transaction record
    await tx.insert(bankTransactions).values({
      bankAccountId,
      transactionDate:  new Date().toISOString().split("T")[0],
      transactionType:  "DEBIT",
      amount:           String(amount),
      description:      `Voucher release: ${voucher.description}`,
      requiresDualAuth,
      status:           "APPROVED",
      enteredBy:        user.id,
    });

    // 3. Decrement bank balance (execute_financial_finalization equivalent)
    await tx.update(bankAccounts)
      .set({ currentBalance: sql`current_balance - ${amount}` })
      .where(eq(bankAccounts.id, bankAccountId));
  });

  revalidatePath("/finance/disbursements");
  revalidatePath("/main-dashboard");
  return { success: true, requiresDualAuth };
}

// ─── Payment Request Release ──────────────────────────────────────────────────
// Gemini: releasePayment(paymentId, authUser) — authUser from client (security hole).
// Covers payment_requests (PO/payable/voucher payment queue) distinct from
// manual_vouchers. Applies same segregation-of-duties gate; no bank balance
// update here — that happens when the bank transaction is separately approved.

export async function releasePaymentRequest(
  paymentRequestId: string,
): Promise<SimpleResult> {
  const user = await getAuthUser();
  if (!user) return { success: false, error: "Not authenticated." };

  const [pr] = await db
    .select({ requestedBy: paymentRequests.requestedBy, status: paymentRequests.status })
    .from(paymentRequests)
    .where(eq(paymentRequests.id, paymentRequestId))
    .limit(1);

  if (!pr) return { success: false, error: "Payment request not found." };
  if (pr.status === "RELEASED") return { success: false, error: "Already released." };

  // Segregation of Duties: requester cannot self-authorize release
  if (pr.requestedBy === user.id) {
    return { success: false, error: "Dual-Auth Violation: Requester cannot authorize the release." };
  }

  await db.update(paymentRequests).set({
    status:     "RELEASED",
    releasedBy: user.id,
    releasedAt: new Date(),
  }).where(eq(paymentRequests.id, paymentRequestId));

  revalidatePath("/finance/disbursements");
  return { success: true };
}
