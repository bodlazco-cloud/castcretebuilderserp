-- Migration 025: Premix concrete as assembled product
-- Bridges Planning BOMs → Batching Plant → Purchasing in one zero-trust chain.

-- ── 1. Premix Material Links ──────────────────────────────────────────────────
-- One master material (the "premix product" in Planning BOM) ↔ one mix design.
-- Set by Admin/QC on the Recipe page after the mix design is approved.
CREATE TABLE IF NOT EXISTS premix_material_links (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    material_id     UUID NOT NULL UNIQUE REFERENCES materials(id),
    mix_design_id   UUID NOT NULL REFERENCES mix_designs(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pml_mix_design_id ON premix_material_links(mix_design_id);

-- ── 2. IPO Raw Material Requirements ─────────────────────────────────────────
-- Exploded BOM per IPO: mix_design_bom × requested_volume_m3.
-- Generated when the IPO is accepted; each row becomes a PR line item.
-- pr_item_id is back-filled when the Batching Plant PR is generated.
CREATE TABLE IF NOT EXISTS ipo_raw_material_requirements (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ipo_id          UUID NOT NULL REFERENCES internal_purchase_orders(id) ON DELETE CASCADE,
    material_id     UUID NOT NULL REFERENCES materials(id),
    required_qty    NUMERIC(15,4) NOT NULL,
    unit_of_measure VARCHAR(10)   NOT NULL,
    pr_item_id      UUID REFERENCES purchase_requisition_items(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ipo_rmr_ipo_id      ON ipo_raw_material_requirements(ipo_id);
CREATE INDEX IF NOT EXISTS idx_ipo_rmr_material_id ON ipo_raw_material_requirements(material_id);

-- ── 3. Batching Plant PR Flags ────────────────────────────────────────────────
-- Tags a purchase_requisition as "receive at Batching Plant" without touching
-- the procurement schema. One PR : one IPO (UNIQUE on pr_id).
CREATE TABLE IF NOT EXISTS batching_plant_pr_flags (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pr_id               UUID NOT NULL UNIQUE REFERENCES purchase_requisitions(id),
    ipo_id              UUID NOT NULL REFERENCES internal_purchase_orders(id),
    receiving_location  VARCHAR(50) NOT NULL DEFAULT 'BATCHING_PLANT',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bppf_ipo_id ON batching_plant_pr_flags(ipo_id);
