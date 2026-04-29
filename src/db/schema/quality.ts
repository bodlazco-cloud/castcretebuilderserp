import {
  pgTable, uuid, varchar, boolean,
  timestamp, date, text, jsonb,
} from "drizzle-orm/pg-core";
import { users } from "./core";
import { projects } from "./projects";
import { projectUnits } from "./units";
import { punchListStatusEnum } from "./enums";

export const punchLists = pgTable("punch_lists", {
  id:              uuid("id").primaryKey().defaultRandom(),
  projectId:       uuid("project_id").notNull().references(() => projects.id),
  unitId:          uuid("unit_id").references(() => projectUnits.id),
  item:            text("item").notNull(),
  category:        varchar("category", { length: 50 }).notNull(),
  status:          punchListStatusEnum("status").notNull().default("OPEN"),
  assignedTo:      uuid("assigned_to").references(() => users.id),
  dueDate:         date("due_date"),
  attachmentUrls:  jsonb("attachment_urls"),
  closedAt:        timestamp("closed_at", { withTimezone: true }),
  closedBy:        uuid("closed_by").references(() => users.id),
  createdBy:       uuid("created_by").notNull().references(() => users.id),
  createdAt:       timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const turnoverCertificates = pgTable("turnover_certificates", {
  id:              uuid("id").primaryKey().defaultRandom(),
  unitId:          uuid("unit_id").notNull().references(() => projectUnits.id),
  turnoverDate:    date("turnover_date").notNull(),
  status:          varchar("status", { length: 20 }).notNull().default("DRAFT"),
  certificateUrl:  text("certificate_url"),
  inspectedBy:     uuid("inspected_by").notNull().references(() => users.id),
  approvedBy:      uuid("approved_by").references(() => users.id),
  approvedAt:      timestamp("approved_at", { withTimezone: true }),
  createdAt:       timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
