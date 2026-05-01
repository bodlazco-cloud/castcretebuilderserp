-- =============================================================
-- ADMIN SOVEREIGNTY: BOM Standards & Resource Forecasts
-- =============================================================
-- Policy: Admin-Write-Only on bom_standards.
-- Everyone (authenticated) can READ the master BOM so Planning,
-- Procurement, and Construction can reference it — but only users
-- whose JWT role = 'admin' can INSERT, UPDATE, or DELETE rows.
-- =============================================================

ALTER TABLE bom_standards ENABLE ROW LEVEL SECURITY;

-- Drop policies if re-running this script
DROP POLICY IF EXISTS "bom_standards_public_read"  ON bom_standards;
DROP POLICY IF EXISTS "bom_standards_admin_write"   ON bom_standards;

CREATE POLICY "bom_standards_public_read"
    ON bom_standards
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "bom_standards_admin_write"
    ON bom_standards
    FOR ALL
    TO authenticated
    USING     (auth.jwt() ->> 'dept_code' = 'ADMIN')
    WITH CHECK (auth.jwt() ->> 'dept_code' = 'ADMIN');

-- =============================================================
-- READ-ONLY on resource_forecasts for most roles.
-- Procurement can update status (PR_CREATED, PO_ISSUED, ISSUED)
-- but cannot delete or insert rows (those come only from the trigger).
-- =============================================================

ALTER TABLE resource_forecasts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "resource_forecasts_read"              ON resource_forecasts;
DROP POLICY IF EXISTS "resource_forecasts_procurement_update" ON resource_forecasts;
DROP POLICY IF EXISTS "resource_forecasts_admin_all"          ON resource_forecasts;

CREATE POLICY "resource_forecasts_read"
    ON resource_forecasts
    FOR SELECT
    TO authenticated
    USING (true);

-- Procurement can advance the status along the chain
CREATE POLICY "resource_forecasts_procurement_update"
    ON resource_forecasts
    FOR UPDATE
    TO authenticated
    USING     (auth.jwt() ->> 'dept_code' IN ('PROCUREMENT', 'ADMIN', 'BOD'))
    WITH CHECK (auth.jwt() ->> 'dept_code' IN ('PROCUREMENT', 'ADMIN', 'BOD'));

-- Admin/BOD have full access
CREATE POLICY "resource_forecasts_admin_all"
    ON resource_forecasts
    FOR ALL
    TO authenticated
    USING     (auth.jwt() ->> 'dept_code' IN ('ADMIN', 'BOD'))
    WITH CHECK (auth.jwt() ->> 'dept_code' IN ('ADMIN', 'BOD'));

-- =============================================================
-- DUAL-AUTH: purchase_orders > 50,000 PHP
-- Flag is set via trigger; policy enforces BOD/Finance approval.
-- =============================================================

ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "po_general_read"             ON purchase_orders;
DROP POLICY IF EXISTS "po_procurement_write"         ON purchase_orders;
DROP POLICY IF EXISTS "po_dual_auth_approval"        ON purchase_orders;

CREATE POLICY "po_general_read"
    ON purchase_orders
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "po_procurement_write"
    ON purchase_orders
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.jwt() ->> 'dept_code' IN ('PROCUREMENT', 'ADMIN', 'BOD'));

-- Only FINANCE or BOD can flip status to APPROVED on dual-auth POs
CREATE POLICY "po_dual_auth_approval"
    ON purchase_orders
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (
        CASE
            WHEN requires_dual_auth = TRUE THEN
                auth.jwt() ->> 'dept_code' IN ('FINANCE', 'BOD', 'ADMIN')
            ELSE
                auth.jwt() ->> 'dept_code' IN ('PROCUREMENT', 'AUDIT', 'FINANCE', 'BOD', 'ADMIN')
        END
    );
