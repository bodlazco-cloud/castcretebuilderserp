-- Migration 023: Add release-workflow fields to manual_vouchers
-- requires_dual_auth: set TRUE when amount >= 50,000 (mirrors PO behavior).
--                     Documents that the dual-auth control was applied.
-- bank_account_id:    Which bank account to debit on RELEASED — required for
--                     the execute_financial_finalization step (bank DEBIT + P&L).

ALTER TABLE manual_vouchers
    ADD COLUMN IF NOT EXISTS requires_dual_auth BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS bank_account_id    UUID REFERENCES bank_accounts(id);

-- Auto-flag existing high-value vouchers
UPDATE manual_vouchers SET requires_dual_auth = TRUE WHERE amount >= 50000;

COMMENT ON COLUMN manual_vouchers.requires_dual_auth IS
    'TRUE when amount >= ₱50,000 — audit trail that dual-auth control was applied';
COMMENT ON COLUMN manual_vouchers.bank_account_id IS
    'Bank account to debit when payment_status → RELEASED';
