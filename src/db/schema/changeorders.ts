import {
  pgTable, uuid, varchar, numeric, boolean,
  timestamp, date, text, jsonb,
} from "drizzle-orm/pg-core";
import { users } from "./core";
import { projects } from "./projects";
import { activityDefinitions, bomStandards, materials } from "./admin";
import { unitTypeEnum, changeOrderTypeEnum } from "./enums";

export const changeOrderRequests = pgTable("change_order_requests", {
  id:               uuid("id").primaryKey().defaultRandom(),
  projectId:        uuid("project_id").notNull().references(() => projects.id),
  bomStandardId:    uuid("bom_standard_id").references(() => bomStandards.id),
  activityDefId:    uuid("activity_def_id").references(() => activityDefinitions.id),
  unitModel:        varchar("unit_model", { length: 50 }),
  unitType:         unitTypeEnum("unit_type"),
  materialId:       uuid("material_id").references(() => materials.id),
  changeType:       changeOrderTypeEnum("change_type").notNull(),
  oldQuantity:      numeric("old_quantity", { precision: 15, scale: 4 }),
  newQuantity:      numeric("new_quantity", { precision: 15, scale: 4 }),
  reason:           text("reason").notNull(),
  attachmentUrls:   jsonb("attachment_urls"),
  status:           varchar("status", { length: 20 }).notNull().default("PENDING"),
  requestedBy:      uuid("requested_by").notNull().references(() => users.id),
  reviewedBy:       uuid("reviewed_by").references(() => users.id),
  reviewedAt:       timestamp("reviewed_at", { withTimezone: true }),
  rejectionReason:  text("rejection_reason"),
  createdAt:        timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
