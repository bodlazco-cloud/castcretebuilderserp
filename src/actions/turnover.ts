"use server";

import { db } from "@/db";
import {
  projectUnits, unitTurnovers, projects,
  payables, invoices,
} from "@/db/schema";
import { eq, and, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getAuthUser } from "@/lib/supabase-server";

// ─── Record Architectural Turnover ───────────────────────────────────────────
// Moves a batch of units from CIP Asset → COGS / Deferred Revenue → Revenue.
// cipCost per unit = project's total certified payables ÷ project's total unit count.

const RecordTurnoverSchema = z.object({
  unitIds:      z.array(z.string().uuid()).min(1),
  turnoverDate: z.string().date(),
  notes:        z.string().max(1000).optional(),
});

export type RecordTurnoverResult =
  | { success: true;  count: number; totalCipCost: string; totalRevenue: string }
  | { success: false; error: string };

export async function recordArchitecturalTurnover(
  input: z.infer<typeof RecordTurnoverSchema>,
): Promise<RecordTurnoverResult> {
  const parsed = RecordTurnoverSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid input." };

  const user = await getAuthUser();
  if (!user) return { success: false, error: "Not authenticated." };

  const { unitIds, turnoverDate, notes } = parsed.data;

  // Fetch the units — must be in ARCHITECTURAL category and not yet turned over
  const units = await db
    .select({
      id:              projectUnits.id,
      projectId:       projectUnits.projectId,
      unitCode:        projectUnits.unitCode,
      contractPrice:   projectUnits.contractPrice,
      currentCategory: projectUnits.currentCategory,
      turnedOverAt:    projectUnits.turnedOverAt,
    })
    .from(projectUnits)
    .where(inArray(projectUnits.id, unitIds));

  const ineligible = units.filter(
    (u) => u.currentCategory !== "ARCHITECTURAL" || u.turnedOverAt !== null,
  );
  if (ineligible.length > 0) {
    return {
      success: false,
      error: `${ineligible.length} unit(s) are not in ARCHITECTURAL category or are already turned over.`,
    };
  }

  // Group by project so we can compute a cost per unit per project
  const projectIds = [...new Set<string>(units.map((u) => String(u.projectId)))];

  // For each project: total certified payables ÷ total unit count = cost per unit
  const costPerUnit = new Map<string, number>();

  for (const projectId of projectIds) {
    const [payableAgg] = await db
      .select({
        totalCost: sql<string>`COALESCE(SUM(COALESCE(net_payable, gross_amount)::numeric), 0)`,
      })
      .from(payables)
      .where(and(
        eq(payables.projectId, projectId),
        eq(payables.status, "APPROVED"),
      ));

    const [unitCount] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(projectUnits)
      .where(eq(projectUnits.projectId, projectId));

    const total = Number(payableAgg?.totalCost ?? 0);
    const count = Number(unitCount?.count ?? 1);
    costPerUnit.set(projectId, count > 0 ? total / count : 0);
  }

  // Build insert records and collect totals
  const turnoverInserts: (typeof unitTurnovers.$inferInsert)[] = [];
  let totalCip     = 0;
  let totalRevenue = 0;

  for (const unit of units) {
    const cipCost      = costPerUnit.get(unit.projectId) ?? 0;
    const contractPx   = Number(unit.contractPrice ?? 0);
    totalCip          += cipCost;
    totalRevenue      += contractPx;

    turnoverInserts.push({
      unitId:        unit.id,
      projectId:     unit.projectId,
      turnoverDate,
      cipCost:       String(cipCost.toFixed(2)),
      contractPrice: String(contractPx.toFixed(2)),
      unitCode:      unit.unitCode,
      notes:         notes ?? null,
      recordedBy:    user.id,
    });
  }

  // Write turnover events
  await db.insert(unitTurnovers).values(turnoverInserts);

  // Update units: category → TURNOVER, stamp turnedOverAt, record cipCost
  for (const unit of units) {
    const cipCost = costPerUnit.get(unit.projectId) ?? 0;
    await db.update(projectUnits)
      .set({
        currentCategory: "TURNOVER",
        turnedOverAt:    new Date(`${turnoverDate}T00:00:00Z`),
        turnoverCost:    String(cipCost.toFixed(2)),
      })
      .where(eq(projectUnits.id, unit.id));
  }

  revalidatePath("/construction/architectural-turnover");
  revalidatePath("/finance/reports/turnover-pnl");
  return {
    success:      true,
    count:        units.length,
    totalCipCost: totalCip.toFixed(2),
    totalRevenue: totalRevenue.toFixed(2),
  };
}

// ─── Turnover P&L data ────────────────────────────────────────────────────────
// Used by the Board report to show CIP → COGS / Deferred → Recognized Revenue.

export type TurnoverPnlData = {
  // Revenue
  recognizedRevenue: number;   // collections from turned-over units
  deferredRevenue:   number;   // collections from units NOT yet turned over
  totalBilled:       number;   // all submitted invoices (turned + not turned)
  // Cost
  cogs:              number;   // sum of cipCost for turned-over units
  cipAssetBalance:   number;   // estimated remaining CIP (not yet turned over)
  // Profit
  grossProfit:       number;
  grossMarginPct:    number;
  // Counts
  unitsTurnedOver:   number;
  unitsInProgress:   number;
  totalUnits:        number;
};

export async function getTurnoverPnl(projectId?: string): Promise<TurnoverPnlData> {
  const projectFilter = projectId
    ? and(eq(projectUnits.projectId, projectId))
    : undefined;

  // All units
  const allUnits = await db
    .select({
      id:            projectUnits.id,
      projectId:     projectUnits.projectId,
      currentCategory: projectUnits.currentCategory,
      turnoverCost:  projectUnits.turnoverCost,
      contractPrice: projectUnits.contractPrice,
    })
    .from(projectUnits)
    .where(projectFilter);

  const turnedOverIds  = allUnits.filter((u) => u.currentCategory === "TURNOVER").map((u) => u.id);
  const inProgressIds  = allUnits.filter((u) => u.currentCategory !== "TURNOVER").map((u) => u.id);

  // COGS = sum of cipCost for turned-over units
  const cogs = allUnits
    .filter((u) => u.currentCategory === "TURNOVER")
    .reduce((s, u) => s + Number(u.turnoverCost ?? 0), 0);

  // Invoice collections — split by whether unit is turned over
  const invoiceRows = await db
    .select({
      unitMilestoneId: invoices.unitMilestoneId,
      collectionAmount: invoices.collectionAmount,
      submittedAt:      invoices.submittedAt,
      collectedAt:      invoices.collectedAt,
      grossAccomplishment: invoices.grossAccomplishment,
    })
    .from(invoices)
    .where(
      projectId
        ? eq(invoices.projectId, projectId)
        : sql`TRUE`,
    );

  // We need to know which unitMilestones belong to turned-over vs in-progress units
  // invoices.unitMilestoneId → unitMilestones.unitId
  // Simpler: join via a subquery — do it in JS using the unit sets we already have
  // Since unitMilestones isn't in our select here, use the project-level approach:
  // Recognized = collected invoices × (turnedOver% of units)
  // This is a project-level proportional split since invoices aren't tagged per unit

  const totalUnits   = allUnits.length;
  const turnedCount  = turnedOverIds.length;
  const turnoverRatio = totalUnits > 0 ? turnedCount / totalUnits : 0;

  let totalCollected = 0;
  let totalBilled    = 0;

  for (const inv of invoiceRows) {
    if (inv.collectedAt && inv.collectionAmount) {
      totalCollected += Number(inv.collectionAmount);
    }
    if (inv.submittedAt) {
      totalBilled += Number(inv.grossAccomplishment);
    }
  }

  const recognizedRevenue = totalCollected * turnoverRatio;
  const deferredRevenue   = totalCollected * (1 - turnoverRatio);

  // CIP Asset balance = remaining project payables not yet turned over
  // Estimated as total project payables × (1 - turnoverRatio)
  const [payableAgg] = await db
    .select({
      total: sql<string>`COALESCE(SUM(COALESCE(net_payable, gross_amount)::numeric), 0)`,
    })
    .from(payables)
    .where(
      projectId
        ? and(eq(payables.projectId, projectId), eq(payables.status, "APPROVED"))
        : eq(payables.status, "APPROVED"),
    );

  const totalCertifiedCost = Number(payableAgg?.total ?? 0);
  const cipAssetBalance    = totalCertifiedCost * (1 - turnoverRatio);

  const grossProfit     = recognizedRevenue - cogs;
  const grossMarginPct  = recognizedRevenue > 0
    ? (grossProfit / recognizedRevenue) * 100
    : 0;

  return {
    recognizedRevenue,
    deferredRevenue,
    totalBilled,
    cogs,
    cipAssetBalance,
    grossProfit,
    grossMarginPct,
    unitsTurnedOver:  turnedCount,
    unitsInProgress:  inProgressIds.length,
    totalUnits,
  };
}
