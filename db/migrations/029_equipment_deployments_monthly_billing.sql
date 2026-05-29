-- Migration 029: Fixed-rate equipment deployments + auto monthly billing
-- Replaces the per-batch batching_equipment_rentals approach with a structured
-- deployment model. Motorpool assigns a machine to a department at a fixed
-- monthly rate; a cron job auto-posts billing on the 1st of each month.

CREATE TABLE IF NOT EXISTS equipment_deployments (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id         UUID NOT NULL REFERENCES equipment(id),
  deployed_to_dept_id  UUID NOT NULL REFERENCES departments(id),
  project_id           UUID REFERENCES projects(id),
  monthly_rate         NUMERIC(15, 2) NOT NULL,
  start_date           DATE NOT NULL,
  end_date             DATE,
  status               VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  notes                TEXT,
  approved_by          UUID REFERENCES users(id),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_equip_deployments_equipment
  ON equipment_deployments(equipment_id);
CREATE INDEX IF NOT EXISTS idx_equip_deployments_dept
  ON equipment_deployments(deployed_to_dept_id);
CREATE INDEX IF NOT EXISTS idx_equip_deployments_status
  ON equipment_deployments(status);

CREATE TABLE IF NOT EXISTS equipment_monthly_billings (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deployment_id  UUID NOT NULL REFERENCES equipment_deployments(id),
  equipment_id   UUID NOT NULL REFERENCES equipment(id),
  dept_id        UUID NOT NULL REFERENCES departments(id),
  project_id     UUID REFERENCES projects(id),
  billing_month  VARCHAR(7) NOT NULL,   -- YYYY-MM
  monthly_rate   NUMERIC(15, 2) NOT NULL,
  status         VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  posted_at      TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (deployment_id, billing_month)
);

CREATE INDEX IF NOT EXISTS idx_equip_billing_equipment
  ON equipment_monthly_billings(equipment_id);
CREATE INDEX IF NOT EXISTS idx_equip_billing_month
  ON equipment_monthly_billings(billing_month);
CREATE INDEX IF NOT EXISTS idx_equip_billing_dept
  ON equipment_monthly_billings(dept_id);

-- Drop the interim per-batch table introduced in migration 028
DROP TABLE IF EXISTS batching_equipment_rentals;
