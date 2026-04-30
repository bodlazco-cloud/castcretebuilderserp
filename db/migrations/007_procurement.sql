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
