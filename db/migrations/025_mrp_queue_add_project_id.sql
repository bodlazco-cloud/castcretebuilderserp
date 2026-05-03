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
