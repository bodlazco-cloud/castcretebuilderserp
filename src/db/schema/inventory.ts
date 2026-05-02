import {
  pgTable, uuid, numeric, timestamp, unique,
} from "drizzle-orm/pg-core";
import { materials } from "./admin";
import { projects } from "./projects";

// Running balance per material per site, kept in sync by
// fn_sync_inventory_ledger trigger on material_movement_logs.
// RECEIPT → total_bulk_qty; ISSUANCE/TRANSFER-OUT → allocated_qty;
// ADJUSTMENT can affect either column depending on sign.
export const virtualInventoryLedger = pgTable("virtual_inventory_ledger", {
  id:            uuid("id").primaryKey().defaultRandom(),
  materialId:    uuid("material_id").notNull().references(() => materials.id),
  projectId:     uuid("project_id").notNull().references(() => projects.id),
  totalBulkQty:  numeric("total_bulk_qty", { precision: 12, scale: 2 }).notNull().default("0"),
  allocatedQty:  numeric("allocated_qty", { precision: 12, scale: 2 }).notNull().default("0"),
  remainingQty:  numeric("remaining_qty", { precision: 12, scale: 2 }), // generated in DB
  updatedAt:     timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  uniqMaterialSite: unique("uq_inventory_material_project").on(t.materialId, t.projectId),
}));
