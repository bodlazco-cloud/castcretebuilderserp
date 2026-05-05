-- ════════════════════════════════════════════════════════════════
-- PART 3: Triggers, functions, and views
-- ════════════════════════════════════════════════════════════════

-- ── Trigger: Auto-set requires_dual_auth on POs > 50,000 ─────────
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
    BEFORE INSERT OR UPDATE OF total_amount ON purchase_orders
    FOR EACH ROW EXECUTE FUNCTION set_dual_auth_flag();

-- ── Trigger: Auto-generate resource forecasts when NTP → ACTIVE ──
CREATE OR REPLACE FUNCTION generate_unit_resource_forecast()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT'  AND NEW.status = 'ACTIVE') OR
       (TG_OP = 'UPDATE'  AND NEW.status = 'ACTIVE' AND OLD.status <> 'ACTIVE')
    THEN
        IF NOT EXISTS (SELECT 1 FROM resource_forecasts WHERE ntp_id = NEW.id) THEN
            INSERT INTO resource_forecasts (
                ntp_id, project_id, unit_id, bom_standard_id,
                material_id, forecast_qty, status
            )
            SELECT
                NEW.id, NEW.project_id, NEW.unit_id,
                bs.id, bs.material_id, bs.quantity_per_unit, 'PENDING_PR'
            FROM bom_standards bs
            JOIN project_units pu ON pu.id = NEW.unit_id
            WHERE bs.unit_model = pu.unit_model
              AND bs.is_active  = TRUE;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_forecast_on_ntp_active ON task_assignments;
CREATE TRIGGER trigger_forecast_on_ntp_active
    AFTER INSERT OR UPDATE OF status ON task_assignments
    FOR EACH ROW EXECUTE FUNCTION generate_unit_resource_forecast();

-- ── Trigger: updated_at maintenance for resource_forecasts ───────
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
    FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ── View: virtual_inventory_ledger ────────────────────────────────
CREATE OR REPLACE VIEW virtual_inventory_ledger AS
SELECT
    il.material_id,
    il.project_id,
    SUM(il.quantity_remaining) AS quantity_on_hand,
    AVG(il.unit_price)         AS avg_unit_price,
    MAX(il.received_at)        AS last_received
FROM inventory_ledger il
GROUP BY il.material_id, il.project_id;
