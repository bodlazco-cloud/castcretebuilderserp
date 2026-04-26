import {
  pgTable, uuid, varchar, numeric, integer, boolean,
  timestamp, date, text,
} from "drizzle-orm/pg-core";
import { users } from "./core";
import { workCategoryEnum } from "./enums";

export const developers = pgTable("developers", {
  id:          uuid("id").primaryKey().defaultRandom(),
  name:        varchar("name", { length: 150 }).notNull(),
  contactInfo: uuid("contact_info"),          // stored as jsonb in DB
  isActive:    boolean("is_active").notNull().default(true),
  createdAt:   timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const projects = pgTable("projects", {
  id:                       uuid("id").primaryKey().defaultRandom(),
  name:                     varchar("name", { length: 200 }).notNull(),
  developerId:              uuid("developer_id").notNull().references(() => developers.id),
  contractValue:            numeric("contract_value", { precision: 15, scale: 2 }).notNull(),
  developerAdvance:         numeric("developer_advance", { precision: 15, scale: 2 }).notNull().default("63750000.00"),
  advanceRecovered:         numeric("advance_recovered", { precision: 15, scale: 2 }).notNull().default("0.00"),
  targetUnitsPerMonth:      integer("target_units_per_month").notNull().default(120),
  minOperatingCashBuffer:   numeric("min_operating_cash_buffer", { precision: 15, scale: 2 }).notNull().default("5000000.00"),
  status:                   varchar("status", { length: 30 }).notNull().default("BIDDING"),
  ntpDocumentUrl:           text("ntp_document_url"),
  ntpUploadedAt:            timestamp("ntp_uploaded_at", { withTimezone: true }),
  ntpUploadedBy:            uuid("ntp_uploaded_by").references(() => users.id),
  bodApprovedAt:            timestamp("bod_approved_at", { withTimezone: true }),
  bodApprovedBy:            uuid("bod_approved_by").references(() => users.id),
  startDate:                date("start_date"),
  endDate:                  date("end_date"),
  createdAt:                timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:                timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const developerRateCards = pgTable("developer_rate_cards", {
  id:                uuid("id").primaryKey().defaultRandom(),
  projectId:         uuid("project_id").notNull().references(() => projects.id),
  milestoneCategory: workCategoryEnum("milestone_category").notNull(),
  grossRatePerUnit:  numeric("gross_rate_per_unit", { precision: 15, scale: 2 }).notNull(),
  retentionPct:      numeric("retention_pct", { precision: 5, scale: 4 }).notNull().default("0.10"),
  dpRecoupmentPct:   numeric("dp_recoupment_pct", { precision: 5, scale: 4 }).notNull().default("0.10"),
  taxPct:            numeric("tax_pct", { precision: 5, scale: 4 }).notNull().default("0.00"),
  version:           integer("version").notNull().default(1),
  isActive:          boolean("is_active").notNull().default(true),
  approvedBy:        uuid("approved_by").references(() => users.id),
  approvedAt:        timestamp("approved_at", { withTimezone: true }),
  createdAt:         timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const blocks = pgTable("blocks", {
  id:         uuid("id").primaryKey().defaultRandom(),
  projectId:  uuid("project_id").notNull().references(() => projects.id),
  blockName:  varchar("block_name", { length: 50 }).notNull(),
  totalLots:  integer("total_lots").notNull(),
  createdAt:  timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
