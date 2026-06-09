"use server";

import { db } from "@/db";
import {
  projects, taskAssignments, subcontractors,
  subcontractorCapacityMatrix, workAccomplishedReports,
  milestoneDocuments, unitMilestones, dailyProgressEntries,
} from "@/db/schema";
import { eq, and, count, sql, inArray } from "drizzle-orm";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { notifyWarSubmitted } from "@/lib/notifications";
import { generateResourceForecastsForUnit } from "@/actions/planning";

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE I — BOD Strategic Gate
// No Task Assignment (NTP) can be issued until the Board has approved the
// Production Target and Margin Projection for the project.
// ═══════════════════════════════════════════════════════════════════════════════

const IssueNtpSchema = z.object({
  projectId:    z.string().uuid(),
  unitId:       z.string().uuid(),
  subconId:     z.string().uuid(),
  category:     z.enum(["SLAB","STRUCTURAL","SPECIALTY_WORKS","MEPF","ARCHITECTURAL","TURNOVER"]),
  workType:     z.enum(["STRUCTURAL", "ARCHITECTURAL", "BOTH"]).optional().default("STRUCTURAL"),
  phaseScopeId: z.string().uuid().optional(),
  startDate:    z.string().date(),
  endDate:      z.string().date(),
  issuedBy:     z.string().uuid(),
});

export type IssueNtpResult =
  | { success: true; taskAssignmentId: string }
  | { success: false; error: string };

export async function issueTaskAssignment(
  input: z.infer<typeof IssueNtpSchema>,
): Promise<IssueNtpResult> {
  const parsed = IssueNtpSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid input." };

  const { projectId, unitId, subconId, category, workType, phaseScopeId, startDate, endDate, issuedBy } =
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

  // ── All gates passed: create the Task Assignment as DRAFT ────────────────
  const [newAssignment] = await db
    .insert(taskAssignments)
    .values({
      projectId,
      unitId,
      subconId,
      category: category as any,
      workType: workType as any,
      phaseScopeId: phaseScopeId ?? null,
      startDate,
      endDate,
      status: "DRAFT",
      capacityCheckPassed: true,
      capacityCheckedAt: new Date(),
      capacityCheckedBy: issuedBy,
      issuedBy,
    })
    .returning({ id: taskAssignments.id });

  // Fire-and-forget: generate resource forecasts for this unit from approved BOM entries.
  // NTP issuance succeeds even if forecast generation fails.
  void generateResourceForecastsForUnit(projectId, unitId).catch(() => undefined);

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/planning/mrp-queue");
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
  warId:      z.string().uuid(),
  verifiedBy: z.string().uuid(),
});

export type VerifyChecklistResult =
  | { success: true; missingDocs: string[] }
  | { success: false; error: string };

export async function verifyDocumentChecklist(
  input: z.infer<typeof VerifyChecklistSchema>,
): Promise<VerifyChecklistResult> {
  const parsed = VerifyChecklistSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid input." };

  const { warId, verifiedBy } = parsed.data;

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

  const uploadedTypes = new Set(uploadedDocs.map((d) => d.docType));
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
  unitActivityId:   z.string().uuid().optional(),
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
      unitActivityId:  d.unitActivityId ?? null,
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
// LOG DAILY PROGRESS — PHASE-ACTIVITY BASED (new workflow)
// Accepts multiple activities (checklist) and creates one entry per activity.
// Requires migration 035 to be applied (phase_activity_id column + nullable unit_activity_id).
// ═══════════════════════════════════════════════════════════════════════════════

const ActivityEntrySchema = z.object({
  phaseActivityId: z.string().uuid(),
  status:          z.enum(["STARTED","ONGOING","COMPLETED"]).default("STARTED"),
});

const LogProgressBulkSchema = z.object({
  projectId:        z.string().uuid(),
  unitIds:          z.array(z.string().uuid()).min(1),
  taskAssignmentId: z.string().uuid(),
  subconId:         z.string().uuid(),
  activities:       z.array(ActivityEntrySchema).min(1),
  entryDate:        z.string().date(),
  actualManpower:   z.number().int().min(0),
  delayType:        z.enum(["WEATHER","MATERIAL_DELAY","MANPOWER_SHORTAGE","EQUIPMENT_BREAKDOWN","DESIGN_CHANGE","OTHER"]).optional(),
  issuesDetails:    z.string().optional(),
  enteredBy:        z.string().uuid(),
});

export type LogProgressBulkResult =
  | { success: true; count: number }
  | { success: false; error: string };

export async function logDailyProgressBulk(
  input: z.infer<typeof LogProgressBulkSchema>,
): Promise<LogProgressBulkResult> {
  const parsed = LogProgressBulkSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid input." };
  const d = parsed.data;

  const docGapFlagged = !!d.delayType || !!d.issuesDetails;

  const rows = d.unitIds.flatMap((unitId: string) =>
    d.activities.map((act: { phaseActivityId: string; status: string }) => ({
      projectId:        d.projectId,
      unitId,
      taskAssignmentId: d.taskAssignmentId,
      unitActivityId:   null,
      phaseActivityId:  act.phaseActivityId,
      entryDate:        d.entryDate,
      status:           act.status,
      subconId:         d.subconId,
      actualManpower:   d.actualManpower,
      delayType:        (d.delayType as any) ?? null,
      issuesDetails:    d.issuesDetails ?? null,
      docGapFlagged,
      enteredBy:        d.enteredBy,
    })),
  );

  await db.insert(dailyProgressEntries).values(rows);
  revalidatePath("/construction");
  return { success: true, count: rows.length };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUBMIT WORK ACCOMPLISHED REPORT
// ═══════════════════════════════════════════════════════════════════════════════

const SubmitWarSchema = z.object({
  projectId:        z.string().uuid(),
  unitId:           z.string().uuid(),
  unitMilestoneId:  z.string().uuid(),
  taskAssignmentId: z.string().uuid(),
  grossAccomplishment: z.number().min(0).default(0).optional(),
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

// ═══════════════════════════════════════════════════════════════════════════════
// NTP APPROVAL WORKFLOW
// DRAFT → PENDING_BOD → ACTIVE   (or REJECTED → edit → DRAFT → PENDING_BOD)
// ═══════════════════════════════════════════════════════════════════════════════

export type NtpActionResult =
  | { success: true }
  | { success: false; error: string };

export async function submitNtpForApproval(
  ntpId: string,
  submittedBy: string,
): Promise<NtpActionResult> {
  const [ntp] = await db
    .select({ status: taskAssignments.status })
    .from(taskAssignments)
    .where(eq(taskAssignments.id, ntpId))
    .limit(1);
  if (!ntp) return { success: false, error: "NTP not found." };
  if (!["DRAFT", "REJECTED"].includes(ntp.status)) {
    return { success: false, error: `Cannot submit NTP in status '${ntp.status}'.` };
  }
  await db
    .update(taskAssignments)
    .set({ status: "PENDING_BOD", submittedAt: new Date(), submittedBy, rejectionReason: null })
    .where(eq(taskAssignments.id, ntpId));
  revalidatePath("/construction/ntp");
  return { success: true };
}

export async function approveNtp(
  ntpId: string,
  approvedBy: string,
): Promise<NtpActionResult> {
  try {
    if (!approvedBy) return { success: false, error: "Not authenticated." };
    const [ntp] = await db
      .select({ status: taskAssignments.status, projectId: taskAssignments.projectId, unitId: taskAssignments.unitId })
      .from(taskAssignments)
      .where(eq(taskAssignments.id, ntpId))
      .limit(1);
    if (!ntp) return { success: false, error: "NTP not found." };
    if (ntp.status !== "PENDING_BOD") {
      return { success: false, error: `NTP must be PENDING_BOD to approve (current: ${ntp.status}).` };
    }
    try {
      await db
        .update(taskAssignments)
        .set({ status: "ACTIVE", bodApprovedAt: new Date(), bodApprovedBy: approvedBy })
        .where(eq(taskAssignments.id, ntpId));
    } catch {
      // columns may not exist yet — fall back to status-only update
      await db
        .update(taskAssignments)
        .set({ status: "ACTIVE" })
        .where(eq(taskAssignments.id, ntpId));
    }
    try { void generateResourceForecastsForUnit(ntp.projectId, ntp.unitId).catch(() => undefined); } catch {}
    revalidatePath("/construction/ntp");
    revalidatePath(`/construction/ntp/${ntpId}`);
    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

const RejectNtpSchema = z.object({
  ntpId:      z.string().uuid(),
  rejectedBy: z.string().uuid(),
  reason:     z.string().min(1, "Rejection reason is required."),
});

export async function rejectNtp(
  input: z.infer<typeof RejectNtpSchema>,
): Promise<NtpActionResult> {
  try {
    const parsed = RejectNtpSchema.safeParse(input);
    if (!parsed.success) return { success: false, error: parsed.error.errors[0]?.message ?? "Invalid input." };
    const { ntpId, rejectedBy, reason } = parsed.data;
    const [ntp] = await db
      .select({ status: taskAssignments.status })
      .from(taskAssignments)
      .where(eq(taskAssignments.id, ntpId))
      .limit(1);
    if (!ntp) return { success: false, error: "NTP not found." };
    if (ntp.status !== "PENDING_BOD" && ntp.status !== "PENDING_REVIEW") {
      return { success: false, error: `NTP cannot be rejected from status: ${ntp.status}.` };
    }
    try {
      await db
        .update(taskAssignments)
        .set({ status: "REJECTED", bodApprovedBy: rejectedBy, bodApprovedAt: new Date(), rejectionReason: reason })
        .where(eq(taskAssignments.id, ntpId));
    } catch {
      await db
        .update(taskAssignments)
        .set({ status: "REJECTED", rejectionReason: reason })
        .where(eq(taskAssignments.id, ntpId));
    }
    revalidatePath("/construction/ntp");
    revalidatePath(`/construction/ntp/${ntpId}`);
    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

const UpdateNtpSchema = z.object({
  ntpId:        z.string().uuid(),
  subconId:     z.string().uuid(),
  phaseScopeId: z.string().uuid().optional(),
  workType:     z.enum(["STRUCTURAL", "ARCHITECTURAL", "BOTH"]).optional().default("STRUCTURAL"),
  startDate:    z.string().date(),
  endDate:      z.string().date(),
});

export async function updateNtp(
  input: z.infer<typeof UpdateNtpSchema>,
): Promise<NtpActionResult> {
  const parsed = UpdateNtpSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid input." };
  const { ntpId, subconId, phaseScopeId, workType, startDate, endDate } = parsed.data;
  const [ntp] = await db
    .select({ status: taskAssignments.status })
    .from(taskAssignments)
    .where(eq(taskAssignments.id, ntpId))
    .limit(1);
  if (!ntp) return { success: false, error: "NTP not found." };
  if (!["DRAFT", "REJECTED"].includes(ntp.status)) {
    return { success: false, error: "Only DRAFT or REJECTED NTPs can be edited." };
  }
  await db
    .update(taskAssignments)
    .set({
      subconId,
      phaseScopeId: phaseScopeId ?? null,
      workType: workType as any,
      startDate,
      endDate,
      status: "DRAFT",
      rejectionReason: null,
    })
    .where(eq(taskAssignments.id, ntpId));
  revalidatePath(`/construction/ntp/${ntpId}`);
  revalidatePath("/construction/ntp");
  return { success: true };
}

// ═══════════════════════════════════════════════════════════════════════════════
// DAILY PROGRESS ENTRY APPROVAL
// Managers / Admin / BOD approve or reject submitted progress entries.
// ═══════════════════════════════════════════════════════════════════════════════

export type DpeApprovalResult =
  | { success: true }
  | { success: false; error: string };

export async function approveProgressEntry(
  entryId: string,
  approvedBy: string,
): Promise<DpeApprovalResult> {
  const [entry] = await db
    .select({ approvalStatus: dailyProgressEntries.approvalStatus })
    .from(dailyProgressEntries)
    .where(eq(dailyProgressEntries.id, entryId))
    .limit(1);
  if (!entry) return { success: false, error: "Entry not found." };
  if (entry.approvalStatus === "APPROVED") {
    return { success: false, error: "Entry is already approved." };
  }
  await db
    .update(dailyProgressEntries)
    .set({ approvalStatus: "APPROVED", approvedBy, approvedAt: new Date(), rejectionReason: null })
    .where(eq(dailyProgressEntries.id, entryId));
  revalidatePath("/construction/daily-progress");
  revalidatePath(`/construction/daily-progress/${entryId}`);
  return { success: true };
}

const RejectDpeSchema = z.object({
  entryId:    z.string().uuid(),
  rejectedBy: z.string().uuid(),
  reason:     z.string().min(1, "Rejection reason is required."),
});

export async function rejectProgressEntry(
  input: z.infer<typeof RejectDpeSchema>,
): Promise<DpeApprovalResult> {
  const parsed = RejectDpeSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.errors[0]?.message ?? "Invalid." };
  const { entryId, rejectedBy, reason } = parsed.data;
  await db
    .update(dailyProgressEntries)
    .set({ approvalStatus: "REJECTED", approvedBy: rejectedBy, approvedAt: new Date(), rejectionReason: reason })
    .where(eq(dailyProgressEntries.id, entryId));
  revalidatePath("/construction/daily-progress");
  revalidatePath(`/construction/daily-progress/${entryId}`);
  return { success: true };
}

export async function bulkApproveProgressEntries(
  entryIds: string[],
  approvedBy: string,
): Promise<DpeApprovalResult> {
  if (entryIds.length === 0) return { success: false, error: "No entries selected." };
  await db
    .update(dailyProgressEntries)
    .set({ approvalStatus: "APPROVED", approvedBy, approvedAt: new Date(), rejectionReason: null })
    .where(inArray(dailyProgressEntries.id, entryIds));
  revalidatePath("/construction/daily-progress");
  return { success: true };
}
