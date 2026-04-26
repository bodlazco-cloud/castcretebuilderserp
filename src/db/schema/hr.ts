import {
  pgTable, uuid, varchar, numeric, boolean,
  timestamp, date, text, time,
} from "drizzle-orm/pg-core";
import { users, departments, costCenters } from "./core";
import { projectUnits } from "./units";

export const employees = pgTable("employees", {
  id:                     uuid("id").primaryKey().defaultRandom(),
  userId:                 uuid("user_id").references(() => users.id),
  employeeCode:           varchar("employee_code", { length: 50 }).notNull().unique(),
  fullName:               varchar("full_name", { length: 150 }).notNull(),
  deptId:                 uuid("dept_id").notNull().references(() => departments.id),
  costCenterId:           uuid("cost_center_id").notNull().references(() => costCenters.id),
  position:               varchar("position", { length: 100 }).notNull(),
  employmentType:         varchar("employment_type", { length: 20 }).notNull(),
  dailyRate:              numeric("daily_rate", { precision: 12, scale: 2 }).notNull(),
  sssContribution:        numeric("sss_contribution", { precision: 10, scale: 2 }).notNull().default("0"),
  philhealthContribution: numeric("philhealth_contribution", { precision: 10, scale: 2 }).notNull().default("0"),
  pagibigContribution:    numeric("pagibig_contribution", { precision: 10, scale: 2 }).notNull().default("0"),
  hireDate:               date("hire_date").notNull(),
  separationDate:         date("separation_date"),
  isActive:               boolean("is_active").notNull().default(true),
  createdAt:              timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:              timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const dailyTimeRecords = pgTable("daily_time_records", {
  id:           uuid("id").primaryKey().defaultRandom(),
  employeeId:   uuid("employee_id").notNull().references(() => employees.id),
  workDate:     date("work_date").notNull(),
  unitId:       uuid("unit_id").references(() => projectUnits.id),
  costCenterId: uuid("cost_center_id").notNull().references(() => costCenters.id),
  timeIn:       time("time_in"),
  timeOut:      time("time_out"),
  hoursWorked:  numeric("hours_worked", { precision: 5, scale: 2 }),
  overtimeHours: numeric("overtime_hours", { precision: 5, scale: 2 }).notNull().default("0"),
  isVerified:   boolean("is_verified").notNull().default(false),
  verifiedBy:   uuid("verified_by").references(() => users.id),
  verifiedAt:   timestamp("verified_at", { withTimezone: true }),
  fileUrl:      text("file_url"),
  createdAt:    timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const payrollRecords = pgTable("payroll_records", {
  id:                   uuid("id").primaryKey().defaultRandom(),
  employeeId:           uuid("employee_id").notNull().references(() => employees.id),
  costCenterId:         uuid("cost_center_id").notNull().references(() => costCenters.id),
  periodStart:          date("period_start").notNull(),
  periodEnd:            date("period_end").notNull(),
  daysWorked:           numeric("days_worked", { precision: 5, scale: 2 }).notNull().default("0"),
  overtimeHours:        numeric("overtime_hours", { precision: 7, scale: 2 }).notNull().default("0"),
  grossPay:             numeric("gross_pay", { precision: 12, scale: 2 }).notNull(),
  taxDeduction:         numeric("tax_deduction", { precision: 10, scale: 2 }).notNull().default("0"),
  sssDeduction:         numeric("sss_deduction", { precision: 10, scale: 2 }).notNull().default("0"),
  philhealthDeduction:  numeric("philhealth_deduction", { precision: 10, scale: 2 }).notNull().default("0"),
  pagibigDeduction:     numeric("pagibig_deduction", { precision: 10, scale: 2 }).notNull().default("0"),
  otherDeductions:      numeric("other_deductions", { precision: 10, scale: 2 }).notNull().default("0"),
  netPay:               numeric("net_pay", { precision: 12, scale: 2 }).notNull(),
  status:               varchar("status", { length: 20 }).notNull().default("DRAFT"),
  approvedBy:           uuid("approved_by").references(() => users.id),
  approvedAt:           timestamp("approved_at", { withTimezone: true }),
  paidAt:               timestamp("paid_at", { withTimezone: true }),
  createdAt:            timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const leaveSchedules = pgTable("leave_schedules", {
  id:          uuid("id").primaryKey().defaultRandom(),
  employeeId:  uuid("employee_id").notNull().references(() => employees.id),
  leaveType:   varchar("leave_type", { length: 30 }).notNull(),
  startDate:   date("start_date").notNull(),
  endDate:     date("end_date").notNull(),
  daysCount:   numeric("days_count", { precision: 5, scale: 0 }),  // generated in DB
  status:      varchar("status", { length: 20 }).notNull().default("PENDING"),
  approvedBy:  uuid("approved_by").references(() => users.id),
  approvedAt:  timestamp("approved_at", { withTimezone: true }),
  createdAt:   timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
