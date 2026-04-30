import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq, sql } from "drizzle-orm";
import { departments, costCenters, users } from "./schema/core";
import { developers, projects, blocks } from "./schema/projects";
import { suppliers, materials, activityDefinitions, milestoneDefinitions, developerRateCards, bomStandards } from "./schema/admin";
import { subcontractors, subcontractorCapacityMatrix } from "./schema/subcontractors";
import { projectUnits, unitMilestones } from "./schema/units";
import { employees } from "./schema/hr";
import { equipment } from "./schema/motorpool";
import { bankAccounts, bankTransactions, requestsForPayment } from "./schema/banking";

const client = postgres(process.env.DATABASE_URL!, { prepare: false });
const db = drizzle(client, { schema: { departments, costCenters, users, developers, projects, blocks, suppliers, materials, activityDefinitions, milestoneDefinitions, developerRateCards, bomStandards, subcontractors, subcontractorCapacityMatrix, projectUnits, unitMilestones, employees, equipment, bankAccounts, bankTransactions, requestsForPayment } });

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
    .returning({ id: blocks.id, blockName: blocks.blockName, projectId: blocks.projectId });

  // blockMap key: "<projectId>::<blockName>" → blockId
  const blockMap = Object.fromEntries(blockRows.map((b) => [`${b.projectId}::${b.blockName}`, b.id]));

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
    .returning({ id: activityDefinitions.id, activityCode: activityDefinitions.activityCode, projectId: activityDefinitions.projectId });

  // actMap key: "<projectId>::<activityCode>" → activityDef UUID
  const actMap = Object.fromEntries(actRows.map((a) => [`${a.projectId}::${a.activityCode}`, a.id]));
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
    .returning({ id: milestoneDefinitions.id, name: milestoneDefinitions.name, projectId: milestoneDefinitions.projectId });

  // msMap key: "<projectId>::<milestoneName>" → milestoneDefId
  const msMap = Object.fromEntries(msRows.map((m) => [`${m.projectId}::${m.name}`, m.id]));

  console.log(`Inserted ${msRows.length} milestone definitions.`);
  console.log("Chunk 4 seed complete.");

  // materialMap key: material code → UUID
  const materialMap = Object.fromEntries(materialRows.map((m) => [m.code, m.id]));

  // ── Developer Rate Cards (1 per project × activity = 16 rows) ────────────
  // grossRatePerUnit is the PHP amount Castcrete earns from the developer per
  // completed housing unit for that activity.
  // Primavera (PHP 425 M, higher spec) carries ~20 % premium over Verdana.
  const rateTemplate = (projectId: string, rates: Record<string, string>) =>
    Object.entries(rates).map(([activityCode, grossRatePerUnit]) => ({
      projectId,
      activityDefId:    actMap[`${projectId}::${activityCode}`]!,
      grossRatePerUnit,
      retentionPct:     "0.1000",
      dpRecoupmentPct:  "0.1000",
      taxPct:           "0.0000",
    }));

  const primaveraRates: Record<string, string> = {
    "ACT-STR-001": "12000.00",   // Excavation & Grading
    "ACT-STR-002": "35000.00",   // Footing Reinforcement & Pouring
    "ACT-STR-003": "28000.00",   // Column & Beam Reinforcement
    "ACT-STR-004": "24000.00",   // Formwork & Concrete Pouring
    "ACT-STR-005": "30000.00",   // Slab Reinforcement & Pouring
    "ACT-ARC-001": "18000.00",   // CHB Wall Installation
    "ACT-ARC-002": "14500.00",   // Plastering & Skim Coat
    "ACT-TRN-001":  "6500.00",   // Final Inspection & Punch List
  };

  const verdanaRates: Record<string, string> = {
    "ACT-STR-001":  "9500.00",
    "ACT-STR-002": "28000.00",
    "ACT-STR-003": "22000.00",
    "ACT-STR-004": "19000.00",
    "ACT-STR-005": "24000.00",
    "ACT-ARC-001": "14500.00",
    "ACT-ARC-002": "11500.00",
    "ACT-TRN-001":  "5200.00",
  };

  const rcRows = await db
    .insert(developerRateCards)
    .values([
      ...rateTemplate(projMap["Primavera Residences Phase 1"]!, primaveraRates),
      ...rateTemplate(projMap["Verdana Townhomes Cluster A"]!,   verdanaRates),
    ])
    .returning({ id: developerRateCards.id });

  console.log(`Inserted ${rcRows.length} developer rate cards.`);

  // ── BOM Standards (key materials for structural activities) ──────────────
  // Quantities are per housing unit, REG type, model "2BR-44SQM".
  // Covers the three most material-intensive structural activities for both
  // projects (same construction method → same BOM quantities).
  type BomRow = {
    activityDefId:   string;
    unitModel:       string;
    unitType:        "BEG" | "REG" | "END";
    materialId:      string;
    quantityPerUnit: string;
  };

  const bomForActivity = (activityCode: string, projectId: string, rows: Omit<BomRow, "activityDefId">[]): BomRow[] =>
    rows.map((r) => ({ activityDefId: actMap[`${projectId}::${activityCode}`]!, ...r }));

  const buildBoms = (projectId: string): BomRow[] => [
    // ACT-STR-002 — Footing Reinforcement & Concrete Pouring
    ...bomForActivity("ACT-STR-002", projectId, [
      { unitModel: "2BR-44SQM", unitType: "REG", materialId: materialMap["CEM-OPC-40K"]!,    quantityPerUnit: "25.0000" },
      { unitModel: "2BR-44SQM", unitType: "REG", materialId: materialMap["AGG-GRAVEL-34"]!,  quantityPerUnit: "3.5000"  },
      { unitModel: "2BR-44SQM", unitType: "REG", materialId: materialMap["AGG-SAND-CRS"]!,   quantityPerUnit: "2.5000"  },
      { unitModel: "2BR-44SQM", unitType: "REG", materialId: materialMap["REBAR-16MM"]!,     quantityPerUnit: "18.0000" },
      { unitModel: "2BR-44SQM", unitType: "REG", materialId: materialMap["REBAR-20MM"]!,     quantityPerUnit: "12.0000" },
      { unitModel: "2BR-44SQM", unitType: "REG", materialId: materialMap["WIRE-TIENG-16"]!,  quantityPerUnit: "6.0000"  },
    ]),
    // ACT-STR-003 — Column & Beam Reinforcement
    ...bomForActivity("ACT-STR-003", projectId, [
      { unitModel: "2BR-44SQM", unitType: "REG", materialId: materialMap["REBAR-12MM"]!,     quantityPerUnit: "24.0000" },
      { unitModel: "2BR-44SQM", unitType: "REG", materialId: materialMap["REBAR-16MM"]!,     quantityPerUnit: "16.0000" },
      { unitModel: "2BR-44SQM", unitType: "REG", materialId: materialMap["WIRE-TIENG-16"]!,  quantityPerUnit: "8.0000"  },
    ]),
    // ACT-STR-004 — Formwork Installation & Concrete Pouring
    ...bomForActivity("ACT-STR-004", projectId, [
      { unitModel: "2BR-44SQM", unitType: "REG", materialId: materialMap["FW-PLYWD-34"]!,    quantityPerUnit: "12.0000" },
      { unitModel: "2BR-44SQM", unitType: "REG", materialId: materialMap["FW-LUMBER-2X3"]!,  quantityPerUnit: "80.0000" },
      { unitModel: "2BR-44SQM", unitType: "REG", materialId: materialMap["CEM-OPC-40K"]!,    quantityPerUnit: "20.0000" },
      { unitModel: "2BR-44SQM", unitType: "REG", materialId: materialMap["AGG-GRAVEL-34"]!,  quantityPerUnit: "2.8000"  },
      { unitModel: "2BR-44SQM", unitType: "REG", materialId: materialMap["AGG-SAND-CRS"]!,   quantityPerUnit: "2.0000"  },
    ]),
    // ACT-STR-005 — Slab Reinforcement & Concrete Pouring
    ...bomForActivity("ACT-STR-005", projectId, [
      { unitModel: "2BR-44SQM", unitType: "REG", materialId: materialMap["REBAR-10MM"]!,     quantityPerUnit: "30.0000" },
      { unitModel: "2BR-44SQM", unitType: "REG", materialId: materialMap["REBAR-12MM"]!,     quantityPerUnit: "16.0000" },
      { unitModel: "2BR-44SQM", unitType: "REG", materialId: materialMap["CEM-OPC-40K"]!,    quantityPerUnit: "18.0000" },
      { unitModel: "2BR-44SQM", unitType: "REG", materialId: materialMap["AGG-GRAVEL-12"]!,  quantityPerUnit: "2.5000"  },
      { unitModel: "2BR-44SQM", unitType: "REG", materialId: materialMap["AGG-SAND-CRS"]!,   quantityPerUnit: "1.8000"  },
      { unitModel: "2BR-44SQM", unitType: "REG", materialId: materialMap["ADM-PLASTICIZER"]!,quantityPerUnit: "4.5000"  },
      { unitModel: "2BR-44SQM", unitType: "REG", materialId: materialMap["CUR-COMPOUND"]!,   quantityPerUnit: "3.0000"  },
    ]),
  ];

  const bomRows = await db
    .insert(bomStandards)
    .values([
      ...buildBoms(projMap["Primavera Residences Phase 1"]!),
      ...buildBoms(projMap["Verdana Townhomes Cluster A"]!),
    ])
    .returning({ id: bomStandards.id });

  console.log(`Inserted ${bomRows.length} BOM standards.`);
  console.log("Chunk 5 seed complete.");

  // ── Subcontractors (3 firms) ─────────────────────────────────────────────
  const subconRows = await db
    .insert(subcontractors)
    .values([
      {
        code:                 "RSC-001",
        name:                 "Reyes Structural Construction",
        tradeTypes:           ["STRUCTURAL"],
        defaultMaxActiveUnits: 40,
        manpowerBenchmark:    "8.50",
        performanceGrade:     "A",
        performanceScore:     "96.50",
      },
      {
        code:                 "AAB-001",
        name:                 "Aguilar Architectural Builders",
        tradeTypes:           ["ARCHITECTURAL"],
        defaultMaxActiveUnits: 35,
        manpowerBenchmark:    "6.00",
        performanceGrade:     "A",
        performanceScore:     "94.00",
      },
      {
        code:                 "PGC-001",
        name:                 "Philippine General Contractors, Inc.",
        tradeTypes:           ["BOTH"],
        defaultMaxActiveUnits: 55,
        manpowerBenchmark:    "12.00",
        performanceGrade:     "B",
        performanceScore:     "82.00",
      },
    ])
    .returning({ id: subcontractors.id, code: subcontractors.code });

  const subconMap = Object.fromEntries(subconRows.map((s) => [s.code, s.id]));
  console.log(`Inserted ${subconRows.length} subcontractors.`);

  // ── Subcontractor Capacity Matrix (per subcon × project) ─────────────────
  // RSC-001 and AAB-001 each get one row per project (single work type).
  // PGC-001 is split into STRUCTURAL and ARCHITECTURAL rows per project
  // since it covers both trades, giving 8 rows total.
  const capRows = await db
    .insert(subcontractorCapacityMatrix)
    .values([
      // RSC-001 — Structural only
      {
        subconId:       subconMap["RSC-001"]!,
        projectId:      projMap["Primavera Residences Phase 1"]!,
        unitModel:      "2BR-44SQM",
        workType:       "STRUCTURAL" as const,
        ratedCapacity:  40,
        capacityWeight: "1.00",
      },
      {
        subconId:       subconMap["RSC-001"]!,
        projectId:      projMap["Verdana Townhomes Cluster A"]!,
        unitModel:      "2BR-44SQM",
        workType:       "STRUCTURAL" as const,
        ratedCapacity:  30,
        capacityWeight: "1.00",
      },
      // AAB-001 — Architectural only
      {
        subconId:       subconMap["AAB-001"]!,
        projectId:      projMap["Primavera Residences Phase 1"]!,
        unitModel:      "2BR-44SQM",
        workType:       "ARCHITECTURAL" as const,
        ratedCapacity:  35,
        capacityWeight: "1.00",
      },
      {
        subconId:       subconMap["AAB-001"]!,
        projectId:      projMap["Verdana Townhomes Cluster A"]!,
        unitModel:      "2BR-44SQM",
        workType:       "ARCHITECTURAL" as const,
        ratedCapacity:  25,
        capacityWeight: "1.00",
      },
      // PGC-001 — Both trades, split into separate rows per trade per project
      {
        subconId:       subconMap["PGC-001"]!,
        projectId:      projMap["Primavera Residences Phase 1"]!,
        unitModel:      "2BR-44SQM",
        workType:       "STRUCTURAL" as const,
        ratedCapacity:  30,
        capacityWeight: "0.90",
      },
      {
        subconId:       subconMap["PGC-001"]!,
        projectId:      projMap["Primavera Residences Phase 1"]!,
        unitModel:      "2BR-44SQM",
        workType:       "ARCHITECTURAL" as const,
        ratedCapacity:  25,
        capacityWeight: "0.90",
      },
      {
        subconId:       subconMap["PGC-001"]!,
        projectId:      projMap["Verdana Townhomes Cluster A"]!,
        unitModel:      "2BR-44SQM",
        workType:       "STRUCTURAL" as const,
        ratedCapacity:  25,
        capacityWeight: "0.90",
      },
      {
        subconId:       subconMap["PGC-001"]!,
        projectId:      projMap["Verdana Townhomes Cluster A"]!,
        unitModel:      "2BR-44SQM",
        workType:       "ARCHITECTURAL" as const,
        ratedCapacity:  20,
        capacityWeight: "0.90",
      },
    ])
    .returning({ id: subcontractorCapacityMatrix.id });

  console.log(`Inserted ${capRows.length} capacity matrix rows.`);
  console.log("Chunk 6 seed complete.");

  // ── Project Units (6 per block × 4 blocks = 24 rows) ────────────────────
  // Lot sequence: position 1 = BEG type, 2-5 = REG, 6 = END (matches BOM unitType).
  // unitCode is globally unique: <PROJECT_PREFIX>-<BLOCK_ABBR>-<LOT_SEQ>.
  type UnitSeed = {
    projectId: string;
    blockId:   string;
    lotNumber: string;
    unitCode:  string;
    unitModel: string;
  };

  const unitsForBlock = (
    projectId: string,
    blockKey:  string,        // e.g. "Block A"
    prefix:    string,        // e.g. "PRM-A"
  ): UnitSeed[] =>
    Array.from({ length: 6 }, (_, i) => {
      const seq = String(i + 1).padStart(3, "0");
      return {
        projectId,
        blockId:   blockMap[`${projectId}::${blockKey}`]!,
        lotNumber: `LOT-${seq}`,
        unitCode:  `${prefix}-${seq}`,
        unitModel: "2BR-44SQM",
      };
    });

  const primId = projMap["Primavera Residences Phase 1"]!;
  const verdId = projMap["Verdana Townhomes Cluster A"]!;

  const unitValues: UnitSeed[] = [
    ...unitsForBlock(primId, "Block A", "PRM-A"),
    ...unitsForBlock(primId, "Block B", "PRM-B"),
    ...unitsForBlock(verdId, "Block 1", "VRD-1"),
    ...unitsForBlock(verdId, "Block 2", "VRD-2"),
  ];

  const unitRows = await db
    .insert(projectUnits)
    .values(unitValues)
    .returning({ id: projectUnits.id, projectId: projectUnits.projectId });

  console.log(`Inserted ${unitRows.length} project units.`);

  // ── Unit Milestones (24 units × 4 milestones = 96 rows) ─────────────────
  // Every unit starts with all four milestones in PENDING status.
  // milestoneDefId is resolved from msMap keyed by projectId + milestone name.
  const milestoneNames = [
    "Foundation Complete",
    "Structure Topped Out",
    "Architectural Works Complete",
    "Unit Turnover Accepted",
  ];

  const umValues = unitRows.flatMap(({ id: unitId, projectId }) =>
    milestoneNames.map((name) => ({
      unitId,
      milestoneDefId: msMap[`${projectId}::${name}`]!,
      status: "PENDING",
    })),
  );

  const umRows = await db
    .insert(unitMilestones)
    .values(umValues)
    .returning({ id: unitMilestones.id });

  console.log(`Inserted ${umRows.length} unit milestones.`);
  console.log("Chunk 7 seed complete.");

  // ccMap key: cost-center code → UUID (built here for first use in chunk 8)
  const ccMap = Object.fromEntries(ccRows.map((c) => [c.code, c.id]));

  // ── Employees (12 rows) ──────────────────────────────────────────────────
  // Contributions are monthly employee-share amounts under 2025 Philippine
  // statutory rates: SSS 4.5 % of MSC, PhilHealth 2.5 % of basic salary
  // (capped ₱90 k/mo), Pag-IBIG 2 % (capped ₱200/mo).
  // dailyRate × 26 working days ≈ monthly salary used for computation.
  const empRows = await db
    .insert(employees)
    .values([
      // ── Construction ────────────────────────────────────────────────────
      {
        employeeCode:           "EMP-CON-001",
        fullName:               "Carlos Dela Cruz",
        deptId:                 deptMap["CONSTRUCTION"]!,
        costCenterId:           ccMap["CC-PROJECT-DEFAULT"]!,
        position:               "Site Engineer",
        employmentType:         "REGULAR",
        dailyRate:              "1200.00",
        sssContribution:        "1350.00",   // MSC 30 000
        philhealthContribution: "780.00",    // 31 200 × 2.5 %
        pagibigContribution:    "200.00",
        hireDate:               "2022-03-01",
        tinNumber:              "123-456-789-000",
      },
      {
        employeeCode:           "EMP-CON-002",
        fullName:               "Rodrigo Bautista",
        deptId:                 deptMap["CONSTRUCTION"]!,
        costCenterId:           ccMap["CC-PROJECT-DEFAULT"]!,
        position:               "Site Engineer",
        employmentType:         "REGULAR",
        dailyRate:              "1000.00",
        sssContribution:        "1125.00",   // MSC 25 000
        philhealthContribution: "650.00",    // 26 000 × 2.5 %
        pagibigContribution:    "200.00",
        hireDate:               "2023-01-16",
        tinNumber:              "234-567-890-001",
      },
      {
        employeeCode:           "EMP-CON-003",
        fullName:               "Danilo Reyes",
        deptId:                 deptMap["CONSTRUCTION"]!,
        costCenterId:           ccMap["CC-PROJECT-DEFAULT"]!,
        position:               "Site Foreman",
        employmentType:         "REGULAR",
        dailyRate:              "750.00",
        sssContribution:        "877.50",    // MSC 19 500
        philhealthContribution: "487.50",    // 19 500 × 2.5 %
        pagibigContribution:    "200.00",
        hireDate:               "2021-06-01",
        tinNumber:              "345-678-901-002",
      },
      {
        employeeCode:           "EMP-CON-004",
        fullName:               "Jerome Santos",
        deptId:                 deptMap["CONSTRUCTION"]!,
        costCenterId:           ccMap["CC-PROJECT-DEFAULT"]!,
        position:               "Safety Officer",
        employmentType:         "REGULAR",
        dailyRate:              "900.00",
        sssContribution:        "1035.00",   // MSC 23 000
        philhealthContribution: "585.00",    // 23 400 × 2.5 %
        pagibigContribution:    "200.00",
        hireDate:               "2022-09-12",
        tinNumber:              "456-789-012-003",
      },
      // ── Procurement ─────────────────────────────────────────────────────
      {
        employeeCode:           "EMP-PRO-001",
        fullName:               "Ana Lim",
        deptId:                 deptMap["PROCUREMENT"]!,
        costCenterId:           ccMap["HQ-ADMIN"]!,
        position:               "Procurement Officer",
        employmentType:         "REGULAR",
        dailyRate:              "850.00",
        sssContribution:        "990.00",    // MSC 22 000
        philhealthContribution: "552.50",    // 22 100 × 2.5 %
        pagibigContribution:    "200.00",
        hireDate:               "2022-04-04",
        tinNumber:              "567-890-123-004",
      },
      {
        employeeCode:           "EMP-PRO-002",
        fullName:               "Noel Gacutan",
        deptId:                 deptMap["PROCUREMENT"]!,
        costCenterId:           ccMap["HQ-ADMIN"]!,
        position:               "Warehouseman",
        employmentType:         "REGULAR",
        dailyRate:              "600.00",
        sssContribution:        "720.00",    // MSC 16 000
        philhealthContribution: "390.00",    // 15 600 × 2.5 %
        pagibigContribution:    "200.00",
        hireDate:               "2023-07-01",
        tinNumber:              "678-901-234-005",
      },
      // ── Motor Pool ───────────────────────────────────────────────────────
      {
        employeeCode:           "EMP-MPL-001",
        fullName:               "Eduardo Cruz",
        deptId:                 deptMap["MOTORPOOL"]!,
        costCenterId:           ccMap["CC-FLEET"]!,
        position:               "Equipment Operator",
        employmentType:         "REGULAR",
        dailyRate:              "800.00",
        sssContribution:        "922.50",    // MSC 20 500
        philhealthContribution: "520.00",    // 20 800 × 2.5 %
        pagibigContribution:    "200.00",
        hireDate:               "2021-11-15",
        tinNumber:              "789-012-345-006",
      },
      {
        employeeCode:           "EMP-MPL-002",
        fullName:               "Ruben Villanueva",
        deptId:                 deptMap["MOTORPOOL"]!,
        costCenterId:           ccMap["CC-FLEET"]!,
        position:               "Driver",
        employmentType:         "REGULAR",
        dailyRate:              "650.00",
        sssContribution:        "765.00",    // MSC 17 000
        philhealthContribution: "422.50",    // 16 900 × 2.5 %
        pagibigContribution:    "200.00",
        hireDate:               "2022-02-01",
        tinNumber:              "890-123-456-007",
      },
      // ── Finance ──────────────────────────────────────────────────────────
      {
        employeeCode:           "EMP-FIN-001",
        fullName:               "Patricia Ocampo",
        deptId:                 deptMap["FINANCE"]!,
        costCenterId:           ccMap["HQ-FINANCE"]!,
        position:               "Accountant",
        employmentType:         "REGULAR",
        dailyRate:              "1100.00",
        sssContribution:        "1282.50",   // MSC 28 500
        philhealthContribution: "715.00",    // 28 600 × 2.5 %
        pagibigContribution:    "200.00",
        hireDate:               "2021-08-16",
        tinNumber:              "901-234-567-008",
      },
      // ── HR ───────────────────────────────────────────────────────────────
      {
        employeeCode:           "EMP-HRS-001",
        fullName:               "Rosario Mendoza",
        deptId:                 deptMap["HR"]!,
        costCenterId:           ccMap["HQ-ADMIN"]!,
        position:               "HR Specialist",
        employmentType:         "REGULAR",
        dailyRate:              "900.00",
        sssContribution:        "1035.00",
        philhealthContribution: "585.00",
        pagibigContribution:    "200.00",
        hireDate:               "2020-05-04",
        tinNumber:              "012-345-678-009",
      },
      // ── Audit ────────────────────────────────────────────────────────────
      {
        employeeCode:           "EMP-AUD-001",
        fullName:               "Jose Reyes",
        deptId:                 deptMap["AUDIT"]!,
        costCenterId:           ccMap["HQ-ADMIN"]!,
        position:               "QC Inspector",
        employmentType:         "REGULAR",
        dailyRate:              "950.00",
        sssContribution:        "1102.50",   // MSC 24 500
        philhealthContribution: "617.50",    // 24 700 × 2.5 %
        pagibigContribution:    "200.00",
        hireDate:               "2022-11-01",
        tinNumber:              "111-222-333-010",
      },
      // ── Batching ─────────────────────────────────────────────────────────
      {
        employeeCode:           "EMP-BAT-001",
        fullName:               "Ramon Flores",
        deptId:                 deptMap["BATCHING"]!,
        costCenterId:           ccMap["CC-BATCHING"]!,
        position:               "Batching Plant Operator",
        employmentType:         "REGULAR",
        dailyRate:              "700.00",
        sssContribution:        "810.00",    // MSC 18 000
        philhealthContribution: "455.00",    // 18 200 × 2.5 %
        pagibigContribution:    "200.00",
        hireDate:               "2023-03-06",
        tinNumber:              "222-333-444-011",
      },
    ])
    .returning({ id: employees.id, employeeCode: employees.employeeCode });

  console.log(`Inserted ${empRows.length} employees.`);

  // ── Equipment (5 pieces) ─────────────────────────────────────────────────
  // dailyRentalRate is the internal charge-back rate used in finance ledger.
  // fuelStandardLitersPerHour is the manufacturer benchmark for variance tracking.
  const eqRows = await db
    .insert(equipment)
    .values([
      {
        code:                       "EQ-TM-001",
        name:                       "Transit Mixer No. 1",
        type:                       "CONCRETE_MIXER",
        make:                       "Hino",
        model:                      "700 Series FM",
        year:                       2022,
        purchaseValue:              "8500000.00",
        dailyRentalRate:            "8500.00",
        fuelStandardLitersPerHour:  "12.5000",
        totalEngineHours:           "2340.00",
        status:                     "AVAILABLE",
      },
      {
        code:                       "EQ-EX-001",
        name:                       "Hydraulic Excavator No. 1",
        type:                       "EXCAVATOR",
        make:                       "Komatsu",
        model:                      "PC200-8M0",
        year:                       2021,
        purchaseValue:              "6200000.00",
        dailyRentalRate:            "6200.00",
        fuelStandardLitersPerHour:  "15.0000",
        totalEngineHours:           "3850.00",
        status:                     "AVAILABLE",
      },
      {
        code:                       "EQ-CP-001",
        name:                       "Concrete Pump No. 1",
        type:                       "CONCRETE_PUMP",
        make:                       "Putzmeister",
        model:                      "BSA 1409 D",
        year:                       2022,
        purchaseValue:              "4500000.00",
        dailyRentalRate:            "4500.00",
        fuelStandardLitersPerHour:  "8.0000",
        totalEngineHours:           "1620.00",
        status:                     "AVAILABLE",
      },
      {
        code:                       "EQ-DT-001",
        name:                       "Dump Truck No. 1",
        type:                       "DUMP_TRUCK",
        make:                       "Isuzu",
        model:                      "Giga FVZ 34P",
        year:                       2023,
        purchaseValue:              "3200000.00",
        dailyRentalRate:            "3200.00",
        fuelStandardLitersPerHour:  "10.0000",
        totalEngineHours:           "980.00",
        status:                     "AVAILABLE",
      },
      {
        code:                       "EQ-CR-001",
        name:                       "Mobile Crane No. 1",
        type:                       "CRANE",
        make:                       "Tadano",
        model:                      "GR-500EX-2",
        year:                       2020,
        purchaseValue:              "12000000.00",
        dailyRentalRate:            "12000.00",
        fuelStandardLitersPerHour:  "18.0000",
        totalEngineHours:           "5210.00",
        status:                     "AVAILABLE",
      },
    ])
    .returning({ id: equipment.id, code: equipment.code });

  console.log(`Inserted ${eqRows.length} equipment records.`);
  console.log("Chunk 8 seed complete.");

  // userMap key: email → UUID (built here for first use in chunk 9)
  const userMap = Object.fromEntries(userRows.map((u) => [u.email, u.id]));
  const financeUserId = userMap["finance@castcrete.ph"]!;
  const adminUserId   = userMap["admin@castcrete.ph"]!;

  // ── Bank Accounts (3 rows) ───────────────────────────────────────────────
  const baRows = await db
    .insert(bankAccounts)
    .values([
      {
        bankName:       "BDO Unibank",
        accountName:    "Castcrete Builders — Main Operating",
        accountNumber:  "004680-123456-7",
        accountType:    "CHECKING",
        currency:       "PHP",
        openingBalance: "15000000.00",
        currentBalance: "15000000.00",
      },
      {
        bankName:       "Bank of the Philippine Islands",
        accountName:    "Castcrete Builders — Payroll",
        accountNumber:  "3219-8765-43",
        accountType:    "SAVINGS",
        currency:       "PHP",
        openingBalance: "3500000.00",
        currentBalance: "3500000.00",
      },
      {
        bankName:       "RCBC",
        accountName:    "Castcrete Builders — CapEx Reserve",
        accountNumber:  "9-500-12345-6",
        accountType:    "SAVINGS",
        currency:       "PHP",
        openingBalance: "8000000.00",
        currentBalance: "8000000.00",
      },
    ])
    .returning({ id: bankAccounts.id, accountNumber: bankAccounts.accountNumber });

  const baMap = Object.fromEntries(baRows.map((b) => [b.accountNumber, b.id]));
  const bdoId  = baMap["004680-123456-7"]!;
  const bpiId  = baMap["3219-8765-43"]!;
  const rcbcId = baMap["9-500-12345-6"]!;
  console.log(`Inserted ${baRows.length} bank accounts.`);

  // ── Bank Transactions (10 rows) ──────────────────────────────────────────
  // Mix of CREDIT (inflows) and DEBIT (outflows) across all three accounts.
  // requiresDualAuth=true on any single transaction above ₱5 M per policy.
  const btRows = await db
    .insert(bankTransactions)
    .values([
      {
        bankAccountId:    bdoId,
        transactionDate:  "2024-01-20",
        transactionType:  "CREDIT" as const,
        amount:           "25000000.00",
        description:      "Developer advance receipt — Primavera Phase 1 mobilisation",
        referenceNumber:  "PLC-ADV-2024-001",
        costCenterId:     ccMap["CC-PROJECT-DEFAULT"]!,
        requiresDualAuth: true,
        status:           "POSTED",
        enteredBy:        financeUserId,
      },
      {
        bankAccountId:    bdoId,
        transactionDate:  "2024-01-25",
        transactionType:  "DEBIT" as const,
        amount:           "8500000.00",
        description:      "Internal transfer to RCBC CapEx reserve account",
        referenceNumber:  "INT-XFER-2024-001",
        costCenterId:     ccMap["HQ-FINANCE"]!,
        requiresDualAuth: true,
        status:           "POSTED",
        enteredBy:        financeUserId,
      },
      {
        bankAccountId:    rcbcId,
        transactionDate:  "2024-01-25",
        transactionType:  "CREDIT" as const,
        amount:           "8500000.00",
        description:      "Internal transfer from BDO operating account",
        referenceNumber:  "INT-XFER-2024-001",
        costCenterId:     ccMap["HQ-FINANCE"]!,
        requiresDualAuth: true,
        status:           "POSTED",
        enteredBy:        financeUserId,
      },
      {
        bankAccountId:    bdoId,
        transactionDate:  "2024-02-05",
        transactionType:  "DEBIT" as const,
        amount:           "2350000.00",
        description:      "Supplier payment — cement and aggregates February batch (Holcim / Republic)",
        referenceNumber:  "PO-PAY-2024-002",
        costCenterId:     ccMap["CC-PROJECT-DEFAULT"]!,
        requiresDualAuth: false,
        status:           "POSTED",
        enteredBy:        financeUserId,
      },
      {
        bankAccountId:    bdoId,
        transactionDate:  "2024-02-15",
        transactionType:  "DEBIT" as const,
        amount:           "1875000.00",
        description:      "Subcontractor progress billing — RSC-001 February structural works",
        referenceNumber:  "SUBCON-PAY-2024-001",
        costCenterId:     ccMap["CC-PROJECT-DEFAULT"]!,
        requiresDualAuth: false,
        status:           "POSTED",
        enteredBy:        financeUserId,
      },
      {
        bankAccountId:    bpiId,
        transactionDate:  "2024-02-29",
        transactionType:  "DEBIT" as const,
        amount:           "1240000.00",
        description:      "Payroll release — February 2024 semi-monthly payroll",
        referenceNumber:  "PAY-2024-02B",
        costCenterId:     ccMap["HQ-ADMIN"]!,
        requiresDualAuth: false,
        status:           "POSTED",
        enteredBy:        financeUserId,
      },
      {
        bankAccountId:    bdoId,
        transactionDate:  "2024-07-05",
        transactionType:  "CREDIT" as const,
        amount:           "12750000.00",
        description:      "Developer advance receipt — Verdana Townhomes Cluster A mobilisation",
        referenceNumber:  "VHR-ADV-2024-001",
        costCenterId:     ccMap["CC-PROJECT-DEFAULT"]!,
        requiresDualAuth: true,
        status:           "POSTED",
        enteredBy:        financeUserId,
      },
      {
        bankAccountId:    bdoId,
        transactionDate:  "2024-07-15",
        transactionType:  "DEBIT" as const,
        amount:           "3120000.00",
        description:      "Supplier payment — rebar and formwork materials July batch (Pag-asa Steel / GrandBuilders)",
        referenceNumber:  "PO-PAY-2024-015",
        costCenterId:     ccMap["CC-PROJECT-DEFAULT"]!,
        requiresDualAuth: false,
        status:           "POSTED",
        enteredBy:        financeUserId,
      },
      {
        bankAccountId:    bpiId,
        transactionDate:  "2024-07-31",
        transactionType:  "DEBIT" as const,
        amount:           "1340000.00",
        description:      "Payroll release — July 2024 semi-monthly payroll",
        referenceNumber:  "PAY-2024-07B",
        costCenterId:     ccMap["HQ-ADMIN"]!,
        requiresDualAuth: false,
        status:           "POSTED",
        enteredBy:        financeUserId,
      },
      {
        bankAccountId:    bdoId,
        transactionDate:  "2024-09-30",
        transactionType:  "DEBIT" as const,
        amount:           "980000.00",
        description:      "Equipment maintenance parts and fuel costs — Q3 motor pool",
        referenceNumber:  "MPL-EXP-2024-Q3",
        costCenterId:     ccMap["CC-FLEET"]!,
        requiresDualAuth: false,
        status:           "POSTED",
        enteredBy:        financeUserId,
      },
    ])
    .returning({ id: bankTransactions.id });

  console.log(`Inserted ${btRows.length} bank transactions.`);

  // ── Requests for Payment (3 rows) ────────────────────────────────────────
  // sourceDocumentUrl is NOT NULL; placeholder paths stand in for uploaded PDFs.
  const rfpRows = await db
    .insert(requestsForPayment)
    .values([
      {
        bankAccountId:    bdoId,
        amount:           "1850000.00",
        payeeName:        "Holcim Philippines, Inc.",
        purpose:          "Cement delivery — October 2024 batch order, 6 500 bags OPC Type I for Primavera Phase 1 and Verdana Cluster A",
        sourceDocumentUrl: "/documents/rfp/holcim-oct-2024-invoice.pdf",
        costCenterId:     ccMap["CC-PROJECT-DEFAULT"]!,
        status:           "PENDING",
        submittedBy:      financeUserId,
      },
      {
        bankAccountId:    bdoId,
        amount:           "2450000.00",
        payeeName:        "Reyes Structural Construction",
        purpose:          "Subcontractor progress billing — structural works completion Primavera Block A units PRM-A-001 to PRM-A-006, October 2024",
        sourceDocumentUrl: "/documents/rfp/rsc-001-billing-oct-2024.pdf",
        costCenterId:     ccMap["CC-PROJECT-DEFAULT"]!,
        status:           "PENDING",
        submittedBy:      financeUserId,
      },
      {
        bankAccountId:    bdoId,
        amount:           "380000.00",
        payeeName:        "Petron Corporation",
        purpose:          "Fleet fuel supply — October 2024 diesel for transit mixer, excavator, dump truck, and mobile crane",
        sourceDocumentUrl: "/documents/rfp/petron-fuel-oct-2024.pdf",
        costCenterId:     ccMap["CC-FLEET"]!,
        status:           "PENDING",
        submittedBy:      adminUserId,
      },
    ])
    .returning({ id: requestsForPayment.id });

  console.log(`Inserted ${rfpRows.length} requests for payment.`);
  console.log("Chunk 9 seed complete — all chunks done.");
  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
