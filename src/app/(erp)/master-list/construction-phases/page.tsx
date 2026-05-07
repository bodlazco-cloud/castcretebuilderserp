export const dynamic = "force-dynamic";
import { getAuthUser } from "@/lib/supabase-server";
import { db } from "@/db";
import { phaseCategories, phaseScopes, phaseActivities, phaseBillingMilestones } from "@/db/schema";
import { asc } from "drizzle-orm";
import ConstructionPhasesClient from "./ConstructionPhasesClient";

export default async function ConstructionPhasesPage() {
  await getAuthUser();

  let categories:       typeof cats      = [];
  let scopes:           typeof scs       = [];
  let activities:       typeof acts      = [];
  let billingMilestones:typeof bms       = [];
  let dbError: string | null = null;

  let cats:  { id: string; code: string; name: string; sequenceOrder: number; isActive: boolean }[] = [];
  let scs:   { id: string; categoryId: string; code: string; name: string; sequenceOrder: number; isActive: boolean }[] = [];
  let acts:  { id: string; scopeId: string; code: string; name: string; standardDurationDays: number; weightInScopePct: string; sequenceOrder: number; isActive: boolean }[] = [];
  let bms:   { id: string; categoryId: string; name: string; weightPct: string; triggersBilling: boolean; sequenceOrder: number; notes: string | null; isActive: boolean }[] = [];

  try {
    [cats, scs, acts, bms] = await Promise.all([
      db.select({
        id: phaseCategories.id, code: phaseCategories.code, name: phaseCategories.name,
        sequenceOrder: phaseCategories.sequenceOrder, isActive: phaseCategories.isActive,
      }).from(phaseCategories).orderBy(asc(phaseCategories.sequenceOrder), asc(phaseCategories.name)),

      db.select({
        id: phaseScopes.id, categoryId: phaseScopes.categoryId,
        code: phaseScopes.code, name: phaseScopes.name,
        sequenceOrder: phaseScopes.sequenceOrder, isActive: phaseScopes.isActive,
      }).from(phaseScopes).orderBy(asc(phaseScopes.sequenceOrder), asc(phaseScopes.name)),

      db.select({
        id: phaseActivities.id, scopeId: phaseActivities.scopeId,
        code: phaseActivities.code, name: phaseActivities.name,
        standardDurationDays: phaseActivities.standardDurationDays,
        weightInScopePct: phaseActivities.weightInScopePct,
        sequenceOrder: phaseActivities.sequenceOrder, isActive: phaseActivities.isActive,
      }).from(phaseActivities).orderBy(asc(phaseActivities.sequenceOrder), asc(phaseActivities.name)),

      db.select({
        id: phaseBillingMilestones.id, categoryId: phaseBillingMilestones.categoryId,
        name: phaseBillingMilestones.name, weightPct: phaseBillingMilestones.weightPct,
        triggersBilling: phaseBillingMilestones.triggersBilling,
        sequenceOrder: phaseBillingMilestones.sequenceOrder,
        notes: phaseBillingMilestones.notes, isActive: phaseBillingMilestones.isActive,
      }).from(phaseBillingMilestones).orderBy(asc(phaseBillingMilestones.sequenceOrder), asc(phaseBillingMilestones.name)),
    ]);

    categories = cats;
    scopes = scs;
    activities = acts;
    billingMilestones = bms;
  } catch (err) {
    dbError = err instanceof Error ? err.message : "Database query failed.";
  }

  return (
    <ConstructionPhasesClient
      categories={categories}
      scopes={scopes}
      activities={activities}
      billingMilestones={billingMilestones}
      dbError={dbError}
    />
  );
}
