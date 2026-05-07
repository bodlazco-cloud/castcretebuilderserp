import {
  pgTable, uuid, varchar, numeric, integer, boolean, timestamp, text,
} from "drizzle-orm/pg-core";

export const phaseCategories = pgTable("phase_categories", {
  id:            uuid("id").primaryKey().defaultRandom(),
  code:          varchar("code", { length: 50 }).notNull().unique(),
  name:          varchar("name", { length: 150 }).notNull(),
  sequenceOrder: integer("sequence_order").notNull().default(0),
  isActive:      boolean("is_active").notNull().default(true),
  createdAt:     timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const phaseScopes = pgTable("phase_scopes", {
  id:            uuid("id").primaryKey().defaultRandom(),
  categoryId:    uuid("category_id").notNull().references(() => phaseCategories.id, { onDelete: "cascade" }),
  code:          varchar("code", { length: 100 }).notNull().unique(),
  name:          varchar("name", { length: 200 }).notNull(),
  sequenceOrder: integer("sequence_order").notNull().default(0),
  isActive:      boolean("is_active").notNull().default(true),
  createdAt:     timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const phaseActivities = pgTable("phase_activities", {
  id:                   uuid("id").primaryKey().defaultRandom(),
  scopeId:              uuid("scope_id").notNull().references(() => phaseScopes.id, { onDelete: "cascade" }),
  code:                 varchar("code", { length: 100 }).notNull().unique(),
  name:                 varchar("name", { length: 200 }).notNull(),
  standardDurationDays: integer("standard_duration_days").notNull().default(1),
  weightInScopePct:     numeric("weight_in_scope_pct", { precision: 5, scale: 2 }).notNull().default("0"),
  sequenceOrder:        integer("sequence_order").notNull().default(0),
  isActive:             boolean("is_active").notNull().default(true),
  createdAt:            timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const phaseBillingMilestones = pgTable("phase_billing_milestones", {
  id:              uuid("id").primaryKey().defaultRandom(),
  categoryId:      uuid("category_id").notNull().references(() => phaseCategories.id, { onDelete: "cascade" }),
  name:            varchar("name", { length: 200 }).notNull(),
  weightPct:       numeric("weight_pct", { precision: 5, scale: 2 }).notNull().default("0"),
  triggersBilling: boolean("triggers_billing").notNull().default(true),
  sequenceOrder:   integer("sequence_order").notNull().default(0),
  notes:           text("notes"),
  isActive:        boolean("is_active").notNull().default(true),
  createdAt:       timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
