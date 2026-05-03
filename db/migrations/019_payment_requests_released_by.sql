-- Migration 019: Add released_by to payment_requests
-- From the Gemini consolidated schema dump (payments table):
--   prepared_by → payment_requests.requested_by (already exists)
--   released_by → MISSING (released_at exists but not the who)
--   status      → payment_requests.status (already exists)
--
-- All other tables in the consolidated dump are already covered:
--   resource_forecasts, BOM RLS, triggers  → migration 014
--   virtual_inventory_ledger               → migration 017
--   manual_vouchers prepared_by/authorized → migration 018
--   purchase_orders audit_reviewed_by/at   → already in schema (= verified_by/at)
--   material_movement_logs                 → migration 014
--   site_profitability view                → migration 015
--   internal rental trigger                → migration 016

ALTER TABLE payment_requests
    ADD COLUMN IF NOT EXISTS released_by UUID REFERENCES users(id);

COMMENT ON COLUMN payment_requests.released_by IS
    'User who physically released the payment (set when status → RELEASED)';
