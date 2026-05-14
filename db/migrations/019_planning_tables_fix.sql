-- Migration 019: Fix planning tables
-- Drops bom_standards (wrong schema from migration 004) and recreates with correct
-- schema matching the Drizzle ORM definitions. Also creates missing tables.

-- ─── Enums (safe no-op if already exists) ────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE unit_type AS ENUM ('BEG', 'MID', 'END', 'SHOP');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE change_order_type AS ENUM ('ADD', 'MODIFY', 'REMOVE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── Activity Definitions ─────────────────────────────────────────────────────
-- Safe: creates only if missing. If already exists from migration 004, skipped.

CREATE TABLE IF NOT EXISTS activity_definitions (
    id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id              UUID        NOT NULL REFERENCES projects(id),
    category                work_category NOT NULL,
    scope_code              VARCHAR(100) NOT NULL,
    scope_name              VARCHAR(150) NOT NULL,
    activity_code           VARCHAR(100) NOT NULL,
    activity_name           VARCHAR(150) NOT NULL,
    standard_duration_days  INTEGER     NOT NULL,
    weight_in_scope_pct     NUMERIC(5,2) NOT NULL,
    sequence_order          INTEGER     NOT NULL,
    is_active               BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (project_id, activity_code)
);

-- ─── Milestone Definitions ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS milestone_definitions (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id          UUID        NOT NULL REFERENCES projects(id),
    scope_code          VARCHAR(100),
    scope_name          VARCHAR(150),
    name                VARCHAR(150) NOT NULL,
    category            work_category NOT NULL,
    sequence_order      INTEGER     NOT NULL,
    triggers_billing    BOOLEAN     NOT NULL DEFAULT FALSE,
    weight_pct          NUMERIC(5,2) NOT NULL,
    is_active           BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── BOM Standards — DROP and recreate (old schema is incompatible) ───────────
-- The original migration 004 used project_id + inline activity_code columns.
-- Current code uses activity_def_id + unit_type + status. Must recreate.

DROP TABLE IF EXISTS change_order_requests CASCADE;
DROP TABLE IF EXISTS bom_standards         CASCADE;

CREATE TABLE bom_standards (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_def_id     UUID        NOT NULL REFERENCES activity_definitions(id),
    unit_model          VARCHAR(50) NOT NULL,
    unit_type           unit_type   NOT NULL,
    material_id         UUID        NOT NULL REFERENCES materials(id),
    quantity_per_unit   NUMERIC(15,4) NOT NULL,
    version             INTEGER     NOT NULL DEFAULT 1,
    is_active           BOOLEAN     NOT NULL DEFAULT TRUE,
    status              VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
    approved_by         UUID        REFERENCES users(id),
    approved_at         TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Change Order Requests ────────────────────────────────────────────────────

CREATE TABLE change_order_requests (
    id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id          UUID            NOT NULL REFERENCES projects(id),
    bom_standard_id     UUID            REFERENCES bom_standards(id),
    activity_def_id     UUID            REFERENCES activity_definitions(id),
    unit_model          VARCHAR(50),
    unit_type           unit_type,
    material_id         UUID            REFERENCES materials(id),
    change_type         change_order_type NOT NULL,
    old_quantity        NUMERIC(15,4),
    new_quantity        NUMERIC(15,4),
    reason              TEXT            NOT NULL,
    attachment_urls     JSONB,
    status              VARCHAR(20)     NOT NULL DEFAULT 'PENDING',
    requested_by        UUID            NOT NULL REFERENCES users(id),
    reviewed_by         UUID            REFERENCES users(id),
    reviewed_at         TIMESTAMPTZ,
    rejection_reason    TEXT,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
);

-- ─── Construction Manpower Logs ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS construction_manpower_logs (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id          UUID        NOT NULL REFERENCES projects(id),
    log_date            DATE        NOT NULL,
    activity_def_id     UUID        REFERENCES activity_definitions(id),
    subcon_id           UUID        REFERENCES subcontractors(id),
    subcon_headcount    INTEGER     NOT NULL DEFAULT 0,
    direct_staff_count  INTEGER     NOT NULL DEFAULT 0,
    remarks             TEXT,
    recorded_by         UUID        NOT NULL REFERENCES users(id),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Developer Rate Cards (if missing) ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS developer_rate_cards (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id          UUID        NOT NULL REFERENCES projects(id),
    activity_def_id     UUID        REFERENCES activity_definitions(id),
    unit_model          VARCHAR(50),
    unit_type           unit_type,
    gross_rate_per_unit NUMERIC(15,2) NOT NULL,
    retention_pct       NUMERIC(5,4) NOT NULL DEFAULT 0.10,
    dp_recoupment_pct   NUMERIC(5,4) NOT NULL DEFAULT 0.10,
    tax_pct             NUMERIC(5,4) NOT NULL DEFAULT 0.00,
    version             INTEGER     NOT NULL DEFAULT 1,
    is_active           BOOLEAN     NOT NULL DEFAULT TRUE,
    approved_by         UUID        REFERENCES users(id),
    approved_at         TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS developer_rate_card_deductions (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    rate_card_id    UUID        NOT NULL REFERENCES developer_rate_cards(id) ON DELETE CASCADE,
    name            VARCHAR(150) NOT NULL,
    deduction_pct   NUMERIC(5,4) NOT NULL,
    is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
