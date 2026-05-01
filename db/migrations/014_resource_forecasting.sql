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
