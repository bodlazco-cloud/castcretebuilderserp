import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq, sql } from "drizzle-orm";
import { departments, costCenters, users } from "./schema/core";
import { developers, projects, blocks } from "./schema/projects";

const client = postgres(process.env.DATABASE_URL!, { prepare: false });
const db = drizzle(client, { schema: { departments, costCenters, users, developers, projects, blocks } });

async function main() {
  // Idempotency check — skip if seed data already present
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(departments);

  if (count > 0) {
    console.log(`Seed already applied (${count} departments found). Exiting.`);
    await client.end();
    return;
  }

  // ── Departments (10 rows) ────────────────────────────────────────────────
  const deptRows = await db
    .insert(departments)
    .values([
      { code: "ADMIN",         name: "Administration" },
      { code: "BOD",           name: "Board of Directors" },
      { code: "PLANNING",      name: "Planning & Engineering" },
      { code: "AUDIT",         name: "Internal Audit" },
      { code: "CONSTRUCTION",  name: "Construction Operations" },
      { code: "PROCUREMENT",   name: "Procurement & Logistics" },
      { code: "BATCHING",      name: "Batching Plant" },
      { code: "MOTORPOOL",     name: "Motor Pool & Equipment" },
      { code: "FINANCE",       name: "Finance & Accounting" },
      { code: "HR",            name: "Human Resources & Payroll" },
    ])
    .returning({ id: departments.id, code: departments.code });

  const deptMap = Object.fromEntries(deptRows.map((d) => [d.code, d.id]));
  console.log(`Inserted ${deptRows.length} departments.`);

  // ── Cost Centers (5 rows) ────────────────────────────────────────────────
  const ccRows = await db
    .insert(costCenters)
    .values([
      {
        code:   "HQ-ADMIN",
        name:   "Head Office — Administration",
        deptId: deptMap["ADMIN"]!,
        type:   "HQ",
      },
      {
        code:   "HQ-FINANCE",
        name:   "Head Office — Finance",
        deptId: deptMap["FINANCE"]!,
        type:   "HQ",
      },
      {
        code:   "CC-BATCHING",
        name:   "Batching Plant Operations",
        deptId: deptMap["BATCHING"]!,
        type:   "BATCHING",
      },
      {
        code:   "CC-FLEET",
        name:   "Motor Pool & Fleet",
        deptId: deptMap["MOTORPOOL"]!,
        type:   "FLEET",
      },
      {
        code:   "CC-PROJECT-DEFAULT",
        name:   "Default Project Cost Center",
        deptId: deptMap["PLANNING"]!,
        type:   "PROJECT",
      },
    ])
    .returning({ id: costCenters.id, code: costCenters.code });

  console.log(`Inserted ${ccRows.length} cost centers.`);

  // ── Users (10 rows) ──────────────────────────────────────────────────────
  const userRows = await db
    .insert(users)
    .values([
      {
        email:    "admin@castcrete.ph",
        fullName: "System Administrator",
        deptId:   deptMap["ADMIN"],
        role:     "ADMIN",
      },
      {
        email:    "bod@castcrete.ph",
        fullName: "Board Director",
        deptId:   deptMap["BOD"],
        role:     "BOD",
      },
      {
        email:    "planner@castcrete.ph",
        fullName: "Maria Santos",
        deptId:   deptMap["PLANNING"],
        role:     "PLANNER",
      },
      {
        email:    "auditor@castcrete.ph",
        fullName: "Jose Reyes",
        deptId:   deptMap["AUDIT"],
        role:     "AUDITOR",
      },
      {
        email:    "site.engineer@castcrete.ph",
        fullName: "Carlos Dela Cruz",
        deptId:   deptMap["CONSTRUCTION"],
        role:     "SITE_ENGINEER",
      },
      {
        email:    "procurement@castcrete.ph",
        fullName: "Ana Lim",
        deptId:   deptMap["PROCUREMENT"],
        role:     "PROCUREMENT_OFFICER",
      },
      {
        email:    "batching@castcrete.ph",
        fullName: "Ramon Flores",
        deptId:   deptMap["BATCHING"],
        role:     "BATCHING_SUPERVISOR",
      },
      {
        email:    "motorpool@castcrete.ph",
        fullName: "Eduardo Cruz",
        deptId:   deptMap["MOTORPOOL"],
        role:     "FLEET_MANAGER",
      },
      {
        email:    "finance@castcrete.ph",
        fullName: "Patricia Ocampo",
        deptId:   deptMap["FINANCE"],
        role:     "FINANCE_OFFICER",
      },
      {
        email:    "hr@castcrete.ph",
        fullName: "Rosario Mendoza",
        deptId:   deptMap["HR"],
        role:     "HR_OFFICER",
      },
    ])
    .returning({ id: users.id, email: users.email });

  console.log(`Inserted ${userRows.length} users.`);
  console.log("Chunk 1 seed complete.");

  // ── Developers (2 rows) ──────────────────────────────────────────────────
  const devRows = await db
    .insert(developers)
    .values([
      { name: "Primavera Land Corporation", isActive: true },
      { name: "Verdana Homes Realty, Inc.",  isActive: true },
    ])
    .returning({ id: developers.id, name: developers.name });

  const devMap = Object.fromEntries(devRows.map((d) => [d.name, d.id]));
  console.log(`Inserted ${devRows.length} developers.`);

  // ── Projects (2 rows, ACTIVE) ────────────────────────────────────────────
  // Contract values are realistic PHP mid-rise residential project figures.
  const projectRows = await db
    .insert(projects)
    .values([
      {
        name:                   "Primavera Residences Phase 1",
        developerId:            devMap["Primavera Land Corporation"]!,
        contractValue:          "425000000.00",   // PHP 425 M
        developerAdvance:       "63750000.00",    // 15 % mobilisation advance
        advanceRecovered:       "12750000.00",    // partial recovery
        targetUnitsPerMonth:    120,
        minOperatingCashBuffer: "5000000.00",
        status:                 "ACTIVE",
        startDate:              "2024-01-15",
        endDate:                "2026-06-30",
      },
      {
        name:                   "Verdana Townhomes Cluster A",
        developerId:            devMap["Verdana Homes Realty, Inc."]!,
        contractValue:          "218500000.00",   // PHP 218.5 M
        developerAdvance:       "32775000.00",    // 15 % mobilisation advance
        advanceRecovered:       "0.00",
        targetUnitsPerMonth:    80,
        minOperatingCashBuffer: "3000000.00",
        status:                 "ACTIVE",
        startDate:              "2024-07-01",
        endDate:                "2026-12-31",
      },
    ])
    .returning({ id: projects.id, name: projects.name });

  const projMap = Object.fromEntries(projectRows.map((p) => [p.name, p.id]));
  console.log(`Inserted ${projectRows.length} projects.`);

  // ── Blocks (2 per project = 4 rows) ─────────────────────────────────────
  const blockRows = await db
    .insert(blocks)
    .values([
      {
        projectId: projMap["Primavera Residences Phase 1"]!,
        blockName:  "Block A",
        totalLots:  48,
      },
      {
        projectId: projMap["Primavera Residences Phase 1"]!,
        blockName:  "Block B",
        totalLots:  52,
      },
      {
        projectId: projMap["Verdana Townhomes Cluster A"]!,
        blockName:  "Block 1",
        totalLots:  40,
      },
      {
        projectId: projMap["Verdana Townhomes Cluster A"]!,
        blockName:  "Block 2",
        totalLots:  36,
      },
    ])
    .returning({ id: blocks.id, blockName: blocks.blockName });

  console.log(`Inserted ${blockRows.length} blocks.`);
  console.log("Chunk 2 seed complete.");
  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
