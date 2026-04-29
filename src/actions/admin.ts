"use server";

import { db } from "@/db";
import {
  users, departments, materials, materialPriceHistory,
  suppliers, activityDefinitions, milestoneDefinitions,
  bomStandards, developerRateCards,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { getAuthUser } from "@/lib/supabase-server";

type SimpleResult = { success: boolean; error?: string };

// ─── USERS ────────────────────────────────────────────────────────────────────

export async function createUser(input: {
  email: string;
  fullName: string;
  role: string;
  deptId?: string;
}): Promise<{ success: boolean; id?: string; error?: string }> {
  const actor = await getAuthUser();
  if (!actor) return { success: false, error: "Not authenticated." };

  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, input.email));
  if (existing.length > 0) return { success: false, error: "A user with this email already exists." };

  const [inserted] = await db
    .insert(users)
    .values({
      email:    input.email,
      fullName: input.fullName,
      role:     input.role,
      deptId:   input.deptId || null,
      isActive: true,
    })
    .returning({ id: users.id });

  return { success: true, id: inserted.id };
}

export async function updateUser(
  id: string,
  input: { fullName?: string; role?: string; deptId?: string | null },
): Promise<SimpleResult> {
  const actor = await getAuthUser();
  if (!actor) return { success: false, error: "Not authenticated." };

  await db
    .update(users)
    .set({
      ...(input.fullName !== undefined && { fullName: input.fullName }),
      ...(input.role     !== undefined && { role:     input.role }),
      ...(input.deptId   !== undefined && { deptId:   input.deptId }),
      updatedAt: new Date(),
    })
    .where(eq(users.id, id));

  return { success: true };
}

export async function deactivateUser(id: string): Promise<SimpleResult> {
  const actor = await getAuthUser();
  if (!actor) return { success: false, error: "Not authenticated." };

  await db.update(users).set({ isActive: false, updatedAt: new Date() }).where(eq(users.id, id));
  return { success: true };
}

export async function activateUser(id: string): Promise<SimpleResult> {
  const actor = await getAuthUser();
  if (!actor) return { success: false, error: "Not authenticated." };

  await db.update(users).set({ isActive: true, updatedAt: new Date() }).where(eq(users.id, id));
  return { success: true };
}

// ─── MATERIALS ────────────────────────────────────────────────────────────────

export async function createMaterial(input: {
  code: string;
  name: string;
  unit: string;
  category: string;
  adminPrice: string;
  preferredSupplierId?: string;
}): Promise<{ success: boolean; id?: string; error?: string }> {
  const actor = await getAuthUser();
  if (!actor) return { success: false, error: "Not authenticated." };

  const existing = await db.select({ id: materials.id }).from(materials).where(eq(materials.code, input.code));
  if (existing.length > 0) return { success: false, error: "A material with this code already exists." };

  const [inserted] = await db
    .insert(materials)
    .values({
      code:                input.code,
      name:                input.name,
      unit:                input.unit,
      category:            input.category,
      adminPrice:          input.adminPrice,
      preferredSupplierId: input.preferredSupplierId || null,
      priceVersion:        1,
      isActive:            true,
    })
    .returning({ id: materials.id });

  return { success: true, id: inserted.id };
}

export async function updateMaterialPrice(
  id: string,
  newPrice: string,
  effectiveFrom: string,
): Promise<SimpleResult> {
  const actor = await getAuthUser();
  if (!actor) return { success: false, error: "Not authenticated." };

  const [mat] = await db.select().from(materials).where(eq(materials.id, id));
  if (!mat) return { success: false, error: "Material not found." };

  const nextVersion = mat.priceVersion + 1;

  await db.insert(materialPriceHistory).values({
    materialId:    id,
    oldPrice:      mat.adminPrice,
    newPrice:      newPrice,
    version:       nextVersion,
    changedBy:     actor.id,
    effectiveFrom: effectiveFrom,
  });

  await db.update(materials).set({ adminPrice: newPrice, priceVersion: nextVersion }).where(eq(materials.id, id));

  return { success: true };
}

export async function deactivateMaterial(id: string): Promise<SimpleResult> {
  const actor = await getAuthUser();
  if (!actor) return { success: false, error: "Not authenticated." };

  await db.update(materials).set({ isActive: false }).where(eq(materials.id, id));
  return { success: true };
}

// ─── SUPPLIERS ────────────────────────────────────────────────────────────────

export async function createSupplier(input: {
  name: string;
}): Promise<{ success: boolean; id?: string; error?: string }> {
  const actor = await getAuthUser();
  if (!actor) return { success: false, error: "Not authenticated." };

  const [inserted] = await db
    .insert(suppliers)
    .values({ name: input.name, isActive: true })
    .returning({ id: suppliers.id });

  return { success: true, id: inserted.id };
}

export async function toggleSupplier(id: string, active: boolean): Promise<SimpleResult> {
  const actor = await getAuthUser();
  if (!actor) return { success: false, error: "Not authenticated." };

  await db.update(suppliers).set({ isActive: active }).where(eq(suppliers.id, id));
  return { success: true };
}
