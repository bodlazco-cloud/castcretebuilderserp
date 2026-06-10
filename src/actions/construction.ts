"use server";

import { db } from "@/db";
import {
  projects, taskAssignments, subcontractors,
  subcontractorCapacityMatrix, workAccomplishedReports,
  milestoneDocuments, unitMilestones, dailyProgressEntries, materialTransfers,
  milestoneDefinitions,
} from "@/db/schema";
import { phaseScopes, phaseActivities } from "@/db/schema/phases";
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

  // ── Gate 4: One NTP per unit per scope of work (or per category if no scope) ──
  // An NTP can only be issued once per lot/unit for a given scope of work —
  // or for the whole category if no scope is specified — unless the prior
  // NTP for that unit + scope/category was rejected or cancelled.
  const duplicateConditions = phaseScopeId
    ? and(eq(taskAssignments.unitId, unitId), eq(taskAssignments.phaseScopeId, phaseScopeId))
    : and(eq(taskAssignments.unitId, unitId), eq(taskAssignments.category, category as any), sql`${taskAssignments.phaseScopeId} IS NULL`);

  const [duplicate] = await db
    .select({ id: taskAssignments.id, status: taskAssignments.status })
    .from(taskAssignments)
    .where(and(duplicateConditions, sql`${taskAssignments.status} NOT IN ('REJECTED','CANCELLED')`))
    .limit(1);

  if (duplicate) {
    return {
      success: false,
      error: phaseScopeId
        ? "An NTP has already been issued for this unit and scope of work."
        : "An NTP has already been issued for this unit and category.",
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

async function checkMaterialsTransferred(taskAssignmentId: string, unitId: string): Promise<boolean> {
  try {
    const [transfer] = await db
      .select({ id: materialTransfers.id })
      .from(materialTransfers)
      .where(
        and(
          eq(materialTransfers.unitId, unitId),
          inArray(materialTransfers.status, ["RECEIVED", "TRANSFERRED"]),
        ),
      )
      .limit(1);
    return !!transfer;
  } catch {
    return false;
  }
}

export async function logDailyProgress(
  input: z.infer<typeof LogProgressSchema>,
): Promise<LogProgressResult> {
  const parsed = LogProgressSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid input." };
  const d = parsed.data;

  const materialsReady = await checkMaterialsTransferred(d.taskAssignmentId, d.unitId);
  if (!materialsReady) {
    return { success: false, error: "Materials have not been transferred to the subcontractor for this unit. Complete material transfer in Procurement before logging progress." };
  }

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
  activities:       z.array(ActivityEntrySchema).default([]),
  entryDate:        z.string().date(),
  actualManpower:   z.number().int().min(0),
  delayType:        z.enum(["WEATHER","MATERIAL_DELAY","MANPOWER_SHORTAGE","EQUIPMENT_BREAKDOWN","DESIGN_CHANGE","OTHER"]).optional(),
  issuesDetails:    z.string().optional(),
  enteredBy:        z.string().uuid(),
});

// ── Auto-generate a DRAFT WAR when a billing milestone scope is fully completed ──
async function maybeAutoGenerateWar(
  projectId: string,
  unitId: string,
  taskAssignmentId: string,
  enteredBy: string,
): Promise<void> {
  try {
    const [ntp] = await db
      .select({ phaseScopeId: taskAssignments.phaseScopeId })
      .from(taskAssignments)
      .where(eq(taskAssignments.id, taskAssignmentId))
      .limit(1);
    if (!ntp?.phaseScopeId) return;

    const [scope] = await db
      .select({ code: phaseScopes.code, name: phaseScopes.name })
      .from(phaseScopes)
      .where(eq(phaseScopes.id, ntp.phaseScopeId))
      .limit(1);
    if (!scope) return;

    const scopeActivities = await db
      .select({ id: phaseActivities.id })
      .from(phaseActivities)
      .where(and(eq(phaseActivities.scopeId, ntp.phaseScopeId), eq(phaseActivities.isActive, true)));
    if (scopeActivities.length === 0) return;

    // Latest status per phase activity for this unit + NTP
    const entries = await db
      .select({
        phaseActivityId: dailyProgressEntries.phaseActivityId,
        status:          dailyProgressEntries.status,
        createdAt:       dailyProgressEntries.createdAt,
      })
      .from(dailyProgressEntries)
      .where(and(
        eq(dailyProgressEntries.taskAssignmentId, taskAssignmentId),
        eq(dailyProgressEntries.unitId, unitId),
      ));

    // Latest status per activity, resolved by chronological order
    const sorted = [...entries].sort((a, b) => (a.createdAt?.getTime() ?? 0) - (b.createdAt?.getTime() ?? 0));
    const latestStatus = new Map<string, string>();
    for (const e of sorted) {
      if (!e.phaseActivityId) continue;
      latestStatus.set(e.phaseActivityId, e.status);
    }

    const allCompleted = scopeActivities.every((a) => latestStatus.get(a.id) === "COMPLETED");
    if (!allCompleted) return;

    // Find billing milestone definitions matching this scope
    const milestoneDefs = await db
      .select({ id: milestoneDefinitions.id, weightPct: milestoneDefinitions.weightPct })
      .from(milestoneDefinitions)
      .where(and(
        eq(milestoneDefinitions.projectId, projectId),
        eq(milestoneDefinitions.triggersBilling, true),
        eq(milestoneDefinitions.isActive, true),
        sql`(${milestoneDefinitions.scopeCode} = ${scope.code} OR ${milestoneDefinitions.scopeName} = ${scope.name})`,
      ));

    for (const def of milestoneDefs) {
      let [um] = await db
        .select({ id: unitMilestones.id, status: unitMilestones.status })
        .from(unitMilestones)
        .where(and(eq(unitMilestones.unitId, unitId), eq(unitMilestones.milestoneDefId, def.id)))
        .limit(1);

      if (!um) {
        [um] = await db
          .insert(unitMilestones)
          .values({ unitId, milestoneDefId: def.id, status: "COMPLETED", completedAt: new Date() })
          .returning({ id: unitMilestones.id, status: unitMilestones.status });
      } else if (um.status !== "COMPLETED") {
        await db.update(unitMilestones).set({ status: "COMPLETED", completedAt: new Date() }).where(eq(unitMilestones.id, um.id));
      }

      const [existingWar] = await db
        .select({ id: workAccomplishedReports.id })
        .from(workAccomplishedReports)
        .where(and(
          eq(workAccomplishedReports.unitId, unitId),
          eq(workAccomplishedReports.unitMilestoneId, um.id),
          eq(workAccomplishedReports.taskAssignmentId, taskAssignmentId),
        ))
        .limit(1);

      if (!existingWar) {
        await db.insert(workAccomplishedReports).values({
          projectId,
          unitId,
          unitMilestoneId: um.id,
          taskAssignmentId,
          grossAccomplishment: def.weightPct,
          status: "DRAFT",
          submittedBy: enteredBy,
        });
        revalidatePath("/construction/war");
        revalidatePath(`/construction/ntp/${taskAssignmentId}`);
      }
    }
  } catch {
    // Non-critical — don't block progress logging on auto-WAR generation failure.
  }
}

export type LogProgressBulkResult =
  | { success: true; count: number }
  | { success: false; error: string };

export async function logDailyProgressBulk(
  input: z.infer<typeof LogProgressBulkSchema>,
): Promise<LogProgressBulkResult> {
  const parsed = LogProgressBulkSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid input." };
  const d = parsed.data;

  // Check materials transferred for at least one of the units
  const transferChecks = await Promise.all(
    d.unitIds.map((uid) => checkMaterialsTransferred(d.taskAssignmentId, uid)),
  );
  if (!transferChecks.some(Boolean)) {
    return { success: false, error: "Materials have not been transferred to the subcontractor. Complete material transfer in Procurement before logging progress." };
  }

  const docGapFlagged = !!d.delayType || !!d.issuesDetails;

  const rows = d.activities.length > 0
    ? d.unitIds.flatMap((unitId: string) =>
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
      )
    // No activity selected — log a single NTP/scope-level entry per unit
    : d.unitIds.map((unitId: string) => ({
        projectId:        d.projectId,
        unitId,
        taskAssignmentId: d.taskAssignmentId,
        unitActivityId:   null,
        phaseActivityId:  null,
        entryDate:        d.entryDate,
        status:           "ONGOING",
        subconId:         d.subconId,
        actualManpower:   d.actualManpower,
        delayType:        (d.delayType as any) ?? null,
        issuesDetails:    d.issuesDetails ?? null,
        docGapFlagged,
        enteredBy:        d.enteredBy,
      }));

  await db.insert(dailyProgressEntries).values(rows);

  // Auto-generate a DRAFT WAR if any activity completion finishes a billing milestone scope
  if (d.activities.some((a) => a.status === "COMPLETED")) {
    await Promise.all(
      d.unitIds.map((unitId) => maybeAutoGenerateWar(d.projectId, unitId, d.taskAssignmentId, d.enteredBy)),
    );
  }

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
// DRAFT → PENDING_REVIEW (manager) → PENDING_BOD (BOD) → ACTIVE
// ═══════════════════════════════════════════════════════════════════════════════

export type NtpActionResult =
  | { success: true }
  | { success: false; error: string };

export async function submitNtpForApproval(
  ntpId: string,
  submittedBy: string,
): Promise<NtpActionResult> {
  try {
    const [ntp] = await db
      .select({ status: taskAssignments.status })
      .from(taskAssignments)
      .where(eq(taskAssignments.id, ntpId))
      .limit(1);
    if (!ntp) return { success: false, error: "NTP not found." };
    if (!["DRAFT", "REJECTED"].includes(ntp.status)) {
      return { success: false, error: `Cannot submit NTP in status '${ntp.status}'.` };
    }
    await db.execute(sql`
      UPDATE task_assignments
      SET status = 'PENDING_REVIEW', submitted_at = NOW(), submitted_by = ${submittedBy}::uuid, rejection_reason = NULL
      WHERE id = ${ntpId}
    `);
    revalidatePath("/construction/ntp");
    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function reviewNtp(
  ntpId: string,
  reviewedBy: string,
): Promise<NtpActionResult> {
  try {
    if (!reviewedBy) return { success: false, error: "Not authenticated." };
    const [ntp] = await db
      .select({ status: taskAssignments.status })
      .from(taskAssignments)
      .where(eq(taskAssignments.id, ntpId))
      .limit(1);
    if (!ntp) return { success: false, error: "NTP not found." };
    if (ntp.status !== "PENDING_REVIEW") {
      return { success: false, error: `NTP must be PENDING_REVIEW to forward to BOD (current: ${ntp.status}).` };
    }
    await db.execute(sql`
      UPDATE task_assignments
      SET status = 'PENDING_BOD'
      WHERE id = ${ntpId}
    `);
    // Best-effort: stamp reviewer metadata if columns exist
    try {
      await db.execute(sql`
        UPDATE task_assignments
        SET reviewed_at = NOW(), reviewed_by = ${reviewedBy}::uuid
        WHERE id = ${ntpId}
      `);
    } catch { /* columns not yet migrated — non-critical */ }
    revalidatePath("/construction/ntp");
    revalidatePath(`/construction/ntp/${ntpId}`);
    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
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
    // Use raw SQL so the update succeeds even if bod_approved_at/by columns
    // haven't been created by migration 036 yet.
    await db.execute(sql`
      UPDATE task_assignments
      SET status = 'ACTIVE'
      WHERE id = ${ntpId}
    `);
    // Best-effort: stamp the approval metadata if columns exist
    try {
      await db.execute(sql`
        UPDATE task_assignments
        SET bod_approved_at = NOW(), bod_approved_by = ${approvedBy}::uuid
        WHERE id = ${ntpId}
      `);
    } catch { /* columns not yet migrated — non-critical */ }
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
    await db.execute(sql`
      UPDATE task_assignments
      SET status = 'REJECTED', rejection_reason = ${reason}
      WHERE id = ${ntpId}
    `);
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
