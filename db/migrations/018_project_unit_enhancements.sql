-- Migration 018: Add contract_price and turnover fields to project_units,
-- and create project_unit_models table (missing from schema).

ALTER TABLE project_units
  ADD COLUMN IF NOT EXISTS contract_price  NUMERIC(15,2),
  ADD COLUMN IF NOT EXISTS turned_over_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS turnover_cost   NUMERIC(15,2);

-- Unit model names per project (used by rate card dropdowns)
CREATE TABLE IF NOT EXISTS project_unit_models (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name        VARCHAR(50) NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, name)
);
