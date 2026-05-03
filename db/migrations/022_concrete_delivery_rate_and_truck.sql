-- Migration 022: Admin-locked rate on mix_designs + truck tracking on delivery notes
-- Enables the logConcreteDelivery action to source the internal billing rate from
-- the admin-locked mix design rather than accepting it from the caller.

ALTER TABLE mix_designs
    ADD COLUMN IF NOT EXISTS internal_rate_per_m3 NUMERIC(15,2);

COMMENT ON COLUMN mix_designs.internal_rate_per_m3 IS
    'Admin-locked ₱/m³ rate used for internal Batching→Site sales (P&L billing)';

-- Make production_log_id nullable: quick field deliveries may arrive before the
-- batch production log is created (driver drops concrete, log filled in later).
ALTER TABLE concrete_delivery_notes
    ALTER COLUMN production_log_id DROP NOT NULL,
    ADD COLUMN IF NOT EXISTS mix_design_id UUID REFERENCES mix_designs(id),
    ADD COLUMN IF NOT EXISTS truck_id      UUID REFERENCES equipment(id);

COMMENT ON COLUMN concrete_delivery_notes.truck_id IS
    'Delivery truck (equipment) used — links to Motorpool for ROI tracking';
