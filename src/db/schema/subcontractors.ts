import {
  pgTable, uuid, varchar, numeric, integer, boolean,
  timestamp, date, jsonb,
} from "drizzle-orm/pg-core";
import { users } from "./core";
import { projects } from "./projects";
import { activityDefinitions } from "./admin";
import { tradeTypeEnum, performanceGradeEnum } from "./enums";

export const subcontractors = pgTable("subcontractors", {
  id:                   uuid("id").primaryKey().defaultRandom(),
  code:                 varchar("code", { length: 50 }).notNull().unique(),
  name:                 varchar("name", { length: 150 }).notNull(),
  contactInfo:          jsonb("contact_info"),
  tradeTypes:           tradeTypeEnum("trade_types").array().notNull(),
  defaultMaxActiveUnits: integer("default_max_active_units").notNull(),
  manpowerBenchmark:    numeric("manpower_benchmark", { precision: 5, scale: 2 }).notNull(),
  performanceGrade:     performanceGradeEnum("performance_grade").notNull().default("A"),
  performanceScore:     numeric("performance_score", { precision: 5, scale: 2 }).notNull().default("100.00"),
  stopAssignment:       boolean("stop_assignment").notNull().default(false),
  isActive:             boolean("is_active").notNull().default(true),
  createdAt:            timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:            timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const subcontractorCapacityMatrix = pgTable("subcontractor_capacity_matrix", {
  id:               uuid("id").primaryKey().defaultRandom(),
  subconId:         uuid("subcon_id").notNull().references(() => subcontractors.id),
  projectId:        uuid("project_id").notNull().references(() => projects.id),
  unitModel:        varchar("unit_model", { length: 50 }),
  workType:         tradeTypeEnum("work_type").notNull(),
  ratedCapacity:    integer("rated_capacity").notNull(),
  capacityWeight:   numeric("capacity_weight", { precision: 4, scale: 2 }).notNull().default("1.00"),
  createdAt:        timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const subcontractorAdvances = pgTable("subcontractor_advances", {
  id:                uuid("id").primaryKey().defaultRandom(),
  subconId:          uuid("subcon_id").notNull().references(() => subcontractors.id),
  projectId:         uuid("project_id").notNull().references(() => projects.id),
  advanceAmount:     numeric("advance_amount", { precision: 15, scale: 2 }).notNull(),
  recoupmentPct:     numeric("recoupment_pct", { precision: 5, scale: 4 }).notNull(),
  amountRecovered:   numeric("amount_recovered", { precision: 15, scale: 2 }).notNull().default("0.00"),
  isFullyRecovered:  boolean("is_fully_recovered").notNull().default(false),
  issuedDate:        date("issued_date").notNull(),
  issuedBy:          uuid("issued_by").notNull().references(() => users.id),
  createdAt:         timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const subcontractorPerformanceRatings = pgTable("subcontractor_performance_ratings", {
  id:                       uuid("id").primaryKey().defaultRandom(),
  subconId:                 uuid("subcon_id").notNull().references(() => subcontractors.id),
  projectId:                uuid("project_id").notNull().references(() => projects.id),
  periodStart:              date("period_start").notNull(),
  periodEnd:                date("period_end").notNull(),
  scheduleVarianceScore:    numeric("schedule_variance_score", { precision: 5, scale: 2 }).notNull(),
  materialVarianceScore:    numeric("material_variance_score", { precision: 5, scale: 2 }).notNull(),
  qualityReworkScore:       numeric("quality_rework_score", { precision: 5, scale: 2 }).notNull(),
  safetyComplianceScore:    numeric("safety_compliance_score", { precision: 5, scale: 2 }).notNull(),
  // weighted_total is a generated column in the DB; mirrored as nullable here for reads
  weightedTotal:            numeric("weighted_total", { precision: 5, scale: 2 }),
  grade:                    performanceGradeEnum("grade").notNull(),
  computedBy:               uuid("computed_by").references(() => users.id),
  computedAt:               timestamp("computed_at", { withTimezone: true }).notNull().defaultNow(),
});

export const subcontractorRateCards = pgTable("subcontractor_rate_cards", {
  id:            uuid("id").primaryKey().defaultRandom(),
  subconId:      uuid("subcon_id").notNull().references(() => subcontractors.id),
  projectId:     uuid("project_id").notNull().references(() => projects.id),
  activityDefId: uuid("activity_def_id").notNull().references(() => activityDefinitions.id),
  ratePerUnit:   numeric("rate_per_unit", { precision: 15, scale: 2 }).notNull(),
  retentionPct:  numeric("retention_pct", { precision: 5, scale: 4 }).notNull().default("0.10"),
  version:       integer("version").notNull().default(1),
  isActive:      boolean("is_active").notNull().default(true),
  approvedBy:    uuid("approved_by").references(() => users.id),
  approvedAt:    timestamp("approved_at", { withTimezone: true }),
  createdAt:     timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
