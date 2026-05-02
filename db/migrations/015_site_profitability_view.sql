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
