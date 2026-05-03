-- Migration 021: Add audit_remarks to work_accomplished_reports
-- The existing rejection_reason column is for rejection-specific text.
-- audit_remarks is a general field for auditor notes on both VERIFIED and
-- REJECTED outcomes, matching the verifyMilestone server action.

ALTER TABLE work_accomplished_reports
    ADD COLUMN IF NOT EXISTS audit_remarks TEXT;

COMMENT ON COLUMN work_accomplished_reports.audit_remarks IS
    'General auditor notes recorded on VERIFIED or REJECTED outcome';
COMMENT ON COLUMN work_accomplished_reports.rejection_reason IS
    'Subcontractor-facing explanation populated only on REJECTED status';
