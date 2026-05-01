import {
  pgTable, uuid, varchar, numeric,
  timestamp, check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { projects } from "./projects";
import { projectUnits } from "./units";
import { bomStandards, materials } from "./admin";
import { taskAssignments } from "./construction";
import { purchaseRequisitions } from "./procurement";
import { resourceForecastStatusEnum } from "./enums";

/**
 * Resource Forecasts — The Chain of Necessity Output
 *
 * Rows here are AUTO-CREATED by the PostgreSQL trigger `trigger_forecast_on_ntp_active`
 * (defined in db/migrations/014_resource_forecasting.sql) whenever a task_assignment
 * transitions to ACTIVE status. One row is inserted per BOM standard line that matches
 * the unit's model type.
 *
 * Flow: NTP issued (ACTIVE) → trigger → resource_forecasts rows (PENDING_PR)
 *       → Procurement clicks "Generate PR" → status → PR_CREATED
 *       → PO raised → status → PO_ISSUED
 *       → Material transferred to site → status → ISSUED
 *
 * The 10% variance check enforces that actual issuance never silently exceeds
 * the BOM forecast by more than the Admin-approved tolerance.
 */
export const resourceForecasts = pgTable(
  "resource_forecasts",
  {
    id:               uuid("id").primaryKey().defaultRandom(),
    ntpId:            uuid("ntp_id").notNull().references(() => taskAssignments.id),
    projectId:        uuid("project_id").notNull().references(() => projects.id),
    unitId:           uuid("unit_id").notNull().references(() => projectUnits.id),
    bomStandardId:    uuid("bom_standard_id").notNull().references(() => bomStandards.id),
    materialId:       uuid("material_id").notNull().references(() => materials.id),
    forecastQty:      numeric("forecast_qty",      { precision: 15, scale: 4 }).notNull(),
    actualIssuedQty:  numeric("actual_issued_qty", { precision: 15, scale: 4 }).notNull().default("0"),
    status:           resourceForecastStatusEnum("status").notNull().default("PENDING_PR"),
    prId:             uuid("pr_id").references(() => purchaseRequisitions.id),  // set when PR is generated
    createdAt:        timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt:        timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    // Max 10% over-issuance allowed; hard enforcement lives in the DB trigger/constraint
    varianceCheck: check(
      "qty_variance_check",
      sql`${t.actualIssuedQty} <= ${t.forecastQty} * 1.10`,
    ),
  }),
);
