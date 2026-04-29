import {
  pgTable, uuid, varchar, numeric, integer,
  timestamp, date, text,
} from "drizzle-orm/pg-core";
import { users, costCenters } from "./core";
import { projects } from "./projects";
import { activityDefinitions } from "./admin";
import { subcontractors } from "./subcontractors";
import { equipment } from "./motorpool";
import { employees } from "./hr";

export const constructionManpowerLogs = pgTable("construction_manpower_logs", {
  id:                 uuid("id").primaryKey().defaultRandom(),
  projectId:          uuid("project_id").notNull().references(() => projects.id),
  logDate:            date("log_date").notNull(),
  activityDefId:      uuid("activity_def_id").references(() => activityDefinitions.id),
  subconId:           uuid("subcon_id").references(() => subcontractors.id),
  subconHeadcount:    integer("subcon_headcount").notNull().default(0),
  directStaffCount:   integer("direct_staff_count").notNull().default(0),
  remarks:            text("remarks"),
  recordedBy:         uuid("recorded_by").notNull().references(() => users.id),
  createdAt:          timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const batchingManpowerLogs = pgTable("batching_manpower_logs", {
  id:             uuid("id").primaryKey().defaultRandom(),
  logDate:        date("log_date").notNull(),
  employeeId:     uuid("employee_id").notNull().references(() => employees.id),
  shift:          varchar("shift", { length: 10 }).notNull(),
  hoursWorked:    numeric("hours_worked", { precision: 5, scale: 2 }).notNull(),
  overtimeHours:  numeric("overtime_hours", { precision: 5, scale: 2 }).notNull().default("0"),
  costCenterId:   uuid("cost_center_id").notNull().references(() => costCenters.id),
  recordedBy:     uuid("recorded_by").notNull().references(() => users.id),
  createdAt:      timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const fleetManpowerLogs = pgTable("fleet_manpower_logs", {
  id:             uuid("id").primaryKey().defaultRandom(),
  logDate:        date("log_date").notNull(),
  employeeId:     uuid("employee_id").notNull().references(() => employees.id),
  equipmentId:    uuid("equipment_id").references(() => equipment.id),
  hoursWorked:    numeric("hours_worked", { precision: 5, scale: 2 }).notNull(),
  overtimeHours:  numeric("overtime_hours", { precision: 5, scale: 2 }).notNull().default("0"),
  costCenterId:   uuid("cost_center_id").notNull().references(() => costCenters.id),
  recordedBy:     uuid("recorded_by").notNull().references(() => users.id),
  createdAt:      timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
