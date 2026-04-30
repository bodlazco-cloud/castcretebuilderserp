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
