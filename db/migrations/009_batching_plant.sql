-- Migration 009: Batching plant — mix designs, production logs, delivery notes/receipts
-- Mass Balance logic: Theoretical Yield vs Actual Yield; >2% variance flags to Audit.

-- ─── Mix designs (owned by Planning & Engineering) ────────────────────────────
CREATE TABLE mix_designs (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id                  UUID            NOT NULL REFERENCES projects(id),
    code                        VARCHAR(50)     NOT NULL UNIQUE,
    name                        VARCHAR(100)    NOT NULL,   -- e.g. "3000 PSI Standard"
    cement_bags_per_m3          NUMERIC(8,4)    NOT NULL,
    sand_kg_per_m3              NUMERIC(10,4)   NOT NULL,
    gravel_kg_per_m3            NUMERIC(10,4)   NOT NULL,
    water_liters_per_m3         NUMERIC(8,4)    NOT NULL,
    is_active                   BOOLEAN         NOT NULL DEFAULT TRUE,
    created_by                  UUID            NOT NULL REFERENCES users(id),   -- Planning
    approved_by                 UUID            REFERENCES users(id),
    approved_at                 TIMESTAMPTZ,
    created_at                  TIMESTAMPTZ     NOT NULL DEFAULT now()
);

-- ─── Batching production logs ─────────────────────────────────────────────────
-- Gate 1 + Gate 2: inputs logged, theoretical yield computed, variance checked.
CREATE TABLE batching_production_logs (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id              UUID            NOT NULL REFERENCES projects(id),
    mix_design_id           UUID            NOT NULL REFERENCES mix_designs(id),
    batch_date              DATE            NOT NULL,
    shift                   VARCHAR(5)      NOT NULL CHECK (shift IN ('AM','PM','NIGHT')),
    -- Actual inputs (Gate 1: digital scale integration)
    cement_used_bags        NUMERIC(10,4)   NOT NULL,
    sand_used_kg            NUMERIC(10,4)   NOT NULL,
    gravel_used_kg          NUMERIC(10,4)   NOT NULL,
    -- Outputs
    volume_produced_m3      NUMERIC(10,4)   NOT NULL,   -- actual
    theoretical_yield_m3    NUMERIC(10,4)   NOT NULL,   -- from mix design
    yield_variance_pct      NUMERIC(7,4)
        GENERATED ALWAYS AS (
            CASE WHEN theoretical_yield_m3 > 0
                THEN ((theoretical_yield_m3 - volume_produced_m3) / theoretical_yield_m3) * 100
                ELSE 0
            END
        ) STORED,
    -- >2% variance auto-flags to Audit
    is_production_flagged   BOOLEAN         NOT NULL DEFAULT FALSE,
    flag_reason             TEXT,
    operator_id             UUID            NOT NULL REFERENCES users(id),
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT now()
);

-- ─── Concrete delivery notes (Plant → Site) ───────────────────────────────────
-- Gate 3 starts here: Plant records what left.
CREATE TABLE concrete_delivery_notes (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    production_log_id       UUID            NOT NULL REFERENCES batching_production_logs(id),
    project_id              UUID            NOT NULL REFERENCES projects(id),
    unit_id                 UUID            NOT NULL REFERENCES project_units(id),
    volume_dispatched_m3    NUMERIC(10,4)   NOT NULL,
    dispatched_at           TIMESTAMPTZ     NOT NULL DEFAULT now(),
    dispatched_by           UUID            NOT NULL REFERENCES users(id)
);

-- ─── Concrete delivery receipts (Site confirms receipt) ──────────────────────
-- Gate 3 closes here: Site Engineer digitally acknowledges volume received.
-- Gap = dispatched - received → flagged to Audit immediately if > 0.
CREATE TABLE concrete_delivery_receipts (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    delivery_note_id        UUID            NOT NULL UNIQUE REFERENCES concrete_delivery_notes(id),
    unit_id                 UUID            NOT NULL REFERENCES project_units(id),
    volume_received_m3      NUMERIC(10,4)   NOT NULL,
    volume_variance_m3      NUMERIC(10,4),  -- populated by trigger/app after receipt
    is_delivery_flagged     BOOLEAN         NOT NULL DEFAULT FALSE,
    received_by             UUID            NOT NULL REFERENCES users(id),  -- Site Engineer
    received_at             TIMESTAMPTZ     NOT NULL DEFAULT now()
);

-- ─── Batching internal sales ──────────────────────────────────────────────────
-- Batching "sells" concrete to Project Sites at Board-approved rates.
-- These are INTERNAL transfers; no real cash leaves the company.
CREATE TABLE batching_internal_sales (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    delivery_receipt_id     UUID            NOT NULL REFERENCES concrete_delivery_receipts(id),
    project_id              UUID            NOT NULL REFERENCES projects(id),
    unit_id                 UUID            NOT NULL REFERENCES project_units(id),
    volume_m3               NUMERIC(10,4)   NOT NULL,
    internal_rate_per_m3    NUMERIC(15,2)   NOT NULL,   -- Board-approved
    total_internal_revenue  NUMERIC(15,2)   NOT NULL
        GENERATED ALWAYS AS (volume_m3 * internal_rate_per_m3) STORED,
    transaction_date        DATE            NOT NULL,
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT now()
);
