import {
  pgTable, uuid, varchar, numeric, integer, boolean,
  timestamp, date, text, jsonb,
} from "drizzle-orm/pg-core";
import { users, costCenters } from "./core";
import { projects } from "./projects";
import { projectUnits } from "./units";
import { fixOrFlipEnum } from "./enums";

export const equipment = pgTable("equipment", {
  id:                           uuid("id").primaryKey().defaultRandom(),
  code:                         varchar("code", { length: 50 }).notNull().unique(),
  name:                         varchar("name", { length: 150 }).notNull(),
  type:                         varchar("type", { length: 50 }).notNull(),
  make:                         varchar("make", { length: 100 }),
  model:                        varchar("model", { length: 100 }),
  year:                         integer("year"),
  purchaseValue:                numeric("purchase_value", { precision: 15, scale: 2 }),
  dailyRentalRate:              numeric("daily_rental_rate", { precision: 15, scale: 2 }).notNull(),
  fuelStandardLitersPerHour:    numeric("fuel_standard_liters_per_hour", { precision: 8, scale: 4 }).notNull(),
  totalEngineHours:             numeric("total_engine_hours", { precision: 10, scale: 2 }).notNull().default("0"),
  status:                       varchar("status", { length: 20 }).notNull().default("AVAILABLE"),
  isFlaggedForFlip:             boolean("is_flagged_for_flip").notNull().default(false),
  isLocked:                     boolean("is_locked").notNull().default(false),
  createdAt:                    timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:                    timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const equipmentAssignments = pgTable("equipment_assignments", {
  id:               uuid("id").primaryKey().defaultRandom(),
  equipmentId:      uuid("equipment_id").notNull().references(() => equipment.id),
  projectId:        uuid("project_id").notNull().references(() => projects.id),
  unitId:           uuid("unit_id").references(() => projectUnits.id),
  costCenterId:     uuid("cost_center_id").notNull().references(() => costCenters.id),
  operatorId:       uuid("operator_id").notNull().references(() => users.id),
  assignedDate:     date("assigned_date").notNull(),
  returnedDate:     date("returned_date"),
  daysRented:       integer("days_rented"),      // generated in DB
  dailyRate:        numeric("daily_rate", { precision: 15, scale: 2 }).notNull(),
  totalRentalIncome: numeric("total_rental_income", { precision: 15, scale: 2 }),
  status:           varchar("status", { length: 20 }).notNull().default("ACTIVE"),
  createdAt:        timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const maintenanceRecords = pgTable("maintenance_records", {
  id:               uuid("id").primaryKey().defaultRandom(),
  equipmentId:      uuid("equipment_id").notNull().references(() => equipment.id),
  maintenanceType:  varchar("maintenance_type", { length: 20 }).notNull(),
  description:      text("description").notNull(),
  partsCost:        numeric("parts_cost", { precision: 15, scale: 2 }).notNull().default("0"),
  laborCost:        numeric("labor_cost", { precision: 15, scale: 2 }).notNull().default("0"),
  totalCost:        numeric("total_cost", { precision: 15, scale: 2 }), // generated in DB
  downtimeDays:     integer("downtime_days").notNull().default(0),
  maintenanceDate:  date("maintenance_date").notNull(),
  completedDate:    date("completed_date"),
  status:           varchar("status", { length: 20 }).notNull().default("PENDING"),
  recordedBy:       uuid("recorded_by").notNull().references(() => users.id),
  createdAt:        timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const fuelLogs = pgTable("fuel_logs", {
  id:                         uuid("id").primaryKey().defaultRandom(),
  equipmentId:                uuid("equipment_id").notNull().references(() => equipment.id),
  assignmentId:               uuid("assignment_id").notNull().references(() => equipmentAssignments.id),
  logDate:                    date("log_date").notNull(),
  engineHoursStart:           numeric("engine_hours_start", { precision: 10, scale: 2 }).notNull(),
  engineHoursEnd:             numeric("engine_hours_end", { precision: 10, scale: 2 }).notNull(),
  engineHoursTotal:           numeric("engine_hours_total", { precision: 10, scale: 2 }),  // generated in DB
  fuelConsumedLiters:         numeric("fuel_consumed_liters", { precision: 10, scale: 4 }).notNull(),
  fuelEfficiencyActual:       numeric("fuel_efficiency_actual", { precision: 8, scale: 4 }),
  fuelStandardLitersPerHour:  numeric("fuel_standard_liters_per_hour", { precision: 8, scale: 4 }).notNull(),
  efficiencyVariancePct:      numeric("efficiency_variance_pct", { precision: 7, scale: 4 }),
  isFlagged:                  boolean("is_flagged").notNull().default(false),
  operatorId:                 uuid("operator_id").notNull().references(() => users.id),
  createdAt:                  timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const equipmentDailyChecklists = pgTable("equipment_daily_checklists", {
  id:               uuid("id").primaryKey().defaultRandom(),
  equipmentId:      uuid("equipment_id").notNull().references(() => equipment.id),
  assignmentId:     uuid("assignment_id").notNull().references(() => equipmentAssignments.id),
  checkDate:        date("check_date").notNull(),
  oilOk:            boolean("oil_ok").notNull(),
  fuelOk:           boolean("fuel_ok").notNull(),
  hydraulicsOk:     boolean("hydraulics_ok").notNull(),
  otherChecks:      jsonb("other_checks"),
  allPassed:        boolean("all_passed").notNull(),
  equipmentLocked:  boolean("equipment_locked").notNull().default(false),
  operatorId:       uuid("operator_id").notNull().references(() => users.id),
  createdAt:        timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const fixOrFlipAssessments = pgTable("fix_or_flip_assessments", {
  id:                                 uuid("id").primaryKey().defaultRandom(),
  equipmentId:                        uuid("equipment_id").notNull().references(() => equipment.id),
  assessmentDate:                     date("assessment_date").notNull(),
  cumulativeMaintenanceCost12mo:      numeric("cumulative_maintenance_cost_12mo", { precision: 15, scale: 2 }).notNull(),
  annualRentalIncome:                 numeric("annual_rental_income", { precision: 15, scale: 2 }).notNull(),
  efficiencyRatio:                    numeric("efficiency_ratio", { precision: 8, scale: 4 }).notNull(),
  totalEngineHours:                   numeric("total_engine_hours", { precision: 10, scale: 2 }).notNull(),
  monthlyDowntimeDays:                integer("monthly_downtime_days").notNull(),
  fuelEfficiencyVariancePct:          numeric("fuel_efficiency_variance_pct", { precision: 7, scale: 4 }).notNull(),
  consecutiveMonthsOver50Pct:         integer("consecutive_months_over_50pct").notNull().default(0),
  recommendation:                     fixOrFlipEnum("recommendation").notNull(),
  isTriggered:                        boolean("is_triggered").notNull().default(false),
  assessedBy:                         uuid("assessed_by").references(() => users.id),
  createdAt:                          timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
