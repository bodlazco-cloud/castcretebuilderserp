import {
  pgTable, uuid, varchar, numeric, boolean,
  timestamp, date, text,
} from "drizzle-orm/pg-core";
import { users, costCenters, departments } from "./core";
import { projects } from "./projects";
import { projectUnits, unitMilestones } from "./units";
import { subcontractors } from "./subcontractors";
import { purchaseOrders } from "./procurement";
import { workAccomplishedReports } from "./construction";
import { resourceTypeEnum, transactionTypeEnum, approvalStatusEnum, paymentFlowStatusEnum } from "./enums";

export const financialLedger = pgTable("financial_ledger", {
  id:              uuid("id").primaryKey().defaultRandom(),
  projectId:       uuid("project_id").notNull().references(() => projects.id),
  costCenterId:    uuid("cost_center_id").notNull().references(() => costCenters.id),
  deptId:          uuid("dept_id").notNull().references(() => departments.id),
  unitId:          uuid("unit_id").references(() => projectUnits.id),
  resourceType:    resourceTypeEnum("resource_type").notNull(),
  resourceId:      uuid("resource_id").notNull(),       // polymorphic: employee / material / equipment
  transactionType: transactionTypeEnum("transaction_type").notNull(),
  referenceType:   varchar("reference_type", { length: 50 }).notNull(),
  referenceId:     uuid("reference_id").notNull(),
  amount:          numeric("amount", { precision: 15, scale: 2 }).notNull(),
  isExternal:      boolean("is_external").notNull().default(true),
  transactionDate: date("transaction_date").notNull(),
  description:     text("description"),
  createdAt:       timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const developerAdvanceTracker = pgTable("developer_advance_tracker", {
  id:               uuid("id").primaryKey().defaultRandom(),
  projectId:        uuid("project_id").notNull().unique().references(() => projects.id),
  totalAdvance:     numeric("total_advance", { precision: 15, scale: 2 }).notNull().default("63750000.00"),
  totalRecovered:   numeric("total_recovered", { precision: 15, scale: 2 }).notNull().default("0.00"),
  remainingBalance: numeric("remaining_balance", { precision: 15, scale: 2 }), // generated in DB
  lastUpdated:      timestamp("last_updated", { withTimezone: true }).notNull().defaultNow(),
});

export const invoices = pgTable("invoices", {
  id:                   uuid("id").primaryKey().defaultRandom(),
  projectId:            uuid("project_id").notNull().references(() => projects.id),
  warId:                uuid("war_id").notNull().references(() => workAccomplishedReports.id),
  unitMilestoneId:      uuid("unit_milestone_id").notNull().references(() => unitMilestones.id),
  grossAccomplishment:  numeric("gross_accomplishment", { precision: 15, scale: 2 }).notNull(),
  lessDpRecovery:       numeric("less_dp_recovery", { precision: 15, scale: 2 }).notNull().default("0"),
  lessOsmDeduction:     numeric("less_osm_deduction", { precision: 15, scale: 2 }).notNull().default("0"),
  lessRetention:        numeric("less_retention", { precision: 15, scale: 2 }).notNull().default("0"),
  netAmountDue:         numeric("net_amount_due", { precision: 15, scale: 2 }), // generated in DB
  status:               varchar("status", { length: 30 }).notNull().default("DRAFT"),
  generatedAt:          timestamp("generated_at", { withTimezone: true }).notNull().defaultNow(),
  submittedAt:          timestamp("submitted_at", { withTimezone: true }),
  collectedAt:          timestamp("collected_at", { withTimezone: true }),
  collectionAmount:     numeric("collection_amount", { precision: 15, scale: 2 }),
  createdAt:            timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const payables = pgTable("payables", {
  id:                      uuid("id").primaryKey().defaultRandom(),
  projectId:               uuid("project_id").notNull().references(() => projects.id),
  subconId:                uuid("subcon_id").notNull().references(() => subcontractors.id),
  warId:                   uuid("war_id").notNull().references(() => workAccomplishedReports.id),
  grossAmount:             numeric("gross_amount", { precision: 15, scale: 2 }).notNull(),
  lessAdvanceRecoupment:   numeric("less_advance_recoupment", { precision: 15, scale: 2 }).notNull().default("0"),
  netPayable:              numeric("net_payable", { precision: 15, scale: 2 }), // generated in DB
  status:                  approvalStatusEnum("status").notNull().default("DRAFT"),
  rejectionReason:         text("rejection_reason"),
  auditVerifiedBy:         uuid("audit_verified_by").references(() => users.id),
  auditVerifiedAt:         timestamp("audit_verified_at", { withTimezone: true }),
  bodApprovedBy:           uuid("bod_approved_by").references(() => users.id),
  bodApprovedAt:           timestamp("bod_approved_at", { withTimezone: true }),
  paidAt:                  timestamp("paid_at", { withTimezone: true }),
  createdAt:               timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const manualVouchers = pgTable("manual_vouchers", {
  id:                  uuid("id").primaryKey().defaultRandom(),
  projectId:           uuid("project_id").notNull().references(() => projects.id),
  costCenterId:        uuid("cost_center_id").notNull().references(() => costCenters.id),
  description:         text("description").notNull(),
  amount:              numeric("amount", { precision: 15, scale: 2 }).notNull(),
  requiresBodApproval: boolean("requires_bod_approval").notNull().default(false),
  supportingDocUrl:    text("supporting_doc_url"),
  status:              approvalStatusEnum("status").notNull().default("DRAFT"),
  paymentStatus:       paymentFlowStatusEnum("payment_status").notNull().default("DRAFT"),
  createdBy:           uuid("created_by").notNull().references(() => users.id),
  preparedBy:          uuid("prepared_by").references(() => users.id),
  approvedBy:          uuid("approved_by").references(() => users.id),
  approvedAt:          timestamp("approved_at", { withTimezone: true }),
  authorizedBy:        uuid("authorized_by").references(() => users.id),
  paidAt:              timestamp("paid_at", { withTimezone: true }),
  createdAt:           timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const paymentRequests = pgTable("payment_requests", {
  id:            uuid("id").primaryKey().defaultRandom(),
  projectId:     uuid("project_id").notNull().references(() => projects.id),
  poId:          uuid("po_id").references(() => purchaseOrders.id),
  payableId:     uuid("payable_id").references(() => payables.id),
  voucherId:     uuid("voucher_id").references(() => manualVouchers.id),
  requestType:   varchar("request_type", { length: 30 }).notNull(),
  amount:        numeric("amount", { precision: 15, scale: 2 }).notNull(),
  costCenterId:  uuid("cost_center_id").notNull().references(() => costCenters.id),
  status:        varchar("status", { length: 20 }).notNull().default("PENDING"),
  requestedBy:   uuid("requested_by").notNull().references(() => users.id),
  approvedBy:    uuid("approved_by").references(() => users.id),
  approvedAt:    timestamp("approved_at", { withTimezone: true }),
  releasedAt:    timestamp("released_at", { withTimezone: true }),
  createdAt:     timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const cashFlowProjections = pgTable("cash_flow_projections", {
  id:                        uuid("id").primaryKey().defaultRandom(),
  projectId:                 uuid("project_id").notNull().references(() => projects.id),
  projectionDate:            date("projection_date").notNull(),
  periodDays:                numeric("period_days", { precision: 3, scale: 0 }).notNull(),
  currentBankBalance:        numeric("current_bank_balance", { precision: 15, scale: 2 }).notNull(),
  verifiedReceivables:       numeric("verified_receivables", { precision: 15, scale: 2 }).notNull(),
  approvedPayables:          numeric("approved_payables", { precision: 15, scale: 2 }).notNull(),
  projectedMaterialOutflow:  numeric("projected_material_outflow", { precision: 15, scale: 2 }).notNull(),
  projectedLaborOutflow:     numeric("projected_labor_outflow", { precision: 15, scale: 2 }).notNull(),
  projectedInflow:           numeric("projected_inflow", { precision: 15, scale: 2 }).notNull(),
  netGap:                    numeric("net_gap", { precision: 15, scale: 2 }), // generated in DB
  isBelowBuffer:             boolean("is_below_buffer").notNull().default(false),
  alertSent:                 boolean("alert_sent").notNull().default(false),
  alertSentAt:               timestamp("alert_sent_at", { withTimezone: true }),
  generatedAt:               timestamp("generated_at", { withTimezone: true }).notNull().defaultNow(),
});
