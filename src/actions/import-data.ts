"use server";

import { db } from "@/db";
import { materials, suppliers, developers, subcontractors } from "@/db/schema";
import { revalidatePath } from "next/cache";

export type ImportRow = Record<string, string>;
export type ImportResult = { imported: number; skipped: number; errors: string[] };

// ─── Materials ──────────────────────────────────────────────────────────────

export async function importMaterials(rows: ImportRow[]): Promise<ImportResult> {
  let imported = 0, skipped = 0;
  const errors: string[] = [];

  for (const row of rows) {
    const code = row["code"]?.trim();
    const name = row["name"]?.trim();
    const unit = row["unit"]?.trim();
    const adminPrice = row["admin_price"]?.trim() || row["adminPrice"]?.trim();

    if (!code || !name || !unit || !adminPrice) {
      errors.push(`Row skipped — missing required field(s): code="${code}", name="${name}", unit="${unit}", admin_price="${adminPrice}"`);
      skipped++;
      continue;
    }
    if (isNaN(Number(adminPrice))) {
      errors.push(`Row skipped — admin_price must be a number (got "${adminPrice}" for code "${code}")`);
      skipped++;
      continue;
    }

    try {
      await db.insert(materials).values({
        code,
        name,
        unit,
        category:   row["category"]?.trim() || null,
        adminPrice: String(Number(adminPrice)),
        minimumQuantity: row["minimum_quantity"] || row["minimumQuantity"] ? String(Number(row["minimum_quantity"] || row["minimumQuantity"])) : null,
      }).onConflictDoNothing();
      imported++;
    } catch {
      errors.push(`Row failed for code "${code}" — duplicate or DB error.`);
      skipped++;
    }
  }

  revalidatePath("/master-list/materials");
  return { imported, skipped, errors };
}

// ─── Vendors / Suppliers ────────────────────────────────────────────────────

export async function importVendors(rows: ImportRow[]): Promise<ImportResult> {
  let imported = 0, skipped = 0;
  const errors: string[] = [];

  for (const row of rows) {
    const name = row["name"]?.trim();
    if (!name) { errors.push("Row skipped — name is required."); skipped++; continue; }

    try {
      await db.insert(suppliers).values({
        name,
        contactPerson: row["contact_person"]?.trim() || null,
        phone:         row["phone"]?.trim() || null,
        email:         row["email"]?.trim() || null,
        address:       row["address"]?.trim() || null,
      });
      imported++;
    } catch {
      errors.push(`Row failed for vendor "${name}" — DB error.`);
      skipped++;
    }
  }

  revalidatePath("/master-list/vendors");
  return { imported, skipped, errors };
}

// ─── Developers ─────────────────────────────────────────────────────────────

export async function importDevelopers(rows: ImportRow[]): Promise<ImportResult> {
  let imported = 0, skipped = 0;
  const errors: string[] = [];

  for (const row of rows) {
    const name = row["name"]?.trim();
    if (!name) { errors.push("Row skipped — name is required."); skipped++; continue; }

    try {
      await db.insert(developers).values({ name });
      imported++;
    } catch {
      errors.push(`Row failed for developer "${name}" — DB error.`);
      skipped++;
    }
  }

  revalidatePath("/master-list/developers");
  return { imported, skipped, errors };
}

// ─── Subcontractors ─────────────────────────────────────────────────────────

export async function importSubcontractors(rows: ImportRow[]): Promise<ImportResult> {
  let imported = 0, skipped = 0;
  const errors: string[] = [];

  const validTrades = ["STRUCTURAL", "ARCHITECTURAL", "BOTH"];

  for (const row of rows) {
    const code = row["code"]?.trim();
    const name = row["name"]?.trim();
    const rawTrades = (row["trade_types"] || row["tradeTypes"] || "BOTH").trim().toUpperCase();

    if (!code || !name) {
      errors.push(`Row skipped — code and name are required (code="${code}", name="${name}").`);
      skipped++;
      continue;
    }

    const tradeTypes = rawTrades.split(/[,;|]/).map((t: string) => t.trim()).filter((t: string) => validTrades.includes(t)) as Array<"STRUCTURAL" | "ARCHITECTURAL" | "BOTH">;
    if (tradeTypes.length === 0) {
      errors.push(`Row skipped — invalid trade_types "${rawTrades}" for code "${code}". Use STRUCTURAL, ARCHITECTURAL, or BOTH.`);
      skipped++;
      continue;
    }

    try {
      await db.insert(subcontractors).values({
        code,
        name,
        tradeTypes,
        defaultMaxActiveUnits: Number(row["default_max_active_units"] || row["defaultMaxActiveUnits"] || "10"),
        manpowerBenchmark:     String(Number(row["manpower_benchmark"] || row["manpowerBenchmark"] || "1.00")),
      }).onConflictDoNothing();
      imported++;
    } catch {
      errors.push(`Row failed for code "${code}" — duplicate or DB error.`);
      skipped++;
    }
  }

  revalidatePath("/master-list/subcontractors");
  return { imported, skipped, errors };
}
