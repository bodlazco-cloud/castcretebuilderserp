-- Migration 028: Batching Plant equipment rental log
-- Tracks which Motorpool equipment was used per batch/day, hours operated,
-- and the cost (hours × daily_rate / 8). Two ledger entries are auto-posted:
--   Debit  → Batching Plant production cost center (OUTFLOW)
--   Credit → Motorpool department cost center (INFLOW)

CREATE TABLE IF NOT EXISTS batching_equipment_rentals (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  production_log_id   UUID REFERENCES batching_production_logs(id),
  equipment_id        UUID NOT NULL REFERENCES equipment(id),
  project_id          UUID NOT NULL REFERENCES projects(id),
  usage_date          DATE NOT NULL,
  hours_operated      NUMERIC(8, 2) NOT NULL,
  daily_rate_snapshot NUMERIC(15, 2) NOT NULL,
  total_cost          NUMERIC(15, 2) NOT NULL,
  notes               TEXT,
  logged_by           UUID NOT NULL REFERENCES users(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_batching_eq_rentals_project
  ON batching_equipment_rentals(project_id);

CREATE INDEX IF NOT EXISTS idx_batching_eq_rentals_equipment
  ON batching_equipment_rentals(equipment_id);

CREATE INDEX IF NOT EXISTS idx_batching_eq_rentals_prod_log
  ON batching_equipment_rentals(production_log_id);
