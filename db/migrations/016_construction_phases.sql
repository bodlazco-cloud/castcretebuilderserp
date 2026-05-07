-- Migration 016: Generic Construction Phases (Category / SOW / Activity / Billing Milestones)
-- These are reusable reference tables NOT tied to a specific project.

CREATE TABLE IF NOT EXISTS phase_categories (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  code           VARCHAR(50) NOT NULL UNIQUE,
  name           VARCHAR(150) NOT NULL,
  sequence_order INTEGER     NOT NULL DEFAULT 0,
  is_active      BOOLEAN     NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS phase_scopes (
  id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id    UUID         NOT NULL REFERENCES phase_categories(id) ON DELETE CASCADE,
  code           VARCHAR(100) NOT NULL UNIQUE,
  name           VARCHAR(200) NOT NULL,
  sequence_order INTEGER      NOT NULL DEFAULT 0,
  is_active      BOOLEAN      NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS phase_activities (
  id                     UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  scope_id               UUID          NOT NULL REFERENCES phase_scopes(id) ON DELETE CASCADE,
  code                   VARCHAR(100)  NOT NULL UNIQUE,
  name                   VARCHAR(200)  NOT NULL,
  standard_duration_days INTEGER       NOT NULL DEFAULT 1,
  weight_in_scope_pct    NUMERIC(5,2)  NOT NULL DEFAULT 0,
  sequence_order         INTEGER       NOT NULL DEFAULT 0,
  is_active              BOOLEAN       NOT NULL DEFAULT true,
  created_at             TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS phase_billing_milestones (
  id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id      UUID          NOT NULL REFERENCES phase_categories(id) ON DELETE CASCADE,
  name             VARCHAR(200)  NOT NULL,
  weight_pct       NUMERIC(5,2)  NOT NULL DEFAULT 0,
  triggers_billing BOOLEAN       NOT NULL DEFAULT true,
  sequence_order   INTEGER       NOT NULL DEFAULT 0,
  notes            TEXT,
  is_active        BOOLEAN       NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_phase_scopes_category      ON phase_scopes(category_id);
CREATE INDEX IF NOT EXISTS idx_phase_activities_scope     ON phase_activities(scope_id);
CREATE INDEX IF NOT EXISTS idx_phase_billing_category     ON phase_billing_milestones(category_id);

-- Seed default categories
INSERT INTO phase_categories (code, name, sequence_order) VALUES
  ('SLAB',             'Slab',             1),
  ('STRUCTURAL',       'Structural',       2),
  ('SPECIALTY_WORKS',  'Specialty Works',  3),
  ('MEPF',             'MEPF',             4),
  ('ARCHITECTURAL',    'Architectural',    5),
  ('TURNOVER',         'Turnover',         6)
ON CONFLICT (code) DO NOTHING;
