"use server";

import { db } from "@/db";
import {
  purchaseOrders, workAccomplishedReports, unitMilestones,
  punchLists, milestoneDocuments, taskAssignments, payables,
} from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getAuthUser } from "@/lib/supabase-server";
import { z } from "zod";

export type SimpleResult = { success: boolean; error?: string };

// ─── PO Audit Clearance ───────────────────────────────────────────────────────

export async function clearPoAudit(poId: string): Promise<SimpleResult> {
  const user = await getAuthUser();
  if (!user) return { success: false, error: "Not authenticated." };
  await db
    .update(purchaseOrders)
    .set({ status: "BOD_APPROVED", auditReviewedBy: user.id, auditReviewedAt: new Date() })
    .where(eq(purchaseOrders.id, poId));
  revalidatePath(`/audit/po-compliance/${poId}`);
  revalidatePath("/audit/po-compliance");
  revalidatePath(`/procurement/po/${poId}`);
  return { success: true };
}

// ─── WAR Audit Verification ───────────────────────────────────────────────────

export async function verifyWar(warId: string): Promise<SimpleResult> {
  const user = await getAuthUser();
  if (!user) return { success: false, error: "Not authenticated." };
  await db
    .update(workAccomplishedReports)
    .set({
      status:          "READY_FOR_APPROVAL",
      auditVerifiedBy: user.id,
      auditVerifiedAt: new Date(),
    })
    .where(eq(workAccomplishedReports.id, warId));
  revalidatePath("/audit/inspections");
  revalidatePath(`/construction/war/${warId}`);
  return { success: true };
}

// ─── Milestone Verification ───────────────────────────────────────────────────
// Locates the WAR for the given NTP + unit, marks it as audit-verified or
// rejected, and — on VERIFIED — creates a Finance payable for BOD review.
// auditor_id is NOT accepted from the client; identity comes from getAuthUser().

const VerifyMilestoneSchema = z.object({
  ntpId:       z.string().uuid(),
  unitId:      z.string().uuid(),
  auditStatus: z.enum(["VERIFIED", "REJECTED"]),
  remarks:     z.string().max(2000).optional(),
});

export async function verifyMilestone(
  input: z.infer<typeof VerifyMilestoneSchema>,
): Promise<SimpleResult> {
  const parsed = VerifyMilestoneSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.errors[0]?.message ?? "Invalid input." };

  const user = await getAuthUser();
  if (!user) return { success: false, error: "Not authenticated." };

  const { ntpId, unitId, auditStatus, remarks } = parsed.data;

  // Find the WAR pending audit for this NTP + unit
  const [war] = await db
    .select()
    .from(workAccomplishedReports)
    .where(
      and(
        eq(workAccomplishedReports.taskAssignmentId, ntpId),
        eq(workAccomplishedReports.unitId, unitId),
      ),
    )
    .limit(1);

  if (!war) return { success: false, error: "No WAR found for this NTP and unit." };

  const isVerified = auditStatus === "VERIFIED";

  // Update WAR with audit result
  await db
    .update(workAccomplishedReports)
    .set({
      status:          isVerified ? "READY_FOR_APPROVAL" : "REJECTED",
      auditVerifiedBy: user.id,
      auditVerifiedAt: new Date(),
      auditRemarks:    remarks ?? null,
      rejectionReason: !isVerified ? (remarks ?? null) : null,
    })
    .where(eq(workAccomplishedReports.id, war.id));

  if (isVerified) {
    // Mark the unit milestone as verified
    await db
      .update(unitMilestones)
      .set({ status: "VERIFIED", verifiedBy: user.id, verifiedAt: new Date() })
      .where(eq(unitMilestones.id, war.unitMilestoneId));

    // Look up subconId from the task assignment
    const [ntp] = await db
      .select({ subconId: taskAssignments.subconId })
      .from(taskAssignments)
      .where(eq(taskAssignments.id, ntpId))
      .limit(1);

    if (ntp?.subconId) {
      // generate_subcon_billable equivalent: create a DRAFT payable for Finance
      await db.insert(payables).values({
        projectId:  war.projectId,
        subconId:   ntp.subconId,
        warId:      war.id,
        grossAmount: war.grossAccomplishment,
        status:     "DRAFT",
      });
    }

    revalidatePath("/finance/payables");
  }

  revalidatePath("/audit/queues");
  revalidatePath(`/audit/milestone-verification/${ntpId}`);
  return { success: true };
}

// ─── Document Verification ────────────────────────────────────────────────────

export async function verifyDocument(docId: string): Promise<SimpleResult> {
  const user = await getAuthUser();
  if (!user) return { success: false, error: "Not authenticated." };
  await db
    .update(milestoneDocuments)
    .set({ isVerified: true, verifiedBy: user.id, verifiedAt: new Date() })
    .where(eq(milestoneDocuments.id, docId));
  revalidatePath("/audit/inspections");
  return { success: true };
}

// ─── QA Punch List ────────────────────────────────────────────────────────────

const CreatePunchListSchema = z.object({
  projectId:  z.string().uuid(),
  unitId:     z.string().uuid().optional(),
  item:       z.string().min(1).max(2000),
  category:   z.string().min(1).max(50),
  dueDate:    z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export type CreatePunchResult = { success: true; id: string } | { success: false; error: string };

export async function createPunchListItem(input: z.infer<typeof CreatePunchListSchema>): Promise<CreatePunchResult> {
  const parsed = CreatePunchListSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.errors[0]?.message ?? "Invalid input." };

  const user = await getAuthUser();
  if (!user) return { success: false, error: "Not authenticated." };

  const { projectId, unitId, item, category, dueDate } = parsed.data;

  const [row] = await db
    .insert(punchLists)
    .values({
      projectId,
      unitId:    unitId ?? null,
      item,
      category,
      status:    "OPEN",
      dueDate:   dueDate ?? null,
      createdBy: user.id,
    })
    .returning({ id: punchLists.id });

  revalidatePath("/audit/qa-punch-list");
  return { success: true, id: row.id };
}

export async function closePunchListItem(id: string): Promise<SimpleResult> {
  const user = await getAuthUser();
  if (!user) return { success: false, error: "Not authenticated." };
  await db
    .update(punchLists)
    .set({ status: "CLOSED", closedAt: new Date(), closedBy: user.id })
    .where(eq(punchLists.id, id));
  revalidatePath(`/audit/qa-punch-list/${id}`);
  revalidatePath("/audit/qa-punch-list");
  return { success: true };
}

export async function progressPunchListItem(id: string): Promise<SimpleResult> {
  await db
    .update(punchLists)
    .set({ status: "IN_PROGRESS" })
    .where(eq(punchLists.id, id));
  revalidatePath(`/audit/qa-punch-list/${id}`);
  revalidatePath("/audit/qa-punch-list");
  return { success: true };
}
