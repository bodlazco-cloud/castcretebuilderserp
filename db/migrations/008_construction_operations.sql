-- Migration 008: Construction operations — task assignments (NTPs), daily progress, WAR

-- ─── Task assignments (Operations NTPs issued to subcontractors) ──────────────
-- Capacity gate is enforced at application layer before INSERT.
-- Check: active_units + new_assignment <= rated_capacity (from capacity_matrix).
CREATE TABLE task_assignments (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id              UUID            NOT NULL REFERENCES projects(id),
    unit_id                 UUID            NOT NULL REFERENCES project_units(id),
    subcon_id               UUID            NOT NULL REFERENCES subcontractors(id),
    category                work_category   NOT NULL,
    work_type               trade_type      NOT NULL,
    start_date              DATE            NOT NULL,
    end_date                DATE            NOT NULL,
    status                  VARCHAR(30)     NOT NULL DEFAULT 'DRAFT'
                                CHECK (status IN ('DRAFT','ACTIVE','EOT_PENDING','COMPLETED','CANCELLED')),
    -- Capacity gate audit trail
    capacity_check_passed   BOOLEAN         NOT NULL DEFAULT FALSE,
    capacity_checked_at     TIMESTAMPTZ,
    capacity_checked_by     UUID            REFERENCES users(id),
    issued_by               UUID            NOT NULL REFERENCES users(id),
    issued_at               TIMESTAMPTZ     NOT NULL DEFAULT now(),
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE (unit_id, subcon_id, category)
);

-- Back-fill deferred FKs on unit_activities and eot_requests
ALTER TABLE unit_activities
    ADD CONSTRAINT fk_unit_activity_task FOREIGN KEY (task_assignment_id)
        REFERENCES task_assignments(id);

ALTER TABLE eot_requests
    ADD CONSTRAINT fk_eot_task FOREIGN KEY (task_assignment_id)
        REFERENCES task_assignments(id);

ALTER TABLE purchase_requisitions
    ADD CONSTRAINT fk_pr_task FOREIGN KEY (task_assignment_id)
        REFERENCES task_assignments(id);

-- ─── Daily progress entries ───────────────────────────────────────────────────
-- Single source of truth: feeds both Payroll (manpower) and Finance (activity → milestone).
CREATE TABLE daily_progress_entries (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id              UUID            NOT NULL REFERENCES projects(id),
    unit_id                 UUID            NOT NULL REFERENCES project_units(id),
    task_assignment_id      UUID            NOT NULL REFERENCES task_assignments(id),
    unit_activity_id        UUID            NOT NULL REFERENCES unit_activities(id),
    entry_date              DATE            NOT NULL,
    status                  VARCHAR(20)     NOT NULL DEFAULT 'STARTED'
                                CHECK (status IN ('STARTED','ONGOING','COMPLETED')),
    subcon_id               UUID            NOT NULL REFERENCES subcontractors(id), -- auto-filled from NTP
    actual_manpower         INTEGER         NOT NULL DEFAULT 0,
    manpower_breakdown      JSONB,          -- {"masons": 3, "helpers": 2, "foreman": 1}
    delay_type              delay_reason,
    issues_details          TEXT,
    -- Documentation gap flag: set when activity uses concrete but no material transfer found
    doc_gap_flagged         BOOLEAN         NOT NULL DEFAULT FALSE,
    file_attachments        JSONB,          -- [{url, type, uploaded_at}]
    entered_by              UUID            NOT NULL REFERENCES users(id),
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE (unit_activity_id, entry_date)
);

-- ─── Work accomplished reports (WAR) ──────────────────────────────────────────
-- Triggered when a milestone is marked "COMPLETED". Pulls into Draft Billing + Draft Payables.
-- Status flow: DRAFT → PENDING_REVIEW (Accounting) → PENDING_AUDIT → READY_FOR_APPROVAL → APPROVED
CREATE TABLE work_accomplished_reports (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id                  UUID            NOT NULL REFERENCES projects(id),
    unit_id                     UUID            NOT NULL REFERENCES project_units(id),
    unit_milestone_id           UUID            NOT NULL REFERENCES unit_milestones(id),
    task_assignment_id          UUID            NOT NULL REFERENCES task_assignments(id),
    gross_accomplishment        NUMERIC(15,2)   NOT NULL,  -- from Developer Rate Card
    status                      approval_status NOT NULL DEFAULT 'DRAFT',
    rejection_reason            TEXT,
    submitted_by                UUID            NOT NULL REFERENCES users(id),   -- Operations
    submitted_at                TIMESTAMPTZ     NOT NULL DEFAULT now(),
    accounting_verified_by      UUID            REFERENCES users(id),
    accounting_verified_at      TIMESTAMPTZ,
    audit_verified_by           UUID            REFERENCES users(id),
    audit_verified_at           TIMESTAMPTZ,
    bod_approved_by             UUID            REFERENCES users(id),
    bod_approved_at             TIMESTAMPTZ,
    created_at                  TIMESTAMPTZ     NOT NULL DEFAULT now()
);

-- ─── Milestone document bucket (Finance-to-Audit checklist) ───────────────────
-- "Submit to Audit" button is locked until all required doc types are ticked.
CREATE TABLE milestone_documents (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    war_id          UUID                NOT NULL REFERENCES work_accomplished_reports(id),
    doc_type        milestone_doc_type  NOT NULL,
    source_dept     dept_code           NOT NULL,
    file_url        TEXT                NOT NULL,
    uploaded_by     UUID                NOT NULL REFERENCES users(id),
    uploaded_at     TIMESTAMPTZ         NOT NULL DEFAULT now(),
    is_verified     BOOLEAN             NOT NULL DEFAULT FALSE,
    verified_by     UUID                REFERENCES users(id),
    verified_at     TIMESTAMPTZ,
    notes           TEXT,
    UNIQUE (war_id, doc_type)   -- one of each type per WAR
);
