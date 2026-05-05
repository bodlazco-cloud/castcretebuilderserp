-- ================================================================
-- 009_batching_plant.sql
-- ================================================================
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

-- ================================================================
-- 010_motor_pool.sql
-- ================================================================
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

-- ================================================================
-- 011_hr_payroll.sql
-- ================================================================
-- Migration 011: HR & Payroll — employees, DTR, payroll records, leave schedules
-- Labor costs are mapped to Departmental P&L centers via cost_center_id.

-- ─── Employees ────────────────────────────────────────────────────────────────
CREATE TABLE employees (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                 UUID            REFERENCES users(id),
    employee_code           VARCHAR(50)     NOT NULL UNIQUE,
    full_name               VARCHAR(150)    NOT NULL,
    dept_id                 UUID            NOT NULL REFERENCES departments(id),
    cost_center_id          UUID            NOT NULL REFERENCES cost_centers(id),
    position                VARCHAR(100)    NOT NULL,
    employment_type         VARCHAR(20)     NOT NULL CHECK (employment_type IN ('REGULAR','CONTRACTUAL','PROBATIONARY')),
    daily_rate              NUMERIC(12,2)   NOT NULL,
    -- Government-mandated deductions (monthly)
    sss_contribution        NUMERIC(10,2)   NOT NULL DEFAULT 0,
    philhealth_contribution NUMERIC(10,2)   NOT NULL DEFAULT 0,
    pagibig_contribution    NUMERIC(10,2)   NOT NULL DEFAULT 0,
    hire_date               DATE            NOT NULL,
    separation_date         DATE,
    is_active               BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ     NOT NULL DEFAULT now()
);

-- Back-fill the deferred FK on departments
ALTER TABLE departments
    DROP CONSTRAINT fk_dept_head;
ALTER TABLE departments
    ADD CONSTRAINT fk_dept_head FOREIGN KEY (head_employee_id) REFERENCES employees(id);

-- ─── Daily time records (DTR) ─────────────────────────────────────────────────
-- Each DTR row maps a work day to a specific cost center and (optionally) a unit.
-- Feeds payroll accrual. DTR compliance = % employees with verified records for the period.
CREATE TABLE daily_time_records (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id     UUID            NOT NULL REFERENCES employees(id),
    work_date       DATE            NOT NULL,
    unit_id         UUID            REFERENCES project_units(id),
    cost_center_id  UUID            NOT NULL REFERENCES cost_centers(id),
    time_in         TIME,
    time_out        TIME,
    hours_worked    NUMERIC(5,2),
    overtime_hours  NUMERIC(5,2)    NOT NULL DEFAULT 0,
    is_verified     BOOLEAN         NOT NULL DEFAULT FALSE,
    verified_by     UUID            REFERENCES users(id),
    verified_at     TIMESTAMPTZ,
    file_url        TEXT,           -- uploaded DTR document / biometric export
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE (employee_id, work_date)
);

-- ─── Payroll records ──────────────────────────────────────────────────────────
-- Each record covers one pay period per employee, mapped to a cost center P&L.
CREATE TABLE payroll_records (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id             UUID            NOT NULL REFERENCES employees(id),
    cost_center_id          UUID            NOT NULL REFERENCES cost_centers(id),
    period_start            DATE            NOT NULL,
    period_end              DATE            NOT NULL,
    days_worked             NUMERIC(5,2)    NOT NULL DEFAULT 0,
    overtime_hours          NUMERIC(7,2)    NOT NULL DEFAULT 0,
    gross_pay               NUMERIC(12,2)   NOT NULL,
    tax_deduction           NUMERIC(10,2)   NOT NULL DEFAULT 0,
    sss_deduction           NUMERIC(10,2)   NOT NULL DEFAULT 0,
    philhealth_deduction    NUMERIC(10,2)   NOT NULL DEFAULT 0,
    pagibig_deduction       NUMERIC(10,2)   NOT NULL DEFAULT 0,
    other_deductions        NUMERIC(10,2)   NOT NULL DEFAULT 0,
    net_pay                 NUMERIC(12,2)   NOT NULL,
    status                  VARCHAR(20)     NOT NULL DEFAULT 'DRAFT'
                                CHECK (status IN ('DRAFT','APPROVED','PAID')),
    approved_by             UUID            REFERENCES users(id),
    approved_at             TIMESTAMPTZ,
    paid_at                 TIMESTAMPTZ,
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE (employee_id, period_start, period_end)
);

-- ─── Leave schedules ──────────────────────────────────────────────────────────
-- Tracked to prevent manpower drops on site.
CREATE TABLE leave_schedules (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id     UUID            NOT NULL REFERENCES employees(id),
    leave_type      VARCHAR(30)     NOT NULL CHECK (leave_type IN ('SICK','VACATION','EMERGENCY','MATERNITY','PATERNITY')),
    start_date      DATE            NOT NULL,
    end_date        DATE            NOT NULL,
    days_count      INTEGER         NOT NULL
        GENERATED ALWAYS AS ((end_date - start_date) + 1) STORED,
    status          VARCHAR(20)     NOT NULL DEFAULT 'PENDING'
                        CHECK (status IN ('PENDING','APPROVED','REJECTED')),
    approved_by     UUID            REFERENCES users(id),
    approved_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now()
);

-- ================================================================
-- 012_finance_accounting.sql
-- ================================================================
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

-- ================================================================
-- 013_indexes_and_views.sql
-- ================================================================
-- Migration 013: Indexes and reporting views
-- Performance indexes on high-traffic FK and filter columns.
-- Views support the 8 departmental KPI dashboards and the BOD Cockpit.

-- ═══════════════════════════════════════════════════════════════════════════════
-- INDEXES
-- ═══════════════════════════════════════════════════════════════════════════════

-- Core lookups
CREATE INDEX idx_project_units_project   ON project_units(project_id);
CREATE INDEX idx_project_units_block     ON project_units(block_id);
CREATE INDEX idx_project_units_status    ON project_units(status);

-- Procurement
CREATE INDEX idx_pr_project              ON purchase_requisitions(project_id);
CREATE INDEX idx_pr_status               ON purchase_requisitions(status);
CREATE INDEX idx_po_project              ON purchase_orders(project_id);
CREATE INDEX idx_po_status               ON purchase_orders(status);
CREATE INDEX idx_inv_ledger_material     ON inventory_ledger(material_id, project_id);
CREATE INDEX idx_inv_ledger_batch        ON inventory_ledger(batch_id);
CREATE INDEX idx_material_transfers_unit ON material_transfers(unit_id);

-- Construction / Operations
CREATE INDEX idx_task_assignment_unit    ON task_assignments(unit_id);
CREATE INDEX idx_task_assignment_subcon  ON task_assignments(subcon_id);
CREATE INDEX idx_task_assignment_status  ON task_assignments(status);
CREATE INDEX idx_daily_progress_unit     ON daily_progress_entries(unit_id, entry_date);
CREATE INDEX idx_war_project             ON work_accomplished_reports(project_id);
CREATE INDEX idx_war_status              ON work_accomplished_reports(status);
CREATE INDEX idx_unit_milestones_unit    ON unit_milestones(unit_id);
CREATE INDEX idx_unit_activities_task    ON unit_activities(task_assignment_id);

-- Batching
CREATE INDEX idx_batch_logs_date         ON batching_production_logs(project_id, batch_date);
CREATE INDEX idx_batch_logs_flagged      ON batching_production_logs(is_production_flagged) WHERE is_production_flagged = TRUE;
CREATE INDEX idx_delivery_receipts_flag  ON concrete_delivery_receipts(is_delivery_flagged) WHERE is_delivery_flagged = TRUE;

-- Motorpool
CREATE INDEX idx_equipment_status        ON equipment(status);
CREATE INDEX idx_equip_assign_project    ON equipment_assignments(project_id);
CREATE INDEX idx_fuel_logs_equipment     ON fuel_logs(equipment_id, log_date);
CREATE INDEX idx_fuel_logs_flagged       ON fuel_logs(is_flagged) WHERE is_flagged = TRUE;
CREATE INDEX idx_fix_flip_equipment      ON fix_or_flip_assessments(equipment_id, assessment_date);

-- HR / Payroll
CREATE INDEX idx_dtr_employee_date       ON daily_time_records(employee_id, work_date);
CREATE INDEX idx_payroll_employee        ON payroll_records(employee_id, period_start);
CREATE INDEX idx_payroll_cost_center     ON payroll_records(cost_center_id);

-- Finance
CREATE INDEX idx_ledger_project          ON financial_ledger(project_id, transaction_date);
CREATE INDEX idx_ledger_cost_center      ON financial_ledger(cost_center_id);
CREATE INDEX idx_ledger_unit             ON financial_ledger(unit_id);
CREATE INDEX idx_invoices_project        ON invoices(project_id, status);
CREATE INDEX idx_payables_subcon         ON payables(subcon_id, status);
CREATE INDEX idx_cash_flow_project       ON cash_flow_projections(project_id, projection_date);

-- Subcontractors
CREATE INDEX idx_subcon_perf_project     ON subcontractor_performance_ratings(subcon_id, project_id);

-- Full-text search on unit_code for quick lookups
CREATE INDEX idx_unit_code_trgm          ON project_units USING gin(unit_code gin_trgm_ops);


-- ═══════════════════════════════════════════════════════════════════════════════
-- VIEWS (KPI Dashboards)
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── I. Planning Overview: Schedule Variance + Subcon Capacity ────────────────
CREATE VIEW vw_planning_subcon_health AS
SELECT
    s.id                                    AS subcon_id,
    s.name                                  AS subcon_name,
    p.id                                    AS project_id,
    scm.rated_capacity,
    COUNT(ta.id) FILTER (
        WHERE ta.status = 'ACTIVE'
    )                                       AS active_units,
    ROUND(
        COUNT(ta.id) FILTER (WHERE ta.status = 'ACTIVE')::NUMERIC
        / NULLIF(scm.rated_capacity, 0) * 100, 2
    )                                       AS utilization_pct,
    s.performance_grade,
    s.performance_score,
    s.stop_assignment,
    CASE
        WHEN s.stop_assignment THEN 'RED'
        WHEN COUNT(ta.id) FILTER (WHERE ta.status = 'ACTIVE') >= scm.rated_capacity THEN 'YELLOW'
        ELSE 'GREEN'
    END                                     AS health_status
FROM subcontractors s
JOIN subcontractor_capacity_matrix scm ON scm.subcon_id = s.id
JOIN projects p ON p.id = scm.project_id
LEFT JOIN task_assignments ta ON ta.subcon_id = s.id AND ta.project_id = p.id
GROUP BY s.id, s.name, p.id, scm.rated_capacity, s.performance_grade, s.performance_score, s.stop_assignment;


-- ─── II. Procurement: Inventory Runway (days of stock remaining) ──────────────
CREATE VIEW vw_inventory_runway AS
SELECT
    ist.material_id,
    m.name                              AS material_name,
    m.unit,
    ist.project_id,
    ist.quantity_on_hand,
    -- Average daily consumption = total transferred in last 30 days / 30
    COALESCE(
        SUM(mt.quantity) FILTER (WHERE mt.transfer_date >= CURRENT_DATE - 30)
        / 30.0, 0
    )                                   AS avg_daily_consumption,
    CASE
        WHEN COALESCE(SUM(mt.quantity) FILTER (WHERE mt.transfer_date >= CURRENT_DATE - 30), 0) = 0
        THEN NULL
        ELSE ROUND(ist.quantity_on_hand / (
            SUM(mt.quantity) FILTER (WHERE mt.transfer_date >= CURRENT_DATE - 30) / 30.0
        ), 1)
    END                                 AS days_of_stock_remaining
FROM inventory_stock ist
JOIN materials m ON m.id = ist.material_id
LEFT JOIN material_transfers mt ON mt.material_id = ist.material_id AND mt.project_id = ist.project_id
GROUP BY ist.material_id, m.name, m.unit, ist.project_id, ist.quantity_on_hand;


-- ─── III. Batching Plant: Yield Variance Summary ──────────────────────────────
CREATE VIEW vw_batching_yield_summary AS
SELECT
    pl.project_id,
    pl.batch_date,
    SUM(pl.volume_produced_m3)          AS total_produced_m3,
    SUM(pl.theoretical_yield_m3)        AS total_theoretical_m3,
    ROUND(AVG(pl.yield_variance_pct), 4) AS avg_yield_variance_pct,
    COUNT(*) FILTER (WHERE pl.is_production_flagged) AS flagged_batches,
    -- Internal revenue from deliveries that day
    COALESCE(SUM(bis.total_internal_revenue), 0) AS internal_revenue
FROM batching_production_logs pl
LEFT JOIN concrete_delivery_notes cdn ON cdn.production_log_id = pl.id
LEFT JOIN concrete_delivery_receipts cdr ON cdr.delivery_note_id = cdn.id
LEFT JOIN batching_internal_sales bis ON bis.delivery_receipt_id = cdr.id
GROUP BY pl.project_id, pl.batch_date;


-- ─── IV. Motorpool: Fix-or-Flip ROI Summary ───────────────────────────────────
CREATE VIEW vw_motorpool_roi AS
SELECT
    e.id                                AS equipment_id,
    e.code,
    e.name,
    e.status,
    e.is_flagged_for_flip,
    e.total_engine_hours,
    COALESCE(SUM(mr.total_cost), 0)     AS total_maintenance_cost_12mo,
    COALESCE(SUM(ea.total_rental_income), 0) AS total_rental_income,
    CASE
        WHEN COALESCE(SUM(ea.total_rental_income), 0) = 0 THEN NULL
        ELSE ROUND(
            COALESCE(SUM(mr.total_cost), 0) / SUM(ea.total_rental_income) * 100, 2
        )
    END                                 AS maintenance_to_income_ratio_pct,
    COALESCE(SUM(ea.days_rented), 0)    AS total_days_rented
FROM equipment e
LEFT JOIN maintenance_records mr
    ON mr.equipment_id = e.id
    AND mr.maintenance_date >= CURRENT_DATE - INTERVAL '12 months'
LEFT JOIN equipment_assignments ea
    ON ea.equipment_id = e.id
    AND ea.status = 'RETURNED'
    AND ea.assigned_date >= CURRENT_DATE - INTERVAL '12 months'
GROUP BY e.id, e.code, e.name, e.status, e.is_flagged_for_flip, e.total_engine_hours;


-- ─── V. Finance: Inflow-Outflow Gap (30-day) ─────────────────────────────────
CREATE VIEW vw_finance_gap_latest AS
SELECT DISTINCT ON (project_id)
    project_id,
    projection_date,
    30                                  AS period_days,
    current_bank_balance,
    verified_receivables,
    projected_inflow,
    approved_payables,
    projected_material_outflow,
    projected_labor_outflow,
    net_gap,
    is_below_buffer,
    generated_at
FROM cash_flow_projections
WHERE period_days = 30
ORDER BY project_id, projection_date DESC;


-- ─── VI. BOD Cockpit: Production velocity vs. 120-unit target ─────────────────
CREATE VIEW vw_bod_production_velocity AS
SELECT
    pu.project_id,
    DATE_TRUNC('month', um.verified_at)::DATE   AS month,
    COUNT(*) FILTER (
        WHERE um.status = 'VERIFIED'
        AND md.triggers_billing = TRUE
    )                                           AS units_completed_this_month,
    p.target_units_per_month,
    ROUND(
        COUNT(*) FILTER (
            WHERE um.status = 'VERIFIED' AND md.triggers_billing = TRUE
        )::NUMERIC / NULLIF(p.target_units_per_month, 0) * 100, 2
    )                                           AS velocity_pct_of_target
FROM unit_milestones um
JOIN project_units pu ON pu.id = um.unit_id
JOIN milestone_definitions md ON md.id = um.milestone_def_id
JOIN projects p ON p.id = pu.project_id
WHERE um.verified_at IS NOT NULL
GROUP BY pu.project_id, DATE_TRUNC('month', um.verified_at), p.target_units_per_month;


-- ─── VII. HR: DTR Compliance ─────────────────────────────────────────────────
CREATE VIEW vw_dtr_compliance AS
SELECT
    e.dept_id,
    d.name                              AS dept_name,
    COUNT(DISTINCT e.id)                AS total_employees,
    COUNT(DISTINCT dtr.employee_id) FILTER (WHERE dtr.is_verified = TRUE)
                                        AS employees_with_verified_dtr,
    ROUND(
        COUNT(DISTINCT dtr.employee_id) FILTER (WHERE dtr.is_verified = TRUE)::NUMERIC
        / NULLIF(COUNT(DISTINCT e.id), 0) * 100, 2
    )                                   AS dtr_compliance_pct
FROM employees e
JOIN departments d ON d.id = e.dept_id
LEFT JOIN daily_time_records dtr
    ON dtr.employee_id = e.id
    AND dtr.work_date >= DATE_TRUNC('month', CURRENT_DATE)
WHERE e.is_active = TRUE
GROUP BY e.dept_id, d.name;

-- ================================================================
-- 014_resource_forecasting.sql
-- ================================================================
-- =============================================================
-- MIGRATION 014: Resource Forecasting & Chain of Necessity
-- =============================================================
-- Applies:
--   1. New enums
--   2. bom_standards.base_rate_php column
--   3. purchase_orders additions (is_osm, requires_dual_auth, audit_status)
--   4. material_receiving_reports.photo_evidence_url
--   5. resource_forecasts table
--   6. material_movement_logs table
--   7. task_assignments.status column type migration
--   8. Trigger: generate_unit_resource_forecast()
--   9. Trigger: auto-set requires_dual_auth on POs > 50,000
-- =============================================================

-- 1. ENUMS -------------------------------------------------------

DO $$ BEGIN
    CREATE TYPE ntp_status AS ENUM ('DRAFT', 'BOD_APPROVED', 'ACTIVE', 'COMPLETED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE resource_forecast_status AS ENUM ('PENDING_PR', 'PR_CREATED', 'PO_ISSUED', 'ISSUED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE payment_flow_status AS ENUM ('DRAFT', 'PREPARED', 'RELEASED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE material_movement_type AS ENUM ('RECEIPT', 'ISSUANCE', 'TRANSFER', 'ADJUSTMENT');
EXCEPTION WHEN duplicate_object THEN null; END $$;


-- 2. BOM STANDARDS: base_rate_php -----------------------------------

ALTER TABLE bom_standards
    ADD COLUMN IF NOT EXISTS base_rate_php NUMERIC(15, 2);

COMMENT ON COLUMN bom_standards.base_rate_php IS
    'Model-specific cost rate for job costing. Falls back to materials.admin_price when NULL.';


-- 3. PURCHASE ORDERS: new columns -----------------------------------

ALTER TABLE purchase_orders
    ADD COLUMN IF NOT EXISTS is_osm             BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS requires_dual_auth BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS audit_status       TEXT    NOT NULL DEFAULT 'PENDING_REVIEW';

COMMENT ON COLUMN purchase_orders.is_osm IS
    'TRUE when materials are developer-supplied (OSM); triggers deduction from developer billing.';
COMMENT ON COLUMN purchase_orders.requires_dual_auth IS
    'Auto-set to TRUE by trigger when total_amount > 50,000 PHP. BOD/Finance co-approval required.';
COMMENT ON COLUMN purchase_orders.audit_status IS
    'PENDING_REVIEW | VERIFIED | FLAGGED — independent of the main PO status workflow.';


-- 4. MRRs: photo_evidence_url (Attachment Rule) ----------------------

ALTER TABLE material_receiving_reports
    ADD COLUMN IF NOT EXISTS photo_evidence_url TEXT;

COMMENT ON COLUMN material_receiving_reports.photo_evidence_url IS
    'Required attachment before MRR can advance to PENDING_APPROVAL status (Attachment Rule).';


-- 5. TASK ASSIGNMENTS: migrate status to ntp_status enum -------------

-- Safe migration: cast existing varchar values to the new enum.
-- Values in production must be one of DRAFT, BOD_APPROVED, ACTIVE, COMPLETED.
-- Any non-conforming values will error here — fix them before running.
ALTER TABLE task_assignments
    ALTER COLUMN status TYPE ntp_status
    USING status::ntp_status;

ALTER TABLE task_assignments
    ALTER COLUMN status SET DEFAULT 'DRAFT';


-- 6. RESOURCE FORECASTS TABLE ----------------------------------------

CREATE TABLE IF NOT EXISTS resource_forecasts (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ntp_id           UUID    NOT NULL REFERENCES task_assignments(id) ON DELETE CASCADE,
    project_id       UUID    NOT NULL REFERENCES projects(id),
    unit_id          UUID    NOT NULL REFERENCES project_units(id),
    bom_standard_id  UUID    NOT NULL REFERENCES bom_standards(id),
    material_id      UUID    NOT NULL REFERENCES materials(id),
    forecast_qty     NUMERIC(15, 4) NOT NULL,
    actual_issued_qty NUMERIC(15, 4) NOT NULL DEFAULT 0,
    status           resource_forecast_status NOT NULL DEFAULT 'PENDING_PR',
    pr_id            UUID    REFERENCES purchase_requisitions(id),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT qty_variance_check
        CHECK (actual_issued_qty <= forecast_qty * 1.10)
);

CREATE INDEX IF NOT EXISTS idx_resource_forecasts_ntp      ON resource_forecasts(ntp_id);
CREATE INDEX IF NOT EXISTS idx_resource_forecasts_unit     ON resource_forecasts(unit_id);
CREATE INDEX IF NOT EXISTS idx_resource_forecasts_status   ON resource_forecasts(status);
CREATE INDEX IF NOT EXISTS idx_resource_forecasts_material ON resource_forecasts(material_id);


-- 7. MATERIAL MOVEMENT LOGS TABLE ------------------------------------

CREATE TABLE IF NOT EXISTS material_movement_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    movement_type   material_movement_type NOT NULL,
    reference_type  TEXT NOT NULL,          -- 'PO', 'NTP', 'TRANSFER', 'ADJUSTMENT'
    reference_id    UUID NOT NULL,
    material_id     UUID NOT NULL REFERENCES materials(id),
    project_id      UUID NOT NULL REFERENCES projects(id),
    unit_id         UUID REFERENCES project_units(id),
    quantity        NUMERIC(15, 4) NOT NULL,
    unit_price      NUMERIC(15, 2),
    notes           TEXT,
    performed_by    UUID NOT NULL REFERENCES auth.users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mat_logs_material  ON material_movement_logs(material_id);
CREATE INDEX IF NOT EXISTS idx_mat_logs_project   ON material_movement_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_mat_logs_ref       ON material_movement_logs(reference_type, reference_id);


-- 8. TRIGGER: Auto-set requires_dual_auth when PO > 50,000 PHP -------

CREATE OR REPLACE FUNCTION set_dual_auth_flag()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.total_amount > 50000 THEN
        NEW.requires_dual_auth := TRUE;
    ELSE
        NEW.requires_dual_auth := FALSE;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_dual_auth ON purchase_orders;

CREATE TRIGGER trg_set_dual_auth
    BEFORE INSERT OR UPDATE OF total_amount
    ON purchase_orders
    FOR EACH ROW
    EXECUTE FUNCTION set_dual_auth_flag();


-- 9. TRIGGER: Auto-generate resource forecasts when NTP goes ACTIVE --

CREATE OR REPLACE FUNCTION generate_unit_resource_forecast()
RETURNS TRIGGER AS $$
BEGIN
    -- Fire only when status transitions TO 'ACTIVE' (not on every update)
    IF (TG_OP = 'INSERT'  AND NEW.status = 'ACTIVE') OR
       (TG_OP = 'UPDATE'  AND NEW.status = 'ACTIVE' AND OLD.status <> 'ACTIVE')
    THEN
        -- Guard: skip if forecasts already exist for this NTP (idempotent)
        IF NOT EXISTS (
            SELECT 1 FROM resource_forecasts WHERE ntp_id = NEW.id
        ) THEN
            INSERT INTO resource_forecasts (
                ntp_id,
                project_id,
                unit_id,
                bom_standard_id,
                material_id,
                forecast_qty,
                status
            )
            SELECT
                NEW.id,
                NEW.project_id,
                NEW.unit_id,
                bs.id,
                bs.material_id,
                bs.quantity_per_unit,
                'PENDING_PR'
            FROM bom_standards  bs
            JOIN project_units  pu ON pu.id = NEW.unit_id
            WHERE bs.unit_model = pu.unit_model
              AND bs.is_active  = TRUE;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_forecast_on_ntp_active ON task_assignments;

CREATE TRIGGER trigger_forecast_on_ntp_active
    AFTER INSERT OR UPDATE OF status
    ON task_assignments
    FOR EACH ROW
    EXECUTE FUNCTION generate_unit_resource_forecast();


-- 10. UPDATED_AT auto-maintenance for resource_forecasts -------------

CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_resource_forecasts_updated_at ON resource_forecasts;

CREATE TRIGGER trg_resource_forecasts_updated_at
    BEFORE UPDATE ON resource_forecasts
    FOR EACH ROW
    EXECUTE FUNCTION touch_updated_at();

-- ================================================================
-- 015_site_profitability_view.sql
-- ================================================================
-- Migration 015: site_profitability view + supporting columns
-- Adds contract_price to project_units, labor_cost_php + unit_id to
-- construction_manpower_logs, then creates the site_profitability view
-- that aggregates all four cost streams per unit (Chain of Necessity ROI).

-- ─── Column additions ────────────────────────────────────────────────────────

ALTER TABLE project_units
  ADD COLUMN IF NOT EXISTS contract_price NUMERIC(15,2);

ALTER TABLE construction_manpower_logs
  ADD COLUMN IF NOT EXISTS unit_id UUID REFERENCES project_units(id),
  ADD COLUMN IF NOT EXISTS labor_cost_php NUMERIC(15,2) NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_manpower_logs_unit_id
  ON construction_manpower_logs(unit_id);

-- ─── site_profitability view ─────────────────────────────────────────────────
-- Revenue recognition follows Completed Contract Method:
-- contract_price is only meaningful once current_category = 'TURNOVER'.
-- The view exposes raw cost totals at all phases for job-costing visibility.

DROP VIEW IF EXISTS site_profitability;

CREATE VIEW site_profitability AS
SELECT
    pu.id                                         AS unit_id,
    pu.unit_code,
    pu.unit_model,
    pu.project_id,
    pu.block_id,
    pu.current_category,
    pu.contract_price,

    -- Material cost: sum of issued items (unit_price * quantity on movement log)
    COALESCE(mat.total_materials, 0)              AS total_materials,

    -- Labor cost: entered directly on construction_manpower_logs
    COALESCE(lab.total_labor, 0)                  AS total_labor,

    -- Concrete cost: internal billing from batching plant per unit
    COALESCE(con.total_concrete_internal, 0)      AS total_concrete_internal,

    -- Fleet cost: equipment assignment rental income charged to this unit
    COALESCE(flt.total_fleet_internal, 0)         AS total_fleet_internal,

    -- Derived totals
    (
        COALESCE(mat.total_materials, 0) +
        COALESCE(lab.total_labor, 0) +
        COALESCE(con.total_concrete_internal, 0) +
        COALESCE(flt.total_fleet_internal, 0)
    )                                             AS total_direct_cost,

    -- Net margin: null when contract_price not yet set
    CASE
        WHEN pu.contract_price IS NOT NULL THEN
            pu.contract_price - (
                COALESCE(mat.total_materials, 0) +
                COALESCE(lab.total_labor, 0) +
                COALESCE(con.total_concrete_internal, 0) +
                COALESCE(flt.total_fleet_internal, 0)
            )
        ELSE NULL
    END                                           AS net_profit_margin

FROM project_units pu

-- Material issuances via material_movement_logs (type = 'ISSUANCE')
LEFT JOIN (
    SELECT
        unit_id,
        SUM(quantity * COALESCE(unit_price, 0)) AS total_materials
    FROM material_movement_logs
    WHERE movement_type = 'ISSUANCE'
      AND unit_id IS NOT NULL
    GROUP BY unit_id
) mat ON mat.unit_id = pu.id

-- Labor cost from construction manpower logs
LEFT JOIN (
    SELECT
        unit_id,
        SUM(labor_cost_php) AS total_labor
    FROM construction_manpower_logs
    WHERE unit_id IS NOT NULL
    GROUP BY unit_id
) lab ON lab.unit_id = pu.id

-- Concrete: batching internal sales billed to this unit
LEFT JOIN (
    SELECT
        unit_id,
        SUM(total_internal_revenue) AS total_concrete_internal
    FROM batching_internal_sales
    WHERE unit_id IS NOT NULL
    GROUP BY unit_id
) con ON con.unit_id = pu.id

-- Fleet: equipment assignment rental income charged to unit
LEFT JOIN (
    SELECT
        unit_id,
        SUM(total_rental_income) AS total_fleet_internal
    FROM equipment_assignments
    WHERE unit_id IS NOT NULL
    GROUP BY unit_id
) flt ON flt.unit_id = pu.id;

COMMENT ON VIEW site_profitability IS
  'Per-unit job costing view. Cost streams: materials (material_movement_logs ISSUANCE), '
  'labor (construction_manpower_logs.labor_cost_php), concrete (batching_internal_sales), '
  'fleet (equipment_assignments). Revenue recognized via contract_price only at TURNOVER phase.';

-- ================================================================
-- 016_internal_rental_billing_trigger.sql
-- ================================================================
-- Migration 016: Internal equipment rental billing trigger
-- When an equipment_assignments row is marked COMPLETED, automatically post
-- a paired INTERNAL_TRANSFER journal entry to financial_ledger:
--   DEBIT  → project cost center (dept = CONSTRUCTION)  — expense to site
--   CREDIT → motorpool cost center (dept = MOTORPOOL)   — internal revenue
-- Rate is sourced from the Admin-Locked equipment.daily_rental_rate field.
-- Both entries use is_external = FALSE to distinguish from real vendor payments.

CREATE OR REPLACE FUNCTION fn_post_internal_rental()
RETURNS TRIGGER AS $$
DECLARE
    v_daily_rate    NUMERIC(15,2);
    v_days          INTEGER;
    v_charge        NUMERIC(15,2);
    v_const_dept    UUID;
    v_motor_dept    UUID;
BEGIN
    -- Rate is Admin-Locked on the equipment master (never overridden per assignment)
    SELECT daily_rental_rate
    INTO   v_daily_rate
    FROM   equipment
    WHERE  id = NEW.equipment_id;

    IF v_daily_rate IS NULL THEN
        RAISE EXCEPTION 'equipment % has no daily_rental_rate set', NEW.equipment_id;
    END IF;

    -- Prefer the generated days_rented column; fall back to date diff on completion day
    v_days   := COALESCE(NEW.days_rented, (CURRENT_DATE - NEW.assigned_date)::INTEGER);
    v_charge := v_daily_rate * GREATEST(v_days, 1);

    -- Look up department UUIDs by code (departments seeded in 002_core_master.sql)
    SELECT id INTO v_const_dept FROM departments WHERE code = 'CONSTRUCTION' LIMIT 1;
    SELECT id INTO v_motor_dept FROM departments WHERE code = 'MOTORPOOL'    LIMIT 1;

    IF v_const_dept IS NULL OR v_motor_dept IS NULL THEN
        RAISE EXCEPTION 'CONSTRUCTION or MOTORPOOL department not found in departments table';
    END IF;

    -- Idempotency: remove any prior entries for this assignment before re-posting
    -- (guards against duplicate fires if status is toggled back and re-completed)
    DELETE FROM financial_ledger
    WHERE  reference_type = 'equipment_assignments'
    AND    reference_id   = NEW.id
    AND    transaction_type = 'INTERNAL_TRANSFER';

    -- DEBIT: charge project site (cost to construction)
    INSERT INTO financial_ledger (
        project_id, cost_center_id, dept_id, unit_id,
        resource_type, resource_id,
        transaction_type, reference_type, reference_id,
        amount, is_external, transaction_date, description
    ) VALUES (
        NEW.project_id, NEW.cost_center_id, v_const_dept, NEW.unit_id,
        'MACHINE', NEW.equipment_id,
        'INTERNAL_TRANSFER', 'equipment_assignments', NEW.id,
        v_charge, FALSE, CURRENT_DATE,
        'Internal equipment rental charge: ' || v_days::TEXT || ' day(s) @ ₱' || v_daily_rate::TEXT
    );

    -- CREDIT: record internal revenue for Motorpool
    INSERT INTO financial_ledger (
        project_id, cost_center_id, dept_id, unit_id,
        resource_type, resource_id,
        transaction_type, reference_type, reference_id,
        amount, is_external, transaction_date, description
    ) VALUES (
        NEW.project_id, NEW.cost_center_id, v_motor_dept, NEW.unit_id,
        'MACHINE', NEW.equipment_id,
        'INTERNAL_TRANSFER', 'equipment_assignments', NEW.id,
        v_charge, FALSE, CURRENT_DATE,
        'Internal rental income: ' || v_days::TEXT || ' day(s) @ ₱' || v_daily_rate::TEXT
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Fires once per row when an assignment transitions to COMPLETED
DROP TRIGGER IF EXISTS tr_auto_rental_billing ON equipment_assignments;

CREATE TRIGGER tr_auto_rental_billing
AFTER UPDATE OF status ON equipment_assignments
FOR EACH ROW
WHEN (NEW.status = 'COMPLETED' AND OLD.status <> 'COMPLETED')
EXECUTE FUNCTION fn_post_internal_rental();

-- ================================================================
-- 017_virtual_inventory_ledger.sql
-- ================================================================
-- Migration 017: virtual_inventory_ledger table + sync trigger
-- Maintains a running per-material-per-site balance derived from
-- material_movement_logs. The Chain of Necessity flow:
--   MRR receipt → RECEIPT row  → total_bulk_qty increases
--   NTP issuance → ISSUANCE row → allocated_qty increases
--   ADJUSTMENT   → adjusts total_bulk_qty (positive = stock-in, negative = write-off)
-- remaining_qty is a STORED generated column: (total_bulk_qty - allocated_qty)

-- ─── Table ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS virtual_inventory_ledger (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    material_id     UUID NOT NULL REFERENCES materials(id),
    project_id      UUID NOT NULL REFERENCES projects(id),
    total_bulk_qty  NUMERIC(12,2) NOT NULL DEFAULT 0,
    allocated_qty   NUMERIC(12,2) NOT NULL DEFAULT 0,
    remaining_qty   NUMERIC(12,2) GENERATED ALWAYS AS (total_bulk_qty - allocated_qty) STORED,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_inventory_material_project UNIQUE (material_id, project_id),
    CONSTRAINT chk_inventory_no_negative_remaining
        CHECK (total_bulk_qty >= allocated_qty)
);

CREATE INDEX IF NOT EXISTS idx_vil_material_project
    ON virtual_inventory_ledger (material_id, project_id);

-- ─── Sync trigger function ────────────────────────────────────────────────────
-- Fires AFTER INSERT on material_movement_logs and upserts the balance row.
-- RECEIPT    → adds to total_bulk_qty
-- ISSUANCE   → adds to allocated_qty
-- TRANSFER   → adds to allocated_qty (material leaves this site)
-- ADJUSTMENT → positive quantity adds to total_bulk_qty (e.g. count surplus),
--              negative quantity subtracts from total_bulk_qty (write-off)

CREATE OR REPLACE FUNCTION fn_sync_inventory_ledger()
RETURNS TRIGGER AS $$
BEGIN
    -- Only act when a project context is present
    IF NEW.project_id IS NULL THEN
        RETURN NEW;
    END IF;

    INSERT INTO virtual_inventory_ledger (material_id, project_id, total_bulk_qty, allocated_qty)
    VALUES (
        NEW.material_id,
        NEW.project_id,
        CASE WHEN NEW.movement_type IN ('RECEIPT')
             THEN COALESCE(NEW.quantity, 0)
             WHEN NEW.movement_type = 'ADJUSTMENT' AND NEW.quantity > 0
             THEN NEW.quantity
             ELSE 0
        END,
        CASE WHEN NEW.movement_type IN ('ISSUANCE', 'TRANSFER')
             THEN COALESCE(NEW.quantity, 0)
             WHEN NEW.movement_type = 'ADJUSTMENT' AND NEW.quantity < 0
             THEN ABS(NEW.quantity)  -- treat negative adjustment as a write-off (allocated away)
             ELSE 0
        END
    )
    ON CONFLICT (material_id, project_id) DO UPDATE SET
        total_bulk_qty = virtual_inventory_ledger.total_bulk_qty + EXCLUDED.total_bulk_qty,
        allocated_qty  = virtual_inventory_ledger.allocated_qty  + EXCLUDED.allocated_qty,
        updated_at     = NOW();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_sync_inventory_ledger ON material_movement_logs;

CREATE TRIGGER tr_sync_inventory_ledger
AFTER INSERT ON material_movement_logs
FOR EACH ROW
EXECUTE FUNCTION fn_sync_inventory_ledger();

-- ─── Helper: full recalculation (run after bulk imports or data corrections) ──

CREATE OR REPLACE FUNCTION fn_recalculate_inventory_ledger()
RETURNS VOID AS $$
BEGIN
    DELETE FROM virtual_inventory_ledger;

    INSERT INTO virtual_inventory_ledger (material_id, project_id, total_bulk_qty, allocated_qty)
    SELECT
        material_id,
        project_id,
        COALESCE(SUM(CASE
            WHEN movement_type = 'RECEIPT'                        THEN quantity
            WHEN movement_type = 'ADJUSTMENT' AND quantity > 0    THEN quantity
            ELSE 0
        END), 0) AS total_bulk_qty,
        COALESCE(SUM(CASE
            WHEN movement_type IN ('ISSUANCE', 'TRANSFER')        THEN quantity
            WHEN movement_type = 'ADJUSTMENT' AND quantity < 0    THEN ABS(quantity)
            ELSE 0
        END), 0) AS allocated_qty
    FROM material_movement_logs
    WHERE project_id IS NOT NULL
    GROUP BY material_id, project_id;
END;
$$ LANGUAGE plpgsql;

-- ================================================================
-- 018_manual_vouchers_payment_workflow.sql
-- ================================================================
-- Migration 018: Add payment workflow columns to manual_vouchers
-- Gemini target was financial_vouchers → actual table is manual_vouchers.
--
-- prepared_by   : Finance staff who physically prepared the check/voucher document
--                 (distinct from created_by which is the system record creator)
-- authorized_by : Second signatory who authorized release — satisfies dual-auth
--                 requirement for vouchers tied to POs > ₱50,000
-- payment_status: 3-state release lifecycle separate from the approval workflow
--                 DRAFT → PREPARED → RELEASED
--                 (Gemini used PENDING_RELEASE; mapped to PREPARED in our enum)

ALTER TABLE manual_vouchers
    ADD COLUMN IF NOT EXISTS prepared_by    UUID REFERENCES users(id),
    ADD COLUMN IF NOT EXISTS authorized_by  UUID REFERENCES users(id),
    ADD COLUMN IF NOT EXISTS payment_status payment_flow_status NOT NULL DEFAULT 'DRAFT';

COMMENT ON COLUMN manual_vouchers.payment_status IS
    'DRAFT = being prepared, PREPARED = awaiting banking release, RELEASED = payment sent';
COMMENT ON COLUMN manual_vouchers.prepared_by IS
    'Finance staff who prepared the physical voucher document';
COMMENT ON COLUMN manual_vouchers.authorized_by IS
    'Second signatory for dual-auth release (required when amount > ₱50,000)';

-- ================================================================
-- 019_payment_requests_released_by.sql
-- ================================================================
-- Migration 019: Add released_by to payment_requests
-- From the Gemini consolidated schema dump (payments table):
--   prepared_by → payment_requests.requested_by (already exists)
--   released_by → MISSING (released_at exists but not the who)
--   status      → payment_requests.status (already exists)
--
-- All other tables in the consolidated dump are already covered:
--   resource_forecasts, BOM RLS, triggers  → migration 014
--   virtual_inventory_ledger               → migration 017
--   manual_vouchers prepared_by/authorized → migration 018
--   purchase_orders audit_reviewed_by/at   → already in schema (= verified_by/at)
--   material_movement_logs                 → migration 014
--   site_profitability view                → migration 015
--   internal rental trigger                → migration 016

ALTER TABLE payment_requests
    ADD COLUMN IF NOT EXISTS released_by UUID REFERENCES users(id);

COMMENT ON COLUMN payment_requests.released_by IS
    'User who physically released the payment (set when status → RELEASED)';

-- ================================================================
-- 020_mrp_queue_view.sql
-- ================================================================
-- Migration 020: mrp_queue view
-- MRP (Material Requirements Planning) queue — shows aggregate material demand
-- for all NTPs that are BOD_APPROVED or ACTIVE, factoring in per-model buffers.
--
-- Gemini fixes applied:
--   task_assignments has no unit_model column → join through project_units
--   master_bom.model_id → bom_standards.unit_model
--   master_materials → materials (table: materials)
--   unit_type 'BEG'/'END' → encoded in project_units.unit_model string
--   status 'APPROVED_BY_OFFICER' → ntpStatusEnum has no such value;
--     queue shows BOD_APPROVED (cleared for production) + ACTIVE (in progress)

DROP VIEW IF EXISTS mrp_queue;

CREATE VIEW mrp_queue AS
SELECT
    m.name                                              AS material_name,
    m.uom                                              AS unit_of_measure,
    m.id                                               AS material_id,

    COUNT(DISTINCT ta.id)                              AS ntp_count,

    -- Buffered quantity: BEG-model units carry 10% extra, END-model 15% extra
    SUM(
        b.required_qty *
        CASE
            WHEN pu.unit_model ILIKE '%BEG%' THEN 1.10
            WHEN pu.unit_model ILIKE '%END%' THEN 1.15
            ELSE 1.00
        END
    )                                                  AS total_needed_qty,

    -- Unbuffered baseline for comparison
    SUM(b.required_qty)                                AS baseline_qty,

    -- How much has already been issued against these NTPs
    COALESCE(SUM(rf.actual_issued_qty), 0)            AS already_issued_qty,

    -- Net still to procure (never negative)
    GREATEST(
        SUM(
            b.required_qty *
            CASE
                WHEN pu.unit_model ILIKE '%BEG%' THEN 1.10
                WHEN pu.unit_model ILIKE '%END%' THEN 1.15
                ELSE 1.00
            END
        ) - COALESCE(SUM(rf.actual_issued_qty), 0),
        0
    )                                                  AS net_to_procure_qty,

    -- Admin-locked rate for budget estimation
    COALESCE(b.base_rate_php, m.admin_price)           AS unit_rate_php,

    GREATEST(
        SUM(
            b.required_qty *
            CASE
                WHEN pu.unit_model ILIKE '%BEG%' THEN 1.10
                WHEN pu.unit_model ILIKE '%END%' THEN 1.15
                ELSE 1.00
            END
        ) - COALESCE(SUM(rf.actual_issued_qty), 0),
        0
    ) * COALESCE(b.base_rate_php, m.admin_price)      AS estimated_cost_php

FROM task_assignments ta

-- Bridge to unit model (task_assignments has no unit_model column)
JOIN project_units   pu ON pu.id          = ta.unit_id

-- BOM lookup by model
JOIN bom_standards   b  ON b.unit_model   = pu.unit_model

-- Material master (admin price + UOM)
JOIN materials       m  ON m.id           = b.material_id

-- Resource forecast totals (left join — NTPs before first trigger fire have no rows yet)
LEFT JOIN resource_forecasts rf
    ON  rf.ntp_id      = ta.id
    AND rf.material_id = m.id

-- Only NTPs cleared for production
WHERE ta.status IN ('BOD_APPROVED', 'ACTIVE')

GROUP BY
    m.id, m.name, m.uom, m.admin_price,
    b.base_rate_php

ORDER BY
    net_to_procure_qty DESC;

COMMENT ON VIEW mrp_queue IS
    'Aggregate material demand for active NTPs. Buffer multipliers: BEG-model +10%, '
    'END-model +15%, standard 0%. Net-to-procure deducts already-issued quantities '
    'from resource_forecasts. Rate falls back to materials.admin_price when '
    'bom_standards.base_rate_php is not set.';

-- ================================================================
-- 021_war_audit_remarks.sql
-- ================================================================
-- Migration 021: Add audit_remarks to work_accomplished_reports
-- The existing rejection_reason column is for rejection-specific text.
-- audit_remarks is a general field for auditor notes on both VERIFIED and
-- REJECTED outcomes, matching the verifyMilestone server action.

ALTER TABLE work_accomplished_reports
    ADD COLUMN IF NOT EXISTS audit_remarks TEXT;

COMMENT ON COLUMN work_accomplished_reports.audit_remarks IS
    'General auditor notes recorded on VERIFIED or REJECTED outcome';
COMMENT ON COLUMN work_accomplished_reports.rejection_reason IS
    'Subcontractor-facing explanation populated only on REJECTED status';

-- ================================================================
-- 022_concrete_delivery_rate_and_truck.sql
-- ================================================================
-- Migration 022: Admin-locked rate on mix_designs + truck tracking on delivery notes
-- Enables the logConcreteDelivery action to source the internal billing rate from
-- the admin-locked mix design rather than accepting it from the caller.

ALTER TABLE mix_designs
    ADD COLUMN IF NOT EXISTS internal_rate_per_m3 NUMERIC(15,2);

COMMENT ON COLUMN mix_designs.internal_rate_per_m3 IS
    'Admin-locked ₱/m³ rate used for internal Batching→Site sales (P&L billing)';

-- Make production_log_id nullable: quick field deliveries may arrive before the
-- batch production log is created (driver drops concrete, log filled in later).
ALTER TABLE concrete_delivery_notes
    ALTER COLUMN production_log_id DROP NOT NULL,
    ADD COLUMN IF NOT EXISTS mix_design_id UUID REFERENCES mix_designs(id),
    ADD COLUMN IF NOT EXISTS truck_id      UUID REFERENCES equipment(id);

COMMENT ON COLUMN concrete_delivery_notes.truck_id IS
    'Delivery truck (equipment) used — links to Motorpool for ROI tracking';

-- ================================================================
-- 023_manual_vouchers_release_fields.sql
-- ================================================================
-- Migration 023: Add release-workflow fields to manual_vouchers
-- requires_dual_auth: set TRUE when amount >= 50,000 (mirrors PO behavior).
--                     Documents that the dual-auth control was applied.
-- bank_account_id:    Which bank account to debit on RELEASED — required for
--                     the execute_financial_finalization step (bank DEBIT + P&L).

ALTER TABLE manual_vouchers
    ADD COLUMN IF NOT EXISTS requires_dual_auth BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS bank_account_id    UUID REFERENCES bank_accounts(id);

-- Auto-flag existing high-value vouchers
UPDATE manual_vouchers SET requires_dual_auth = TRUE WHERE amount >= 50000;

COMMENT ON COLUMN manual_vouchers.requires_dual_auth IS
    'TRUE when amount >= ₱50,000 — audit trail that dual-auth control was applied';
COMMENT ON COLUMN manual_vouchers.bank_account_id IS
    'Bank account to debit when payment_status → RELEASED';

-- ================================================================
-- 024_material_movement_logs_photo_url.sql
-- ================================================================
-- Migration 024: Add photo evidence URL to material_movement_logs
-- Required for inventory adjustments (Theft, Damage, Spillage, Found Stock)
-- where photo proof is mandatory before the adjustment is accepted.

ALTER TABLE material_movement_logs
    ADD COLUMN IF NOT EXISTS photo_evidence_url TEXT;

COMMENT ON COLUMN material_movement_logs.photo_evidence_url IS
    'Mandatory photo proof for ADJUSTMENT movements; optional for others';

-- ================================================================
-- 025_mrp_queue_add_project_id.sql
-- ================================================================
-- Migration 025: Add project_id to mrp_queue view
-- Required for filtering the MRP queue by project in consolidateAndIssuePR
-- and the getMrpQueue server action.

DROP VIEW IF EXISTS mrp_queue;

CREATE VIEW mrp_queue AS
SELECT
    ta.project_id,

    m.name                                              AS material_name,
    m.uom                                               AS unit_of_measure,
    m.id                                                AS material_id,

    COUNT(DISTINCT ta.id)                               AS ntp_count,

    SUM(
        b.required_qty *
        CASE
            WHEN pu.unit_model ILIKE '%BEG%' THEN 1.10
            WHEN pu.unit_model ILIKE '%END%' THEN 1.15
            ELSE 1.00
        END
    )                                                   AS total_needed_qty,

    SUM(b.required_qty)                                 AS baseline_qty,

    COALESCE(SUM(rf.actual_issued_qty), 0)              AS already_issued_qty,

    GREATEST(
        SUM(
            b.required_qty *
            CASE
                WHEN pu.unit_model ILIKE '%BEG%' THEN 1.10
                WHEN pu.unit_model ILIKE '%END%' THEN 1.15
                ELSE 1.00
            END
        ) - COALESCE(SUM(rf.actual_issued_qty), 0),
        0
    )                                                   AS net_to_procure_qty,

    COALESCE(b.base_rate_php, m.admin_price)            AS unit_rate_php,

    GREATEST(
        SUM(
            b.required_qty *
            CASE
                WHEN pu.unit_model ILIKE '%BEG%' THEN 1.10
                WHEN pu.unit_model ILIKE '%END%' THEN 1.15
                ELSE 1.00
            END
        ) - COALESCE(SUM(rf.actual_issued_qty), 0),
        0
    ) * COALESCE(b.base_rate_php, m.admin_price)       AS estimated_cost_php

FROM task_assignments ta
JOIN project_units   pu ON pu.id        = ta.unit_id
JOIN bom_standards   b  ON b.unit_model = pu.unit_model
JOIN materials       m  ON m.id         = b.material_id
LEFT JOIN resource_forecasts rf
    ON  rf.ntp_id      = ta.id
    AND rf.material_id = m.id
WHERE ta.status IN ('BOD_APPROVED', 'ACTIVE')
GROUP BY
    ta.project_id, m.id, m.name, m.uom, m.admin_price, b.base_rate_php
ORDER BY
    net_to_procure_qty DESC;

COMMENT ON VIEW mrp_queue IS
    'Aggregate material demand per project for active NTPs. Buffer multipliers: '
    'BEG-model +10%, END-model +15%, standard 0%. Net-to-procure deducts '
    'already-issued quantities from resource_forecasts. Rate falls back to '
    'materials.admin_price when bom_standards.base_rate_php is not set.';

-- ================================================================
-- 026_manpower_log_no_show_flag.sql
-- ================================================================
-- Migration 026: Add No-Show flag to construction_manpower_logs
-- Flagged TRUE when subcon_headcount < committed_headcount * 0.80.
-- committed_headcount is provided at log time (from the task assignment or
-- the subcontractor's daily deployment commitment); not stored on the subcon
-- record because it can vary per assignment.

ALTER TABLE construction_manpower_logs
    ADD COLUMN IF NOT EXISTS committed_headcount  INTEGER,
    ADD COLUMN IF NOT EXISTS is_no_show_flagged   BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN construction_manpower_logs.committed_headcount IS
    'Expected headcount for this subcon on this day (from task assignment deployment plan)';
COMMENT ON COLUMN construction_manpower_logs.is_no_show_flagged IS
    'TRUE when actual subcon_headcount < committed_headcount * 0.80';

-- ================================================================
-- 027_material_suppliers_junction.sql
-- ================================================================
-- Migration 027: material_suppliers junction table
-- Replaces single preferredSupplierId on materials with a proper many-to-many relationship.
-- The old preferredSupplierId column is kept for backwards compatibility but is no longer the
-- primary way to express supplier preference — use material_suppliers.is_preferred instead.

CREATE TABLE IF NOT EXISTS material_suppliers (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id  uuid NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  supplier_id  uuid NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  is_preferred boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (material_id, supplier_id)
);

-- Migrate existing preferredSupplierId relationships into the new table
INSERT INTO material_suppliers (material_id, supplier_id, is_preferred)
SELECT id, preferred_supplier_id, true
FROM materials
WHERE preferred_supplier_id IS NOT NULL
ON CONFLICT (material_id, supplier_id) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_material_suppliers_material ON material_suppliers(material_id);
CREATE INDEX IF NOT EXISTS idx_material_suppliers_supplier ON material_suppliers(supplier_id);

-- ================================================================
-- 028_ntp_pending_review.sql
-- ================================================================
-- Add PENDING_REVIEW value to ntp_status enum
-- NTP lifecycle: DRAFT → PENDING_REVIEW (Planning review) → ACTIVE → COMPLETED
ALTER TYPE ntp_status ADD VALUE IF NOT EXISTS 'PENDING_REVIEW' AFTER 'DRAFT';

