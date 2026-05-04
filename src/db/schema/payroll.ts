import {
  pgTable, uuid, numeric, boolean,
  timestamp, date, text,
} from "drizzle-orm/pg-core";
import { users, costCenters } from "./core";
import { employees } from "./hr";
import { payrollStatusEnum } from "./enums";

export const payrollRuns = pgTable("payroll_runs", {
  id:               uuid("id").primaryKey().defaultRandom(),
  periodStart:      date("period_start").notNull(),
  periodEnd:        date("period_end").notNull(),
  status:           payrollStatusEnum("status").notNull().default("DRAFT"),
  totalGross:       numeric("total_gross", { precision: 15, scale: 2 }),
  totalDeductions:  numeric("total_deductions", { precision: 15, scale: 2 }),
  totalNet:         numeric("total_net", { precision: 15, scale: 2 }),
  dtrVerified:      boolean("dtr_verified").notNull().default(false),
  processedBy:      uuid("processed_by").references(() => users.id),
  approvedBy:       uuid("approved_by").references(() => users.id),
  approvedAt:       timestamp("approved_at", { withTimezone: true }),
  rejectedBy:       uuid("rejected_by").references(() => users.id),
  rejectedAt:       timestamp("rejected_at", { withTimezone: true }),
  rejectionNote:    text("rejection_note"),
  releasedBy:       uuid("released_by").references(() => users.id),
  releasedAt:       timestamp("released_at", { withTimezone: true }),
  createdAt:        timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const payrollLineItems = pgTable("payroll_line_items", {
  id:                   uuid("id").primaryKey().defaultRandom(),
  payrollRunId:         uuid("payroll_run_id").notNull().references(() => payrollRuns.id),
  employeeId:           uuid("employee_id").notNull().references(() => employees.id),
  costCenterId:         uuid("cost_center_id").notNull().references(() => costCenters.id),
  daysWorked:           numeric("days_worked", { precision: 5, scale: 2 }).notNull(),
  overtimeHours:        numeric("overtime_hours", { precision: 5, scale: 2 }).notNull().default("0"),
  grossPay:             numeric("gross_pay", { precision: 12, scale: 2 }).notNull(),
  sssRegularDeduction:  numeric("sss_regular_deduction", { precision: 10, scale: 2 }).notNull().default("0"),
  sssMpfDeduction:      numeric("sss_mpf_deduction", { precision: 10, scale: 2 }).notNull().default("0"),
  philhealthDeduction:  numeric("philhealth_deduction", { precision: 10, scale: 2 }).notNull().default("0"),
  pagibigDeduction:     numeric("pagibig_deduction", { precision: 10, scale: 2 }).notNull().default("0"),
  taxWithheld:          numeric("tax_withheld", { precision: 10, scale: 2 }).notNull().default("0"),
  otherDeductions:      numeric("other_deductions", { precision: 10, scale: 2 }).notNull().default("0"),
  netPay:               numeric("net_pay", { precision: 12, scale: 2 }).notNull(),
  createdAt:            timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
