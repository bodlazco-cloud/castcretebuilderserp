"use server";

import { db } from "@/db";
import { bomStandards, activityDefinitions } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { revalidatePath } from "next/cache";

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
