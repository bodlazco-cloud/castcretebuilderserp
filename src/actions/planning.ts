"use server";

import { db } from "@/db";
import { bomStandards, activityDefinitions, changeOrderRequests, constructionManpowerLogs } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getAuthUser } from "@/lib/supabase-server";

const BomLineSchema = z.object({
  materialId:      z.string().uuid(),
  quantityPerUnit: z.number().positive(),
});

const SaveBomSchema = z.object({
  activityDefId: z.string().uuid(),
  unitModel:     z.string().min(1).max(50),
  unitType:      z.enum(["BEG", "REG", "END"]),
  items:         z.array(BomLineSchema).min(1, "At least one material line is required"),
});

export type SaveBomResult =
  | { success: true; inserted: number }
  | { success: false; error: string };

export async function saveBomEntries(
  input: z.infer<typeof SaveBomSchema>,
): Promise<SaveBomResult> {
  const parsed = SaveBomSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.errors[0]?.message ?? "Invalid input." };

  const { activityDefId, unitModel, unitType, items } = parsed.data;

  // Verify activity exists
  const [activity] = await db
    .select({ id: activityDefinitions.id, projectId: activityDefinitions.projectId })
    .from(activityDefinitions)
    .where(eq(activityDefinitions.id, activityDefId));

  if (!activity) return { success: false, error: "Activity definition not found." };

  // Deactivate existing BOM entries for this scope to maintain versioning
  await db
    .update(bomStandards)
    .set({ isActive: false })
    .where(
      and(
        eq(bomStandards.activityDefId, activityDefId),
        eq(bomStandards.unitModel, unitModel),
        eq(bomStandards.unitType, unitType),
        eq(bomStandards.isActive, true),
      ),
    );

  // Insert new entries
  await db.insert(bomStandards).values(
    items.map((item) => ({
      activityDefId,
      unitModel,
      unitType,
      materialId:      item.materialId,
      quantityPerUnit: String(item.quantityPerUnit),
    })),
  );

  revalidatePath("/planning/bom");
  return { success: true, inserted: items.length };
}

// ─── Change Orders ────────────────────────────────────────────────────────────

const CreateCoSchema = z.object({
  projectId:    z.string().uuid(),
  activityDefId: z.string().uuid().optional(),
  bomStandardId: z.string().uuid().optional(),
  unitModel:    z.string().max(50).optional(),
  unitType:     z.enum(["BEG", "REG", "END"]).optional(),
  materialId:   z.string().uuid().optional(),
  changeType:   z.enum(["ADD", "MODIFY", "REMOVE"]),
  oldQuantity:  z.number().positive().optional(),
  newQuantity:  z.number().positive().optional(),
  reason:       z.string().min(1).max(2000),
});

export type CreateCoResult = { success: true; id: string } | { success: false; error: string };

export async function createChangeOrder(input: z.infer<typeof CreateCoSchema>): Promise<CreateCoResult> {
  const parsed = CreateCoSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.errors[0]?.message ?? "Invalid input." };

  const user = await getAuthUser();
  if (!user) return { success: false, error: "Not authenticated." };
  const { projectId, activityDefId, bomStandardId, unitModel, unitType, materialId, changeType, oldQuantity, newQuantity, reason } = parsed.data;

  const [row] = await db
    .insert(changeOrderRequests)
    .values({
      projectId,
      activityDefId:  activityDefId  ?? null,
      bomStandardId:  bomStandardId  ?? null,
      unitModel:      unitModel      ?? null,
      unitType:       unitType       ?? null,
      materialId:     materialId     ?? null,
      changeType,
      oldQuantity:    oldQuantity != null ? String(oldQuantity) : null,
      newQuantity:    newQuantity != null ? String(newQuantity) : null,
      reason,
      status:         "PENDING",
      requestedBy:    user.id,
    })
    .returning({ id: changeOrderRequests.id });

  revalidatePath("/planning/change-orders");
  return { success: true, id: row.id };
}

export async function reviewChangeOrder(
  id: string,
  action: "APPROVE" | "REJECT",
  rejectionReason?: string,
): Promise<{ success: boolean; error?: string }> {
  const user = await getAuthUser();
  if (!user) return { success: false, error: "Not authenticated." };
  const newStatus = action === "APPROVE" ? "APPROVED" : "REJECTED";

  await db
    .update(changeOrderRequests)
    .set({
      status:          newStatus,
      reviewedBy:      user.id,
      reviewedAt:      new Date(),
      rejectionReason: action === "REJECT" ? (rejectionReason ?? null) : null,
    })
    .where(eq(changeOrderRequests.id, id));

  revalidatePath(`/planning/change-orders/${id}`);
  revalidatePath("/planning/change-orders");
  return { success: true };
}

// ─── Resource Forecasting (Manpower Logs) ────────────────────────────────────

const CreateManpowerLogSchema = z.object({
  projectId:        z.string().uuid(),
  logDate:          z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  activityDefId:    z.string().uuid().optional(),
  subconId:         z.string().uuid().optional(),
  subconHeadcount:  z.number().int().min(0),
  directStaffCount: z.number().int().min(0),
  remarks:          z.string().max(1000).optional(),
});

export type CreateManpowerLogResult = { success: true; id: string } | { success: false; error: string };

export async function createManpowerLog(input: z.infer<typeof CreateManpowerLogSchema>): Promise<CreateManpowerLogResult> {
  const parsed = CreateManpowerLogSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.errors[0]?.message ?? "Invalid input." };

  const user = await getAuthUser();
  if (!user) return { success: false, error: "Not authenticated." };
  const { projectId, logDate, activityDefId, subconId, subconHeadcount, directStaffCount, remarks } = parsed.data;

  const [row] = await db
    .insert(constructionManpowerLogs)
    .values({
      projectId,
      logDate,
      activityDefId:    activityDefId    ?? null,
      subconId:         subconId         ?? null,
      subconHeadcount,
      directStaffCount,
      remarks:          remarks          ?? null,
      recordedBy:       user.id,
    })
    .returning({ id: constructionManpowerLogs.id });

  revalidatePath("/planning/resource-forecasting");
  return { success: true, id: row.id };
}
