-- Migration 012: Finance & Accounting
-- financial_ledger, invoices, payables, payment_requests, manual_vouchers,
-- developer_advance_tracker, cash_flow_projections

-- ─── Financial ledger (the system's heart) ────────────────────────────────────
-- Every monetary event from every department must land here.
-- Three required tags on every row: cost_center_id, resource_type+resource_id, unit_id.
-- This single table powers both Project P&L and Departmental P&L without double-entry.
CREATE TABLE financial_ledger (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id          UUID            NOT NULL REFERENCES projects(id),
    cost_center_id      UUID            NOT NULL REFERENCES cost_centers(id),
    dept_id             UUID            NOT NULL REFERENCES departments(id),
    unit_id             UUID            REFERENCES project_units(id),    -- NULL for HQ overhead
    resource_type       resource_type   NOT NULL,
    resource_id         UUID            NOT NULL,   -- FK to employees/materials/equipment (polymorphic)
    transaction_type    transaction_type NOT NULL,
    reference_type      VARCHAR(50)     NOT NULL,   -- PO, PAYROLL, INVOICE, RENTAL, BATCH_SALE, VOUCHER
    reference_id        UUID            NOT NULL,
    amount              NUMERIC(15,2)   NOT NULL,
    -- External = real cash leaving/entering the company.
    -- Internal = inter-department (Batching/Fleet charges to Site).
    is_external         BOOLEAN         NOT NULL DEFAULT TRUE,
    transaction_date    DATE            NOT NULL,
    description         TEXT,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
);

-- ─── Developer advance tracker ────────────────────────────────────────────────
-- Recoupment progress: 63.75M PHP advance recovered via billing deductions.
CREATE TABLE developer_advance_tracker (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id          UUID            NOT NULL UNIQUE REFERENCES projects(id),
    total_advance       NUMERIC(15,2)   NOT NULL DEFAULT 63750000.00,
    total_recovered     NUMERIC(15,2)   NOT NULL DEFAULT 0.00,
    remaining_balance   NUMERIC(15,2)   NOT NULL
        GENERATED ALWAYS AS (total_advance - total_recovered) STORED,
    last_updated        TIMESTAMPTZ     NOT NULL DEFAULT now()
);

-- ─── Invoices to developer ────────────────────────────────────────────────────
-- Auto-generated from WAR. Shows Gross → Net breakdown (spec: Transparent Calculation).
-- Net = Gross - DP Recovery - OSM Deduction - Retention
CREATE TABLE invoices (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id              UUID            NOT NULL REFERENCES projects(id),
    war_id                  UUID            NOT NULL REFERENCES work_accomplished_reports(id),
    unit_milestone_id       UUID            NOT NULL REFERENCES unit_milestones(id),
    gross_accomplishment    NUMERIC(15,2)   NOT NULL,
    less_dp_recovery        NUMERIC(15,2)   NOT NULL DEFAULT 0,  -- from developer_rate_cards.dp_recoupment_pct
    less_osm_deduction      NUMERIC(15,2)   NOT NULL DEFAULT 0,  -- from osm_deduction_buckets
    less_retention          NUMERIC(15,2)   NOT NULL DEFAULT 0,  -- from developer_rate_cards.retention_pct
    net_amount_due          NUMERIC(15,2)   NOT NULL
        GENERATED ALWAYS AS (
            gross_accomplishment - less_dp_recovery - less_osm_deduction - less_retention
        ) STORED,
    status                  VARCHAR(30)     NOT NULL DEFAULT 'DRAFT'
                                CHECK (status IN ('DRAFT','PENDING_AUDIT','APPROVED','SUBMITTED','COLLECTED','REJECTED')),
    generated_at            TIMESTAMPTZ     NOT NULL DEFAULT now(),
    submitted_at            TIMESTAMPTZ,
    collected_at            TIMESTAMPTZ,
    collection_amount       NUMERIC(15,2),  -- actual amount received (may differ slightly)
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT now()
);

-- ─── Payables to subcontractors ───────────────────────────────────────────────
-- Triggered alongside the invoice when a WAR is approved.
-- Auto-deducts mobilization advance recoupment per billing.
CREATE TABLE payables (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id                  UUID            NOT NULL REFERENCES projects(id),
    subcon_id                   UUID            NOT NULL REFERENCES subcontractors(id),
    war_id                      UUID            NOT NULL REFERENCES work_accomplished_reports(id),
    gross_amount                NUMERIC(15,2)   NOT NULL,
    less_advance_recoupment     NUMERIC(15,2)   NOT NULL DEFAULT 0,  -- from subcontractor_advances
    net_payable                 NUMERIC(15,2)   NOT NULL
        GENERATED ALWAYS AS (gross_amount - less_advance_recoupment) STORED,
    status                      approval_status NOT NULL DEFAULT 'DRAFT',
    rejection_reason            TEXT,
    audit_verified_by           UUID            REFERENCES users(id),
    audit_verified_at           TIMESTAMPTZ,
    bod_approved_by             UUID            REFERENCES users(id),
    bod_approved_at             TIMESTAMPTZ,
    paid_at                     TIMESTAMPTZ,
    created_at                  TIMESTAMPTZ     NOT NULL DEFAULT now()
);

-- ─── Payment requests ─────────────────────────────────────────────────────────
-- For PO payments, subcon payables, prepaid POs, and manual vouchers.
-- Prepaid POs: payment request fires immediately on PO approval (before delivery).
CREATE TABLE payment_requests (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id          UUID            NOT NULL REFERENCES projects(id),
    po_id               UUID            REFERENCES purchase_orders(id),
    payable_id          UUID            REFERENCES payables(id),
    voucher_id          UUID,           -- FK to manual_vouchers added below
    request_type        VARCHAR(30)     NOT NULL
                            CHECK (request_type IN ('PO_PAYMENT','SUBCON_PAYABLE','PREPAID_PO','MANUAL_VOUCHER')),
    amount              NUMERIC(15,2)   NOT NULL,
    cost_center_id      UUID            NOT NULL REFERENCES cost_centers(id),
    status              VARCHAR(20)     NOT NULL DEFAULT 'PENDING'
                            CHECK (status IN ('PENDING','APPROVED','RELEASED','REJECTED')),
    requested_by        UUID            NOT NULL REFERENCES users(id),
    approved_by         UUID            REFERENCES users(id),
    approved_at         TIMESTAMPTZ,
    released_at         TIMESTAMPTZ,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
);

-- ─── Manual vouchers (unusual records: utilities, permits, emergency repairs) ──
-- Amounts above the petty cash threshold require BOD sign-off, same as a PO.
CREATE TABLE manual_vouchers (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id              UUID            NOT NULL REFERENCES projects(id),
    cost_center_id          UUID            NOT NULL REFERENCES cost_centers(id),
    description             TEXT            NOT NULL,
    amount                  NUMERIC(15,2)   NOT NULL,
    requires_bod_approval   BOOLEAN         NOT NULL DEFAULT FALSE,
    supporting_doc_url      TEXT,
    status                  approval_status NOT NULL DEFAULT 'DRAFT',
    created_by              UUID            NOT NULL REFERENCES users(id),
    approved_by             UUID            REFERENCES users(id),
    approved_at             TIMESTAMPTZ,
    paid_at                 TIMESTAMPTZ,
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT now()
);

-- Back-fill voucher FK on payment_requests
ALTER TABLE payment_requests
    ADD CONSTRAINT fk_pr_voucher FOREIGN KEY (voucher_id) REFERENCES manual_vouchers(id);

-- ─── Cash flow projections (30/60/90-day runway) ──────────────────────────────
-- Generated every Friday at 16:00.
-- Trigger: (Bank Balance + Verified Receivables in 30 days) - (Approved Payables + 30-day Projected Outflow)
-- Alert fires when result < min_operating_cash_buffer (default 5M PHP).
CREATE TABLE cash_flow_projections (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id                  UUID            NOT NULL REFERENCES projects(id),
    projection_date             DATE            NOT NULL,
    period_days                 INTEGER         NOT NULL CHECK (period_days IN (30, 60, 90)),
    current_bank_balance        NUMERIC(15,2)   NOT NULL,
    verified_receivables        NUMERIC(15,2)   NOT NULL,   -- invoices in transit
    approved_payables           NUMERIC(15,2)   NOT NULL,   -- POs + payroll approved
    projected_material_outflow  NUMERIC(15,2)   NOT NULL,   -- from Planning Resource Forecast
    projected_labor_outflow     NUMERIC(15,2)   NOT NULL,   -- from milestone payables schedule
    projected_inflow            NUMERIC(15,2)   NOT NULL,   -- net collections (after deductions)
    net_gap                     NUMERIC(15,2)   NOT NULL
        GENERATED ALWAYS AS (
            (current_bank_balance + verified_receivables + projected_inflow)
            - (approved_payables + projected_material_outflow + projected_labor_outflow)
        ) STORED,
    is_below_buffer             BOOLEAN         NOT NULL DEFAULT FALSE,
    alert_sent                  BOOLEAN         NOT NULL DEFAULT FALSE,
    alert_sent_at               TIMESTAMPTZ,
    generated_at                TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE (project_id, projection_date, period_days)
);
