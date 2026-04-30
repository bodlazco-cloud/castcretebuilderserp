import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq, sql } from "drizzle-orm";
import { departments, costCenters, users } from "./schema/core";
import { developers, projects, blocks } from "./schema/projects";
import { suppliers, materials, activityDefinitions, milestoneDefinitions } from "./schema/admin";

const client = postgres(process.env.DATABASE_URL!, { prepare: false });
const db = drizzle(client, { schema: { departments, costCenters, users, developers, projects, blocks, suppliers, materials, activityDefinitions, milestoneDefinitions } });

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

  // ── Suppliers (5 rows) ───────────────────────────────────────────────────
  const supplierRows = await db
    .insert(suppliers)
    .values([
      { name: "Holcim Philippines, Inc.",          isActive: true },
      { name: "Republic Cement Services, Inc.",    isActive: true },
      { name: "Pag-asa Steel Works, Inc.",         isActive: true },
      { name: "Alsons Development & Investment",   isActive: true },
      { name: "GrandBuilders Hardware & Supply",   isActive: true },
    ])
    .returning({ id: suppliers.id, name: suppliers.name });

  const supplierMap = Object.fromEntries(supplierRows.map((s) => [s.name, s.id]));
  console.log(`Inserted ${supplierRows.length} suppliers.`);

  // ── Materials (15 rows, Philippine market prices as of 2025) ────────────
  const materialRows = await db
    .insert(materials)
    .values([
      // ── CEMENT ──────────────────────────────────────────────────────────
      {
        code:               "CEM-OPC-40K",
        name:               "Portland Cement Type I (40 kg bag)",
        unit:               "bag",
        category:           "CEMENT",
        adminPrice:         "285.00",
        preferredSupplierId: supplierMap["Holcim Philippines, Inc."],
      },
      {
        code:               "CEM-OPC-BULK",
        name:               "Portland Cement Type I (bulk, per MT)",
        unit:               "MT",
        category:           "CEMENT",
        adminPrice:         "6800.00",
        preferredSupplierId: supplierMap["Republic Cement Services, Inc."],
      },
      // ── AGGREGATE ───────────────────────────────────────────────────────
      {
        code:               "AGG-SAND-CRS",
        name:               "Coarse Sand (per cu.m.)",
        unit:               "cu.m.",
        category:           "AGGREGATE",
        adminPrice:         "1200.00",
        preferredSupplierId: supplierMap["GrandBuilders Hardware & Supply"],
      },
      {
        code:               "AGG-GRAVEL-34",
        name:               "3/4\" Crushed Gravel (per cu.m.)",
        unit:               "cu.m.",
        category:           "AGGREGATE",
        adminPrice:         "1450.00",
        preferredSupplierId: supplierMap["GrandBuilders Hardware & Supply"],
      },
      {
        code:               "AGG-GRAVEL-12",
        name:               "1/2\" Crushed Gravel (per cu.m.)",
        unit:               "cu.m.",
        category:           "AGGREGATE",
        adminPrice:         "1550.00",
        preferredSupplierId: supplierMap["GrandBuilders Hardware & Supply"],
      },
      // ── REBAR ────────────────────────────────────────────────────────────
      {
        code:               "REBAR-10MM",
        name:               "Deformed Bar 10 mm × 6 m",
        unit:               "pc",
        category:           "REBAR",
        adminPrice:         "320.00",
        preferredSupplierId: supplierMap["Pag-asa Steel Works, Inc."],
      },
      {
        code:               "REBAR-12MM",
        name:               "Deformed Bar 12 mm × 6 m",
        unit:               "pc",
        category:           "REBAR",
        adminPrice:         "465.00",
        preferredSupplierId: supplierMap["Pag-asa Steel Works, Inc."],
      },
      {
        code:               "REBAR-16MM",
        name:               "Deformed Bar 16 mm × 6 m",
        unit:               "pc",
        category:           "REBAR",
        adminPrice:         "820.00",
        preferredSupplierId: supplierMap["Pag-asa Steel Works, Inc."],
      },
      {
        code:               "REBAR-20MM",
        name:               "Deformed Bar 20 mm × 6 m",
        unit:               "pc",
        category:           "REBAR",
        adminPrice:         "1280.00",
        preferredSupplierId: supplierMap["Pag-asa Steel Works, Inc."],
      },
      // ── FORMWORK ─────────────────────────────────────────────────────────
      {
        code:               "FW-PLYWD-34",
        name:               "Marine Plywood 3/4\" (4×8 ft)",
        unit:               "sht",
        category:           "FORMWORK",
        adminPrice:         "1350.00",
        preferredSupplierId: supplierMap["GrandBuilders Hardware & Supply"],
      },
      {
        code:               "FW-PLYWD-12",
        name:               "Marine Plywood 1/2\" (4×8 ft)",
        unit:               "sht",
        category:           "FORMWORK",
        adminPrice:         "980.00",
        preferredSupplierId: supplierMap["GrandBuilders Hardware & Supply"],
      },
      {
        code:               "FW-LUMBER-2X3",
        name:               "Coco Lumber 2\"×3\"×10'",
        unit:               "bd.ft.",
        category:           "FORMWORK",
        adminPrice:         "38.00",
        preferredSupplierId: supplierMap["Alsons Development & Investment"],
      },
      // ── CONCRETE ADMIXTURE ───────────────────────────────────────────────
      {
        code:               "ADM-PLASTICIZER",
        name:               "Concrete Plasticizer / Water Reducer (per L)",
        unit:               "L",
        category:           "ADMIXTURE",
        adminPrice:         "120.00",
        preferredSupplierId: supplierMap["Holcim Philippines, Inc."],
      },
      // ── WIRE ─────────────────────────────────────────────────────────────
      {
        code:               "WIRE-TIENG-16",
        name:               "G.I. Tie Wire #16 (per kg)",
        unit:               "kg",
        category:           "WIRE",
        adminPrice:         "85.00",
        preferredSupplierId: supplierMap["GrandBuilders Hardware & Supply"],
      },
      // ── CURING ───────────────────────────────────────────────────────────
      {
        code:               "CUR-COMPOUND",
        name:               "Concrete Curing Compound (per L)",
        unit:               "L",
        category:           "CURING",
        adminPrice:         "210.00",
        preferredSupplierId: supplierMap["Holcim Philippines, Inc."],
      },
    ])
    .returning({ id: materials.id, code: materials.code });

  console.log(`Inserted ${materialRows.length} materials.`);
  console.log("Chunk 3 seed complete.");

  // ── Activity Definitions (8 per project = 16 rows) ───────────────────────
  // Same activity structure for both residential projects.
  // weightInScopePct sums to 100 within each scope group.
  const activityTemplate = (projectId: string) => [
    // STRUCTURAL — Foundation Works (scope weight split: 40 / 60)
    {
      projectId,
      category:             "STRUCTURAL" as const,
      scopeCode:            "SCO-STR-001",
      scopeName:            "Foundation Works",
      activityCode:         "ACT-STR-001",
      activityName:         "Excavation & Grading",
      standardDurationDays: 15,
      weightInScopePct:     "40.00",
      sequenceOrder:        1,
    },
    {
      projectId,
      category:             "STRUCTURAL" as const,
      scopeCode:            "SCO-STR-001",
      scopeName:            "Foundation Works",
      activityCode:         "ACT-STR-002",
      activityName:         "Footing Reinforcement & Concrete Pouring",
      standardDurationDays: 10,
      weightInScopePct:     "60.00",
      sequenceOrder:        2,
    },
    // STRUCTURAL — Column & Beam Works (55 / 45)
    {
      projectId,
      category:             "STRUCTURAL" as const,
      scopeCode:            "SCO-STR-002",
      scopeName:            "Column & Beam Works",
      activityCode:         "ACT-STR-003",
      activityName:         "Column & Beam Reinforcement",
      standardDurationDays: 8,
      weightInScopePct:     "55.00",
      sequenceOrder:        3,
    },
    {
      projectId,
      category:             "STRUCTURAL" as const,
      scopeCode:            "SCO-STR-002",
      scopeName:            "Column & Beam Works",
      activityCode:         "ACT-STR-004",
      activityName:         "Formwork Installation & Concrete Pouring",
      standardDurationDays: 6,
      weightInScopePct:     "45.00",
      sequenceOrder:        4,
    },
    // STRUCTURAL — Slab Works (100)
    {
      projectId,
      category:             "STRUCTURAL" as const,
      scopeCode:            "SCO-STR-003",
      scopeName:            "Slab Works",
      activityCode:         "ACT-STR-005",
      activityName:         "Slab Reinforcement & Concrete Pouring",
      standardDurationDays: 7,
      weightInScopePct:     "100.00",
      sequenceOrder:        5,
    },
    // ARCHITECTURAL — Masonry Works (100)
    {
      projectId,
      category:             "ARCHITECTURAL" as const,
      scopeCode:            "SCO-ARC-001",
      scopeName:            "Masonry Works",
      activityCode:         "ACT-ARC-001",
      activityName:         "CHB Wall Installation",
      standardDurationDays: 10,
      weightInScopePct:     "100.00",
      sequenceOrder:        6,
    },
    // ARCHITECTURAL — Finishes (100)
    {
      projectId,
      category:             "ARCHITECTURAL" as const,
      scopeCode:            "SCO-ARC-002",
      scopeName:            "Finishes",
      activityCode:         "ACT-ARC-002",
      activityName:         "Plastering & Skim Coat Application",
      standardDurationDays: 8,
      weightInScopePct:     "100.00",
      sequenceOrder:        7,
    },
    // TURNOVER — Punch List (100)
    {
      projectId,
      category:             "TURNOVER" as const,
      scopeCode:            "SCO-TRN-001",
      scopeName:            "Turnover Works",
      activityCode:         "ACT-TRN-001",
      activityName:         "Final Inspection & Punch List Clearance",
      standardDurationDays: 5,
      weightInScopePct:     "100.00",
      sequenceOrder:        8,
    },
  ];

  const actRows = await db
    .insert(activityDefinitions)
    .values([
      ...activityTemplate(projMap["Primavera Residences Phase 1"]!),
      ...activityTemplate(projMap["Verdana Townhomes Cluster A"]!),
    ])
    .returning({ id: activityDefinitions.id, activityCode: activityDefinitions.activityCode });

  console.log(`Inserted ${actRows.length} activity definitions.`);

  // ── Milestone Definitions (4 per project = 8 rows, weights sum to 100 %) ─
  // triggersBilling = true on all four so each completion unlocks an invoice.
  const milestoneTemplate = (projectId: string) => [
    {
      projectId,
      name:            "Foundation Complete",
      category:        "STRUCTURAL" as const,
      sequenceOrder:   1,
      triggersBilling: true,
      weightPct:       "25.00",
    },
    {
      projectId,
      name:            "Structure Topped Out",
      category:        "STRUCTURAL" as const,
      sequenceOrder:   2,
      triggersBilling: true,
      weightPct:       "35.00",
    },
    {
      projectId,
      name:            "Architectural Works Complete",
      category:        "ARCHITECTURAL" as const,
      sequenceOrder:   3,
      triggersBilling: true,
      weightPct:       "25.00",
    },
    {
      projectId,
      name:            "Unit Turnover Accepted",
      category:        "TURNOVER" as const,
      sequenceOrder:   4,
      triggersBilling: true,
      weightPct:       "15.00",
    },
  ];

  const msRows = await db
    .insert(milestoneDefinitions)
    .values([
      ...milestoneTemplate(projMap["Primavera Residences Phase 1"]!),
      ...milestoneTemplate(projMap["Verdana Townhomes Cluster A"]!),
    ])
    .returning({ id: milestoneDefinitions.id, name: milestoneDefinitions.name });

  console.log(`Inserted ${msRows.length} milestone definitions.`);
  console.log("Chunk 4 seed complete.");
  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
