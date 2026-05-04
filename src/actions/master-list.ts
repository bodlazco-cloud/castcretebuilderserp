"use server";

import { db } from "@/db";
import {
  developers, projects, materials, suppliers,
  subcontractors, activityDefinitions, milestoneDefinitions, blocks, projectUnits,
} from "@/db/schema";
import { eq } from "drizzle-orm";
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
