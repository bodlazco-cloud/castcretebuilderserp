import {
  pgTable, uuid, varchar, numeric, boolean,
  timestamp, date, text, integer,
} from "drizzle-orm/pg-core";
import { users } from "./core";
import { projects } from "./projects";
import { projectUnits } from "./units";
import { activityDefinitions, materials, suppliers } from "./admin";
import { approvalStatusEnum, poStatusEnum, inventorySourceEnum } from "./enums";

export const purchaseRequisitions = pgTable("purchase_requisitions", {
  id:                 uuid("id").primaryKey().defaultRandom(),
  projectId:          uuid("project_id").notNull().references(() => projects.id),
  unitId:             uuid("unit_id").references(() => projectUnits.id),
  taskAssignmentId:   uuid("task_assignment_id"),   // FK patched after construction schema
  activityDefId:      uuid("activity_def_id").references(() => activityDefinitions.id),
  status:             approvalStatusEnum("status").notNull().default("DRAFT"),
  requestedBy:        uuid("requested_by").notNull().references(() => users.id),
  approvedBy:         uuid("approved_by").references(() => users.id),
  approvedAt:         timestamp("approved_at", { withTimezone: true }),
  rejectionReason:    text("rejection_reason"),
  createdAt:          timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const purchaseRequisitionItems = pgTable("purchase_requisition_items", {
  id:               uuid("id").primaryKey().defaultRandom(),
  prId:             uuid("pr_id").notNull().references(() => purchaseRequisitions.id),
  materialId:       uuid("material_id").notNull().references(() => materials.id),
  quantityRequired: numeric("quantity_required", { precision: 15, scale: 4 }).notNull(),
  quantityInStock:  numeric("quantity_in_stock", { precision: 15, scale: 4 }).notNull().default("0"),
  quantityToOrder:  numeric("quantity_to_order", { precision: 15, scale: 4 }).notNull(),
  unitPrice:        numeric("unit_price", { precision: 15, scale: 2 }).notNull(),
});

export const purchaseOrders = pgTable("purchase_orders", {
  id:                   uuid("id").primaryKey().defaultRandom(),
  prId:                 uuid("pr_id").notNull().references(() => purchaseRequisitions.id),
  projectId:            uuid("project_id").notNull().references(() => projects.id),
  supplierId:           uuid("supplier_id").notNull().references(() => suppliers.id),
  status:               poStatusEnum("status").notNull().default("DRAFT"),
  isPrepaid:            boolean("is_prepaid").notNull().default(false),
  proformaInvoiceUrl:   text("proforma_invoice_url"),
  totalAmount:          numeric("total_amount", { precision: 15, scale: 2 }).notNull(),
  createdBy:            uuid("created_by").notNull().references(() => users.id),
  createdAt:            timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  auditReviewedBy:      uuid("audit_reviewed_by").references(() => users.id),
  auditReviewedAt:      timestamp("audit_reviewed_at", { withTimezone: true }),
  bodApprovedBy:        uuid("bod_approved_by").references(() => users.id),
  bodApprovedAt:        timestamp("bod_approved_at", { withTimezone: true }),
  deliveredAt:          timestamp("delivered_at", { withTimezone: true }),
});

export const purchaseOrderItems = pgTable("purchase_order_items", {
  id:          uuid("id").primaryKey().defaultRandom(),
  poId:        uuid("po_id").notNull().references(() => purchaseOrders.id),
  materialId:  uuid("material_id").notNull().references(() => materials.id),
  quantity:    numeric("quantity", { precision: 15, scale: 4 }).notNull(),
  unitPrice:   numeric("unit_price", { precision: 15, scale: 2 }).notNull(),
  totalPrice:  numeric("total_price", { precision: 15, scale: 2 }).notNull(),  // generated in DB
});

export const materialReceivingReports = pgTable("material_receiving_reports", {
  id:            uuid("id").primaryKey().defaultRandom(),
  poId:          uuid("po_id").references(() => purchaseOrders.id),
  projectId:     uuid("project_id").notNull().references(() => projects.id),
  sourceType:    inventorySourceEnum("source_type").notNull(),
  supplierId:    uuid("supplier_id").references(() => suppliers.id),
  receivedDate:  date("received_date").notNull(),
  receivedBy:    uuid("received_by").notNull().references(() => users.id),
  notes:         text("notes"),
  status:        varchar("status", { length: 20 }).notNull().default("PENDING"),
  createdAt:     timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const mrrItems = pgTable("mrr_items", {
  id:               uuid("id").primaryKey().defaultRandom(),
  mrrId:            uuid("mrr_id").notNull().references(() => materialReceivingReports.id),
  materialId:       uuid("material_id").notNull().references(() => materials.id),
  quantityReceived: numeric("quantity_received", { precision: 15, scale: 4 }).notNull(),
  unitPrice:        numeric("unit_price", { precision: 15, scale: 2 }).notNull(),
  shadowPrice:      numeric("shadow_price", { precision: 15, scale: 2 }).notNull().default("0.00"),
});

export const inventoryLedger = pgTable("inventory_ledger", {
  id:                uuid("id").primaryKey().defaultRandom(),
  batchId:           uuid("batch_id").notNull().unique().defaultRandom(),
  materialId:        uuid("material_id").notNull().references(() => materials.id),
  projectId:         uuid("project_id").notNull().references(() => projects.id),
  mrrId:             uuid("mrr_id").notNull().references(() => materialReceivingReports.id),
  sourceType:        inventorySourceEnum("source_type").notNull(),
  quantityReceived:  numeric("quantity_received", { precision: 15, scale: 4 }).notNull(),
  quantityRemaining: numeric("quantity_remaining", { precision: 15, scale: 4 }).notNull(),
  unitPrice:         numeric("unit_price", { precision: 15, scale: 2 }).notNull(),
  shadowPrice:       numeric("shadow_price", { precision: 15, scale: 2 }).notNull().default("0.00"),
  receivedAt:        timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
});

export const inventoryStock = pgTable("inventory_stock", {
  id:               uuid("id").primaryKey().defaultRandom(),
  materialId:       uuid("material_id").notNull().references(() => materials.id),
  projectId:        uuid("project_id").notNull().references(() => projects.id),
  quantityOnHand:   numeric("quantity_on_hand", { precision: 15, scale: 4 }).notNull().default("0"),
  quantityReserved: numeric("quantity_reserved", { precision: 15, scale: 4 }).notNull().default("0"),
  lastUpdated:      timestamp("last_updated", { withTimezone: true }).notNull().defaultNow(),
});

export const materialTransfers = pgTable("material_transfers", {
  id:              uuid("id").primaryKey().defaultRandom(),
  projectId:       uuid("project_id").notNull().references(() => projects.id),
  unitId:          uuid("unit_id").notNull().references(() => projectUnits.id),
  batchId:         uuid("batch_id").notNull().references(() => inventoryLedger.batchId),
  materialId:      uuid("material_id").notNull().references(() => materials.id),
  quantity:        numeric("quantity", { precision: 15, scale: 4 }).notNull(),
  unitPrice:       numeric("unit_price", { precision: 15, scale: 2 }).notNull(),
  isOsm:           boolean("is_osm").notNull().default(false),
  shadowPrice:     numeric("shadow_price", { precision: 15, scale: 2 }).notNull().default("0.00"),
  signedByUser:    uuid("signed_by_user").references(() => users.id),
  transferDate:    date("transfer_date").notNull(),
  status:          varchar("status", { length: 20 }).notNull().default("PENDING"),
  createdBy:       uuid("created_by").notNull().references(() => users.id),
  createdAt:       timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const osmDeductionBuckets = pgTable("osm_deduction_buckets", {
  id:             uuid("id").primaryKey().defaultRandom(),
  projectId:      uuid("project_id").notNull().references(() => projects.id),
  unitId:         uuid("unit_id").notNull().references(() => projectUnits.id),
  totalOsmValue:  numeric("total_osm_value", { precision: 15, scale: 2 }).notNull().default("0.00"),
  amountApplied:  numeric("amount_applied", { precision: 15, scale: 2 }).notNull().default("0.00"),
  amountPending:  numeric("amount_pending", { precision: 15, scale: 2 }), // generated in DB
  lastUpdated:    timestamp("last_updated", { withTimezone: true }).notNull().defaultNow(),
});
