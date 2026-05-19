import {
  pgTable, uuid, varchar, numeric, boolean, timestamp, date, text,
} from "drizzle-orm/pg-core";
import { users } from "./core";
import { projects } from "./projects";
import { projectUnits } from "./units";
import { unitTypeEnum, bomStatusEnum } from "./enums";
import { materials } from "./admin";

export const mixDesigns = pgTable("mix_designs", {
  id:                  uuid("id").primaryKey().defaultRandom(),
  projectId:           uuid("project_id").notNull().references(() => projects.id),
  code:                varchar("code", { length: 50 }).notNull().unique(),
  name:                varchar("name", { length: 100 }).notNull(),
  cementBagsPerM3:     numeric("cement_bags_per_m3", { precision: 8, scale: 4 }).notNull(),
  sandKgPerM3:         numeric("sand_kg_per_m3", { precision: 10, scale: 4 }).notNull(),
  gravelKgPerM3:       numeric("gravel_kg_per_m3", { precision: 10, scale: 4 }).notNull(),
  waterLitersPerM3:    numeric("water_liters_per_m3", { precision: 8, scale: 4 }).notNull(),
  isActive:            boolean("is_active").notNull().default(true),
  status:              bomStatusEnum("status").notNull().default("DRAFT"),
  createdBy:           uuid("created_by").notNull().references(() => users.id),
  submittedBy:         uuid("submitted_by").references(() => users.id),
  submittedAt:         timestamp("submitted_at", { withTimezone: true }),
  approvedBy:          uuid("approved_by").references(() => users.id),
  approvedAt:          timestamp("approved_at", { withTimezone: true }),
  rejectionReason:     text("rejection_reason"),
  createdAt:           timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const batchingProductionLogs = pgTable("batching_production_logs", {
  id:                    uuid("id").primaryKey().defaultRandom(),
  projectId:             uuid("project_id").notNull().references(() => projects.id),
  mixDesignId:           uuid("mix_design_id").notNull().references(() => mixDesigns.id),
  batchDate:             date("batch_date").notNull(),
  shift:                 varchar("shift", { length: 5 }).notNull(),
  cementUsedBags:        numeric("cement_used_bags", { precision: 10, scale: 4 }).notNull(),
  sandUsedKg:            numeric("sand_used_kg", { precision: 10, scale: 4 }).notNull(),
  gravelUsedKg:          numeric("gravel_used_kg", { precision: 10, scale: 4 }).notNull(),
  volumeProducedM3:      numeric("volume_produced_m3", { precision: 10, scale: 4 }).notNull(),
  theoreticalYieldM3:    numeric("theoretical_yield_m3", { precision: 10, scale: 4 }).notNull(),
  yieldVariancePct:      numeric("yield_variance_pct", { precision: 7, scale: 4 }),  // generated in DB
  isProductionFlagged:   boolean("is_production_flagged").notNull().default(false),
  flagReason:            text("flag_reason"),
  operatorId:            uuid("operator_id").notNull().references(() => users.id),
  createdAt:             timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const concreteDeliveryNotes = pgTable("concrete_delivery_notes", {
  id:                  uuid("id").primaryKey().defaultRandom(),
  productionLogId:     uuid("production_log_id").notNull().references(() => batchingProductionLogs.id),
  projectId:           uuid("project_id").notNull().references(() => projects.id),
  unitId:              uuid("unit_id").notNull().references(() => projectUnits.id),
  volumeDispatchedM3:  numeric("volume_dispatched_m3", { precision: 10, scale: 4 }).notNull(),
  dispatchedAt:        timestamp("dispatched_at", { withTimezone: true }).notNull().defaultNow(),
  dispatchedBy:        uuid("dispatched_by").notNull().references(() => users.id),
});

export const concreteDeliveryReceipts = pgTable("concrete_delivery_receipts", {
  id:                  uuid("id").primaryKey().defaultRandom(),
  deliveryNoteId:      uuid("delivery_note_id").notNull().unique().references(() => concreteDeliveryNotes.id),
  unitId:              uuid("unit_id").notNull().references(() => projectUnits.id),
  volumeReceivedM3:    numeric("volume_received_m3", { precision: 10, scale: 4 }).notNull(),
  volumeVarianceM3:    numeric("volume_variance_m3", { precision: 10, scale: 4 }),
  isDeliveryFlagged:   boolean("is_delivery_flagged").notNull().default(false),
  receivedBy:          uuid("received_by").notNull().references(() => users.id),
  receivedAt:          timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
});

export const standardMixes = pgTable("standard_mixes", {
  id:                uuid("id").primaryKey().defaultRandom(),
  projectId:         uuid("project_id").notNull().references(() => projects.id),
  unitModel:         varchar("unit_model", { length: 50 }).notNull(),
  unitType:          unitTypeEnum("unit_type").notNull(),
  mixDesignId:       uuid("mix_design_id").references(() => mixDesigns.id),
  volumePerUnitM3:   numeric("volume_per_unit_m3", { precision: 10, scale: 4 }),
  description:       text("description"),
  isActive:          boolean("is_active").notNull().default(true),
  createdBy:         uuid("created_by").references(() => users.id),
  createdAt:         timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const mixDesignBom = pgTable("mix_design_bom", {
  id:               uuid("id").primaryKey().defaultRandom(),
  mixDesignId:      uuid("mix_design_id").notNull().references(() => mixDesigns.id, { onDelete: "cascade" }),
  materialId:       uuid("material_id").notNull().references(() => materials.id),
  requiredQuantity: numeric("required_quantity", { precision: 10, scale: 4 }).notNull(),
  unitOfMeasure:    varchar("unit_of_measure", { length: 10 }).notNull(),
  sortOrder:        numeric("sort_order", { precision: 5, scale: 0 }).default("0"),
  notes:            text("notes"),
  createdAt:        timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// IPO status: PENDING → ACCEPTED → IN_PRODUCTION → DELIVERED → BILLED
export const internalPurchaseOrders = pgTable("internal_purchase_orders", {
  id:                uuid("id").primaryKey().defaultRandom(),
  ipoNumber:         varchar("ipo_number", { length: 50 }).notNull().unique(),
  projectId:         uuid("project_id").notNull().references(() => projects.id),
  unitId:            uuid("unit_id").notNull().references(() => projectUnits.id),
  mixDesignId:       uuid("mix_design_id").notNull().references(() => mixDesigns.id),
  requestedVolumeM3: numeric("requested_volume_m3", { precision: 10, scale: 4 }).notNull(),
  status:            varchar("status", { length: 20 }).notNull().default("PENDING"),
  triggeredBy:       varchar("triggered_by", { length: 100 }),
  internalRatePerM3: numeric("internal_rate_per_m3", { precision: 15, scale: 2 }),
  requestedBy:       uuid("requested_by").references(() => users.id),
  acceptedBy:        uuid("accepted_by").references(() => users.id),
  acceptedAt:        timestamp("accepted_at", { withTimezone: true }),
  productionLogId:   uuid("production_log_id").references(() => batchingProductionLogs.id),
  notes:             text("notes"),
  createdAt:         timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:         timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const batchingInternalSales = pgTable("batching_internal_sales", {
  id:                    uuid("id").primaryKey().defaultRandom(),
  deliveryReceiptId:     uuid("delivery_receipt_id").notNull().references(() => concreteDeliveryReceipts.id),
  projectId:             uuid("project_id").notNull().references(() => projects.id),
  unitId:                uuid("unit_id").notNull().references(() => projectUnits.id),
  volumeM3:              numeric("volume_m3", { precision: 10, scale: 4 }).notNull(),
  internalRatePerM3:     numeric("internal_rate_per_m3", { precision: 15, scale: 2 }).notNull(),
  totalInternalRevenue:  numeric("total_internal_revenue", { precision: 15, scale: 2 }), // generated in DB
  transactionDate:       date("transaction_date").notNull(),
  createdAt:             timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
