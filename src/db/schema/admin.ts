import {
  pgTable, uuid, varchar, numeric, integer, boolean,
  timestamp, date, text,
} from "drizzle-orm/pg-core";
import { users } from "./core";
import { projects } from "./projects";
import { workCategoryEnum } from "./enums";

export const suppliers = pgTable("suppliers", {
  id:                  uuid("id").primaryKey().defaultRandom(),
  name:                varchar("name", { length: 150 }).notNull(),
  contactInfo:         uuid("contact_info"),
  preferredMaterials:  uuid("preferred_materials"),
  isActive:            boolean("is_active").notNull().default(true),
  createdAt:           timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const materials = pgTable("materials", {
  id:                  uuid("id").primaryKey().defaultRandom(),
  code:                varchar("code", { length: 50 }).notNull().unique(),
  name:                varchar("name", { length: 150 }).notNull(),
  unit:                varchar("unit", { length: 30 }).notNull(),
  category:            varchar("category", { length: 50 }).notNull(),
  adminPrice:          numeric("admin_price", { precision: 15, scale: 2 }).notNull(),
  priceVersion:        integer("price_version").notNull().default(1),
  preferredSupplierId: uuid("preferred_supplier_id").references(() => suppliers.id),
  isActive:            boolean("is_active").notNull().default(true),
  approvedBy:          uuid("approved_by").references(() => users.id),
  approvedAt:          timestamp("approved_at", { withTimezone: true }),
  createdAt:           timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const materialPriceHistory = pgTable("material_price_history", {
  id:           uuid("id").primaryKey().defaultRandom(),
  materialId:   uuid("material_id").notNull().references(() => materials.id),
  oldPrice:     numeric("old_price", { precision: 15, scale: 2 }).notNull(),
  newPrice:     numeric("new_price", { precision: 15, scale: 2 }).notNull(),
  version:      integer("version").notNull(),
  changedBy:    uuid("changed_by").notNull().references(() => users.id),
  approvedBy:   uuid("approved_by").references(() => users.id),
  approvedAt:   timestamp("approved_at", { withTimezone: true }),
  effectiveFrom: date("effective_from").notNull(),
  createdAt:    timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const bomStandards = pgTable("bom_standards", {
  id:               uuid("id").primaryKey().defaultRandom(),
  projectId:        uuid("project_id").notNull().references(() => projects.id),
  unitModel:        varchar("unit_model", { length: 50 }).notNull(),
  category:         workCategoryEnum("category").notNull(),
  scopeCode:        varchar("scope_code", { length: 100 }).notNull(),
  activityCode:     varchar("activity_code", { length: 100 }).notNull(),
  materialId:       uuid("material_id").notNull().references(() => materials.id),
  quantityPerUnit:  numeric("quantity_per_unit", { precision: 15, scale: 4 }).notNull(),
  version:          integer("version").notNull().default(1),
  isActive:         boolean("is_active").notNull().default(true),
  approvedBy:       uuid("approved_by").references(() => users.id),
  approvedAt:       timestamp("approved_at", { withTimezone: true }),
  createdAt:        timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const activityDefinitions = pgTable("activity_definitions", {
  id:                    uuid("id").primaryKey().defaultRandom(),
  projectId:             uuid("project_id").notNull().references(() => projects.id),
  category:              workCategoryEnum("category").notNull(),
  scopeCode:             varchar("scope_code", { length: 100 }).notNull(),
  scopeName:             varchar("scope_name", { length: 150 }).notNull(),
  activityCode:          varchar("activity_code", { length: 100 }).notNull(),
  activityName:          varchar("activity_name", { length: 150 }).notNull(),
  standardDurationDays:  integer("standard_duration_days").notNull(),
  weightInScopePct:      numeric("weight_in_scope_pct", { precision: 5, scale: 2 }).notNull(),
  sequenceOrder:         integer("sequence_order").notNull(),
  isActive:              boolean("is_active").notNull().default(true),
  createdAt:             timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const milestoneDefinitions = pgTable("milestone_definitions", {
  id:              uuid("id").primaryKey().defaultRandom(),
  projectId:       uuid("project_id").notNull().references(() => projects.id),
  name:            varchar("name", { length: 150 }).notNull(),
  category:        workCategoryEnum("category").notNull(),
  sequenceOrder:   integer("sequence_order").notNull(),
  triggersBilling: boolean("triggers_billing").notNull().default(false),
  weightPct:       numeric("weight_pct", { precision: 5, scale: 2 }).notNull(),
  isActive:        boolean("is_active").notNull().default(true),
  createdAt:       timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const developerRateCards = pgTable("developer_rate_cards", {
  id:              uuid("id").primaryKey().defaultRandom(),
  projectId:       uuid("project_id").notNull().references(() => projects.id),
  activityDefId:   uuid("activity_def_id").notNull().references(() => activityDefinitions.id),
  grossRatePerUnit: numeric("gross_rate_per_unit", { precision: 15, scale: 2 }).notNull(),
  retentionPct:    numeric("retention_pct", { precision: 5, scale: 4 }).notNull().default("0.10"),
  dpRecoupmentPct: numeric("dp_recoupment_pct", { precision: 5, scale: 4 }).notNull().default("0.10"),
  taxPct:          numeric("tax_pct", { precision: 5, scale: 4 }).notNull().default("0.00"),
  version:         integer("version").notNull().default(1),
  isActive:        boolean("is_active").notNull().default(true),
  approvedBy:      uuid("approved_by").references(() => users.id),
  approvedAt:      timestamp("approved_at", { withTimezone: true }),
  createdAt:       timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
