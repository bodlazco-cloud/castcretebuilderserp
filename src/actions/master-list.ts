"use server";

import { db } from "@/db";
import {
  developers, projects, materials, suppliers,
  subcontractors, activityDefinitions, milestoneDefinitions, blocks, projectUnits, projectUnitModels,
  developerRateCards, developerRateCardDeductions,
  materialPriceHistory, subcontractorRateCards, subcontractorRateCardDeductions,
  bomStandards, costCenters, materialSuppliers, departments,
  phaseCategories, phaseScopes, phaseActivities, phaseBillingMilestones,
  globalSettings,
} from "@/db/schema";
import { eq, count, and } from "drizzle-orm";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getAuthUser } from "@/lib/supabase-server";

// ─── Developers ────────────────────────────────────────────────────────────

const DeveloperSchema = z.object({
  name: z.string().min(1).max(150),
});

export type MutationResult =
  | { success: true; id: string }
  | { success: false; error: string };

export async function createDeveloper(
  input: z.infer<typeof DeveloperSchema>,
): Promise<MutationResult> {
  const parsed = DeveloperSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.errors[0]?.message ?? "Invalid input." };

  const [row] = await db
    .insert(developers)
    .values({ name: parsed.data.name })
    .returning({ id: developers.id });

  revalidatePath("/master-list/developers");
  return { success: true, id: row.id };
}

export async function toggleDeveloperActive(id: string, isActive: boolean): Promise<{ success: boolean }> {
  await db.update(developers).set({ isActive }).where(eq(developers.id, id));
  revalidatePath("/master-list/developers");
  return { success: true };
}

export async function updateDeveloper(
  id: string,
  input: z.infer<typeof DeveloperSchema>,
): Promise<MutationResult> {
  const parsed = DeveloperSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.errors[0]?.message ?? "Invalid input." };
  await db.update(developers).set({ name: parsed.data.name }).where(eq(developers.id, id));
  revalidatePath("/master-list/developers");
  revalidatePath(`/master-list/developers/${id}`);
  return { success: true, id };
}

// ─── Projects ──────────────────────────────────────────────────────────────

const ProjectSchema = z.object({
  name:                   z.string().min(1).max(200),
  developerId:            z.string().uuid(),
  contractValue:          z.number().positive(),
  developerAdvance:       z.number().min(0),
  targetUnitsPerMonth:    z.number().int().positive(),
  minOperatingCashBuffer: z.number().min(0),
  status:                 z.enum(["BIDDING", "ACTIVE", "ON_HOLD", "COMPLETED", "CANCELLED"]),
  startDate:              z.string().optional(),
  endDate:                z.string().optional(),
});

export async function createProject(
  input: z.infer<typeof ProjectSchema>,
): Promise<MutationResult> {
  const parsed = ProjectSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.errors[0]?.message ?? "Invalid input." };

  const d = parsed.data;
  const [row] = await db
    .insert(projects)
    .values({
      name:                   d.name,
      developerId:            d.developerId,
      contractValue:          String(d.contractValue),
      developerAdvance:       String(d.developerAdvance),
      targetUnitsPerMonth:    d.targetUnitsPerMonth,
      minOperatingCashBuffer: String(d.minOperatingCashBuffer),
      status:                 d.status,
      startDate:              d.startDate || null,
      endDate:                d.endDate || null,
    })
    .returning({ id: projects.id });

  revalidatePath("/master-list/projects");
  return { success: true, id: row.id };
}

// ─── Materials ─────────────────────────────────────────────────────────────

const MaterialSchema = z.object({
  code:                z.string().min(1).max(50),
  name:                z.string().min(1).max(150),
  unit:                z.string().min(1).max(30),
  adminPrice:          z.number().min(0),
  minimumQuantity:     z.number().min(0).optional(),
  preferredSupplierId: z.string().uuid().optional(),
});

export async function createMaterial(
  input: z.infer<typeof MaterialSchema>,
): Promise<MutationResult> {
  const parsed = MaterialSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.errors[0]?.message ?? "Invalid input." };

  const d = parsed.data;
  const [row] = await db
    .insert(materials)
    .values({
      code:                d.code,
      name:                d.name,
      unit:                d.unit,
      category:            "",
      adminPrice:          String(d.adminPrice),
      minimumQuantity:     d.minimumQuantity != null ? String(d.minimumQuantity) : null,
      preferredSupplierId: d.preferredSupplierId || null,
    })
    .returning({ id: materials.id });

  revalidatePath("/master-list/materials");
  return { success: true, id: row.id };
}

export async function toggleMaterialActive(id: string, isActive: boolean): Promise<{ success: boolean }> {
  await db.update(materials).set({ isActive }).where(eq(materials.id, id));
  revalidatePath("/master-list/materials");
  return { success: true };
}

const UpdateMaterialSchema = z.object({
  id:                  z.string().uuid(),
  name:                z.string().min(1).max(150),
  unit:                z.string().min(1).max(30),
  adminPrice:          z.number().min(0),
  minimumQuantity:     z.number().min(0).optional(),
  preferredSupplierId: z.string().uuid().optional().or(z.literal("")),
});

export async function updateMaterial(input: z.infer<typeof UpdateMaterialSchema>): Promise<MutationResult> {
  const parsed = UpdateMaterialSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.errors[0]?.message ?? "Invalid input." };
  const d = parsed.data;
  await db.update(materials).set({
    name:                d.name,
    unit:                d.unit,
    adminPrice:          String(d.adminPrice),
    minimumQuantity:     d.minimumQuantity != null ? String(d.minimumQuantity) : null,
    preferredSupplierId: d.preferredSupplierId || null,
  }).where(eq(materials.id, d.id));
  revalidatePath(`/master-list/materials/${d.id}`);
  revalidatePath("/master-list/materials");
  return { success: true, id: d.id };
}

// ─── Suppliers ─────────────────────────────────────────────────────────────

const SupplierSchema = z.object({
  name:          z.string().min(1).max(150),
  address:       z.string().max(500).optional(),
  phone:         z.string().max(50).optional(),
  email:         z.string().email().max(150).optional().or(z.literal("")),
  contactPerson: z.string().max(150).optional(),
});

export async function createSupplier(
  input: z.infer<typeof SupplierSchema>,
): Promise<MutationResult> {
  const parsed = SupplierSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.errors[0]?.message ?? "Invalid input." };
  const d = parsed.data;

  const [row] = await db
    .insert(suppliers)
    .values({
      name:          d.name,
      address:       d.address || null,
      phone:         d.phone || null,
      email:         d.email || null,
      contactPerson: d.contactPerson || null,
    })
    .returning({ id: suppliers.id });

  revalidatePath("/master-list/vendors");
  return { success: true, id: row.id };
}

export async function toggleSupplierActive(id: string, isActive: boolean): Promise<{ success: boolean }> {
  await db.update(suppliers).set({ isActive }).where(eq(suppliers.id, id));
  revalidatePath("/master-list/vendors");
  return { success: true };
}

const UpdateSupplierSchema = z.object({
  id:            z.string().uuid(),
  name:          z.string().min(1).max(150),
  address:       z.string().max(500).optional(),
  phone:         z.string().max(50).optional(),
  email:         z.string().email().max(150).optional().or(z.literal("")),
  contactPerson: z.string().max(150).optional(),
});

export async function updateSupplier(input: z.infer<typeof UpdateSupplierSchema>): Promise<MutationResult> {
  const parsed = UpdateSupplierSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.errors[0]?.message ?? "Invalid input." };
  const d = parsed.data;
  await db.update(suppliers).set({
    name:          d.name,
    address:       d.address || null,
    phone:         d.phone || null,
    email:         d.email || null,
    contactPerson: d.contactPerson || null,
  }).where(eq(suppliers.id, d.id));
  revalidatePath(`/master-list/vendors/${d.id}`);
  revalidatePath("/master-list/vendors");
  return { success: true, id: d.id };
}

// ─── Subcontractors ────────────────────────────────────────────────────────

const SubconSchema = z.object({
  code:                  z.string().min(1).max(50),
  name:                  z.string().min(1).max(150),
  tradeTypes:            z.array(z.enum(["STRUCTURAL", "ARCHITECTURAL", "BOTH"])).min(1),
  defaultMaxActiveUnits: z.number().int().positive(),
  manpowerBenchmark:     z.number().min(0),
});

export async function createSubcontractor(
  input: z.infer<typeof SubconSchema>,
): Promise<MutationResult> {
  const parsed = SubconSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.errors[0]?.message ?? "Invalid input." };

  const d = parsed.data;
  const [row] = await db
    .insert(subcontractors)
    .values({
      code:                  d.code,
      name:                  d.name,
      tradeTypes:            d.tradeTypes,
      defaultMaxActiveUnits: d.defaultMaxActiveUnits,
      manpowerBenchmark:     String(d.manpowerBenchmark),
    })
    .returning({ id: subcontractors.id });

  revalidatePath("/master-list/subcontractors");
  return { success: true, id: row.id };
}

export async function toggleSubconActive(id: string, isActive: boolean): Promise<{ success: boolean }> {
  await db.update(subcontractors).set({ isActive }).where(eq(subcontractors.id, id));
  revalidatePath("/master-list/subcontractors");
  return { success: true };
}

// ─── Activity Definitions (SOW) ────────────────────────────────────────────

const ActivityDefSchema = z.object({
  projectId:            z.string().uuid(),
  category:             z.enum(["SLAB", "STRUCTURAL", "SPECIALTY_WORKS", "MEPF", "ARCHITECTURAL", "TURNOVER"]),
  scopeCode:            z.string().min(1).max(100),
  scopeName:            z.string().min(1).max(150),
  activityCode:         z.string().min(1).max(100),
  activityName:         z.string().min(1).max(150),
  standardDurationDays: z.number().int().positive(),
  weightInScopePct:     z.number().min(0).max(100),
  sequenceOrder:        z.number().int().min(1),
});

export async function createActivityDefinition(
  input: z.infer<typeof ActivityDefSchema>,
): Promise<MutationResult> {
  const parsed = ActivityDefSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.errors[0]?.message ?? "Invalid input." };

  const d = parsed.data;
  const [row] = await db
    .insert(activityDefinitions)
    .values({
      projectId:            d.projectId,
      category:             d.category,
      scopeCode:            d.scopeCode,
      scopeName:            d.scopeName,
      activityCode:         d.activityCode,
      activityName:         d.activityName,
      standardDurationDays: d.standardDurationDays,
      weightInScopePct:     String(d.weightInScopePct),
      sequenceOrder:        d.sequenceOrder,
    })
    .returning({ id: activityDefinitions.id });

  revalidatePath("/master-list/sow");
  return { success: true, id: row.id };
}

export async function updateActivityDefinition(
  id: string,
  input: z.infer<typeof ActivityDefSchema>,
): Promise<MutationResult> {
  const parsed = ActivityDefSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.errors[0]?.message ?? "Invalid input." };

  const d = parsed.data;
  await db.update(activityDefinitions).set({
    category:             d.category,
    scopeCode:            d.scopeCode,
    scopeName:            d.scopeName,
    activityCode:         d.activityCode,
    activityName:         d.activityName,
    standardDurationDays: d.standardDurationDays,
    weightInScopePct:     String(d.weightInScopePct),
    sequenceOrder:        d.sequenceOrder,
  }).where(eq(activityDefinitions.id, id));

  revalidatePath("/master-list/sow");
  revalidatePath(`/master-list/sow/${id}`);
  revalidatePath("/admin/activity-defs");
  return { success: true, id };
}

export async function toggleActivityDefinitionActive(id: string, isActive: boolean): Promise<{ success: boolean }> {
  await db.update(activityDefinitions).set({ isActive }).where(eq(activityDefinitions.id, id));
  revalidatePath("/master-list/sow");
  revalidatePath(`/master-list/sow/${id}`);
  revalidatePath("/admin/activity-defs");
  return { success: true };
}

// ─── Milestone Definitions ─────────────────────────────────────────────────

const MilestoneDefSchema = z.object({
  projectId:       z.string().uuid(),
  scopeCode:       z.string().max(100).optional(),
  scopeName:       z.string().max(150).optional(),
  name:            z.string().min(1).max(150),
  category:        z.enum(["SLAB", "STRUCTURAL", "SPECIALTY_WORKS", "MEPF", "ARCHITECTURAL", "TURNOVER"]),
  sequenceOrder:   z.number().int().min(1),
  triggersBilling: z.boolean(),
  weightPct:       z.number().min(0).max(100),
});

export async function createMilestoneDefinition(
  input: z.infer<typeof MilestoneDefSchema>,
): Promise<MutationResult> {
  const parsed = MilestoneDefSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.errors[0]?.message ?? "Invalid input." };

  const d = parsed.data;
  const [row] = await db.insert(milestoneDefinitions).values({
    projectId:       d.projectId,
    scopeCode:       d.scopeCode,
    scopeName:       d.scopeName,
    name:            d.name,
    category:        d.category,
    sequenceOrder:   d.sequenceOrder,
    triggersBilling: d.triggersBilling,
    weightPct:       String(d.weightPct),
  }).returning({ id: milestoneDefinitions.id });

  revalidatePath("/admin/milestone-defs");
  return { success: true, id: row.id };
}

export async function updateMilestoneDefinition(
  id: string,
  input: z.infer<typeof MilestoneDefSchema>,
): Promise<MutationResult> {
  const parsed = MilestoneDefSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.errors[0]?.message ?? "Invalid input." };

  const d = parsed.data;
  await db.update(milestoneDefinitions).set({
    name:            d.name,
    category:        d.category,
    sequenceOrder:   d.sequenceOrder,
    triggersBilling: d.triggersBilling,
    weightPct:       String(d.weightPct),
  }).where(eq(milestoneDefinitions.id, id));

  revalidatePath("/admin/milestone-defs");
  revalidatePath(`/admin/milestone-defs/${id}`);
  return { success: true, id };
}

export async function toggleMilestoneDefinitionActive(id: string, isActive: boolean): Promise<{ success: boolean }> {
  await db.update(milestoneDefinitions).set({ isActive }).where(eq(milestoneDefinitions.id, id));
  revalidatePath("/admin/milestone-defs");
  return { success: true };
}

// ─── Subcontractor Update ──────────────────────────────────────────────────

export async function updateSubcontractor(
  id: string,
  input: z.infer<typeof SubconSchema>,
): Promise<MutationResult> {
  const parsed = SubconSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.errors[0]?.message ?? "Invalid input." };

  const d = parsed.data;
  await db.update(subcontractors).set({
    code:                  d.code,
    name:                  d.name,
    tradeTypes:            d.tradeTypes,
    defaultMaxActiveUnits: d.defaultMaxActiveUnits,
    manpowerBenchmark:     String(d.manpowerBenchmark),
  }).where(eq(subcontractors.id, id));

  revalidatePath("/master-list/subcontractors");
  revalidatePath(`/master-list/subcontractors/${id}`);
  return { success: true, id };
}

// ─── Project BOD Approval ──────────────────────────────────────────────────

export async function approveProject(id: string): Promise<{ success: boolean; error?: string }> {
  const user = await getAuthUser();
  if (!user) return { success: false, error: "Not authenticated." };

  const [project] = await db.select({ id: projects.id }).from(projects).where(eq(projects.id, id));
  if (!project) return { success: false, error: "Project not found." };

  await db.update(projects).set({
    status:        "ACTIVE",
    bodApprovedAt: new Date(),
    bodApprovedBy: user.id,
  }).where(eq(projects.id, id));

  revalidatePath(`/master-list/projects/${id}`);
  revalidatePath("/planning");
  revalidatePath("/main-dashboard");
  return { success: true };
}

// ─── Blocks ────────────────────────────────────────────────────────────────

const BlockSchema = z.object({
  projectId: z.string().uuid(),
  blockName: z.string().min(1).max(50),
  totalLots: z.number().int().positive(),
});

export async function createBlock(input: z.infer<typeof BlockSchema>): Promise<MutationResult> {
  const parsed = BlockSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.errors[0]?.message ?? "Invalid input." };

  const [row] = await db
    .insert(blocks)
    .values({ projectId: parsed.data.projectId, blockName: parsed.data.blockName, totalLots: parsed.data.totalLots })
    .returning({ id: blocks.id });

  revalidatePath(`/master-list/projects/${parsed.data.projectId}`);
  return { success: true, id: row.id };
}

// ─── Project Units ─────────────────────────────────────────────────────────

const ProjectUnitSchema = z.object({
  projectId: z.string().uuid(),
  blockId:   z.string().uuid(),
  lotNumber: z.string().min(1).max(20),
  unitCode:  z.string().min(1).max(50),
  unitModel: z.string().min(1).max(50),
  unitType:  z.enum(["BEG", "MID", "END", "SHOP"]).default("MID"),
});

export async function createProjectUnit(input: z.infer<typeof ProjectUnitSchema>): Promise<MutationResult> {
  const parsed = ProjectUnitSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.errors[0]?.message ?? "Invalid input." };

  const d = parsed.data;
  const [row] = await db
    .insert(projectUnits)
    .values({ projectId: d.projectId, blockId: d.blockId, lotNumber: d.lotNumber, unitCode: d.unitCode, unitModel: d.unitModel, unitType: d.unitType })
    .returning({ id: projectUnits.id });

  revalidatePath(`/master-list/projects/${d.projectId}`);
  return { success: true, id: row.id };
}

// ─── Block Update / Delete ─────────────────────────────────────────────────

export async function updateBlock(
  id: string,
  input: { blockName: string; totalLots: number },
): Promise<MutationResult> {
  if (!input.blockName?.trim()) return { success: false, error: "Block name is required." };
  if (!Number.isInteger(input.totalLots) || input.totalLots < 1) return { success: false, error: "Total lots must be a positive integer." };

  const [block] = await db.select({ projectId: blocks.projectId }).from(blocks).where(eq(blocks.id, id));
  if (!block) return { success: false, error: "Block not found." };

  await db.update(blocks).set({ blockName: input.blockName.trim(), totalLots: input.totalLots }).where(eq(blocks.id, id));
  revalidatePath(`/master-list/projects/${block.projectId}`);
  return { success: true, id };
}

export async function deleteBlock(id: string): Promise<{ success: boolean; error?: string }> {
  const [block] = await db.select({ projectId: blocks.projectId }).from(blocks).where(eq(blocks.id, id));
  if (!block) return { success: false, error: "Block not found." };

  const [{ n }] = await db.select({ n: count() }).from(projectUnits).where(eq(projectUnits.blockId, id));
  if (Number(n) > 0) return { success: false, error: `Cannot delete: ${n} unit(s) exist in this block. Remove units first.` };

  await db.delete(blocks).where(eq(blocks.id, id));
  revalidatePath(`/master-list/projects/${block.projectId}`);
  return { success: true };
}

// ─── Project Unit Update / Delete ──────────────────────────────────────────

export async function updateProjectUnit(
  id: string,
  input: { blockId: string; lotNumber: string; unitCode: string; unitModel: string; unitType: "BEG" | "MID" | "END" | "SHOP"; contractPrice?: string },
): Promise<MutationResult> {
  if (!input.lotNumber?.trim() || !input.unitCode?.trim() || !input.unitModel?.trim()) {
    return { success: false, error: "Lot number, unit code, and unit model are required." };
  }

  const [unit] = await db.select({ projectId: projectUnits.projectId }).from(projectUnits).where(eq(projectUnits.id, id));
  if (!unit) return { success: false, error: "Unit not found." };

  await db.update(projectUnits).set({
    blockId:       input.blockId,
    lotNumber:     input.lotNumber.trim(),
    unitCode:      input.unitCode.trim(),
    unitModel:     input.unitModel.trim(),
    unitType:      input.unitType,
    contractPrice: input.contractPrice?.trim() ? input.contractPrice.trim() : null,
  }).where(eq(projectUnits.id, id));

  revalidatePath(`/master-list/projects/${unit.projectId}`);
  return { success: true, id };
}

export async function deleteProjectUnit(id: string): Promise<{ success: boolean; error?: string }> {
  const [unit] = await db
    .select({ projectId: projectUnits.projectId, status: projectUnits.status })
    .from(projectUnits)
    .where(eq(projectUnits.id, id));

  if (!unit) return { success: false, error: "Unit not found." };
  if (unit.status !== "PENDING") return { success: false, error: `Cannot delete: unit status is "${unit.status}". Only PENDING units can be deleted.` };

  await db.delete(projectUnits).where(eq(projectUnits.id, id));
  revalidatePath(`/master-list/projects/${unit.projectId}`);
  return { success: true };
}

// ─── Developer Rate Cards ───────────────────────────────────────────────────

const RateCardSchema = z.object({
  projectId:        z.string().uuid(),
  phaseActivityId:  z.string().uuid().optional(),
  unitModel:        z.string().max(50).optional(),
  unitType:         z.enum(["BEG", "MID", "END", "SHOP"]).optional(),
  grossRatePerUnit: z.number().positive(),
  retentionPct:     z.number().min(0).max(1),
  dpRecoupmentPct:  z.number().min(0).max(1),
  taxPct:           z.number().min(0).max(1),
});

export async function createDeveloperRateCard(
  input: z.infer<typeof RateCardSchema>,
): Promise<MutationResult> {
  const parsed = RateCardSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.errors[0]?.message ?? "Invalid input." };

  const { projectId, phaseActivityId, unitModel, unitType, grossRatePerUnit, retentionPct, dpRecoupmentPct, taxPct } = parsed.data;

  const [row] = await db
    .insert(developerRateCards)
    .values({
      projectId,
      phaseActivityId:  phaseActivityId ?? null,
      unitModel:        unitModel ?? null,
      unitType:         (unitType as "BEG" | "MID" | "END" | "SHOP" | null) ?? null,
      grossRatePerUnit: String(grossRatePerUnit),
      retentionPct:     String(retentionPct),
      dpRecoupmentPct:  String(dpRecoupmentPct),
      taxPct:           String(taxPct),
    })
    .returning({ id: developerRateCards.id });

  revalidatePath("/master-list/developers");
  return { success: true, id: row.id };
}

export async function updateDeveloperRateCard(
  id: string,
  input: z.infer<typeof RateCardSchema>,
): Promise<MutationResult> {
  const parsed = RateCardSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.errors[0]?.message ?? "Invalid input." };

  const { projectId, phaseActivityId, unitModel, unitType, grossRatePerUnit, retentionPct, dpRecoupmentPct, taxPct } = parsed.data;

  await db
    .update(developerRateCards)
    .set({
      projectId,
      phaseActivityId:  phaseActivityId ?? null,
      unitModel:        unitModel ?? null,
      unitType:         (unitType as "BEG" | "MID" | "END" | "SHOP" | null) ?? null,
      grossRatePerUnit: String(grossRatePerUnit),
      retentionPct:     String(retentionPct),
      dpRecoupmentPct:  String(dpRecoupmentPct),
      taxPct:           String(taxPct),
    })
    .where(eq(developerRateCards.id, id));

  revalidatePath("/master-list/developers");
  return { success: true, id };
}

export async function toggleDeveloperRateCardActive(
  id: string,
  isActive: boolean,
): Promise<{ success: boolean }> {
  await db.update(developerRateCards).set({ isActive }).where(eq(developerRateCards.id, id));
  revalidatePath("/master-list/developers");
  return { success: true };
}

const DeductionSchema = z.object({
  name:         z.string().min(1).max(150),
  deductionPct: z.number().min(0).max(1),
});

export async function createDevRateCardDeduction(
  rateCardId: string,
  input: z.infer<typeof DeductionSchema>,
): Promise<MutationResult> {
  const parsed = DeductionSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.errors[0]?.message ?? "Invalid input." };
  const [row] = await db
    .insert(developerRateCardDeductions)
    .values({ rateCardId, name: parsed.data.name, deductionPct: String(parsed.data.deductionPct) })
    .returning({ id: developerRateCardDeductions.id });
  revalidatePath("/master-list/developers");
  return { success: true, id: row.id };
}

export async function deleteDevRateCardDeduction(id: string): Promise<{ success: boolean }> {
  await db.delete(developerRateCardDeductions).where(eq(developerRateCardDeductions.id, id));
  revalidatePath("/master-list/developers");
  return { success: true };
}

// ─── Material Delete ────────────────────────────────────────────────────────

export async function deleteMaterial(id: string): Promise<{ success: boolean; error?: string }> {
  const [{ n }] = await db
    .select({ n: count() })
    .from(materialPriceHistory)
    .where(eq(materialPriceHistory.materialId, id));

  if (Number(n) > 0) {
    return { success: false, error: `Cannot delete: ${n} price history record(s) exist. Deactivate instead.` };
  }

  await db.delete(materials).where(eq(materials.id, id));
  revalidatePath("/admin/materials");
  revalidatePath("/master-list/materials");
  return { success: true };
}

// ─── Supplier Delete ────────────────────────────────────────────────────────

export async function deleteSupplier(id: string): Promise<{ success: boolean; error?: string }> {
  const [{ n }] = await db
    .select({ n: count() })
    .from(materials)
    .where(eq(materials.preferredSupplierId, id));

  if (Number(n) > 0) {
    return { success: false, error: `Cannot delete: ${n} material(s) use this supplier. Reassign them first.` };
  }

  await db.delete(suppliers).where(eq(suppliers.id, id));
  revalidatePath("/admin/suppliers");
  return { success: true };
}

// ─── Subcontractor Rate Cards ───────────────────────────────────────────────

const SubconRateCardSchema = z.object({
  subconId:        z.string().uuid(),
  projectId:       z.string().uuid(),
  phaseActivityId: z.string().uuid().optional(),
  unitModel:       z.string().max(50).optional(),
  unitType:        z.enum(["BEG", "MID", "END", "SHOP"]).optional(),
  ratePerUnit:     z.number().positive(),
  retentionPct:    z.number().min(0).max(1),
});

export async function createSubconRateCard(
  input: z.infer<typeof SubconRateCardSchema>,
): Promise<MutationResult> {
  const parsed = SubconRateCardSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.errors[0]?.message ?? "Invalid input." };

  const d = parsed.data;
  const [row] = await db
    .insert(subcontractorRateCards)
    .values({
      subconId:        d.subconId,
      projectId:       d.projectId,
      phaseActivityId: d.phaseActivityId ?? null,
      unitModel:       d.unitModel ?? null,
      unitType:        (d.unitType as "BEG" | "MID" | "END" | "SHOP" | null) ?? null,
      ratePerUnit:     String(d.ratePerUnit),
      retentionPct:    String(d.retentionPct),
    })
    .returning({ id: subcontractorRateCards.id });

  revalidatePath("/master-list/subcontractors");
  return { success: true, id: row.id };
}

export async function updateSubconRateCard(
  id: string,
  input: z.infer<typeof SubconRateCardSchema>,
): Promise<MutationResult> {
  const parsed = SubconRateCardSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.errors[0]?.message ?? "Invalid input." };

  const d = parsed.data;
  await db.update(subcontractorRateCards).set({
    subconId:        d.subconId,
    projectId:       d.projectId,
    phaseActivityId: d.phaseActivityId ?? null,
    unitModel:       d.unitModel ?? null,
    unitType:        (d.unitType as "BEG" | "MID" | "END" | "SHOP" | null) ?? null,
    ratePerUnit:     String(d.ratePerUnit),
    retentionPct:    String(d.retentionPct),
  }).where(eq(subcontractorRateCards.id, id));

  revalidatePath("/master-list/subcontractors");
  return { success: true, id };
}

export async function toggleSubconRateCardActive(
  id: string,
  isActive: boolean,
): Promise<{ success: boolean }> {
  await db.update(subcontractorRateCards).set({ isActive }).where(eq(subcontractorRateCards.id, id));
  revalidatePath("/master-list/subcontractors");
  return { success: true };
}

export async function createSubconRateCardDeduction(
  rateCardId: string,
  input: z.infer<typeof DeductionSchema>,
): Promise<MutationResult> {
  const parsed = DeductionSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.errors[0]?.message ?? "Invalid input." };
  const [row] = await db
    .insert(subcontractorRateCardDeductions)
    .values({ rateCardId, name: parsed.data.name, deductionPct: String(parsed.data.deductionPct) })
    .returning({ id: subcontractorRateCardDeductions.id });
  revalidatePath("/master-list/subcontractors");
  return { success: true, id: row.id };
}

export async function deleteSubconRateCardDeduction(id: string): Promise<{ success: boolean }> {
  await db.delete(subcontractorRateCardDeductions).where(eq(subcontractorRateCardDeductions.id, id));
  revalidatePath("/master-list/subcontractors");
  return { success: true };
}

// ─── Activity Definition — delete ──────────────────────────────────────────

export async function deleteActivityDefinition(id: string): Promise<{ success: boolean; error?: string }> {
  const [uses] = await db.select({ n: count() }).from(bomStandards).where(eq(bomStandards.activityDefId, id));
  if ((uses?.n ?? 0) > 0) return { success: false, error: "Cannot delete: activity is referenced by BOM standards." };
  await db.delete(activityDefinitions).where(eq(activityDefinitions.id, id));
  revalidatePath("/admin/activity-defs");
  return { success: true };
}

// ─── Milestone Definition — delete ─────────────────────────────────────────

export async function deleteMilestoneDefinition(id: string): Promise<{ success: boolean; error?: string }> {
  await db.delete(milestoneDefinitions).where(eq(milestoneDefinitions.id, id));
  revalidatePath("/admin/milestone-defs");
  return { success: true };
}

// ─── BOM Standards CRUD ────────────────────────────────────────────────────

const BomStandardSchema = z.object({
  activityDefId:   z.string().uuid(),
  unitModel:       z.string().min(1).max(50),
  unitType:        z.enum(["BEG", "MID", "END", "SHOP"]),
  materialId:      z.string().uuid(),
  quantityPerUnit: z.number().positive(),
});

export async function createBomStandard(input: z.infer<typeof BomStandardSchema>): Promise<MutationResult> {
  const parsed = BomStandardSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.errors[0]?.message ?? "Invalid input." };
  const d = parsed.data;
  const [row] = await db.insert(bomStandards).values({
    activityDefId:   d.activityDefId,
    unitModel:       d.unitModel,
    unitType:        d.unitType,
    materialId:      d.materialId,
    quantityPerUnit: String(d.quantityPerUnit),
  }).returning({ id: bomStandards.id });
  revalidatePath("/admin/bom-standards");
  return { success: true, id: row.id };
}

export async function updateBomStandard(id: string, input: z.infer<typeof BomStandardSchema>): Promise<MutationResult> {
  const parsed = BomStandardSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.errors[0]?.message ?? "Invalid input." };
  const d = parsed.data;
  await db.update(bomStandards).set({
    activityDefId:   d.activityDefId,
    unitModel:       d.unitModel,
    unitType:        d.unitType,
    materialId:      d.materialId,
    quantityPerUnit: String(d.quantityPerUnit),
  }).where(eq(bomStandards.id, id));
  revalidatePath("/admin/bom-standards");
  revalidatePath(`/admin/bom-standards/${id}`);
  return { success: true, id };
}

export async function toggleBomStandardActive(id: string, isActive: boolean): Promise<{ success: boolean }> {
  await db.update(bomStandards).set({ isActive }).where(eq(bomStandards.id, id));
  revalidatePath("/admin/bom-standards");
  return { success: true };
}

export async function deleteBomStandard(id: string): Promise<{ success: boolean; error?: string }> {
  await db.delete(bomStandards).where(eq(bomStandards.id, id));
  revalidatePath("/admin/bom-standards");
  return { success: true };
}

// ─── Cost Centers CRUD ─────────────────────────────────────────────────────

const CostCenterSchema = z.object({
  code:    z.string().min(1).max(50),
  name:    z.string().min(1).max(100),
  deptId:  z.string().uuid(),
  type:    z.enum(["PROJECT", "BATCHING", "FLEET", "HQ"]),
});

export async function createCostCenter(input: z.infer<typeof CostCenterSchema>): Promise<MutationResult> {
  const parsed = CostCenterSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.errors[0]?.message ?? "Invalid input." };
  const d = parsed.data;
  const [row] = await db.insert(costCenters).values({
    code: d.code, name: d.name, deptId: d.deptId, type: d.type,
  }).returning({ id: costCenters.id });
  revalidatePath("/admin/cost-centers");
  return { success: true, id: row.id };
}

export async function updateCostCenterAdmin(id: string, input: z.infer<typeof CostCenterSchema>): Promise<MutationResult> {
  const parsed = CostCenterSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.errors[0]?.message ?? "Invalid input." };
  const d = parsed.data;
  await db.update(costCenters).set({ code: d.code, name: d.name, deptId: d.deptId, type: d.type }).where(eq(costCenters.id, id));
  revalidatePath("/admin/cost-centers");
  revalidatePath(`/admin/cost-centers/${id}`);
  return { success: true, id };
}

export async function toggleCostCenterActive(id: string, isActive: boolean): Promise<{ success: boolean }> {
  await db.update(costCenters).set({ isActive }).where(eq(costCenters.id, id));
  revalidatePath("/admin/cost-centers");
  return { success: true };
}

export async function deleteCostCenterAdmin(id: string): Promise<{ success: boolean; error?: string }> {
  await db.delete(costCenters).where(eq(costCenters.id, id));
  revalidatePath("/admin/cost-centers");
  return { success: true };
}

// ─── Material Suppliers (many-to-many) ────────────────────────────────────

export async function setMaterialSupplier(
  materialId: string,
  supplierId: string,
  isPreferred: boolean,
): Promise<{ success: boolean; error?: string }> {
  const [existing] = await db.select({ id: materialSuppliers.id })
    .from(materialSuppliers)
    .where(eq(materialSuppliers.materialId, materialId))
    .limit(1);

  // When setting as preferred, clear existing preferred
  if (isPreferred) {
    await db.update(materialSuppliers).set({ isPreferred: false })
      .where(eq(materialSuppliers.materialId, materialId));
  }

  const [exists] = await db.select({ id: materialSuppliers.id })
    .from(materialSuppliers)
    .where(eq(materialSuppliers.materialId, materialId))
    .limit(1);

  // Check if this specific pair already exists
  const allLinks = await db.select({ id: materialSuppliers.id, supplierId: materialSuppliers.supplierId })
    .from(materialSuppliers)
    .where(eq(materialSuppliers.materialId, materialId));

  const link = allLinks.find((r) => r.supplierId === supplierId);

  if (link) {
    await db.update(materialSuppliers).set({ isPreferred }).where(eq(materialSuppliers.id, link.id));
  } else {
    await db.insert(materialSuppliers).values({ materialId, supplierId, isPreferred });
  }

  revalidatePath(`/admin/materials/${materialId}`);
  return { success: true };
}

export async function removeMaterialSupplier(id: string, materialId: string): Promise<{ success: boolean }> {
  await db.delete(materialSuppliers).where(eq(materialSuppliers.id, id));
  revalidatePath(`/admin/materials/${materialId}`);
  return { success: true };
}

// ─── Vendor Price List ────────────────────────────────────────────────────────

const VendorPriceEntrySchema = z.object({
  materialId:      z.string().uuid(),
  unitPrice:       z.coerce.number().positive(),
  uom:             z.string().max(30).optional(),
  minimumQuantity: z.coerce.number().min(0).optional(),
  effectiveDate:   z.string().optional(),
  notes:           z.string().max(500).optional(),
});

export async function addVendorPriceEntry(
  vendorId: string,
  input: z.infer<typeof VendorPriceEntrySchema>,
): Promise<{ success: boolean; error?: string }> {
  const parsed = VendorPriceEntrySchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.errors[0]?.message ?? "Invalid input." };
  const d = parsed.data;
  try {
    // Archive all existing current entries for this vendor-material pair
    await db.update(materialSuppliers)
      .set({ isCurrent: false })
      .where(and(
        eq(materialSuppliers.supplierId, vendorId),
        eq(materialSuppliers.materialId, d.materialId),
        eq(materialSuppliers.isCurrent, true),
      ));
    // Insert new current entry
    await db.insert(materialSuppliers).values({
      supplierId:      vendorId,
      materialId:      d.materialId,
      unitPrice:       String(d.unitPrice),
      uom:             d.uom ?? null,
      minimumQuantity: d.minimumQuantity != null ? String(d.minimumQuantity) : null,
      effectiveDate:   d.effectiveDate ?? null,
      notes:           d.notes ?? null,
      isCurrent:       true,
    });
    revalidatePath(`/master-list/vendors/${vendorId}`);
    revalidatePath(`/master-list/materials/${d.materialId}`);
    return { success: true };
  } catch {
    return { success: false, error: "Failed to save price entry." };
  }
}

export async function updateVendorPriceEntry(
  id: string,
  vendorId: string,
  materialId: string,
  input: { unitPrice: number; uom?: string; minimumQuantity?: number; effectiveDate?: string; notes?: string },
): Promise<{ success: boolean; error?: string }> {
  if (!input.unitPrice || input.unitPrice <= 0) return { success: false, error: "Unit price must be positive." };
  try {
    await db.update(materialSuppliers)
      .set({
        unitPrice:       String(input.unitPrice),
        uom:             input.uom ?? null,
        minimumQuantity: input.minimumQuantity != null ? String(input.minimumQuantity) : null,
        effectiveDate:   input.effectiveDate ?? null,
        notes:           input.notes ?? null,
      })
      .where(eq(materialSuppliers.id, id));
    revalidatePath(`/master-list/vendors/${vendorId}`);
    revalidatePath(`/master-list/materials/${materialId}`);
    return { success: true };
  } catch {
    return { success: false, error: "Update failed." };
  }
}

export async function deleteVendorPriceEntry(
  id: string,
  vendorId: string,
  materialId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    await db.delete(materialSuppliers).where(eq(materialSuppliers.id, id));
    revalidatePath(`/master-list/vendors/${vendorId}`);
    revalidatePath(`/master-list/materials/${materialId}`);
    return { success: true };
  } catch {
    return { success: false, error: "Delete failed." };
  }
}

// ─── Phase Categories ──────────────────────────────────────────────────────

const PhaseCategorySchema = z.object({
  code:          z.string().min(1).max(50),
  name:          z.string().min(1).max(150),
  sequenceOrder: z.number().int().min(0).default(0),
});

export async function createPhaseCategory(input: z.infer<typeof PhaseCategorySchema>): Promise<MutationResult> {
  const parsed = PhaseCategorySchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.errors[0]?.message ?? "Invalid input." };
  const d = parsed.data;
  const [row] = await db.insert(phaseCategories).values({ code: d.code, name: d.name, sequenceOrder: d.sequenceOrder }).returning({ id: phaseCategories.id });
  revalidatePath("/master-list/construction-phases");
  return { success: true, id: row.id };
}

export async function updatePhaseCategory(id: string, input: z.infer<typeof PhaseCategorySchema>): Promise<MutationResult> {
  const parsed = PhaseCategorySchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.errors[0]?.message ?? "Invalid input." };
  const d = parsed.data;
  await db.update(phaseCategories).set({ code: d.code, name: d.name, sequenceOrder: d.sequenceOrder }).where(eq(phaseCategories.id, id));
  revalidatePath("/master-list/construction-phases");
  return { success: true, id };
}

export async function deletePhaseCategory(id: string): Promise<{ success: boolean; error?: string }> {
  const [scopes] = await db.select({ n: count() }).from(phaseScopes).where(eq(phaseScopes.categoryId, id));
  if (Number(scopes?.n ?? 0) > 0) return { success: false, error: "Cannot delete: scopes exist in this category. Remove them first." };
  await db.delete(phaseCategories).where(eq(phaseCategories.id, id));
  revalidatePath("/master-list/construction-phases");
  return { success: true };
}

export async function togglePhaseCategoryActive(id: string, isActive: boolean): Promise<{ success: boolean }> {
  await db.update(phaseCategories).set({ isActive }).where(eq(phaseCategories.id, id));
  revalidatePath("/master-list/construction-phases");
  return { success: true };
}

// ─── Phase Scopes (Scope of Work) ─────────────────────────────────────────

const PhaseScopeSchema = z.object({
  categoryId:    z.string().uuid(),
  code:          z.string().min(1).max(100),
  name:          z.string().min(1).max(200),
  sequenceOrder: z.number().int().min(0).default(0),
});

export async function createPhaseScope(input: z.infer<typeof PhaseScopeSchema>): Promise<MutationResult> {
  const parsed = PhaseScopeSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.errors[0]?.message ?? "Invalid input." };
  const d = parsed.data;
  const [row] = await db.insert(phaseScopes).values({ categoryId: d.categoryId, code: d.code, name: d.name, sequenceOrder: d.sequenceOrder }).returning({ id: phaseScopes.id });
  revalidatePath("/master-list/construction-phases");
  return { success: true, id: row.id };
}

export async function updatePhaseScope(id: string, input: z.infer<typeof PhaseScopeSchema>): Promise<MutationResult> {
  const parsed = PhaseScopeSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.errors[0]?.message ?? "Invalid input." };
  const d = parsed.data;
  await db.update(phaseScopes).set({ categoryId: d.categoryId, code: d.code, name: d.name, sequenceOrder: d.sequenceOrder }).where(eq(phaseScopes.id, id));
  revalidatePath("/master-list/construction-phases");
  return { success: true, id };
}

export async function deletePhaseScope(id: string): Promise<{ success: boolean; error?: string }> {
  const [acts] = await db.select({ n: count() }).from(phaseActivities).where(eq(phaseActivities.scopeId, id));
  if (Number(acts?.n ?? 0) > 0) return { success: false, error: "Cannot delete: activities exist in this scope. Remove them first." };
  await db.delete(phaseScopes).where(eq(phaseScopes.id, id));
  revalidatePath("/master-list/construction-phases");
  return { success: true };
}

export async function togglePhaseScopeActive(id: string, isActive: boolean): Promise<{ success: boolean }> {
  await db.update(phaseScopes).set({ isActive }).where(eq(phaseScopes.id, id));
  revalidatePath("/master-list/construction-phases");
  return { success: true };
}

// ─── Phase Activities ──────────────────────────────────────────────────────

const PhaseActivitySchema = z.object({
  scopeId:              z.string().uuid(),
  code:                 z.string().min(1).max(100),
  name:                 z.string().min(1).max(200),
  standardDurationDays: z.number().int().positive().default(1),
  weightInScopePct:     z.number().min(0).max(100).default(0),
  sequenceOrder:        z.number().int().min(0).default(0),
});

export async function createPhaseActivity(input: z.infer<typeof PhaseActivitySchema>): Promise<MutationResult> {
  const parsed = PhaseActivitySchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.errors[0]?.message ?? "Invalid input." };
  const d = parsed.data;
  const [row] = await db.insert(phaseActivities).values({
    scopeId: d.scopeId, code: d.code, name: d.name,
    standardDurationDays: d.standardDurationDays,
    weightInScopePct: String(d.weightInScopePct),
    sequenceOrder: d.sequenceOrder,
  }).returning({ id: phaseActivities.id });
  revalidatePath("/master-list/construction-phases");
  return { success: true, id: row.id };
}

export async function updatePhaseActivity(id: string, input: z.infer<typeof PhaseActivitySchema>): Promise<MutationResult> {
  const parsed = PhaseActivitySchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.errors[0]?.message ?? "Invalid input." };
  const d = parsed.data;
  await db.update(phaseActivities).set({
    scopeId: d.scopeId, code: d.code, name: d.name,
    standardDurationDays: d.standardDurationDays,
    weightInScopePct: String(d.weightInScopePct),
    sequenceOrder: d.sequenceOrder,
  }).where(eq(phaseActivities.id, id));
  revalidatePath("/master-list/construction-phases");
  return { success: true, id };
}

export async function deletePhaseActivity(id: string): Promise<{ success: boolean; error?: string }> {
  await db.delete(phaseActivities).where(eq(phaseActivities.id, id));
  revalidatePath("/master-list/construction-phases");
  return { success: true };
}

export async function togglePhaseActivityActive(id: string, isActive: boolean): Promise<{ success: boolean }> {
  await db.update(phaseActivities).set({ isActive }).where(eq(phaseActivities.id, id));
  revalidatePath("/master-list/construction-phases");
  return { success: true };
}

// ─── Phase Billing Milestones ──────────────────────────────────────────────

const PhaseBillingMilestoneSchema = z.object({
  categoryId:      z.string().uuid(),
  name:            z.string().min(1).max(200),
  weightPct:       z.number().min(0).max(100).default(0),
  triggersBilling: z.boolean().default(true),
  sequenceOrder:   z.number().int().min(0).default(0),
  notes:           z.string().max(1000).optional(),
});

export async function createPhaseBillingMilestone(input: z.infer<typeof PhaseBillingMilestoneSchema>): Promise<MutationResult> {
  const parsed = PhaseBillingMilestoneSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.errors[0]?.message ?? "Invalid input." };
  const d = parsed.data;
  const [row] = await db.insert(phaseBillingMilestones).values({
    categoryId: d.categoryId, name: d.name,
    weightPct: String(d.weightPct), triggersBilling: d.triggersBilling,
    sequenceOrder: d.sequenceOrder, notes: d.notes ?? null,
  }).returning({ id: phaseBillingMilestones.id });
  revalidatePath("/master-list/construction-phases");
  return { success: true, id: row.id };
}

export async function updatePhaseBillingMilestone(id: string, input: z.infer<typeof PhaseBillingMilestoneSchema>): Promise<MutationResult> {
  const parsed = PhaseBillingMilestoneSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.errors[0]?.message ?? "Invalid input." };
  const d = parsed.data;
  await db.update(phaseBillingMilestones).set({
    categoryId: d.categoryId, name: d.name,
    weightPct: String(d.weightPct), triggersBilling: d.triggersBilling,
    sequenceOrder: d.sequenceOrder, notes: d.notes ?? null,
  }).where(eq(phaseBillingMilestones.id, id));
  revalidatePath("/master-list/construction-phases");
  return { success: true, id };
}

export async function deletePhaseBillingMilestone(id: string): Promise<{ success: boolean; error?: string }> {
  await db.delete(phaseBillingMilestones).where(eq(phaseBillingMilestones.id, id));
  revalidatePath("/master-list/construction-phases");
  return { success: true };
}

// ─── Global Settings ───────────────────────────────────────────────────────

export async function updateGlobalSetting(
  key: string,
  value: string,
): Promise<{ success: boolean; error?: string }> {
  if (!key?.trim()) return { success: false, error: "Key is required." };
  await db.update(globalSettings)
    .set({ value: value.trim(), updatedAt: new Date() })
    .where(eq(globalSettings.key, key));
  revalidatePath("/admin/global-config");
  return { success: true };
}

// ─── Update Project (Site Registry edits) ─────────────────────────────────

const UpdateProjectSchema = z.object({
  id:                     z.string().uuid(),
  name:                   z.string().min(1).max(200),
  status:                 z.enum(["BIDDING", "ACTIVE", "ON_HOLD", "COMPLETED", "CANCELLED"]),
  startDate:              z.string().date().optional().or(z.literal("")),
  endDate:                z.string().date().optional().or(z.literal("")),
  contractValue:          z.number().min(0),
  developerAdvance:       z.number().min(0),
  targetUnitsPerMonth:    z.number().int().min(0),
  minOperatingCashBuffer: z.number().min(0),
});

export async function updateProject(
  input: z.infer<typeof UpdateProjectSchema>,
): Promise<MutationResult> {
  const parsed = UpdateProjectSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.errors[0]?.message ?? "Invalid input." };
  const d = parsed.data;
  await db.update(projects).set({
    name:                   d.name,
    status:                 d.status,
    startDate:              d.startDate || null,
    endDate:                d.endDate || null,
    contractValue:          String(d.contractValue),
    developerAdvance:       String(d.developerAdvance),
    targetUnitsPerMonth:    d.targetUnitsPerMonth,
    minOperatingCashBuffer: String(d.minOperatingCashBuffer),
    updatedAt:              new Date(),
  }).where(eq(projects.id, d.id));
  revalidatePath(`/master-list/projects/${d.id}`);
  revalidatePath("/master-list/projects");
  revalidatePath("/construction/sites");
  return { success: true, id: d.id };
}

// ─── Departments ────────────────────────────────────────────────────────────

const DEPT_CODES = ["PLANNING","AUDIT","CONSTRUCTION","PROCUREMENT","BATCHING","MOTORPOOL","FINANCE","HR","ADMIN","BOD"] as const;
const DEPT_NAMES: Record<string, string> = {
  PLANNING: "Planning", AUDIT: "Audit", CONSTRUCTION: "Construction",
  PROCUREMENT: "Procurement", BATCHING: "Batching Plant", MOTORPOOL: "Motor Pool",
  FINANCE: "Finance", HR: "Human Resources", ADMIN: "Administration", BOD: "Board of Directors",
};

export async function seedDepartments(): Promise<{ success: boolean; seeded: number }> {
  const existing = await db.select({ code: departments.code }).from(departments);
  const existingCodes = new Set(existing.map((r) => r.code));
  let seeded = 0;
  for (const code of DEPT_CODES) {
    if (!existingCodes.has(code)) {
      await db.insert(departments).values({ code, name: DEPT_NAMES[code] ?? code });
      seeded++;
    }
  }
  revalidatePath("/master-list/departments");
  return { success: true, seeded };
}

export async function createCostCenterForDept(input: z.infer<typeof CostCenterSchema>): Promise<MutationResult> {
  const parsed = CostCenterSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.errors[0]?.message ?? "Invalid input." };
  const d = parsed.data;
  const [existing] = await db.select({ id: costCenters.id }).from(costCenters).where(eq(costCenters.code, d.code)).limit(1);
  if (existing) return { success: false, error: "Cost center code already exists." };
  const [row] = await db.insert(costCenters).values({
    code: d.code, name: d.name, deptId: d.deptId, type: d.type,
  }).returning({ id: costCenters.id });
  revalidatePath("/master-list/departments");
  return { success: true, id: row.id };
}

export async function toggleCostCenterActiveForDept(id: string, isActive: boolean): Promise<{ success: boolean }> {
  await db.update(costCenters).set({ isActive }).where(eq(costCenters.id, id));
  revalidatePath("/master-list/departments");
  return { success: true };
}

// ─── Developer Delete ────────────────────────────────────────────────────────

export async function deleteDeveloper(id: string): Promise<{ success: boolean; error?: string }> {
  const [n] = await db.select({ n: count() }).from(projects).where(eq(projects.developerId, id));
  if ((n?.n ?? 0) > 0) return { success: false, error: `Cannot delete: ${n?.n} project(s) are linked to this developer.` };
  await db.delete(developers).where(eq(developers.id, id));
  revalidatePath("/master-list/developers");
  return { success: true };
}

// ─── Subcontractor Delete ────────────────────────────────────────────────────

export async function deleteSubcontractor(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    await db.delete(subcontractors).where(eq(subcontractors.id, id));
    revalidatePath("/master-list/subcontractors");
    return { success: true };
  } catch {
    return { success: false, error: "Cannot delete: subcontractor may have linked records." };
  }
}

// ─── Department Edit / Delete ────────────────────────────────────────────────

export async function updateDepartment(id: string, input: { name: string }): Promise<{ success: boolean; error?: string }> {
  const name = input.name?.trim();
  if (!name) return { success: false, error: "Name is required." };
  await db.update(departments).set({ name }).where(eq(departments.id, id));
  revalidatePath("/master-list/departments");
  return { success: true };
}

export async function deleteDepartment(id: string): Promise<{ success: boolean; error?: string }> {
  const [n] = await db.select({ n: count() }).from(costCenters).where(eq(costCenters.deptId, id));
  if ((n?.n ?? 0) > 0) return { success: false, error: `Cannot delete: ${n?.n} cost center(s) are linked. Delete them first.` };
  try {
    await db.delete(departments).where(eq(departments.id, id));
    revalidatePath("/master-list/departments");
    return { success: true };
  } catch {
    return { success: false, error: "Cannot delete: department is referenced by other records." };
  }
}

// ─── Cost Center Edit / Delete ───────────────────────────────────────────────

export async function updateCostCenter(id: string, input: { code: string; name: string; type: string }): Promise<{ success: boolean; error?: string }> {
  const code = input.code?.trim();
  const name = input.name?.trim();
  if (!code || !name) return { success: false, error: "Code and name are required." };
  try {
    await db.update(costCenters).set({ code, name, type: input.type as any }).where(eq(costCenters.id, id));
    revalidatePath("/master-list/departments");
    return { success: true };
  } catch {
    return { success: false, error: "Code already exists or update failed." };
  }
}

export async function deleteCostCenter(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    await db.delete(costCenters).where(eq(costCenters.id, id));
    revalidatePath("/master-list/departments");
    return { success: true };
  } catch {
    return { success: false, error: "Cannot delete: cost center is referenced by other records." };
  }
}


// ─── Project Unit Models ────────────────────────────────────────────────────

const UnitModelSchema = z.object({
  name: z.string().min(1).max(50),
});

export async function createProjectUnitModel(
  projectId: string,
  input: z.infer<typeof UnitModelSchema>,
): Promise<MutationResult> {
  const parsed = UnitModelSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.errors[0]?.message ?? "Invalid input." };
  try {
    const [row] = await db
      .insert(projectUnitModels)
      .values({ projectId, name: parsed.data.name })
      .returning({ id: projectUnitModels.id });
    revalidatePath(`/master-list/projects/${projectId}`);
    revalidatePath("/planning/bom/new");
    return { success: true, id: row.id };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("does not exist")) return { success: false, error: "Migration not applied yet — run the project_unit_models SQL in Supabase first." };
    return { success: false, error: "Could not save unit model. " + msg };
  }
}

export async function deleteProjectUnitModel(id: string, projectId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await db.delete(projectUnitModels).where(eq(projectUnitModels.id, id));
    revalidatePath(`/master-list/projects/${projectId}`);
    revalidatePath("/planning/bom/new");
    return { success: true };
  } catch {
    return { success: false, error: "Could not delete unit model." };
  }
}
