-- Migration 017: virtual_inventory_ledger table + sync trigger
-- Maintains a running per-material-per-site balance derived from
-- material_movement_logs. The Chain of Necessity flow:
--   MRR receipt → RECEIPT row  → total_bulk_qty increases
--   NTP issuance → ISSUANCE row → allocated_qty increases
--   ADJUSTMENT   → adjusts total_bulk_qty (positive = stock-in, negative = write-off)
-- remaining_qty is a STORED generated column: (total_bulk_qty - allocated_qty)

-- ─── Table ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS virtual_inventory_ledger (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    material_id     UUID NOT NULL REFERENCES materials(id),
    project_id      UUID NOT NULL REFERENCES projects(id),
    total_bulk_qty  NUMERIC(12,2) NOT NULL DEFAULT 0,
    allocated_qty   NUMERIC(12,2) NOT NULL DEFAULT 0,
    remaining_qty   NUMERIC(12,2) GENERATED ALWAYS AS (total_bulk_qty - allocated_qty) STORED,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_inventory_material_project UNIQUE (material_id, project_id),
    CONSTRAINT chk_inventory_no_negative_remaining
        CHECK (total_bulk_qty >= allocated_qty)
);

CREATE INDEX IF NOT EXISTS idx_vil_material_project
    ON virtual_inventory_ledger (material_id, project_id);

-- ─── Sync trigger function ────────────────────────────────────────────────────
-- Fires AFTER INSERT on material_movement_logs and upserts the balance row.
-- RECEIPT    → adds to total_bulk_qty
-- ISSUANCE   → adds to allocated_qty
-- TRANSFER   → adds to allocated_qty (material leaves this site)
-- ADJUSTMENT → positive quantity adds to total_bulk_qty (e.g. count surplus),
--              negative quantity subtracts from total_bulk_qty (write-off)

CREATE OR REPLACE FUNCTION fn_sync_inventory_ledger()
RETURNS TRIGGER AS $$
BEGIN
    -- Only act when a project context is present
    IF NEW.project_id IS NULL THEN
        RETURN NEW;
    END IF;

    INSERT INTO virtual_inventory_ledger (material_id, project_id, total_bulk_qty, allocated_qty)
    VALUES (
        NEW.material_id,
        NEW.project_id,
        CASE WHEN NEW.movement_type IN ('RECEIPT')
             THEN COALESCE(NEW.quantity, 0)
             WHEN NEW.movement_type = 'ADJUSTMENT' AND NEW.quantity > 0
             THEN NEW.quantity
             ELSE 0
        END,
        CASE WHEN NEW.movement_type IN ('ISSUANCE', 'TRANSFER')
             THEN COALESCE(NEW.quantity, 0)
             WHEN NEW.movement_type = 'ADJUSTMENT' AND NEW.quantity < 0
             THEN ABS(NEW.quantity)  -- treat negative adjustment as a write-off (allocated away)
             ELSE 0
        END
    )
    ON CONFLICT (material_id, project_id) DO UPDATE SET
        total_bulk_qty = virtual_inventory_ledger.total_bulk_qty + EXCLUDED.total_bulk_qty,
        allocated_qty  = virtual_inventory_ledger.allocated_qty  + EXCLUDED.allocated_qty,
        updated_at     = NOW();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_sync_inventory_ledger ON material_movement_logs;

CREATE TRIGGER tr_sync_inventory_ledger
AFTER INSERT ON material_movement_logs
FOR EACH ROW
EXECUTE FUNCTION fn_sync_inventory_ledger();

-- ─── Helper: full recalculation (run after bulk imports or data corrections) ──

CREATE OR REPLACE FUNCTION fn_recalculate_inventory_ledger()
RETURNS VOID AS $$
BEGIN
    DELETE FROM virtual_inventory_ledger;

    INSERT INTO virtual_inventory_ledger (material_id, project_id, total_bulk_qty, allocated_qty)
    SELECT
        material_id,
        project_id,
        COALESCE(SUM(CASE
            WHEN movement_type = 'RECEIPT'                        THEN quantity
            WHEN movement_type = 'ADJUSTMENT' AND quantity > 0    THEN quantity
            ELSE 0
        END), 0) AS total_bulk_qty,
        COALESCE(SUM(CASE
            WHEN movement_type IN ('ISSUANCE', 'TRANSFER')        THEN quantity
            WHEN movement_type = 'ADJUSTMENT' AND quantity < 0    THEN ABS(quantity)
            ELSE 0
        END), 0) AS allocated_qty
    FROM material_movement_logs
    WHERE project_id IS NOT NULL
    GROUP BY material_id, project_id;
END;
$$ LANGUAGE plpgsql;
