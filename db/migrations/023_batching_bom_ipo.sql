-- Migration 023: Batching Plant – Recipe BOM per m³ and Internal Purchase Orders

-- ── Mix Design Recipe BOM ─────────────────────────────────────────────────────
-- Stores the raw material breakdown for exactly 1 m³ of a given mix design.
-- References the master materials table for material names, codes, and pricing.
CREATE TABLE IF NOT EXISTS mix_design_bom (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mix_design_id       UUID         NOT NULL REFERENCES mix_designs(id) ON DELETE CASCADE,
    material_id         UUID         NOT NULL REFERENCES materials(id),
    required_quantity   NUMERIC(10,4) NOT NULL,   -- quantity per 1 m³
    unit_of_measure     VARCHAR(10)  NOT NULL,    -- 'KG', 'LITERS', 'BAG'
    sort_order          NUMERIC(5,0) NOT NULL DEFAULT 0,
    notes               TEXT,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mix_design_bom_mix_design_id ON mix_design_bom(mix_design_id);
CREATE INDEX IF NOT EXISTS idx_mix_design_bom_material_id   ON mix_design_bom(material_id);

-- ── Internal Purchase Orders ──────────────────────────────────────────────────
-- Auto-generated when a site unit is flagged "Ready for Pouring".
-- Drives the Batching Plant production queue.
-- Status flow: PENDING → ACCEPTED → IN_PRODUCTION → DELIVERED → BILLED
CREATE TABLE IF NOT EXISTS internal_purchase_orders (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ipo_number          VARCHAR(50)  NOT NULL UNIQUE,   -- e.g. 'IPO-2026-00001'
    project_id          UUID         NOT NULL REFERENCES projects(id),
    unit_id             UUID         NOT NULL REFERENCES project_units(id),
    mix_design_id       UUID         NOT NULL REFERENCES mix_designs(id),
    requested_volume_m3 NUMERIC(10,4) NOT NULL,
    status              VARCHAR(20)  NOT NULL DEFAULT 'PENDING'
                        CHECK (status IN ('PENDING','ACCEPTED','IN_PRODUCTION','DELIVERED','BILLED')),
    triggered_by        VARCHAR(100),              -- e.g. 'UNIT_READY_FOR_POUR'
    internal_rate_per_m3 NUMERIC(15,2),
    requested_by        UUID         REFERENCES users(id),
    accepted_by         UUID         REFERENCES users(id),
    accepted_at         TIMESTAMPTZ,
    production_log_id   UUID         REFERENCES batching_production_logs(id),
    notes               TEXT,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ipo_project_id ON internal_purchase_orders(project_id);
CREATE INDEX IF NOT EXISTS idx_ipo_unit_id    ON internal_purchase_orders(unit_id);
CREATE INDEX IF NOT EXISTS idx_ipo_status     ON internal_purchase_orders(status);
