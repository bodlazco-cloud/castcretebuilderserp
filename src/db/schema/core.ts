import {
  pgTable, uuid, varchar, boolean, timestamp, jsonb,
} from "drizzle-orm/pg-core";
import { deptCodeEnum, costCenterTypeEnum } from "./enums";

export const departments = pgTable("departments", {
  id:              uuid("id").primaryKey().defaultRandom(),
  code:            deptCodeEnum("code").notNull().unique(),
  name:            varchar("name", { length: 100 }).notNull(),
  headEmployeeId:  uuid("head_employee_id"),
  createdAt:       timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const costCenters = pgTable("cost_centers", {
  id:        uuid("id").primaryKey().defaultRandom(),
  code:      varchar("code", { length: 50 }).notNull().unique(),
  name:      varchar("name", { length: 100 }).notNull(),
  deptId:    uuid("dept_id").notNull().references(() => departments.id),
  type:      costCenterTypeEnum("type").notNull(),
  isActive:  boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const users = pgTable("users", {
  id:        uuid("id").primaryKey().defaultRandom(),
  email:     varchar("email", { length: 200 }).notNull().unique(),
  fullName:  varchar("full_name", { length: 150 }).notNull(),
  deptId:    uuid("dept_id").references(() => departments.id),
  role:      varchar("role", { length: 50 }).notNull(),
  isActive:  boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const adminSettings = pgTable("admin_settings", {
  id:           uuid("id").primaryKey().defaultRandom(),
  projectId:    uuid("project_id"),
  settingKey:   varchar("setting_key", { length: 100 }).notNull(),
  settingValue: jsonb("setting_value").notNull(),
  version:      uuid("version"),
  isActive:     boolean("is_active").notNull().default(true),
  createdBy:    uuid("created_by").notNull().references(() => users.id),
  approvedBy:   uuid("approved_by").references(() => users.id),
  approvedAt:   timestamp("approved_at", { withTimezone: true }),
  createdAt:    timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
