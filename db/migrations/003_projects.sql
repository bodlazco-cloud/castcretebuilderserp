-- Migration 003: Projects, developers, and developer rate cards

-- ─── Developers (clients who issue NTPs and receive invoices) ─────────────────
CREATE TABLE developers (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(150)  NOT NULL,
    contact_info    JSONB,
    is_active       BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- ─── Projects ────────────────────────────────────────────────────────────────
CREATE TABLE projects (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                        VARCHAR(200)    NOT NULL,
    developer_id                UUID            NOT NULL REFERENCES developers(id),
    contract_value              NUMERIC(15,2)   NOT NULL,
    developer_advance           NUMERIC(15,2)   NOT NULL DEFAULT 63750000.00,
    advance_recovered           NUMERIC(15,2)   NOT NULL DEFAULT 0.00,
    target_units_per_month      INTEGER         NOT NULL DEFAULT 120,
    min_operating_cash_buffer   NUMERIC(15,2)   NOT NULL DEFAULT 5000000.00,
    status                      VARCHAR(30)     NOT NULL DEFAULT 'BIDDING'
                                    CHECK (status IN ('BIDDING','ACTIVE','COMPLETED','ON_HOLD')),
    ntp_document_url            TEXT,
    ntp_uploaded_at             TIMESTAMPTZ,
    ntp_uploaded_by             UUID            REFERENCES users(id),
    bod_approved_at             TIMESTAMPTZ,
    bod_approved_by             UUID            REFERENCES users(id),
    start_date                  DATE,
    end_date                    DATE,
    created_at                  TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at                  TIMESTAMPTZ     NOT NULL DEFAULT now()
);

-- FK for admin_settings project reference
ALTER TABLE admin_settings
    ADD CONSTRAINT fk_admin_settings_project FOREIGN KEY (project_id) REFERENCES projects(id);

-- ─── Developer rate card ──────────────────────────────────────────────────────
-- Admin-controlled. Price/rate locked; changes require version increment + sign-off.
CREATE TABLE developer_rate_cards (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id          UUID            NOT NULL REFERENCES projects(id),
    milestone_category  work_category   NOT NULL,
    gross_rate_per_unit NUMERIC(15,2)   NOT NULL,   -- PHP per completed unit at this milestone
    retention_pct       NUMERIC(5,4)    NOT NULL DEFAULT 0.10,
    dp_recoupment_pct   NUMERIC(5,4)    NOT NULL DEFAULT 0.10,
    tax_pct             NUMERIC(5,4)    NOT NULL DEFAULT 0.00,
    version             INTEGER         NOT NULL DEFAULT 1,
    is_active           BOOLEAN         NOT NULL DEFAULT TRUE,
    approved_by         UUID            REFERENCES users(id),
    approved_at         TIMESTAMPTZ,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE (project_id, milestone_category, version)
);

-- ─── Project blocks (physical groupings of units on site) ─────────────────────
CREATE TABLE blocks (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id  UUID            NOT NULL REFERENCES projects(id),
    block_name  VARCHAR(50)     NOT NULL,
    total_lots  INTEGER         NOT NULL,
    created_at  TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE (project_id, block_name)
);
