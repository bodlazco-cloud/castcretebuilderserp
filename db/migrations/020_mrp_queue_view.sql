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
