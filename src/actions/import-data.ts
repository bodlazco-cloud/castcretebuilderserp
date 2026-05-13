"use server";

import { db } from "@/db";
import { materials, suppliers, developers, subcontractors } from "@/db/schema";
import { revalidatePath } from "next/cache";

export type ImportRow = Record<string, unknown>;
export type ImportResult = { imported: number; skipped: number; errors: string[] };

function str(v: unknown): string {
  if (v == null) return "";
  return String(v).trim();
}

// ─── Materials ──────────────────────────────────────────────────────────────

export async function importMaterials(rows: ImportRow[]): Promise<ImportResult> {
  let imported = 0, skipped = 0;
  const errors: string[] = [];

  for (const row of rows) {
    try {
      const code       = str(row["code"]);
      const name       = str(row["name"]);
      const unit       = str(row["unit"]);
      const adminPrice = str(row["admin_price"]) || str(row["adminPrice"]);

      if (!code || !name || !unit || !adminPrice) {
        errors.push(`Row skipped — missing required field(s): code="${code}", name="${name}", unit="${unit}", admin_price="${adminPrice}"`);
        skipped++; continue;
      }
      if (isNaN(Number(adminPrice))) {
        errors.push(`Row skipped — admin_price must be a number (got "${adminPrice}" for code "${code}")`);
        skipped++; continue;
      }

      const minQtyRaw = str(row["minimum_quantity"]) || str(row["minimumQuantity"]);

      await db.insert(materials).values({
        code,
        name,
        unit,
        category:        str(row["category"]) || null,
        adminPrice:      String(Number(adminPrice)),
        minimumQuantity: minQtyRaw ? String(Number(minQtyRaw)) : null,
      }).onConflictDoNothing();
      imported++;
    } catch (e) {
      errors.push(`Row failed — ${e instanceof Error ? e.message : "DB error"}.`);
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
    try {
      const name = str(row["name"]);
      if (!name) { errors.push("Row skipped — name is required."); skipped++; continue; }

      await db.insert(suppliers).values({
        name,
        contactPerson: str(row["contact_person"]) || null,
        phone:         str(row["phone"])          || null,
        email:         str(row["email"])          || null,
        address:       str(row["address"])        || null,
      });
      imported++;
    } catch (e) {
      errors.push(`Row failed — ${e instanceof Error ? e.message : "DB error"}.`);
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
    try {
      const name = str(row["name"]);
      if (!name) { errors.push("Row skipped — name is required."); skipped++; continue; }

      await db.insert(developers).values({ name });
      imported++;
    } catch (e) {
      errors.push(`Row failed — ${e instanceof Error ? e.message : "DB error"}.`);
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
    try {
      const code      = str(row["code"]);
      const name      = str(row["name"]);
      const rawTrades = (str(row["trade_types"]) || str(row["tradeTypes"]) || "BOTH").toUpperCase();

      if (!code || !name) {
        errors.push(`Row skipped — code and name are required (code="${code}", name="${name}").`);
        skipped++; continue;
      }

      const tradeTypes = rawTrades.split(/[,;|]/).map((t) => t.trim()).filter((t) => validTrades.includes(t)) as Array<"STRUCTURAL" | "ARCHITECTURAL" | "BOTH">;
      if (tradeTypes.length === 0) {
        errors.push(`Row skipped — invalid trade_types "${rawTrades}" for code "${code}". Use STRUCTURAL, ARCHITECTURAL, or BOTH.`);
        skipped++; continue;
      }

      const maxUnits  = Number(str(row["default_max_active_units"]) || str(row["defaultMaxActiveUnits"]) || "10");
      const benchmark = String(Number(str(row["manpower_benchmark"]) || str(row["manpowerBenchmark"]) || "1.00"));

      await db.insert(subcontractors).values({
        code,
        name,
        tradeTypes,
        defaultMaxActiveUnits: isNaN(maxUnits) ? 10 : maxUnits,
        manpowerBenchmark:     isNaN(Number(benchmark)) ? "1.00" : benchmark,
      }).onConflictDoNothing();
      imported++;
    } catch (e) {
      errors.push(`Row failed — ${e instanceof Error ? e.message : "DB error"}.`);
      skipped++;
    }
  }

  revalidatePath("/master-list/subcontractors");
  return { imported, skipped, errors };
}
