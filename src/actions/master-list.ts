"use server";

import { db } from "@/db";
import {
  developers, projects, materials, suppliers,
  subcontractors, activityDefinitions, milestoneDefinitions, blocks, projectUnits,
  developerRateCards, materialPriceHistory, subconRateCards,
} from "@/db/schema";
import { eq, count } from "drizzle-orm";
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
  category:            z.string().min(1).max(50),
  adminPrice:          z.number().min(0),
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
      category:            d.category,
      adminPrice:          String(d.adminPrice),
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

// ─── Suppliers ─────────────────────────────────────────────────────────────

const SupplierSchema = z.object({
  name: z.string().min(1).max(150),
});

export async function createSupplier(
  input: z.infer<typeof SupplierSchema>,
): Promise<MutationResult> {
  const parsed = SupplierSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.errors[0]?.message ?? "Invalid input." };

  const [row] = await db
    .insert(suppliers)
    .values({ name: parsed.data.name })
    .returning({ id: suppliers.id });

  revalidatePath("/master-list/vendors");
  return { success: true, id: row.id };
}

export async function toggleSupplierActive(id: string, isActive: boolean): Promise<{ success: boolean }> {
  await db.update(suppliers).set({ isActive }).where(eq(suppliers.id, id));
  revalidatePath("/master-list/vendors");
  return { success: true };
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
  category:             z.enum(["STRUCTURAL", "ARCHITECTURAL", "TURNOVER"]),
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
  name:            z.string().min(1).max(150),
  category:        z.enum(["STRUCTURAL", "ARCHITECTURAL", "TURNOVER"]),
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

// ─── Material Update (full fields) ─────────────────────────────────────────

const UpdateMaterialSchema = z.object({
  code:                z.string().min(1).max(50),
  name:                z.string().min(1).max(150),
  unit:                z.string().min(1).max(30),
  category:            z.string().min(1).max(50),
  preferredSupplierId: z.string().uuid().optional(),
});

export async function updateMaterial(
  id: string,
  input: z.infer<typeof UpdateMaterialSchema>,
): Promise<MutationResult> {
  const parsed = UpdateMaterialSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.errors[0]?.message ?? "Invalid input." };

  const d = parsed.data;
  await db.update(materials).set({
    code:                d.code,
    name:                d.name,
    unit:                d.unit,
    category:            d.category,
    preferredSupplierId: d.preferredSupplierId || null,
  }).where(eq(materials.id, id));

  revalidatePath("/admin/materials");
  revalidatePath(`/admin/materials/${id}`);
  revalidatePath("/master-list/materials");
  return { success: true, id };
}

// ─── Supplier Update ───────────────────────────────────────────────────────

export async function updateSupplier(
  id: string,
  input: { name: string },
): Promise<MutationResult> {
  if (!input.name?.trim()) return { success: false, error: "Name is required." };
  await db.update(suppliers).set({ name: input.name.trim() }).where(eq(suppliers.id, id));
  revalidatePath("/admin/suppliers");
  revalidatePath(`/admin/suppliers/${id}`);
  revalidatePath("/master-list/vendors");
  return { success: true, id };
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
});

export async function createProjectUnit(input: z.infer<typeof ProjectUnitSchema>): Promise<MutationResult> {
  const parsed = ProjectUnitSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.errors[0]?.message ?? "Invalid input." };

  const d = parsed.data;
  const [row] = await db
    .insert(projectUnits)
    .values({ projectId: d.projectId, blockId: d.blockId, lotNumber: d.lotNumber, unitCode: d.unitCode, unitModel: d.unitModel })
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
  input: { blockId: string; lotNumber: string; unitCode: string; unitModel: string; contractPrice?: string },
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
  activityDefId:    z.string().uuid(),
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

  const { projectId, activityDefId, grossRatePerUnit, retentionPct, dpRecoupmentPct, taxPct } = parsed.data;

  const [row] = await db
    .insert(developerRateCards)
    .values({
      projectId,
      activityDefId,
      grossRatePerUnit: String(grossRatePerUnit),
      retentionPct:     String(retentionPct),
      dpRecoupmentPct:  String(dpRecoupmentPct),
      taxPct:           String(taxPct),
    })
    .returning({ id: developerRateCards.id });

  revalidatePath("/admin/rate-cards");
  return { success: true, id: row.id };
}

export async function updateDeveloperRateCard(
  id: string,
  input: z.infer<typeof RateCardSchema>,
): Promise<MutationResult> {
  const parsed = RateCardSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.errors[0]?.message ?? "Invalid input." };

  const { projectId, activityDefId, grossRatePerUnit, retentionPct, dpRecoupmentPct, taxPct } = parsed.data;

  await db
    .update(developerRateCards)
    .set({
      projectId,
      activityDefId,
      grossRatePerUnit: String(grossRatePerUnit),
      retentionPct:     String(retentionPct),
      dpRecoupmentPct:  String(dpRecoupmentPct),
      taxPct:           String(taxPct),
    })
    .where(eq(developerRateCards.id, id));

  revalidatePath("/admin/rate-cards");
  return { success: true, id };
}

export async function toggleDeveloperRateCardActive(
  id: string,
  isActive: boolean,
): Promise<{ success: boolean }> {
  await db.update(developerRateCards).set({ isActive }).where(eq(developerRateCards.id, id));
  revalidatePath("/admin/rate-cards");
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
  subconId:      z.string().uuid(),
  projectId:     z.string().uuid(),
  activityDefId: z.string().uuid(),
  ratePerUnit:   z.number().positive(),
  retentionPct:  z.number().min(0).max(1),
});

export async function createSubconRateCard(
  input: z.infer<typeof SubconRateCardSchema>,
): Promise<MutationResult> {
  const parsed = SubconRateCardSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.errors[0]?.message ?? "Invalid input." };

  const d = parsed.data;
  const [row] = await db
    .insert(subconRateCards)
    .values({
      subconId:      d.subconId,
      projectId:     d.projectId,
      activityDefId: d.activityDefId,
      ratePerUnit:   String(d.ratePerUnit),
      retentionPct:  String(d.retentionPct),
    })
    .returning({ id: subconRateCards.id });

  revalidatePath("/admin/subcon-rate-cards");
  return { success: true, id: row.id };
}

export async function updateSubconRateCard(
  id: string,
  input: z.infer<typeof SubconRateCardSchema>,
): Promise<MutationResult> {
  const parsed = SubconRateCardSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.errors[0]?.message ?? "Invalid input." };

  const d = parsed.data;
  await db.update(subconRateCards).set({
    subconId:      d.subconId,
    projectId:     d.projectId,
    activityDefId: d.activityDefId,
    ratePerUnit:   String(d.ratePerUnit),
    retentionPct:  String(d.retentionPct),
  }).where(eq(subconRateCards.id, id));

  revalidatePath("/admin/subcon-rate-cards");
  revalidatePath(`/admin/subcon-rate-cards/${id}`);
  return { success: true, id };
}

export async function toggleSubconRateCardActive(
  id: string,
  isActive: boolean,
): Promise<{ success: boolean }> {
  await db.update(subconRateCards).set({ isActive }).where(eq(subconRateCards.id, id));
  revalidatePath("/admin/subcon-rate-cards");
  return { success: true };
}
