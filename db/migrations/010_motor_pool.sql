-- Migration 010: Motor pool — equipment, assignments (daily rentals), maintenance,
-- fuel logs, daily checklists, Fix-or-Flip assessments.
-- Each machine is treated as a micro-business: rental income vs. maintenance costs.

-- ─── Equipment master ─────────────────────────────────────────────────────────
CREATE TABLE equipment (
    id                              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code                            VARCHAR(50)     NOT NULL UNIQUE,
    name                            VARCHAR(150)    NOT NULL,
    type                            VARCHAR(50)     NOT NULL,   -- BACKHOE, MIXER, DUMP_TRUCK, etc.
    make                            VARCHAR(100),
    model                           VARCHAR(100),
    year                            INTEGER,
    purchase_value                  NUMERIC(15,2),
    daily_rental_rate               NUMERIC(15,2)   NOT NULL,   -- Board-approved internal rate
    fuel_standard_liters_per_hour   NUMERIC(8,4)    NOT NULL,   -- manufacturer standard
    total_engine_hours              NUMERIC(10,2)   NOT NULL DEFAULT 0,
    status                          VARCHAR(20)     NOT NULL DEFAULT 'AVAILABLE'
                                        CHECK (status IN ('AVAILABLE','ON_SITE','MAINTENANCE','SOLD','RETIRED')),
    is_flagged_for_flip             BOOLEAN         NOT NULL DEFAULT FALSE,
    is_locked                       BOOLEAN         NOT NULL DEFAULT FALSE, -- locked if checklist fails
    created_at                      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at                      TIMESTAMPTZ     NOT NULL DEFAULT now()
);

-- ─── Equipment assignments (daily rental to project sites) ───────────────────
-- Rental charges start the moment the machine arrives at the block.
CREATE TABLE equipment_assignments (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    equipment_id        UUID            NOT NULL REFERENCES equipment(id),
    project_id          UUID            NOT NULL REFERENCES projects(id),
    unit_id             UUID            REFERENCES project_units(id),
    cost_center_id      UUID            NOT NULL REFERENCES cost_centers(id),
    operator_id         UUID            NOT NULL REFERENCES users(id),
    assigned_date       DATE            NOT NULL,
    returned_date       DATE,
    days_rented         INTEGER
        GENERATED ALWAYS AS (
            CASE WHEN returned_date IS NOT NULL
                THEN (returned_date - assigned_date)
                ELSE NULL
            END
        ) STORED,
    daily_rate          NUMERIC(15,2)   NOT NULL,   -- snapshot of equipment.daily_rental_rate
    total_rental_income NUMERIC(15,2),  -- = days_rented * daily_rate; populated on return
    status              VARCHAR(20)     NOT NULL DEFAULT 'ACTIVE'
                            CHECK (status IN ('ACTIVE','RETURNED','CANCELLED')),
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
);

-- ─── Maintenance records ──────────────────────────────────────────────────────
CREATE TABLE maintenance_records (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    equipment_id        UUID            NOT NULL REFERENCES equipment(id),
    maintenance_type    VARCHAR(20)     NOT NULL CHECK (maintenance_type IN ('PREVENTIVE','CORRECTIVE')),
    description         TEXT            NOT NULL,
    parts_cost          NUMERIC(15,2)   NOT NULL DEFAULT 0,
    labor_cost          NUMERIC(15,2)   NOT NULL DEFAULT 0,
    total_cost          NUMERIC(15,2)   NOT NULL
        GENERATED ALWAYS AS (parts_cost + labor_cost) STORED,
    downtime_days       INTEGER         NOT NULL DEFAULT 0,
    maintenance_date    DATE            NOT NULL,
    completed_date      DATE,
    status              VARCHAR(20)     NOT NULL DEFAULT 'PENDING'
                            CHECK (status IN ('PENDING','IN_PROGRESS','COMPLETED')),
    recorded_by         UUID            NOT NULL REFERENCES users(id),
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
);

-- ─── Fuel logs ────────────────────────────────────────────────────────────────
-- Tracks actual vs. standard liters/hour; >20% over standard flags to Audit.
CREATE TABLE fuel_logs (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    equipment_id                UUID            NOT NULL REFERENCES equipment(id),
    assignment_id               UUID            NOT NULL REFERENCES equipment_assignments(id),
    log_date                    DATE            NOT NULL,
    engine_hours_start          NUMERIC(10,2)   NOT NULL,
    engine_hours_end            NUMERIC(10,2)   NOT NULL,
    engine_hours_total          NUMERIC(10,2)
        GENERATED ALWAYS AS (engine_hours_end - engine_hours_start) STORED,
    fuel_consumed_liters        NUMERIC(10,4)   NOT NULL,
    fuel_efficiency_actual      NUMERIC(8,4),   -- liters / engine_hours_total; computed by app
    fuel_standard_liters_per_hour NUMERIC(8,4)  NOT NULL,
    efficiency_variance_pct     NUMERIC(7,4),   -- ((actual - standard) / standard) * 100
    is_flagged                  BOOLEAN         NOT NULL DEFAULT FALSE,  -- >20% variance
    operator_id                 UUID            NOT NULL REFERENCES users(id),
    created_at                  TIMESTAMPTZ     NOT NULL DEFAULT now()
);

-- ─── Daily operator checklists ────────────────────────────────────────────────
-- If any check fails, equipment is locked in the ERP until Maintenance clears it.
CREATE TABLE equipment_daily_checklists (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    equipment_id    UUID            NOT NULL REFERENCES equipment(id),
    assignment_id   UUID            NOT NULL REFERENCES equipment_assignments(id),
    check_date      DATE            NOT NULL,
    oil_ok          BOOLEAN         NOT NULL,
    fuel_ok         BOOLEAN         NOT NULL,
    hydraulics_ok   BOOLEAN         NOT NULL,
    other_checks    JSONB,          -- {"tires": true, "lights": true}
    all_passed      BOOLEAN         NOT NULL,
    equipment_locked BOOLEAN        NOT NULL DEFAULT FALSE,
    operator_id     UUID            NOT NULL REFERENCES users(id),
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE (equipment_id, check_date)
);

-- ─── Fix-or-Flip assessments ──────────────────────────────────────────────────
-- Spec criteria: age/hours, 12-month maintenance ratio, downtime, fuel efficiency.
-- Auto-triggered when any flip threshold is met for 3 consecutive months.
CREATE TABLE fix_or_flip_assessments (
    id                                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    equipment_id                        UUID            NOT NULL REFERENCES equipment(id),
    assessment_date                     DATE            NOT NULL,
    cumulative_maintenance_cost_12mo    NUMERIC(15,2)   NOT NULL,
    annual_rental_income                NUMERIC(15,2)   NOT NULL,
    -- Efficiency Ratio = (Maintenance + Downtime Losses) / Rental Income
    efficiency_ratio                    NUMERIC(8,4)    NOT NULL,
    total_engine_hours                  NUMERIC(10,2)   NOT NULL,
    monthly_downtime_days               INTEGER         NOT NULL,
    fuel_efficiency_variance_pct        NUMERIC(7,4)    NOT NULL,
    consecutive_months_over_50pct       INTEGER         NOT NULL DEFAULT 0,
    recommendation                      fix_or_flip     NOT NULL,
    is_triggered                        BOOLEAN         NOT NULL DEFAULT FALSE,
    assessed_by                         UUID            REFERENCES users(id),
    created_at                          TIMESTAMPTZ     NOT NULL DEFAULT now()
);
