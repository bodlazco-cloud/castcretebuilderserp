"use server";

import { db } from "@/db";
import {
  purchaseOrders, workAccomplishedReports, unitMilestones,
  punchLists, milestoneDocuments,
} from "@/db/schema";
import { eq } from "drizzle-orm";
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

export async function verifyMilestone(unitMilestoneId: string): Promise<SimpleResult> {
  const user = await getAuthUser();
  if (!user) return { success: false, error: "Not authenticated." };
  await db
    .update(unitMilestones)
    .set({ status: "VERIFIED", verifiedBy: user.id, verifiedAt: new Date() })
    .where(eq(unitMilestones.id, unitMilestoneId));
  revalidatePath("/audit/milestone-verification");
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
