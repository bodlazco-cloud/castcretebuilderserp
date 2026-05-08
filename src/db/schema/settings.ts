import { pgTable, varchar, text, timestamp } from "drizzle-orm/pg-core";

export const globalSettings = pgTable("global_settings", {
  key:         varchar("key", { length: 100 }).primaryKey(),
  value:       text("value"),
  label:       varchar("label", { length: 200 }).notNull(),
  description: text("description"),
  updatedAt:   timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
