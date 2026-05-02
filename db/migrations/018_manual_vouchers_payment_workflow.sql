-- Migration 018: Add payment workflow columns to manual_vouchers
-- Gemini target was financial_vouchers → actual table is manual_vouchers.
--
-- prepared_by   : Finance staff who physically prepared the check/voucher document
--                 (distinct from created_by which is the system record creator)
-- authorized_by : Second signatory who authorized release — satisfies dual-auth
--                 requirement for vouchers tied to POs > ₱50,000
-- payment_status: 3-state release lifecycle separate from the approval workflow
--                 DRAFT → PREPARED → RELEASED
--                 (Gemini used PENDING_RELEASE; mapped to PREPARED in our enum)

ALTER TABLE manual_vouchers
    ADD COLUMN IF NOT EXISTS prepared_by    UUID REFERENCES users(id),
    ADD COLUMN IF NOT EXISTS authorized_by  UUID REFERENCES users(id),
    ADD COLUMN IF NOT EXISTS payment_status payment_flow_status NOT NULL DEFAULT 'DRAFT';

COMMENT ON COLUMN manual_vouchers.payment_status IS
    'DRAFT = being prepared, PREPARED = awaiting banking release, RELEASED = payment sent';
COMMENT ON COLUMN manual_vouchers.prepared_by IS
    'Finance staff who prepared the physical voucher document';
COMMENT ON COLUMN manual_vouchers.authorized_by IS
    'Second signatory for dual-auth release (required when amount > ₱50,000)';
