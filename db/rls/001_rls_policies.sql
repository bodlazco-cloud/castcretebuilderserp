-- RLS Policies — Castcrete 360 Permission Matrix
-- Supabase Auth: user's dept_code is stored in auth.users.raw_user_meta_data->>'dept_code'
--
-- Permission Matrix (from Spec):
--   PLANNING     : own tables + BOM/Activities/Units (no HR/Finance banking)
--   AUDIT        : read all operational + WAR + POs; write audit verifications
--   CONSTRUCTION : own daily progress, task assignments, WAR submission
--   PROCUREMENT  : PRs, POs, inventory, transfers (no price/qty edits)
--   BATCHING     : own production logs, delivery notes
--   MOTORPOOL    : own equipment, assignments, maintenance, fuel
--   FINANCE      : invoices, payables, ledger, cash flow (no HR details)
--   HR           : employees, DTR, payroll (isolated from Finance banking)
--   ADMIN/BOD    : full read/write on all tables

-- Helper: extract dept_code from the JWT
CREATE OR REPLACE FUNCTION auth.dept_code()
RETURNS TEXT LANGUAGE sql STABLE AS $$
  SELECT coalesce(auth.jwt() -> 'user_metadata' ->> 'dept_code', '')
$$;

CREATE OR REPLACE FUNCTION auth.user_id()
RETURNS UUID LANGUAGE sql STABLE AS $$
  SELECT auth.uid()
$$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- Enable RLS on all tables
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE departments               ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_centers              ENABLE ROW LEVEL SECURITY;
ALTER TABLE users                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_settings            ENABLE ROW LEVEL SECURITY;
ALTER TABLE developers                ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE developer_rate_cards      ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocks                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE materials                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_price_history    ENABLE ROW LEVEL SECURITY;
ALTER TABLE bom_standards             ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_definitions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE milestone_definitions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE subcontractors            ENABLE ROW LEVEL SECURITY;
ALTER TABLE subcontractor_capacity_matrix ENABLE ROW LEVEL SECURITY;
ALTER TABLE subcontractor_advances    ENABLE ROW LEVEL SECURITY;
ALTER TABLE subcontractor_performance_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_units             ENABLE ROW LEVEL SECURITY;
ALTER TABLE unit_milestones           ENABLE ROW LEVEL SECURITY;
ALTER TABLE unit_activities           ENABLE ROW LEVEL SECURITY;
ALTER TABLE eot_requests              ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_requisitions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_requisition_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders           ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items      ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_receiving_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE mrr_items                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_ledger          ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_stock           ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_transfers        ENABLE ROW LEVEL SECURITY;
ALTER TABLE osm_deduction_buckets     ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_assignments          ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_progress_entries    ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_accomplished_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE milestone_documents       ENABLE ROW LEVEL SECURITY;
ALTER TABLE mix_designs               ENABLE ROW LEVEL SECURITY;
ALTER TABLE batching_production_logs  ENABLE ROW LEVEL SECURITY;
ALTER TABLE concrete_delivery_notes   ENABLE ROW LEVEL SECURITY;
ALTER TABLE concrete_delivery_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE batching_internal_sales   ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_assignments     ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_records       ENABLE ROW LEVEL SECURITY;
ALTER TABLE fuel_logs                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_daily_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE fix_or_flip_assessments   ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_time_records        ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_records           ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_schedules           ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_ledger          ENABLE ROW LEVEL SECURITY;
ALTER TABLE developer_advance_tracker ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE payables                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE manual_vouchers           ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_requests          ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_flow_projections     ENABLE ROW LEVEL SECURITY;

-- ═══════════════════════════════════════════════════════════════════════════════
-- MACRO: all departments that are not restricted from a given table get full read
-- ADMIN and BOD always have full access to everything
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── Core / lookup tables: all authenticated users can read ──────────────────
CREATE POLICY "all_read_departments"     ON departments         FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "all_read_cost_centers"    ON cost_centers        FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "all_read_projects"        ON projects            FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "all_read_blocks"          ON blocks              FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "all_read_materials"       ON materials           FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "all_read_suppliers"       ON suppliers           FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "all_read_bom_standards"   ON bom_standards       FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "all_read_activity_defs"   ON activity_definitions FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "all_read_milestone_defs"  ON milestone_definitions FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "all_read_units"           ON project_units       FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "all_read_subcontractors"  ON subcontractors      FOR SELECT USING (auth.role() = 'authenticated');

-- ─── Admin / BOD: full write on master lists ─────────────────────────────────
CREATE POLICY "admin_write_materials"   ON materials            FOR ALL USING (auth.dept_code() IN ('ADMIN','BOD'));
CREATE POLICY "admin_write_bom"         ON bom_standards        FOR ALL USING (auth.dept_code() IN ('ADMIN','BOD','PLANNING'));
CREATE POLICY "admin_write_activities"  ON activity_definitions FOR ALL USING (auth.dept_code() IN ('ADMIN','BOD','PLANNING'));
CREATE POLICY "admin_write_milestones"  ON milestone_definitions FOR ALL USING (auth.dept_code() IN ('ADMIN','BOD','PLANNING'));
CREATE POLICY "admin_write_settings"    ON admin_settings       FOR ALL USING (auth.dept_code() IN ('ADMIN','BOD'));
CREATE POLICY "admin_write_rate_cards"  ON developer_rate_cards FOR ALL USING (auth.dept_code() IN ('ADMIN','BOD'));

-- ─── PLANNING ─────────────────────────────────────────────────────────────────
CREATE POLICY "planning_write_pr"       ON purchase_requisitions      FOR ALL USING (auth.dept_code() IN ('PLANNING','ADMIN','BOD'));
CREATE POLICY "planning_write_pr_items" ON purchase_requisition_items FOR ALL USING (auth.dept_code() IN ('PLANNING','ADMIN','BOD'));
CREATE POLICY "planning_read_subcon"    ON subcontractor_capacity_matrix FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "planning_write_subcon_cap" ON subcontractor_capacity_matrix FOR ALL USING (auth.dept_code() IN ('PLANNING','ADMIN','BOD'));
CREATE POLICY "planning_write_mix"      ON mix_designs                FOR ALL USING (auth.dept_code() IN ('PLANNING','ADMIN','BOD'));
CREATE POLICY "planning_read_unit_act"  ON unit_activities            FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "planning_write_eot"      ON eot_requests               FOR ALL USING (auth.dept_code() IN ('PLANNING','ADMIN','BOD'));

-- ─── CONSTRUCTION / OPERATIONS ───────────────────────────────────────────────
CREATE POLICY "ops_write_task_assign"   ON task_assignments       FOR ALL USING (auth.dept_code() IN ('CONSTRUCTION','ADMIN','BOD'));
CREATE POLICY "ops_write_daily_prog"    ON daily_progress_entries FOR ALL USING (auth.dept_code() IN ('CONSTRUCTION','ADMIN','BOD'));
CREATE POLICY "ops_write_war"           ON work_accomplished_reports FOR ALL
    USING (auth.dept_code() IN ('CONSTRUCTION','FINANCE','AUDIT','ADMIN','BOD'));
CREATE POLICY "ops_write_unit_milestones" ON unit_milestones      FOR ALL USING (auth.dept_code() IN ('CONSTRUCTION','AUDIT','ADMIN','BOD'));
CREATE POLICY "ops_read_task_assign"    ON task_assignments       FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "ops_read_daily_prog"     ON daily_progress_entries FOR SELECT USING (auth.role() = 'authenticated');

-- ─── PROCUREMENT ─────────────────────────────────────────────────────────────
-- Can create POs (choosing supplier only) but cannot modify price or quantity.
CREATE POLICY "proc_write_po"           ON purchase_orders        FOR ALL USING (auth.dept_code() IN ('PROCUREMENT','ADMIN','BOD'));
CREATE POLICY "proc_read_po_items"      ON purchase_order_items   FOR SELECT USING (auth.role() = 'authenticated');
-- Procurement cannot insert/update PO items directly — only system (service role) can
CREATE POLICY "proc_write_mrr"          ON material_receiving_reports FOR ALL USING (auth.dept_code() IN ('PROCUREMENT','ADMIN','BOD'));
CREATE POLICY "proc_write_mrr_items"    ON mrr_items              FOR ALL USING (auth.dept_code() IN ('PROCUREMENT','ADMIN','BOD'));
CREATE POLICY "proc_write_transfers"    ON material_transfers     FOR ALL USING (auth.dept_code() IN ('PROCUREMENT','ADMIN','BOD'));
CREATE POLICY "proc_read_inventory"     ON inventory_ledger       FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "proc_read_stock"         ON inventory_stock        FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "proc_write_stock"        ON inventory_stock        FOR ALL USING (auth.dept_code() IN ('PROCUREMENT','ADMIN','BOD'));

-- ─── AUDIT ────────────────────────────────────────────────────────────────────
CREATE POLICY "audit_read_all_po"       ON purchase_orders        FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "audit_read_war"          ON work_accomplished_reports FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "audit_write_docs"        ON milestone_documents    FOR ALL USING (auth.dept_code() IN ('AUDIT','CONSTRUCTION','PROCUREMENT','FINANCE','ADMIN','BOD'));
CREATE POLICY "audit_read_docs"         ON milestone_documents    FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "audit_write_subcon_perf" ON subcontractor_performance_ratings FOR ALL USING (auth.dept_code() IN ('AUDIT','PLANNING','ADMIN','BOD'));

-- ─── BATCHING ─────────────────────────────────────────────────────────────────
CREATE POLICY "batch_write_logs"        ON batching_production_logs  FOR ALL USING (auth.dept_code() IN ('BATCHING','ADMIN','BOD'));
CREATE POLICY "batch_write_notes"       ON concrete_delivery_notes   FOR ALL USING (auth.dept_code() IN ('BATCHING','ADMIN','BOD'));
CREATE POLICY "batch_write_receipts"    ON concrete_delivery_receipts FOR ALL USING (auth.dept_code() IN ('BATCHING','CONSTRUCTION','ADMIN','BOD'));
CREATE POLICY "batch_write_sales"       ON batching_internal_sales   FOR ALL USING (auth.dept_code() IN ('BATCHING','ADMIN','BOD'));
CREATE POLICY "batch_read_all"          ON batching_production_logs  FOR SELECT USING (auth.role() = 'authenticated');

-- ─── MOTORPOOL ────────────────────────────────────────────────────────────────
CREATE POLICY "fleet_write_equip"       ON equipment              FOR ALL USING (auth.dept_code() IN ('MOTORPOOL','ADMIN','BOD'));
CREATE POLICY "fleet_write_assignments" ON equipment_assignments  FOR ALL USING (auth.dept_code() IN ('MOTORPOOL','ADMIN','BOD'));
CREATE POLICY "fleet_write_maintenance" ON maintenance_records    FOR ALL USING (auth.dept_code() IN ('MOTORPOOL','ADMIN','BOD'));
CREATE POLICY "fleet_write_fuel"        ON fuel_logs              FOR ALL USING (auth.dept_code() IN ('MOTORPOOL','ADMIN','BOD'));
CREATE POLICY "fleet_write_checklist"   ON equipment_daily_checklists FOR ALL USING (auth.dept_code() IN ('MOTORPOOL','ADMIN','BOD'));
CREATE POLICY "fleet_write_flip"        ON fix_or_flip_assessments FOR ALL USING (auth.dept_code() IN ('MOTORPOOL','ADMIN','BOD'));
CREATE POLICY "fleet_read_all"          ON equipment              FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "fleet_read_assignments"  ON equipment_assignments  FOR SELECT USING (auth.role() = 'authenticated');

-- ─── FINANCE & ACCOUNTING ─────────────────────────────────────────────────────
-- Finance cannot see detailed HR payroll records (only cost-center totals via ledger).
CREATE POLICY "finance_write_invoices"  ON invoices               FOR ALL USING (auth.dept_code() IN ('FINANCE','AUDIT','ADMIN','BOD'));
CREATE POLICY "finance_write_payables"  ON payables               FOR ALL USING (auth.dept_code() IN ('FINANCE','AUDIT','ADMIN','BOD'));
CREATE POLICY "finance_write_vouchers"  ON manual_vouchers        FOR ALL USING (auth.dept_code() IN ('FINANCE','ADMIN','BOD'));
CREATE POLICY "finance_write_payments"  ON payment_requests       FOR ALL USING (auth.dept_code() IN ('FINANCE','ADMIN','BOD'));
CREATE POLICY "finance_write_ledger"    ON financial_ledger       FOR ALL USING (auth.dept_code() IN ('FINANCE','ADMIN','BOD'));
CREATE POLICY "finance_write_cashflow"  ON cash_flow_projections  FOR ALL USING (auth.dept_code() IN ('FINANCE','ADMIN','BOD'));
CREATE POLICY "finance_write_advance"   ON developer_advance_tracker FOR ALL USING (auth.dept_code() IN ('FINANCE','ADMIN','BOD'));
CREATE POLICY "finance_read_invoices"   ON invoices               FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "finance_read_ledger"     ON financial_ledger       FOR SELECT USING (auth.dept_code() IN ('FINANCE','AUDIT','ADMIN','BOD'));
-- Finance can read OSM buckets for invoice deductions
CREATE POLICY "finance_read_osm"        ON osm_deduction_buckets  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "finance_write_osm"       ON osm_deduction_buckets  FOR ALL USING (auth.dept_code() IN ('FINANCE','PROCUREMENT','ADMIN','BOD'));

-- ─── HR & PAYROLL ─────────────────────────────────────────────────────────────
-- HR data is isolated: PLANNING/FINANCE/PROCUREMENT cannot see individual payroll.
-- Finance sees only cost-center P&L totals, not individual employee records.
CREATE POLICY "hr_write_employees"      ON employees              FOR ALL USING (auth.dept_code() IN ('HR','ADMIN','BOD'));
CREATE POLICY "hr_read_employees"       ON employees              FOR SELECT USING (auth.dept_code() IN ('HR','ADMIN','BOD'));
CREATE POLICY "hr_write_dtr"            ON daily_time_records     FOR ALL USING (auth.dept_code() IN ('HR','ADMIN','BOD'));
CREATE POLICY "hr_read_dtr"             ON daily_time_records     FOR SELECT USING (auth.dept_code() IN ('HR','ADMIN','BOD'));
CREATE POLICY "hr_write_payroll"        ON payroll_records        FOR ALL USING (auth.dept_code() IN ('HR','ADMIN','BOD'));
CREATE POLICY "hr_read_payroll"         ON payroll_records        FOR SELECT USING (auth.dept_code() IN ('HR','ADMIN','BOD'));
CREATE POLICY "hr_write_leave"          ON leave_schedules        FOR ALL USING (auth.dept_code() IN ('HR','ADMIN','BOD'));
CREATE POLICY "hr_read_leave"           ON leave_schedules        FOR SELECT USING (auth.dept_code() IN ('HR','ADMIN','BOD'));
-- Construction can see leave schedules to anticipate manpower drops
CREATE POLICY "ops_read_leave"          ON leave_schedules        FOR SELECT USING (auth.dept_code() IN ('CONSTRUCTION','PLANNING','ADMIN','BOD'));
