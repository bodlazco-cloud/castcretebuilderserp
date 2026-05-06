import {
  pgTable, uuid, varchar, numeric, integer, boolean,
  timestamp, date, text,
} from "drizzle-orm/pg-core";
import { users } from "./core";
import { projects, blocks } from "./projects";
import { activityDefinitions, milestoneDefinitions } from "./admin";
import { workCategoryEnum, delayReasonEnum, unitTypeEnum } from "./enums";

export const projectUnits = pgTable("project_units", {
  id:              uuid("id").primaryKey().defaultRandom(),
  projectId:       uuid("project_id").notNull().references(() => projects.id),
  blockId:         uuid("block_id").notNull().references(() => blocks.id),
  lotNumber:       varchar("lot_number", { length: 20 }).notNull(),
  unitCode:        varchar("unit_code", { length: 50 }).notNull().unique(),
  unitModel:       varchar("unit_model", { length: 50 }).notNull(),
  unitType:        unitTypeEnum("unit_type").notNull().default("MID"),
  contractPrice:   numeric("contract_price", { precision: 15, scale: 2 }),
  currentCategory: workCategoryEnum("current_category").notNull().default("STRUCTURAL"),
  status:          varchar("status", { length: 30 }).notNull().default("PENDING"),
  turnedOverAt:    timestamp("turned_over_at", { withTimezone: true }),
  turnoverCost:    numeric("turnover_cost", { precision: 15, scale: 2 }),  // CIP cost captured at turnover
  createdAt:       timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Records each architectural turnover event — the moment CIP becomes COGS
// and Deferred Revenue becomes Recognized Revenue.
export const unitTurnovers = pgTable("unit_turnovers", {
  id:               uuid("id").primaryKey().defaultRandom(),
  unitId:           uuid("unit_id").notNull().references(() => projectUnits.id),
  projectId:        uuid("project_id").notNull().references(() => projects.id),
  turnoverDate:     date("turnover_date").notNull(),
  cipCost:          numeric("cip_cost",          { precision: 15, scale: 2 }).notNull(),  // COGS booked
  contractPrice:    numeric("contract_price",    { precision: 15, scale: 2 }).notNull(),  // Revenue snapshot
  unitCode:         varchar("unit_code",         { length: 50 }).notNull(),               // denormalized for reports
  notes:            text("notes"),
  recordedBy:       uuid("recorded_by").notNull().references(() => users.id),
  createdAt:        timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const unitMilestones = pgTable("unit_milestones", {
  id:               uuid("id").primaryKey().defaultRandom(),
  unitId:           uuid("unit_id").notNull().references(() => projectUnits.id),
  milestoneDefId:   uuid("milestone_def_id").notNull().references(() => milestoneDefinitions.id),
  status:           varchar("status", { length: 30 }).notNull().default("PENDING"),
  startedAt:        timestamp("started_at", { withTimezone: true }),
  completedAt:      timestamp("completed_at", { withTimezone: true }),
  verifiedBy:       uuid("verified_by").references(() => users.id),
  verifiedAt:       timestamp("verified_at", { withTimezone: true }),
  createdAt:        timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const unitActivities = pgTable("unit_activities", {
  id:                    uuid("id").primaryKey().defaultRandom(),
  unitId:                uuid("unit_id").notNull().references(() => projectUnits.id),
  taskAssignmentId:      uuid("task_assignment_id"),   // FK patched after construction schema
  activityDefId:         uuid("activity_def_id").notNull().references(() => activityDefinitions.id),
  status:                varchar("status", { length: 20 }).notNull().default("PENDING"),
  plannedStart:          date("planned_start"),
  plannedEnd:            date("planned_end"),
  actualStart:           date("actual_start"),
  actualEnd:             date("actual_end"),
  scheduleVarianceDays:  integer("schedule_variance_days"),   // generated column in DB
  createdAt:             timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const eotRequests = pgTable("eot_requests", {
  id:                  uuid("id").primaryKey().defaultRandom(),
  taskAssignmentId:    uuid("task_assignment_id"),   // FK patched after construction schema
  unitActivityId:      uuid("unit_activity_id").notNull().references(() => unitActivities.id),
  reason:              delayReasonEnum("reason").notNull(),
  reasonDetail:        text("reason_detail"),
  originalEndDate:     date("original_end_date").notNull(),
  requestedEndDate:    date("requested_end_date").notNull(),
  status:              varchar("status", { length: 20 }).notNull().default("PENDING"),
  requestedBy:         uuid("requested_by").notNull().references(() => users.id),
  approvedBy:          uuid("approved_by").references(() => users.id),
  approvedAt:          timestamp("approved_at", { withTimezone: true }),
  rejectionReason:     text("rejection_reason"),
  createdAt:           timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
