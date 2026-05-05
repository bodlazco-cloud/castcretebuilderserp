-- ================================================================
-- 001_extensions.sql
-- ================================================================
-- Migration 001: Extensions and shared enums
-- Castcrete Builders ERP

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ─── Department codes ────────────────────────────────────────────────────────
CREATE TYPE dept_code AS ENUM (
    'PLANNING',
    'AUDIT',
    'CONSTRUCTION',
    'PROCUREMENT',
    'BATCHING',
    'MOTORPOOL',
    'FINANCE',
    'HR',
    'ADMIN',
    'BOD'
);

-- ─── Cost center types ───────────────────────────────────────────────────────
CREATE TYPE cost_center_type AS ENUM (
    'PROJECT',
    'BATCHING',
    'FLEET',
    'HQ'
);

-- ─── Generic approval / document status flow ─────────────────────────────────
CREATE TYPE approval_status AS ENUM (
    'DRAFT',
    'PENDING_REVIEW',
    'PENDING_AUDIT',
    'READY_FOR_APPROVAL',
    'APPROVED',
    'REJECTED',
    'CANCELLED'
);

-- ─── Unit work category ──────────────────────────────────────────────────────
CREATE TYPE work_category AS ENUM (
    'STRUCTURAL',
    'ARCHITECTURAL',
    'TURNOVER'
);

-- ─── Trade types ─────────────────────────────────────────────────────────────
CREATE TYPE trade_type AS ENUM (
    'STRUCTURAL',
    'ARCHITECTURAL',
    'BOTH'
);

-- ─── Resource types for the financial ledger ─────────────────────────────────
CREATE TYPE resource_type AS ENUM (
    'MATERIAL',
    'EMPLOYEE',
    'MACHINE'
);

-- ─── Transaction direction ───────────────────────────────────────────────────
CREATE TYPE transaction_type AS ENUM (
    'INFLOW',
    'OUTFLOW',
    'INTERNAL_TRANSFER'
);

-- ─── Inventory source ────────────────────────────────────────────────────────
CREATE TYPE inventory_source AS ENUM (
    'SUPPLIER',
    'DEVELOPER_OSM'     -- Owner Supplied Materials (zero-cost)
);

-- ─── PO payment type ─────────────────────────────────────────────────────────
CREATE TYPE po_status AS ENUM (
    'DRAFT',
    'AUDIT_REVIEW',
    'BOD_APPROVED',
    'PREPAID_REQUIRED',
    'AWAITING_DELIVERY',
    'PARTIALLY_DELIVERED',
    'DELIVERED',
    'CANCELLED'
);

-- ─── Subcontractor performance grade ─────────────────────────────────────────
CREATE TYPE performance_grade AS ENUM (
    'A',    -- 90-100: full capacity eligible
    'B',    -- 75-89:  capped at 80% capacity
    'C'     -- <75:    stop-assignment status
);

-- ─── Equipment disposition ───────────────────────────────────────────────────
CREATE TYPE fix_or_flip AS ENUM (
    'FIX',
    'FLIP',
    'MONITOR'
);

-- ─── Delay / EOT reason ──────────────────────────────────────────────────────
CREATE TYPE delay_reason AS ENUM (
    'WEATHER',
    'MATERIAL_DELAY',
    'MANPOWER_SHORTAGE',
    'EQUIPMENT_BREAKDOWN',
    'DESIGN_CHANGE',
    'OTHER'
);

-- ─── Document bucket types ───────────────────────────────────────────────────
CREATE TYPE milestone_doc_type AS ENUM (
    'WAR_SIGNED',
    'MILESTONE_PHOTOS',
    'MATERIAL_TRANSFER_SLIPS',
    'OSM_ACKNOWLEDGMENT',
    'SUBCON_BILLING_INVOICE',
    'QUALITY_CLEARANCE'
);

-- ================================================================
-- 002_core_master.sql
-- ================================================================
-- Migration 002: Core master tables
-- departments, cost_centers, users

-- ─── Departments ─────────────────────────────────────────────────────────────
CREATE TABLE departments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code            dept_code        NOT NULL UNIQUE,
    name            VARCHAR(100)     NOT NULL,
    head_employee_id UUID,           -- FK added after employees table
    created_at      TIMESTAMPTZ      NOT NULL DEFAULT now()
);

-- ─── Cost centers ─────────────────────────────────────────────────────────────
-- Each department maps to one or more cost centers for P&L segregation.
CREATE TABLE cost_centers (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code        VARCHAR(50)      NOT NULL UNIQUE,
    name        VARCHAR(100)     NOT NULL,
    dept_id     UUID             NOT NULL REFERENCES departments(id),
    type        cost_center_type NOT NULL,
    is_active   BOOLEAN          NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ      NOT NULL DEFAULT now()
);

-- ─── Users (system access accounts) ──────────────────────────────────────────
-- Separated from employees so contractors/admins can have accounts without payroll records.
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           VARCHAR(200)  NOT NULL UNIQUE,
    full_name       VARCHAR(150)  NOT NULL,
    dept_id         UUID          REFERENCES departments(id),
    role            VARCHAR(50)   NOT NULL,    -- e.g. ADMIN, PLANNER, SITE_ENGINEER, AUDITOR
    is_active       BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- Back-fill the self-referencing FK on departments
ALTER TABLE departments
    ADD CONSTRAINT fk_dept_head FOREIGN KEY (head_employee_id) REFERENCES users(id);

-- ─── Admin settings (version-controlled key-value store) ──────────────────────
-- Any change requires a secondary admin sign-off (Board Resolution policy).
CREATE TABLE admin_settings (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID,               -- NULL = global setting
    setting_key     VARCHAR(100)        NOT NULL,
    setting_value   JSONB               NOT NULL,
    version         INTEGER             NOT NULL DEFAULT 1,
    is_active       BOOLEAN             NOT NULL DEFAULT TRUE,
    created_by      UUID                NOT NULL REFERENCES users(id),
    approved_by     UUID                REFERENCES users(id),
    approved_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ         NOT NULL DEFAULT now(),
    UNIQUE (project_id, setting_key, version)
);

-- ================================================================
-- 003_projects.sql
-- ================================================================
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

-- ================================================================
-- 004_admin_master_lists.sql
-- ================================================================
-- Migration 004: Admin master lists — materials, suppliers, BOM standards
-- These are read-only for operational modules; only Admin can modify with sign-off.

-- ─── Suppliers ────────────────────────────────────────────────────────────────
CREATE TABLE suppliers (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(150)  NOT NULL,
    contact_info    JSONB,
    preferred_materials JSONB,   -- advisory list
    is_active       BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- ─── Materials (Admin-controlled master list) ─────────────────────────────────
CREATE TABLE materials (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code            VARCHAR(50)   NOT NULL UNIQUE,
    name            VARCHAR(150)  NOT NULL,
    unit            VARCHAR(30)   NOT NULL,   -- bags, kg, m3, pcs, liters
    category        VARCHAR(50)   NOT NULL,   -- CEMENT, REBAR, TILES, AGGREGATE, etc.
    admin_price     NUMERIC(15,2) NOT NULL,   -- Admin-fixed; Procurement cannot override
    price_version   INTEGER       NOT NULL DEFAULT 1,
    preferred_supplier_id UUID    REFERENCES suppliers(id),
    is_active       BOOLEAN       NOT NULL DEFAULT TRUE,
    approved_by     UUID          REFERENCES users(id),
    approved_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- Price history — every admin_price change creates a new version row
CREATE TABLE material_price_history (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    material_id     UUID          NOT NULL REFERENCES materials(id),
    old_price       NUMERIC(15,2) NOT NULL,
    new_price       NUMERIC(15,2) NOT NULL,
    version         INTEGER       NOT NULL,
    changed_by      UUID          NOT NULL REFERENCES users(id),
    approved_by     UUID          REFERENCES users(id),
    approved_at     TIMESTAMPTZ,
    effective_from  DATE          NOT NULL,
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- ─── BOM Standards (Admin-controlled per unit model / activity) ───────────────
-- Planning reads this to auto-generate PRs. Cannot be edited mid-project without BOD sign-off.
CREATE TABLE bom_standards (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id          UUID            NOT NULL REFERENCES projects(id),
    unit_model          VARCHAR(50)     NOT NULL,   -- MID_UNIT, END_UNIT, CORNER_UNIT
    category            work_category   NOT NULL,
    scope_code          VARCHAR(100)    NOT NULL,   -- e.g. GF_COLUMNS, RF_SLAB
    activity_code       VARCHAR(100)    NOT NULL,   -- e.g. REBAR_TYING, CONCRETE_POURING
    material_id         UUID            NOT NULL REFERENCES materials(id),
    quantity_per_unit   NUMERIC(15,4)   NOT NULL,
    version             INTEGER         NOT NULL DEFAULT 1,
    is_active           BOOLEAN         NOT NULL DEFAULT TRUE,
    approved_by         UUID            REFERENCES users(id),
    approved_at         TIMESTAMPTZ,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE (project_id, unit_model, activity_code, material_id, version)
);

-- ─── Activity definitions (the granular building blocks of work) ──────────────
-- Spec hierarchy: Category > Scope of Work (SOW) > Activity
CREATE TABLE activity_definitions (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id              UUID            NOT NULL REFERENCES projects(id),
    category                work_category   NOT NULL,
    scope_code              VARCHAR(100)    NOT NULL,
    scope_name              VARCHAR(150)    NOT NULL,
    activity_code           VARCHAR(100)    NOT NULL,
    activity_name           VARCHAR(150)    NOT NULL,
    standard_duration_days  INTEGER         NOT NULL,
    weight_in_scope_pct     NUMERIC(5,2)    NOT NULL,   -- % this activity contributes to SOW completion
    sequence_order          INTEGER         NOT NULL,
    is_active               BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE (project_id, activity_code)
);

-- ─── Milestone definitions (billing-trigger points) ──────────────────────────
CREATE TABLE milestone_definitions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id          UUID            NOT NULL REFERENCES projects(id),
    name                VARCHAR(150)    NOT NULL,
    category            work_category   NOT NULL,
    sequence_order      INTEGER         NOT NULL,
    triggers_billing    BOOLEAN         NOT NULL DEFAULT FALSE,
    weight_pct          NUMERIC(5,2)    NOT NULL,   -- % of category completion
    is_active           BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE (project_id, name, category)
);

-- ================================================================
-- 005_subcontractors.sql
-- ================================================================
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

-- ================================================================
-- 006_project_units.sql
-- ================================================================
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

-- ================================================================
-- 007_procurement.sql
-- ================================================================
-- Migration 007: Procurement — PRs, POs, inventory ledger, material transfers
-- Key constraint: Procurement cannot edit Price (Admin-fixed) or Quantity (Planning-fixed).

-- ─── Purchase requisitions ────────────────────────────────────────────────────
CREATE TABLE purchase_requisitions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id          UUID            NOT NULL REFERENCES projects(id),
    unit_id             UUID            REFERENCES project_units(id),   -- NULL = project-wide PR
    task_assignment_id  UUID,           -- FK patched in migration 008
    activity_def_id     UUID            REFERENCES activity_definitions(id),
    status              approval_status NOT NULL DEFAULT 'DRAFT',
    requested_by        UUID            NOT NULL REFERENCES users(id),  -- Planning dept
    approved_by         UUID            REFERENCES users(id),
    approved_at         TIMESTAMPTZ,
    rejection_reason    TEXT,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE TABLE purchase_requisition_items (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pr_id               UUID            NOT NULL REFERENCES purchase_requisitions(id),
    material_id         UUID            NOT NULL REFERENCES materials(id),
    quantity_required   NUMERIC(15,4)   NOT NULL,
    quantity_in_stock   NUMERIC(15,4)   NOT NULL DEFAULT 0,   -- snapshot at PR creation
    quantity_to_order   NUMERIC(15,4)   NOT NULL,             -- = required - in_stock
    unit_price          NUMERIC(15,2)   NOT NULL,             -- copied from materials.admin_price at PR creation
    UNIQUE (pr_id, material_id)
);

-- ─── Purchase orders ──────────────────────────────────────────────────────────
CREATE TABLE purchase_orders (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pr_id                   UUID            NOT NULL REFERENCES purchase_requisitions(id),
    project_id              UUID            NOT NULL REFERENCES projects(id),
    supplier_id             UUID            NOT NULL REFERENCES suppliers(id),
    status                  po_status       NOT NULL DEFAULT 'DRAFT',
    is_prepaid              BOOLEAN         NOT NULL DEFAULT FALSE,
    proforma_invoice_url    TEXT,           -- required before Finance can release prepayment
    total_amount            NUMERIC(15,2)   NOT NULL,
    created_by              UUID            NOT NULL REFERENCES users(id),
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    audit_reviewed_by       UUID            REFERENCES users(id),
    audit_reviewed_at       TIMESTAMPTZ,
    bod_approved_by         UUID            REFERENCES users(id),
    bod_approved_at         TIMESTAMPTZ,
    delivered_at            TIMESTAMPTZ
);

-- Price and quantity are locked from the PR; Procurement cannot edit them.
CREATE TABLE purchase_order_items (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    po_id           UUID            NOT NULL REFERENCES purchase_orders(id),
    material_id     UUID            NOT NULL REFERENCES materials(id),
    quantity        NUMERIC(15,4)   NOT NULL,       -- Planning-fixed
    unit_price      NUMERIC(15,2)   NOT NULL,       -- Admin-fixed
    total_price     NUMERIC(15,2)   NOT NULL
        GENERATED ALWAYS AS (quantity * unit_price) STORED,
    UNIQUE (po_id, material_id)
);

-- ─── Material receiving reports ───────────────────────────────────────────────
CREATE TABLE material_receiving_reports (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    po_id           UUID            REFERENCES purchase_orders(id),
    project_id      UUID            NOT NULL REFERENCES projects(id),
    source_type     inventory_source NOT NULL,
    supplier_id     UUID            REFERENCES suppliers(id),
    received_date   DATE            NOT NULL,
    received_by     UUID            NOT NULL REFERENCES users(id),
    notes           TEXT,
    status          VARCHAR(20)     NOT NULL DEFAULT 'PENDING'
                        CHECK (status IN ('PENDING','VERIFIED')),
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE TABLE mrr_items (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mrr_id          UUID            NOT NULL REFERENCES material_receiving_reports(id),
    material_id     UUID            NOT NULL REFERENCES materials(id),
    quantity_received NUMERIC(15,4) NOT NULL,
    unit_price      NUMERIC(15,2)   NOT NULL,       -- 0 for OSM
    shadow_price    NUMERIC(15,2)   NOT NULL DEFAULT 0.00,  -- contractual price for OSM deductions
    UNIQUE (mrr_id, material_id)
);

-- ─── Inventory ledger (batch-level tracking) ──────────────────────────────────
-- Every batch from a Supplier has a unit_price; every OSM batch has unit_price = 0.
CREATE TABLE inventory_ledger (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id            UUID            NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    material_id         UUID            NOT NULL REFERENCES materials(id),
    project_id          UUID            NOT NULL REFERENCES projects(id),
    mrr_id              UUID            NOT NULL REFERENCES material_receiving_reports(id),
    source_type         inventory_source NOT NULL,
    quantity_received   NUMERIC(15,4)   NOT NULL,
    quantity_remaining  NUMERIC(15,4)   NOT NULL,
    unit_price          NUMERIC(15,2)   NOT NULL,       -- 0 for OSM
    shadow_price        NUMERIC(15,2)   NOT NULL DEFAULT 0.00,
    received_at         TIMESTAMPTZ     NOT NULL DEFAULT now()
);

-- ─── Inventory stock (running totals per material per project) ─────────────────
CREATE TABLE inventory_stock (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    material_id         UUID            NOT NULL REFERENCES materials(id),
    project_id          UUID            NOT NULL REFERENCES projects(id),
    quantity_on_hand    NUMERIC(15,4)   NOT NULL DEFAULT 0,
    quantity_reserved   NUMERIC(15,4)   NOT NULL DEFAULT 0,  -- committed to approved PRs
    last_updated        TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE (material_id, project_id)
);

-- ─── Material transfers (warehouse → unit/block) ──────────────────────────────
-- Every transfer must be signed by the subcontractor rep. Feeds OSM deduction bucket.
CREATE TABLE material_transfers (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id          UUID            NOT NULL REFERENCES projects(id),
    unit_id             UUID            NOT NULL REFERENCES project_units(id),
    batch_id            UUID            NOT NULL REFERENCES inventory_ledger(batch_id),
    material_id         UUID            NOT NULL REFERENCES materials(id),
    quantity            NUMERIC(15,4)   NOT NULL,
    unit_price          NUMERIC(15,2)   NOT NULL,   -- 0 for OSM
    is_osm              BOOLEAN         NOT NULL DEFAULT FALSE,
    shadow_price        NUMERIC(15,2)   NOT NULL DEFAULT 0.00,
    -- Signed by the subcontractor receiving the material at the unit
    signed_by_subcon    UUID            REFERENCES subcontractors(id),
    signed_by_user      UUID            REFERENCES users(id),
    transfer_date       DATE            NOT NULL,
    status              VARCHAR(20)     NOT NULL DEFAULT 'PENDING'
                            CHECK (status IN ('PENDING','TRANSFERRED','VERIFIED')),
    created_by          UUID            NOT NULL REFERENCES users(id),
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
);

-- ─── OSM deduction bucket (per unit, accumulates as OSM is issued) ────────────
-- When a milestone invoice is generated, this bucket is auto-applied as a deduction.
CREATE TABLE osm_deduction_buckets (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id          UUID            NOT NULL REFERENCES projects(id),
    unit_id             UUID            NOT NULL REFERENCES project_units(id),
    total_osm_value     NUMERIC(15,2)   NOT NULL DEFAULT 0.00,
    amount_applied      NUMERIC(15,2)   NOT NULL DEFAULT 0.00,
    amount_pending      NUMERIC(15,2)   NOT NULL
        GENERATED ALWAYS AS (total_osm_value - amount_applied) STORED,
    last_updated        TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE (project_id, unit_id)
);

-- ================================================================
-- 008_construction_operations.sql
-- ================================================================
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

