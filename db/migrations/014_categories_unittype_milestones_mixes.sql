-- ──────────────────────────────────────────────────────────────────────────────
-- 014 — Expanded categories, unit type on units, milestone SOW link,
--        standard mixes table
-- ──────────────────────────────────────────────────────────────────────────────

-- 1. Expand work_category enum
ALTER TYPE work_category ADD VALUE IF NOT EXISTS 'SLAB';
ALTER TYPE work_category ADD VALUE IF NOT EXISTS 'SPECIALTY_WORKS';
ALTER TYPE work_category ADD VALUE IF NOT EXISTS 'MEPF';

-- 2. Add unit_type column to project_units
ALTER TABLE project_units
  ADD COLUMN IF NOT EXISTS unit_type unit_type NOT NULL DEFAULT 'REG';

-- 3. Add scope columns to milestone_definitions (SOW link, non-FK / denormalised)
ALTER TABLE milestone_definitions
  ADD COLUMN IF NOT EXISTS scope_code VARCHAR(100),
  ADD COLUMN IF NOT EXISTS scope_name VARCHAR(150);

-- 4. Standard concrete mixes table
CREATE TABLE IF NOT EXISTS standard_mixes (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id        UUID        NOT NULL REFERENCES projects(id),
  unit_model        VARCHAR(50) NOT NULL,
  unit_type         unit_type   NOT NULL,
  mix_design_id     UUID        REFERENCES mix_designs(id),
  volume_per_unit_m3 NUMERIC(10,4),
  description       TEXT,
  is_active         BOOLEAN     NOT NULL DEFAULT TRUE,
  created_by        UUID        REFERENCES users(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (project_id, unit_model, unit_type)
);
