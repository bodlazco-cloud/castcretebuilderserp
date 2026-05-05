"use server";

import { db } from "@/db";
import {
  projects, taskAssignments, subcontractors,
  subcontractorCapacityMatrix, workAccomplishedReports,
  milestoneDocuments, unitMilestones, dailyProgressEntries,
  unitActivities, projectActivityProgress, projectUnits,
  bomStandards, activityDefinitions,
} from "@/db/schema";
import { eq, and, count, sql, ne } from "drizzle-orm";
import { autoGeneratePurchaseRequisition } from "@/actions/procurement";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { notifyWarSubmitted } from "@/lib/notifications";
import { getAuthUser } from "@/lib/supabase-server";

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE I — BOD Strategic Gate
// No Task Assignment (NTP) can be issued until the Board has approved the
// Production Target and Margin Projection for the project.
// ═══════════════════════════════════════════════════════════════════════════════

const IssueNtpSchema = z.object({
  projectId:   z.string().uuid(),
  unitId:      z.string().uuid(),
  subconId:    z.string().uuid(),
  category:    z.enum(["STRUCTURAL", "ARCHITECTURAL", "TURNOVER"]),
  workType:    z.enum(["STRUCTURAL", "ARCHITECTURAL", "BOTH"]),
  startDate:   z.string().date(),
  endDate:     z.string().date(),
  issuedBy:    z.string().uuid(),
});

export type IssueNtpResult =
  | { success: true; taskAssignmentId: string }
  | { success: false; error: string };

export async function issueTaskAssignment(
  input: z.infer<typeof IssueNtpSchema>,
): Promise<IssueNtpResult> {
  const parsed = IssueNtpSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid input." };

  const { projectId, unitId, subconId, category, workType, startDate, endDate, issuedBy } =
    parsed.data;

  // ── Gate 1: BOD must have approved the project ────────────────────────────
  const [project] = await db
    .select({ status: projects.status, bodApprovedAt: projects.bodApprovedAt })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);

  if (!project) return { success: false, error: "Project not found." };
  if (project.status !== "ACTIVE" || !project.bodApprovedAt) {
    return {
      success: false,
      error: "BOD Strategic Gate: The Board must approve the Production Target before NTPs can be issued.",
    };
  }

  // ── Gate 2: Subcontractor stop-assignment check ───────────────────────────
  const [subcon] = await db
    .select({ stopAssignment: subcontractors.stopAssignment, isActive: subcontractors.isActive })
    .from(subcontractors)
    .where(eq(subcontractors.id, subconId))
    .limit(1);

  if (!subcon?.isActive) return { success: false, error: "Subcontractor is inactive." };
  if (subcon.stopAssignment) {
    return {
      success: false,
      error: "Subcontractor is in Stop-Assignment status (Grade C). Resolve performance issues first.",
    };
  }

  // ── Gate 3: Capacity check ────────────────────────────────────────────────
  // Active units already assigned to this subcontractor on this project
  const [{ activeUnits }] = await db
    .select({ activeUnits: count() })
    .from(taskAssignments)
    .where(
      and(
        eq(taskAssignments.subconId, subconId),
        eq(taskAssignments.projectId, projectId),
        eq(taskAssignments.status, "ACTIVE"),
      ),
    );

  // Rated capacity from the matrix (fallback to defaultMaxActiveUnits)
  const [capacityRow] = await db
    .select({ ratedCapacity: subcontractorCapacityMatrix.ratedCapacity })
    .from(subcontractorCapacityMatrix)
    .where(
      and(
        eq(subcontractorCapacityMatrix.subconId, subconId),
        eq(subcontractorCapacityMatrix.projectId, projectId),
        eq(subcontractorCapacityMatrix.workType, workType as any),
      ),
    )
    .limit(1);

  const [subconFull] = await db
    .select({ defaultMax: subcontractors.defaultMaxActiveUnits })
    .from(subcontractors)
    .where(eq(subcontractors.id, subconId))
    .limit(1);

  const ratedCapacity = capacityRow?.ratedCapacity ?? subconFull?.defaultMax ?? 0;

  if (Number(activeUnits) >= ratedCapacity) {
    return {
      success: false,
      error: `Capacity Gate: Subcontractor is at 100% capacity (${activeUnits}/${ratedCapacity} active units). Select another subcontractor or wait for a unit turnover.`,
    };
  }

  // ── All gates passed: create the Task Assignment (PENDING_REVIEW for Planning) ──
  const [newAssignment] = await db
    .insert(taskAssignments)
    .values({
      projectId,
      unitId,
      subconId,
      category: category as any,
      workType: workType as any,
      startDate,
      endDate,
      status: "PENDING_REVIEW",
      capacityCheckPassed: true,
      capacityCheckedAt: new Date(),
      capacityCheckedBy: issuedBy,
      issuedBy,
    })
    .returning({ id: taskAssignments.id });

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/construction/ntp");
  return { success: true, taskAssignmentId: newAssignment.id };
}

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE III — Verify Document Checklist
// Accounting must tick off all 6 required document types before the WAR
// moves to PENDING_AUDIT. The "Submit to Audit" button stays locked until done.
// ═══════════════════════════════════════════════════════════════════════════════

const REQUIRED_DOC_TYPES = [
  "WAR_SIGNED",
  "MILESTONE_PHOTOS",
  "MATERIAL_TRANSFER_SLIPS",
  "OSM_ACKNOWLEDGMENT",
  "SUBCON_BILLING_INVOICE",
  "QUALITY_CLEARANCE",
] as const;

const VerifyChecklistSchema = z.object({
  warId: z.string().uuid(),
});

export type VerifyChecklistResult =
  | { success: true; missingDocs: string[] }
  | { success: false; error: string };

export async function verifyDocumentChecklist(
  input: z.infer<typeof VerifyChecklistSchema>,
): Promise<VerifyChecklistResult> {
  const parsed = VerifyChecklistSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid input." };

  const user = await getAuthUser();
  if (!user) return { success: false, error: "Not authenticated." };

  const { warId } = parsed.data;
  const verifiedBy = user.id;

  // ── Fetch WAR and check it's in the right state ───────────────────────────
  const [war] = await db
    .select({ status: workAccomplishedReports.status, projectId: workAccomplishedReports.projectId })
    .from(workAccomplishedReports)
    .where(eq(workAccomplishedReports.id, warId))
    .limit(1);

  if (!war) return { success: false, error: "WAR not found." };
  if (war.status !== "DRAFT" && war.status !== "PENDING_REVIEW") {
    return { success: false, error: `WAR is already in status '${war.status}'.` };
  }

  // ── Check which required document types have been uploaded ───────────────
  const uploadedDocs = await db
    .select({ docType: milestoneDocuments.docType })
    .from(milestoneDocuments)
    .where(eq(milestoneDocuments.warId, warId));

  const uploadedTypes = new Set(uploadedDocs.map((d: { docType: string }) => d.docType));
  const missingDocs = REQUIRED_DOC_TYPES.filter((t) => !uploadedTypes.has(t));

  if (missingDocs.length > 0) {
    // Return missing list — caller shows this to Accounting so they know what to upload.
    return { success: true, missingDocs };
  }

  // ── All documents present: advance WAR to PENDING_AUDIT ──────────────────
  await db
    .update(workAccomplishedReports)
    .set({
      status: "PENDING_AUDIT",
      accountingVerifiedBy: verifiedBy,
      accountingVerifiedAt: new Date(),
    })
    .where(eq(workAccomplishedReports.id, warId));

  revalidatePath(`/projects/${war.projectId}/billing`);
  return { success: true, missingDocs: [] };
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOG DAILY PROGRESS ENTRY
// ═══════════════════════════════════════════════════════════════════════════════

const LogProgressSchema = z.object({
  projectId:        z.string().uuid(),
  unitId:           z.string().uuid(),
  taskAssignmentId: z.string().uuid(),
  unitActivityId:   z.string().uuid(),
  entryDate:        z.string().date(),
  subconId:         z.string().uuid(),
  actualManpower:   z.number().int().min(0),
  delayType:        z.enum(["WEATHER","MATERIAL_DELAY","MANPOWER_SHORTAGE","EQUIPMENT_BREAKDOWN","DESIGN_CHANGE","OTHER"]).optional(),
  issuesDetails:    z.string().optional(),
  enteredBy:        z.string().uuid(),
});

export type LogProgressResult =
  | { success: true; entryId: string }
  | { success: false; error: string };

export async function logDailyProgress(
  input: z.infer<typeof LogProgressSchema>,
): Promise<LogProgressResult> {
  const parsed = LogProgressSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid input." };
  const d = parsed.data;

  const docGapFlagged = !!d.delayType || !!d.issuesDetails;

  const [entry] = await db
    .insert(dailyProgressEntries)
    .values({
      projectId:       d.projectId,
      unitId:          d.unitId,
      taskAssignmentId: d.taskAssignmentId,
      unitActivityId:  d.unitActivityId,
      entryDate:       d.entryDate,
      status:          "STARTED",
      subconId:        d.subconId,
      actualManpower:  d.actualManpower,
      delayType:       (d.delayType as any) ?? null,
      issuesDetails:   d.issuesDetails ?? null,
      docGapFlagged,
      enteredBy:       d.enteredBy,
    })
    .returning({ id: dailyProgressEntries.id });

  revalidatePath("/construction");
  return { success: true, entryId: entry.id };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUBMIT WORK ACCOMPLISHED REPORT
// ═══════════════════════════════════════════════════════════════════════════════

const SubmitWarSchema = z.object({
  projectId:        z.string().uuid(),
  unitId:           z.string().uuid(),
  unitMilestoneId:  z.string().uuid(),
  taskAssignmentId: z.string().uuid(),
  grossAccomplishment: z.number().positive(),
  submittedBy:      z.string().uuid(),
});

export type SubmitWarResult =
  | { success: true; warId: string }
  | { success: false; error: string };

export async function submitWorkAccomplishedReport(
  input: z.infer<typeof SubmitWarSchema>,
): Promise<SubmitWarResult> {
  const parsed = SubmitWarSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid input." };
  const d = parsed.data;

  const [war] = await db
    .insert(workAccomplishedReports)
    .values({
      projectId:           d.projectId,
      unitId:              d.unitId,
      unitMilestoneId:     d.unitMilestoneId,
      taskAssignmentId:    d.taskAssignmentId,
      grossAccomplishment: String(d.grossAccomplishment),
      status:              "PENDING_REVIEW",
      submittedBy:         d.submittedBy,
    })
    .returning({ id: workAccomplishedReports.id });

  revalidatePath("/construction");
  void notifyWarSubmitted(war.id);
  return { success: true, warId: war.id };
}

// ─── Standalone capacity check for UI pre-validation ─────────────────────────
// Call this before showing the NTP form to warn the user proactively.
// Mirrors the DB-level guard in issue_ntp_v2.sql but returns a user-facing message.
// activeUnitsCount is NOT a stored field — it is always counted live from task_assignments.

export type CapacityCheckResult =
  | { allowed: true;  activeUnits: number; ratedCapacity: number; headroom: number }
  | { allowed: false; activeUnits: number; ratedCapacity: number; message: string };

export async function checkSubconCapacity(
  subconId:        string,
  additionalUnits: number,
  workType?:       string,
): Promise<CapacityCheckResult> {
  const [subcon] = await db
    .select({ defaultMax: subcontractors.defaultMaxActiveUnits })
    .from(subcontractors)
    .where(eq(subcontractors.id, subconId))
    .limit(1);

  if (!subcon) throw new Error("Subcontractor not found.");

  // Per-work-type capacity if available, else default
  const [matrixRow] = workType
    ? await db
        .select({ ratedCapacity: subcontractorCapacityMatrix.ratedCapacity })
        .from(subcontractorCapacityMatrix)
        .where(
          and(
            eq(subcontractorCapacityMatrix.subconId, subconId),
            eq(subcontractorCapacityMatrix.workType, workType as any),
          ),
        )
        .limit(1)
    : [];

  const ratedCapacity = matrixRow?.ratedCapacity ?? subcon.defaultMax;

  // Live count — never trust a cached/stored activeUnitsCount
  const [{ activeUnits }] = await db
    .select({ activeUnits: count() })
    .from(taskAssignments)
    .where(
      and(
        eq(taskAssignments.subconId, subconId),
        sql`${taskAssignments.status} IN ('DRAFT', 'BOD_APPROVED', 'ACTIVE')`,
      ),
    );

  const headroom = ratedCapacity - activeUnits;

  if (headroom < additionalUnits) {
    return {
      allowed:       false,
      activeUnits,
      ratedCapacity,
      message: `Capacity exceeded: subcontractor has ${activeUnits} active unit(s), rated for ${ratedCapacity}. Only ${headroom} slot(s) available, ${additionalUnits} requested.`,
    };
  }

  return { allowed: true, activeUnits, ratedCapacity, headroom };
}

// ═══════════════════════════════════════════════════════════════════════════════
// UPDATE MILESTONE / ACTIVITY PROGRESS
// progressPct 0 = PENDING (no-op if already PENDING), 1-99 = IN_PROGRESS,
// 100 = COMPLETE. actualStart is stamped on first IN_PROGRESS transition;
// actualEnd is stamped on COMPLETE.
// ═══════════════════════════════════════════════════════════════════════════════

const UpdateActivityProgressSchema = z.object({
  unitActivityId: z.string().uuid(),
  progressPct:    z.number().int().min(0).max(100),
});

export type UpdateActivityProgressResult =
  | { success: true }
  | { success: false; error: string };

export async function updateMilestoneProgress(
  input: z.infer<typeof UpdateActivityProgressSchema>,
): Promise<UpdateActivityProgressResult> {
  const parsed = UpdateActivityProgressSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid input." };

  const user = await getAuthUser();
  if (!user) return { success: false, error: "Not authenticated." };

  const { unitActivityId, progressPct } = parsed.data;

  const [activity] = await db
    .select({
      id:          unitActivities.id,
      status:      unitActivities.status,
      actualStart: unitActivities.actualStart,
    })
    .from(unitActivities)
    .where(eq(unitActivities.id, unitActivityId))
    .limit(1);

  if (!activity) return { success: false, error: "Activity not found." };
  if (activity.status === "COMPLETE") {
    return { success: false, error: "Activity is already complete." };
  }

  if (progressPct === 0) return { success: true }; // no status change

  const today = new Date().toISOString().slice(0, 10);
  const newStatus = progressPct === 100 ? "COMPLETE" : "IN_PROGRESS";

  await db
    .update(unitActivities)
    .set({
      status:      newStatus,
      actualStart: activity.actualStart ?? today,
      ...(newStatus === "COMPLETE" ? { actualEnd: today } : {}),
    })
    .where(eq(unitActivities.id, unitActivityId));

  revalidatePath("/construction");
  return { success: true };
}

// ─── Activity Progress (per-project % completion) ──────────────────────────

export async function bulkUpdateActivityProgress(input: {
  projectId: string;
  updates: { activityDefId: string; completionPct: number; notes?: string }[];
}): Promise<{ success: boolean; error?: string; saved: number }> {
  const user = await getAuthUser();
  if (!user) return { success: false, error: "Not authenticated.", saved: 0 };
  if (!input.updates.length) return { success: true, saved: 0 };

  for (const u of input.updates) {
    await db
      .insert(projectActivityProgress)
      .values({
        projectId:     input.projectId,
        activityDefId: u.activityDefId,
        completionPct: String(Math.min(100, Math.max(0, u.completionPct))),
        notes:         u.notes || null,
        updatedBy:     user.id,
        updatedAt:     new Date(),
      })
      .onConflictDoUpdate({
        target: [projectActivityProgress.projectId, projectActivityProgress.activityDefId],
        set: {
          completionPct: String(Math.min(100, Math.max(0, u.completionPct))),
          notes:         u.notes || null,
          updatedBy:     user.id,
          updatedAt:     new Date(),
        },
      });
  }

  revalidatePath("/construction/activity-progress");
  revalidatePath("/master-list/sow");
  return { success: true, saved: input.updates.length };
}

// ═══════════════════════════════════════════════════════════════════════════════
// PLANNING REVIEW GATE
// Operations submits NTP → PENDING_REVIEW.
// Planning reviews resource needs, then approves → ACTIVE + auto-creates PRs.
// ═══════════════════════════════════════════════════════════════════════════════

export type ApproveNtpResult =
  | { success: true; prsCreated: number }
  | { success: false; error: string };

export async function approveNtp(ntpId: string): Promise<ApproveNtpResult> {
  const user = await getAuthUser();
  if (!user) return { success: false, error: "Not authenticated." };

  // ── Load the NTP ──────────────────────────────────────────────────────────
  const [ntp] = await db
    .select({
      id:        taskAssignments.id,
      status:    taskAssignments.status,
      projectId: taskAssignments.projectId,
      unitId:    taskAssignments.unitId,
      category:  taskAssignments.category,
    })
    .from(taskAssignments)
    .where(eq(taskAssignments.id, ntpId))
    .limit(1);

  if (!ntp) return { success: false, error: "NTP not found." };
  if (ntp.status !== "PENDING_REVIEW") {
    return { success: false, error: `NTP is in status '${ntp.status}'. Only PENDING_REVIEW NTPs can be approved.` };
  }

  // ── Activate the NTP ──────────────────────────────────────────────────────
  await db
    .update(taskAssignments)
    .set({ status: "ACTIVE" })
    .where(eq(taskAssignments.id, ntpId));

  // ── Load unit model to match BOM standards ────────────────────────────────
  const [unit] = await db
    .select({ unitModel: projectUnits.unitModel })
    .from(projectUnits)
    .where(eq(projectUnits.id, ntp.unitId))
    .limit(1);

  const unitModel = unit?.unitModel ?? "";

  // ── Find all active activity defs matching this NTP's category + unit model ─
  const activityDefIds = await db
    .selectDistinct({ activityDefId: bomStandards.activityDefId })
    .from(bomStandards)
    .innerJoin(activityDefinitions, eq(activityDefinitions.id, bomStandards.activityDefId))
    .where(
      and(
        eq(bomStandards.unitModel, unitModel),
        eq(bomStandards.isActive, true),
        eq(activityDefinitions.category, ntp.category as any),
        eq(activityDefinitions.isActive, true),
      ),
    );

  // ── Auto-generate one PR per activity definition ──────────────────────────
  let prsCreated = 0;
  for (const { activityDefId } of activityDefIds) {
    const result = await autoGeneratePurchaseRequisition({
      projectId:        ntp.projectId,
      unitId:           ntp.unitId,
      activityDefId,
      taskAssignmentId: ntp.id,
      requestedBy:      user.id,
    });
    if (result.success) prsCreated++;
  }

  revalidatePath("/construction/ntp");
  revalidatePath(`/construction/ntp/${ntpId}`);
  revalidatePath("/planning/resource-forecasting");
  return { success: true, prsCreated };
}

export type RejectNtpResult =
  | { success: true }
  | { success: false; error: string };

export async function rejectNtp(ntpId: string, reason?: string): Promise<RejectNtpResult> {
  const user = await getAuthUser();
  if (!user) return { success: false, error: "Not authenticated." };

  const [ntp] = await db
    .select({ status: taskAssignments.status })
    .from(taskAssignments)
    .where(eq(taskAssignments.id, ntpId))
    .limit(1);

  if (!ntp) return { success: false, error: "NTP not found." };
  if (ntp.status !== "PENDING_REVIEW") {
    return { success: false, error: `NTP is in status '${ntp.status}'. Only PENDING_REVIEW NTPs can be rejected.` };
  }

  await db
    .update(taskAssignments)
    .set({ status: "DRAFT" })
    .where(eq(taskAssignments.id, ntpId));

  revalidatePath("/construction/ntp");
  revalidatePath(`/construction/ntp/${ntpId}`);
  return { success: true };
}
