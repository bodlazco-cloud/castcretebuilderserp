/**
 * Migration runner — executes all SQL files in db/migrations/ then db/rls/
 * in filename order against your Supabase database.
 *
 * Usage:
 *   npx tsx scripts/migrate.ts
 *
 * Requires DATABASE_URL in your .env.local (use the direct connection URL,
 * NOT the transaction pooler, for DDL migrations):
 *   postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres
 */

import postgres from "postgres";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import { config } from "dotenv";

// Load .env.local
config({ path: ".env.local" });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("❌  DATABASE_URL is not set in .env.local");
  process.exit(1);
}

// Use direct connection (not pooler) for DDL
const sql = postgres(DATABASE_URL, { max: 1 });

async function runMigrations() {
  const migrationDirs = [
    join(process.cwd(), "db", "migrations"),
    join(process.cwd(), "db", "rls"),
  ];

  for (const dir of migrationDirs) {
    let files: string[];
    try {
      files = readdirSync(dir)
        .filter((f) => f.endsWith(".sql"))
        .sort();
    } catch {
      console.warn(`⚠️  Directory not found, skipping: ${dir}`);
      continue;
    }

    for (const file of files) {
      const filePath = join(dir, file);
      const sqlText  = readFileSync(filePath, "utf-8");

      console.log(`▶  Running ${file}...`);
      try {
        await sql.unsafe(sqlText);
        console.log(`✓  ${file}`);
      } catch (err: any) {
        // Ignore "already exists" errors so the script is idempotent
        if (
          err.message?.includes("already exists") ||
          err.message?.includes("duplicate_object")
        ) {
          console.log(`⚡ ${file} — skipped (already applied)`);
        } else {
          console.error(`❌ ${file} failed:`, err.message);
          await sql.end();
          process.exit(1);
        }
      }
    }
  }

  console.log("\n✅  All migrations complete.");
  await sql.end();
}

runMigrations();
