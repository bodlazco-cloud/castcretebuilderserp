-- Migration 005: Subcontractors — registry, capacity matrix, advances, performance

-- ─── Subcontractor registry ───────────────────────────────────────────────────
-- Owned by Planning & Engineering (Admin Settings).
CREATE TABLE subcontractors (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code                    VARCHAR(50)      NOT NULL UNIQUE,
    name                    VARCHAR(150)     NOT NULL,
    contact_info            JSONB,
    trade_types             trade_type[]     NOT NULL,
    -- Default rated capacity (Planning can override per site/model via capacity_matrix)
    default_max_active_units INTEGER         NOT NULL,
    manpower_benchmark      NUMERIC(5,2)     NOT NULL,  -- required workers per active unit
    performance_grade       performance_grade NOT NULL DEFAULT 'A',
    performance_score       NUMERIC(5,2)     NOT NULL DEFAULT 100.00,
    stop_assignment         BOOLEAN          NOT NULL DEFAULT FALSE,  -- Grade C auto-lock
    is_active               BOOLEAN          NOT NULL DEFAULT TRUE,
    created_at              TIMESTAMPTZ      NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ      NOT NULL DEFAULT now()
);

-- ─── Capacity matrix (multi-dimensional: site × model × type) ─────────────────
-- Spec: some sites are harder, complex models count as 1.5 units, trade-specific ratings.
CREATE TABLE subcontractor_capacity_matrix (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subcon_id       UUID            NOT NULL REFERENCES subcontractors(id),
    project_id      UUID            NOT NULL REFERENCES projects(id),
    unit_model      VARCHAR(50),    -- NULL = applies to all models
    work_type       trade_type      NOT NULL,
    rated_capacity  INTEGER         NOT NULL,
    capacity_weight NUMERIC(4,2)    NOT NULL DEFAULT 1.00, -- END_UNIT = 1.5 vs MID_UNIT = 1.0
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE (subcon_id, project_id, unit_model, work_type)
);

-- ─── Mobilization advances to subcontractors ──────────────────────────────────
-- Same recoupment logic as the Developer Advance: auto-deduct % per milestone billing.
CREATE TABLE subcontractor_advances (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subcon_id               UUID            NOT NULL REFERENCES subcontractors(id),
    project_id              UUID            NOT NULL REFERENCES projects(id),
    advance_amount          NUMERIC(15,2)   NOT NULL,
    recoupment_pct          NUMERIC(5,4)    NOT NULL,   -- deduction per milestone payable
    amount_recovered        NUMERIC(15,2)   NOT NULL DEFAULT 0.00,
    is_fully_recovered      BOOLEAN         NOT NULL DEFAULT FALSE,
    issued_date             DATE            NOT NULL,
    issued_by               UUID            NOT NULL REFERENCES users(id),
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT now()
);

-- ─── Subcontractor performance scorecard ──────────────────────────────────────
-- Computed at end of each project period and stored for NTP eligibility checks.
-- Weights: Schedule 40%, Material Efficiency 30%, Quality/Rework 20%, Safety 10%
CREATE TABLE subcontractor_performance_ratings (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subcon_id                   UUID            NOT NULL REFERENCES subcontractors(id),
    project_id                  UUID            NOT NULL REFERENCES projects(id),
    period_start                DATE            NOT NULL,
    period_end                  DATE            NOT NULL,
    -- Raw scores (0-100 each)
    schedule_variance_score     NUMERIC(5,2)    NOT NULL,
    material_variance_score     NUMERIC(5,2)    NOT NULL,
    quality_rework_score        NUMERIC(5,2)    NOT NULL,
    safety_compliance_score     NUMERIC(5,2)    NOT NULL,
    -- Weighted composite (40/30/20/10)
    weighted_total              NUMERIC(5,2)    NOT NULL
        GENERATED ALWAYS AS (
            (schedule_variance_score  * 0.40) +
            (material_variance_score  * 0.30) +
            (quality_rework_score     * 0.20) +
            (safety_compliance_score  * 0.10)
        ) STORED,
    grade                       performance_grade NOT NULL,
    computed_by                 UUID            REFERENCES users(id),
    computed_at                 TIMESTAMPTZ     NOT NULL DEFAULT now()
);
