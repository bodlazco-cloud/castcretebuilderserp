import {
  pgTable, uuid, varchar, numeric, integer, boolean,
  timestamp, text, jsonb,
} from "drizzle-orm/pg-core";
import { users } from "./core";
import { projects } from "./projects";
import { projectUnits } from "./units";
import { activityDefinitions, materials } from "./admin";
import { purchaseRequisitions } from "./procurement";
import { phaseActivities, phaseScopes } from "./phases";
import {
  unitTypeEnum,
  bomStatusEnum,
  forecastTypeEnum,
  forecastStatusEnum,
  varianceRequestTypeEnum,
} from "./enums";

export const masterBomEntries = pgTable("master_bom_entries", {
  id:               uuid("id").primaryKey().defaultRandom(),
  projectId:        uuid("project_id").notNull().references(() => projects.id),
  unitModel:        varchar("unit_model", { length: 50 }).notNull(),
  unitType:         unitTypeEnum("unit_type").notNull(),
  activityDefId:    uuid("activity_def_id").references(() => activityDefinitions.id),
  phaseScopeId:     uuid("phase_scope_id").references(() => phaseScopes.id),
  phaseActivityId:  uuid("phase_activity_id").references(() => phaseActivities.id),
  materialId:       uuid("material_id").notNull().references(() => materials.id),
  quantityPerUnit:  numeric("quantity_per_unit", { precision: 15, scale: 4 }).notNull(),
  equipmentType:    varchar("equipment_type", { length: 100 }),
  version:          integer("version").notNull().default(1),
  isActive:         boolean("is_active").notNull().default(true),
  status:           bomStatusEnum("status").notNull().default("DRAFT"),
  submittedBy:      uuid("submitted_by").references(() => users.id),
  submittedAt:      timestamp("submitted_at", { withTimezone: true }),
  reviewedBy:       uuid("reviewed_by").references(() => users.id),
  reviewedAt:       timestamp("reviewed_at", { withTimezone: true }),
  rejectionReason:  text("rejection_reason"),
  createdBy:        uuid("created_by").notNull().references(() => users.id),
  createdAt:        timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:        timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const resourceForecasts = pgTable("resource_forecasts", {
  id:                   uuid("id").primaryKey().defaultRandom(),
  projectId:            uuid("project_id").notNull().references(() => projects.id),
  unitId:               uuid("unit_id").notNull().references(() => projectUnits.id),
  masterBomEntryId:     uuid("master_bom_entry_id").notNull().references(() => masterBomEntries.id),
  forecastType:         forecastTypeEnum("forecast_type").notNull(),
  grossQuantity:        numeric("gross_quantity", { precision: 15, scale: 4 }).notNull(),
  quantityConsumed:     numeric("quantity_consumed", { precision: 15, scale: 4 }).notNull().default("0"),
  // quantity_remaining is a generated column in the DB — read-only from ORM
  status:               forecastStatusEnum("status").notNull().default("PENDING_PR"),
  purchaseRequisitionId: uuid("purchase_requisition_id").references(() => purchaseRequisitions.id),
  equipmentType:        varchar("equipment_type", { length: 100 }),
  createdAt:            timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:            timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const planningVarianceRequests = pgTable("planning_variance_requests", {
  id:                   uuid("id").primaryKey().defaultRandom(),
  projectId:            uuid("project_id").notNull().references(() => projects.id),
  requestType:          varianceRequestTypeEnum("request_type").notNull(),
  // BOM change fields
  masterBomEntryId:     uuid("master_bom_entry_id").references(() => masterBomEntries.id),
  bomChangeType:        varchar("bom_change_type", { length: 20 }),
  oldQuantity:          numeric("old_quantity", { precision: 15, scale: 4 }),
  newQuantity:          numeric("new_quantity", { precision: 15, scale: 4 }),
  newMaterialId:        uuid("new_material_id").references(() => materials.id),
  // Procurement variance fields
  resourceForecastId:   uuid("resource_forecast_id").references(() => resourceForecasts.id),
  purchaseRequisitionId: uuid("purchase_requisition_id").references(() => purchaseRequisitions.id),
  requestedQuantity:    numeric("requested_quantity", { precision: 15, scale: 4 }),
  isMinOrderQtyIssue:   boolean("is_min_order_qty_issue").notNull().default(false),
  // Common
  reason:               text("reason").notNull(),
  attachmentUrls:       jsonb("attachment_urls"),
  status:               bomStatusEnum("status").notNull().default("DRAFT"),
  submittedBy:          uuid("submitted_by").notNull().references(() => users.id),
  submittedAt:          timestamp("submitted_at", { withTimezone: true }),
  reviewedBy:           uuid("reviewed_by").references(() => users.id),
  reviewedAt:           timestamp("reviewed_at", { withTimezone: true }),
  rejectionReason:      text("rejection_reason"),
  createdAt:            timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:            timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
