-- Migration 006: Project units, unit milestones, unit activities
-- project_units is THE central entity — every transaction attaches to a Unit_ID.

-- ─── Project units (Block + Lot = Unit_ID) ────────────────────────────────────
CREATE TABLE project_units (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID            NOT NULL REFERENCES projects(id),
    block_id        UUID            NOT NULL REFERENCES blocks(id),
    lot_number      VARCHAR(20)     NOT NULL,
    unit_code       VARCHAR(50)     NOT NULL UNIQUE,  -- e.g. SMDC-B5-L01
    unit_model      VARCHAR(50)     NOT NULL,          -- MID_UNIT, END_UNIT, CORNER_UNIT
    current_category work_category  NOT NULL DEFAULT 'STRUCTURAL',
    status          VARCHAR(30)     NOT NULL DEFAULT 'PENDING'
                        CHECK (status IN ('PENDING','IN_PROGRESS','TURNOVER','COMPLETED')),
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE (block_id, lot_number)
);

-- ─── Unit milestones (actual milestone tracking per unit) ─────────────────────
CREATE TABLE unit_milestones (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    unit_id             UUID            NOT NULL REFERENCES project_units(id),
    milestone_def_id    UUID            NOT NULL REFERENCES milestone_definitions(id),
    status              VARCHAR(30)     NOT NULL DEFAULT 'PENDING'
                            CHECK (status IN ('PENDING','IN_PROGRESS','COMPLETED','VERIFIED')),
    started_at          TIMESTAMPTZ,
    completed_at        TIMESTAMPTZ,
    verified_by         UUID            REFERENCES users(id),
    verified_at         TIMESTAMPTZ,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE (unit_id, milestone_def_id)
);

-- ─── Unit activities (actual activity tracking per unit per task assignment) ──
CREATE TABLE unit_activities (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    unit_id                 UUID            NOT NULL REFERENCES project_units(id),
    task_assignment_id      UUID,           -- FK added in migration 008
    activity_def_id         UUID            NOT NULL REFERENCES activity_definitions(id),
    status                  VARCHAR(20)     NOT NULL DEFAULT 'PENDING'
                                CHECK (status IN ('PENDING','STARTED','ONGOING','COMPLETED')),
    planned_start           DATE,
    planned_end             DATE,
    actual_start            DATE,
    actual_end              DATE,
    -- Computed: positive = ahead of schedule, negative = delayed
    schedule_variance_days  INTEGER
        GENERATED ALWAYS AS (
            CASE
                WHEN actual_end IS NOT NULL AND planned_end IS NOT NULL
                THEN (planned_end - actual_end)
                ELSE NULL
            END
        ) STORED,
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE (unit_id, activity_def_id)
);

-- ─── EOT requests (Extension of Time) ────────────────────────────────────────
-- Approved EOTs prevent schedule variance flags from penalising subcontractors unfairly.
CREATE TABLE eot_requests (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_assignment_id      UUID,           -- FK added in migration 008
    unit_activity_id        UUID            NOT NULL REFERENCES unit_activities(id),
    reason                  delay_reason    NOT NULL,
    reason_detail           TEXT,
    original_end_date       DATE            NOT NULL,
    requested_end_date      DATE            NOT NULL,
    status                  VARCHAR(20)     NOT NULL DEFAULT 'PENDING'
                                CHECK (status IN ('PENDING','APPROVED','REJECTED')),
    requested_by            UUID            NOT NULL REFERENCES users(id),
    approved_by             UUID            REFERENCES users(id),
    approved_at             TIMESTAMPTZ,
    rejection_reason        TEXT,
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT now()
);
