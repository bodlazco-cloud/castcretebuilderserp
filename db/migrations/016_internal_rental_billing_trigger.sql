-- Migration 016: Internal equipment rental billing trigger
-- When an equipment_assignments row is marked COMPLETED, automatically post
-- a paired INTERNAL_TRANSFER journal entry to financial_ledger:
--   DEBIT  → project cost center (dept = CONSTRUCTION)  — expense to site
--   CREDIT → motorpool cost center (dept = MOTORPOOL)   — internal revenue
-- Rate is sourced from the Admin-Locked equipment.daily_rental_rate field.
-- Both entries use is_external = FALSE to distinguish from real vendor payments.

CREATE OR REPLACE FUNCTION fn_post_internal_rental()
RETURNS TRIGGER AS $$
DECLARE
    v_daily_rate    NUMERIC(15,2);
    v_days          INTEGER;
    v_charge        NUMERIC(15,2);
    v_const_dept    UUID;
    v_motor_dept    UUID;
BEGIN
    -- Rate is Admin-Locked on the equipment master (never overridden per assignment)
    SELECT daily_rental_rate
    INTO   v_daily_rate
    FROM   equipment
    WHERE  id = NEW.equipment_id;

    IF v_daily_rate IS NULL THEN
        RAISE EXCEPTION 'equipment % has no daily_rental_rate set', NEW.equipment_id;
    END IF;

    -- Prefer the generated days_rented column; fall back to date diff on completion day
    v_days   := COALESCE(NEW.days_rented, (CURRENT_DATE - NEW.assigned_date)::INTEGER);
    v_charge := v_daily_rate * GREATEST(v_days, 1);

    -- Look up department UUIDs by code (departments seeded in 002_core_master.sql)
    SELECT id INTO v_const_dept FROM departments WHERE code = 'CONSTRUCTION' LIMIT 1;
    SELECT id INTO v_motor_dept FROM departments WHERE code = 'MOTORPOOL'    LIMIT 1;

    IF v_const_dept IS NULL OR v_motor_dept IS NULL THEN
        RAISE EXCEPTION 'CONSTRUCTION or MOTORPOOL department not found in departments table';
    END IF;

    -- Idempotency: remove any prior entries for this assignment before re-posting
    -- (guards against duplicate fires if status is toggled back and re-completed)
    DELETE FROM financial_ledger
    WHERE  reference_type = 'equipment_assignments'
    AND    reference_id   = NEW.id
    AND    transaction_type = 'INTERNAL_TRANSFER';

    -- DEBIT: charge project site (cost to construction)
    INSERT INTO financial_ledger (
        project_id, cost_center_id, dept_id, unit_id,
        resource_type, resource_id,
        transaction_type, reference_type, reference_id,
        amount, is_external, transaction_date, description
    ) VALUES (
        NEW.project_id, NEW.cost_center_id, v_const_dept, NEW.unit_id,
        'MACHINE', NEW.equipment_id,
        'INTERNAL_TRANSFER', 'equipment_assignments', NEW.id,
        v_charge, FALSE, CURRENT_DATE,
        'Internal equipment rental charge: ' || v_days::TEXT || ' day(s) @ ₱' || v_daily_rate::TEXT
    );

    -- CREDIT: record internal revenue for Motorpool
    INSERT INTO financial_ledger (
        project_id, cost_center_id, dept_id, unit_id,
        resource_type, resource_id,
        transaction_type, reference_type, reference_id,
        amount, is_external, transaction_date, description
    ) VALUES (
        NEW.project_id, NEW.cost_center_id, v_motor_dept, NEW.unit_id,
        'MACHINE', NEW.equipment_id,
        'INTERNAL_TRANSFER', 'equipment_assignments', NEW.id,
        v_charge, FALSE, CURRENT_DATE,
        'Internal rental income: ' || v_days::TEXT || ' day(s) @ ₱' || v_daily_rate::TEXT
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Fires once per row when an assignment transitions to COMPLETED
DROP TRIGGER IF EXISTS tr_auto_rental_billing ON equipment_assignments;

CREATE TRIGGER tr_auto_rental_billing
AFTER UPDATE OF status ON equipment_assignments
FOR EACH ROW
WHEN (NEW.status = 'COMPLETED' AND OLD.status <> 'COMPLETED')
EXECUTE FUNCTION fn_post_internal_rental();
