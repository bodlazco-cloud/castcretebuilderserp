-- Migration 020: Planning & Engineering full rebuild
-- Drops old planning tables and rebuilds with Master BOM / Resource Forecast architecture.
-- Run this ONCE in Supabase SQL Editor.

-- NOTE: bom_standards and change_order_requests are kept intact for other sections
-- that still reference them (admin, batching, master-list, procurement).
-- The new master_bom_entries + planning_variance_requests replace them for Planning only.

-- ─── New enums ───────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE bom_status AS ENUM ('DRAFT','PENDING_REVIEW','APPROVED','REJECTED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE forecast_type AS ENUM ('MATERIAL','CONCRETE','EQUIPMENT');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE forecast_status AS ENUM ('PENDING_PR','PR_CREATED','PO_ISSUED','ISSUED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE variance_request_type AS ENUM ('BOM_CHANGE','PROCUREMENT_VARIANCE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── Master BOM Entries ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS master_bom_entries (
    id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id          UUID            NOT NULL REFERENCES projects(id),
    unit_model          VARCHAR(50)     NOT NULL,
    unit_type           unit_type       NOT NULL,
    activity_def_id     UUID            NOT NULL REFERENCES activity_definitions(id),
    material_id         UUID            NOT NULL REFERENCES materials(id),
    quantity_per_unit   NUMERIC(15,4)   NOT NULL CHECK (quantity_per_unit > 0),
    equipment_type      VARCHAR(100),
    version             INTEGER         NOT NULL DEFAULT 1,
    is_active           BOOLEAN         NOT NULL DEFAULT TRUE,
    status              bom_status      NOT NULL DEFAULT 'DRAFT',
    submitted_by        UUID            REFERENCES users(id),
    submitted_at        TIMESTAMPTZ,
    reviewed_by         UUID            REFERENCES users(id),
    reviewed_at         TIMESTAMPTZ,
    rejection_reason    TEXT,
    created_by          UUID            NOT NULL REFERENCES users(id),
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_mbe_active_scope
    ON master_bom_entries (project_id, unit_model, unit_type, activity_def_id, material_id)
    WHERE is_active = TRUE AND status = 'APPROVED';

-- ─── Resource Forecasts (auto-populated by PostgreSQL trigger on NTP) ─────────

CREATE TABLE IF NOT EXISTS resource_forecasts (
    id                      UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id              UUID            NOT NULL REFERENCES projects(id),
    unit_id                 UUID            NOT NULL REFERENCES project_units(id),
    master_bom_entry_id     UUID            NOT NULL REFERENCES master_bom_entries(id),
    forecast_type           forecast_type   NOT NULL,
    gross_quantity          NUMERIC(15,4)   NOT NULL,
    quantity_consumed       NUMERIC(15,4)   NOT NULL DEFAULT 0,
    quantity_remaining      NUMERIC(15,4)   GENERATED ALWAYS AS (gross_quantity - quantity_consumed) STORED,
    status                  forecast_status NOT NULL DEFAULT 'PENDING_PR',
    purchase_requisition_id UUID            REFERENCES purchase_requisitions(id),
    equipment_type          VARCHAR(100),
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_rf_unique_unit_bom
    ON resource_forecasts (unit_id, master_bom_entry_id, forecast_type);

-- ─── Planning Variance Requests (BOM changes + procurement overages) ──────────

CREATE TABLE IF NOT EXISTS planning_variance_requests (
    id                      UUID                    PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id              UUID                    NOT NULL REFERENCES projects(id),
    request_type            variance_request_type   NOT NULL,
    -- BOM change fields
    master_bom_entry_id     UUID                    REFERENCES master_bom_entries(id),
    bom_change_type         VARCHAR(20),            -- ADD / MODIFY / REMOVE
    old_quantity            NUMERIC(15,4),
    new_quantity            NUMERIC(15,4),
    new_material_id         UUID                    REFERENCES materials(id),
    -- Procurement variance fields
    resource_forecast_id    UUID                    REFERENCES resource_forecasts(id),
    purchase_requisition_id UUID                    REFERENCES purchase_requisitions(id),
    requested_quantity      NUMERIC(15,4),
    is_min_order_qty_issue  BOOLEAN                 NOT NULL DEFAULT FALSE,
    -- Common
    reason                  TEXT                    NOT NULL,
    attachment_urls         JSONB,
    status                  bom_status              NOT NULL DEFAULT 'DRAFT',
    submitted_by            UUID                    NOT NULL REFERENCES users(id),
    submitted_at            TIMESTAMPTZ,
    reviewed_by             UUID                    REFERENCES users(id),
    reviewed_at             TIMESTAMPTZ,
    rejection_reason        TEXT,
    created_at              TIMESTAMPTZ             NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ             NOT NULL DEFAULT now()
);

-- ─── NTP Trigger: auto-populate resource_forecasts on NTP_ISSUED ─────────────

CREATE OR REPLACE FUNCTION public.fn_ntp_generate_forecasts()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_bom   RECORD;
    v_ftype forecast_type;
BEGIN
    -- Only fire on transitions TO 'NTP_ISSUED'
    IF NEW.status <> 'NTP_ISSUED' THEN RETURN NEW; END IF;
    IF OLD.status = 'NTP_ISSUED' THEN RETURN NEW; END IF;

    FOR v_bom IN
        SELECT
            mbe.id                  AS bom_id,
            mbe.quantity_per_unit,
            mbe.equipment_type,
            m.category              AS material_category
        FROM master_bom_entries mbe
        INNER JOIN materials m ON m.id = mbe.material_id
        WHERE mbe.project_id = NEW.project_id
          AND mbe.unit_model  = NEW.unit_model
          AND mbe.unit_type   = NEW.unit_type::unit_type
          AND mbe.status      = 'APPROVED'
          AND mbe.is_active   = TRUE
    LOOP
        -- Determine forecast type
        IF upper(v_bom.material_category) = 'CONCRETE' THEN
            v_ftype := 'CONCRETE'::forecast_type;
        ELSE
            v_ftype := 'MATERIAL'::forecast_type;
        END IF;

        INSERT INTO resource_forecasts
            (project_id, unit_id, master_bom_entry_id, forecast_type, gross_quantity)
        VALUES
            (NEW.project_id, NEW.id, v_bom.bom_id, v_ftype, v_bom.quantity_per_unit)
        ON CONFLICT (unit_id, master_bom_entry_id, forecast_type) DO NOTHING;

        -- Equipment row (if equipment_type set on BOM entry)
        IF v_bom.equipment_type IS NOT NULL THEN
            INSERT INTO resource_forecasts
                (project_id, unit_id, master_bom_entry_id, forecast_type, gross_quantity, equipment_type)
            VALUES
                (NEW.project_id, NEW.id, v_bom.bom_id, 'EQUIPMENT'::forecast_type,
                 v_bom.quantity_per_unit, v_bom.equipment_type)
            ON CONFLICT (unit_id, master_bom_entry_id, forecast_type) DO NOTHING;
        END IF;
    END LOOP;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ntp_generate_forecasts ON project_units;
CREATE TRIGGER trg_ntp_generate_forecasts
    AFTER UPDATE OF status ON project_units
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_ntp_generate_forecasts();

-- ─── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE master_bom_entries         ENABLE ROW LEVEL SECURITY;
ALTER TABLE resource_forecasts         ENABLE ROW LEVEL SECURITY;
ALTER TABLE planning_variance_requests ENABLE ROW LEVEL SECURITY;

-- Everyone reads
CREATE POLICY "mbe_read_all"   ON master_bom_entries         FOR SELECT USING (TRUE);
CREATE POLICY "rf_read_all"    ON resource_forecasts         FOR SELECT USING (TRUE);
CREATE POLICY "pvr_read_all"   ON planning_variance_requests FOR SELECT USING (TRUE);

-- Write gated by role (application-level dept_code checked in server actions;
-- these policies are defence-in-depth for direct DB access)
CREATE POLICY "mbe_write_admin" ON master_bom_entries
    FOR ALL USING (
        auth.jwt() ->> 'dept_code' IN ('PLANNING','ADMIN','BOD')
    );

CREATE POLICY "rf_write_admin" ON resource_forecasts
    FOR ALL USING (
        auth.jwt() ->> 'dept_code' IN ('PLANNING','ADMIN','BOD','PROCUREMENT')
    );

CREATE POLICY "pvr_write_admin" ON planning_variance_requests
    FOR ALL USING (
        auth.jwt() ->> 'dept_code' IN ('PLANNING','ADMIN','BOD','PROCUREMENT')
    );
