import { db } from "@/db";
import {
  users, departments, projects,
  workAccomplishedReports, invoices, payables,
  requestsForPayment, purchaseRequisitions, purchaseOrders,
} from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { sendEmail } from "./email";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const fmt = (v: number) =>
  `PHP ${v.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;

type DeptCode = "PLANNING" | "AUDIT" | "CONSTRUCTION" | "PROCUREMENT" | "BATCHING" | "MOTORPOOL" | "FINANCE" | "HR" | "ADMIN" | "BOD";

// ─── Recipient helpers ────────────────────────────────────────────────────────

async function emailsByDept(deptCodes: DeptCode[]): Promise<string[]> {
  const rows = await db
    .select({ email: users.email })
    .from(users)
    .innerJoin(departments, eq(users.deptId, departments.id))
    .where(inArray(departments.code, deptCodes));
  return rows.map((r) => r.email);
}

async function emailById(userId: string): Promise<string | null> {
  const [row] = await db
    .select({ email: users.email })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return row?.email ?? null;
}

// ─── WAR ──────────────────────────────────────────────────────────────────────

export async function notifyWarSubmitted(warId: string): Promise<void> {
  const [war] = await db
    .select({ id: workAccomplishedReports.id, projectId: workAccomplishedReports.projectId })
    .from(workAccomplishedReports)
    .where(eq(workAccomplishedReports.id, warId))
    .limit(1);
  if (!war) return;

  const [proj] = await db
    .select({ name: projects.name })
    .from(projects)
    .where(eq(projects.id, war.projectId))
    .limit(1);

  const to = await emailsByDept(["AUDIT", "FINANCE"] as DeptCode[]);
  if (!to.length) return;

  await sendEmail({
    to,
    subject: `WAR Submitted — ${proj?.name ?? war.projectId}`,
    html: `<p>A Work Accomplished Report has been submitted for project <strong>${proj?.name ?? war.projectId}</strong> and is pending review.</p>
<p><a href="${APP_URL}/construction/war/${war.id}">View WAR →</a></p>`,
  });
}

// ─── INVOICES ─────────────────────────────────────────────────────────────────

export async function notifyInvoiceSubmitted(invoiceId: string): Promise<void> {
  const [inv] = await db
    .select({ id: invoices.id, projectId: invoices.projectId, netAmountDue: invoices.netAmountDue })
    .from(invoices)
    .where(eq(invoices.id, invoiceId))
    .limit(1);
  if (!inv) return;

  const [proj] = await db
    .select({ name: projects.name })
    .from(projects)
    .where(eq(projects.id, inv.projectId))
    .limit(1);

  const to = await emailsByDept(["FINANCE", "BOD"] as DeptCode[]);
  if (!to.length) return;

  const amount = inv.netAmountDue ? fmt(Number(inv.netAmountDue)) : "—";
  await sendEmail({
    to,
    subject: `Invoice Submitted — ${proj?.name ?? inv.projectId} (${amount})`,
    html: `<p>An invoice of <strong>${amount}</strong> has been submitted for project <strong>${proj?.name ?? inv.projectId}</strong> and is awaiting collection.</p>
<p><a href="${APP_URL}/finance/invoices/${inv.id}">View Invoice →</a></p>`,
  });
}

export async function notifyInvoiceCollected(invoiceId: string): Promise<void> {
  const [inv] = await db
    .select({ id: invoices.id, projectId: invoices.projectId, collectionAmount: invoices.collectionAmount })
    .from(invoices)
    .where(eq(invoices.id, invoiceId))
    .limit(1);
  if (!inv) return;

  const [proj] = await db
    .select({ name: projects.name })
    .from(projects)
    .where(eq(projects.id, inv.projectId))
    .limit(1);

  const to = await emailsByDept(["FINANCE", "BOD"] as DeptCode[]);
  if (!to.length) return;

  const amount = inv.collectionAmount ? fmt(Number(inv.collectionAmount)) : "—";
  await sendEmail({
    to,
    subject: `Invoice Collected — ${proj?.name ?? inv.projectId} (${amount})`,
    html: `<p>Payment of <strong>${amount}</strong> has been collected for project <strong>${proj?.name ?? inv.projectId}</strong>.</p>
<p><a href="${APP_URL}/finance/invoices/${inv.id}">View Invoice →</a></p>`,
  });
}

// ─── PAYABLES ─────────────────────────────────────────────────────────────────

export async function notifyPayableApproved(payableId: string): Promise<void> {
  const [p] = await db
    .select({ id: payables.id, projectId: payables.projectId, netPayable: payables.netPayable })
    .from(payables)
    .where(eq(payables.id, payableId))
    .limit(1);
  if (!p) return;

  const [proj] = await db
    .select({ name: projects.name })
    .from(projects)
    .where(eq(projects.id, p.projectId))
    .limit(1);

  const to = await emailsByDept(["FINANCE"] as DeptCode[]);
  if (!to.length) return;

  const amount = p.netPayable ? fmt(Number(p.netPayable)) : "—";
  await sendEmail({
    to,
    subject: `Payable Approved — ${proj?.name ?? p.projectId} (${amount})`,
    html: `<p>A subcon payable of <strong>${amount}</strong> for project <strong>${proj?.name ?? p.projectId}</strong> has been <strong>approved</strong> by the BOD and is ready for payment.</p>
<p><a href="${APP_URL}/finance/payables/${p.id}">View Payable →</a></p>`,
  });
}

export async function notifyPayableRejected(payableId: string): Promise<void> {
  const [p] = await db
    .select({ id: payables.id, projectId: payables.projectId, rejectionReason: payables.rejectionReason })
    .from(payables)
    .where(eq(payables.id, payableId))
    .limit(1);
  if (!p) return;

  const [proj] = await db
    .select({ name: projects.name })
    .from(projects)
    .where(eq(projects.id, p.projectId))
    .limit(1);

  const to = await emailsByDept(["FINANCE", "CONSTRUCTION"] as DeptCode[]);
  if (!to.length) return;

  await sendEmail({
    to,
    subject: `Payable Rejected — ${proj?.name ?? p.projectId}`,
    html: `<p>A subcon payable for project <strong>${proj?.name ?? p.projectId}</strong> has been <strong>rejected</strong>.</p>
${p.rejectionReason ? `<p>Reason: ${p.rejectionReason}</p>` : ""}
<p><a href="${APP_URL}/finance/payables/${p.id}">View Payable →</a></p>`,
  });
}

// ─── RFP ──────────────────────────────────────────────────────────────────────

export async function notifyRfpFirstApproved(rfpId: string): Promise<void> {
  const [rfp] = await db
    .select({
      id: requestsForPayment.id,
      payeeName: requestsForPayment.payeeName,
      amount: requestsForPayment.amount,
      purpose: requestsForPayment.purpose,
      submittedBy: requestsForPayment.submittedBy,
    })
    .from(requestsForPayment)
    .where(eq(requestsForPayment.id, rfpId))
    .limit(1);
  if (!rfp) return;

  const submitterEmail = rfp.submittedBy ? await emailById(rfp.submittedBy) : null;
  const to = [
    ...(submitterEmail ? [submitterEmail] : []),
    ...(await emailsByDept(["BOD"] as DeptCode[])),
  ];
  if (!to.length) return;

  await sendEmail({
    to,
    subject: `RFP First-Approved — ${rfp.payeeName} (${fmt(Number(rfp.amount))})`,
    html: `<p>An RFP to <strong>${rfp.payeeName}</strong> for <strong>${fmt(Number(rfp.amount))}</strong> has received first approval and is pending final BOD sign-off.</p>
<p>Purpose: ${rfp.purpose}</p>
<p><a href="${APP_URL}/finance/rfp/${rfp.id}">View RFP →</a></p>`,
  });
}

export async function notifyRfpFinalApproved(rfpId: string): Promise<void> {
  const [rfp] = await db
    .select({
      id: requestsForPayment.id,
      payeeName: requestsForPayment.payeeName,
      amount: requestsForPayment.amount,
      purpose: requestsForPayment.purpose,
      submittedBy: requestsForPayment.submittedBy,
    })
    .from(requestsForPayment)
    .where(eq(requestsForPayment.id, rfpId))
    .limit(1);
  if (!rfp) return;

  const submitterEmail = rfp.submittedBy ? await emailById(rfp.submittedBy) : null;
  const to = [
    ...(submitterEmail ? [submitterEmail] : []),
    ...(await emailsByDept(["FINANCE"] as DeptCode[])),
  ];
  if (!to.length) return;

  await sendEmail({
    to,
    subject: `RFP Fully Approved — ${rfp.payeeName} (${fmt(Number(rfp.amount))})`,
    html: `<p>The RFP to <strong>${rfp.payeeName}</strong> for <strong>${fmt(Number(rfp.amount))}</strong> has been <strong>fully approved</strong> and is ready for disbursement.</p>
<p>Purpose: ${rfp.purpose}</p>
<p><a href="${APP_URL}/finance/rfp/${rfp.id}">View RFP →</a></p>`,
  });
}

export async function notifyRfpRejected(rfpId: string): Promise<void> {
  const [rfp] = await db
    .select({
      id: requestsForPayment.id,
      payeeName: requestsForPayment.payeeName,
      amount: requestsForPayment.amount,
      purpose: requestsForPayment.purpose,
      submittedBy: requestsForPayment.submittedBy,
      rejectionReason: requestsForPayment.rejectionReason,
    })
    .from(requestsForPayment)
    .where(eq(requestsForPayment.id, rfpId))
    .limit(1);
  if (!rfp) return;

  const submitterEmail = rfp.submittedBy ? await emailById(rfp.submittedBy) : null;
  const to = submitterEmail ? [submitterEmail] : [];
  if (!to.length) return;

  await sendEmail({
    to,
    subject: `RFP Rejected — ${rfp.payeeName} (${fmt(Number(rfp.amount))})`,
    html: `<p>Your RFP to <strong>${rfp.payeeName}</strong> for <strong>${fmt(Number(rfp.amount))}</strong> has been <strong>rejected</strong>.</p>
${rfp.rejectionReason ? `<p>Reason: ${rfp.rejectionReason}</p>` : ""}
<p><a href="${APP_URL}/finance/rfp/${rfp.id}">View RFP →</a></p>`,
  });
}

// ─── PURCHASE REQUISITIONS ────────────────────────────────────────────────────

export async function notifyPrApproved(prId: string): Promise<void> {
  const [pr] = await db
    .select({ id: purchaseRequisitions.id, projectId: purchaseRequisitions.projectId, requestedBy: purchaseRequisitions.requestedBy })
    .from(purchaseRequisitions)
    .where(eq(purchaseRequisitions.id, prId))
    .limit(1);
  if (!pr) return;

  const [proj] = await db
    .select({ name: projects.name })
    .from(projects)
    .where(eq(projects.id, pr.projectId))
    .limit(1);

  const requesterEmail = pr.requestedBy ? await emailById(pr.requestedBy) : null;
  const to = [
    ...(requesterEmail ? [requesterEmail] : []),
    ...(await emailsByDept(["PROCUREMENT"] as DeptCode[])),
  ];
  if (!to.length) return;

  await sendEmail({
    to,
    subject: `PR Approved — ${proj?.name ?? pr.projectId}`,
    html: `<p>A purchase requisition for project <strong>${proj?.name ?? pr.projectId}</strong> has been <strong>approved</strong> and a PO can now be created.</p>
<p><a href="${APP_URL}/procurement/pr/${pr.id}">View PR →</a></p>`,
  });
}

export async function notifyPrRejected(prId: string): Promise<void> {
  const [pr] = await db
    .select({ id: purchaseRequisitions.id, projectId: purchaseRequisitions.projectId, requestedBy: purchaseRequisitions.requestedBy, rejectionReason: purchaseRequisitions.rejectionReason })
    .from(purchaseRequisitions)
    .where(eq(purchaseRequisitions.id, prId))
    .limit(1);
  if (!pr) return;

  const [proj] = await db
    .select({ name: projects.name })
    .from(projects)
    .where(eq(projects.id, pr.projectId))
    .limit(1);

  const requesterEmail = pr.requestedBy ? await emailById(pr.requestedBy) : null;
  const to = requesterEmail ? [requesterEmail] : [];
  if (!to.length) return;

  await sendEmail({
    to,
    subject: `PR Rejected — ${proj?.name ?? pr.projectId}`,
    html: `<p>A purchase requisition for project <strong>${proj?.name ?? pr.projectId}</strong> has been <strong>rejected</strong>.</p>
${pr.rejectionReason ? `<p>Reason: ${pr.rejectionReason}</p>` : ""}
<p><a href="${APP_URL}/procurement/pr/${pr.id}">View PR →</a></p>`,
  });
}

// ─── PURCHASE ORDERS ─────────────────────────────────────────────────────────

export async function notifyPoBodyApproved(poId: string): Promise<void> {
  const [po] = await db
    .select({ id: purchaseOrders.id, projectId: purchaseOrders.projectId, totalAmount: purchaseOrders.totalAmount, createdBy: purchaseOrders.createdBy })
    .from(purchaseOrders)
    .where(eq(purchaseOrders.id, poId))
    .limit(1);
  if (!po) return;

  const [proj] = await db
    .select({ name: projects.name })
    .from(projects)
    .where(eq(projects.id, po.projectId))
    .limit(1);

  const creatorEmail = po.createdBy ? await emailById(po.createdBy) : null;
  const to = [
    ...(creatorEmail ? [creatorEmail] : []),
    ...(await emailsByDept(["PROCUREMENT"] as DeptCode[])),
  ];
  if (!to.length) return;

  await sendEmail({
    to,
    subject: `PO BOD-Approved — ${proj?.name ?? po.projectId} (${fmt(Number(po.totalAmount))})`,
    html: `<p>A purchase order of <strong>${fmt(Number(po.totalAmount))}</strong> for project <strong>${proj?.name ?? po.projectId}</strong> has been <strong>approved by the BOD</strong> and is awaiting delivery.</p>
<p><a href="${APP_URL}/procurement/po/${po.id}">View PO →</a></p>`,
  });
}
