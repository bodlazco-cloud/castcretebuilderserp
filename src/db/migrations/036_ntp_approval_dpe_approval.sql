-- Migration 036: NTP BOD approval + Daily Progress manager approval
-- Run this in the Supabase SQL editor before deploying.

-- NTP approval tracking
ALTER TABLE task_assignments ADD COLUMN IF NOT EXISTS submitted_at    TIMESTAMPTZ;
ALTER TABLE task_assignments ADD COLUMN IF NOT EXISTS submitted_by    UUID REFERENCES users(id);
ALTER TABLE task_assignments ADD COLUMN IF NOT EXISTS bod_approved_at TIMESTAMPTZ;
ALTER TABLE task_assignments ADD COLUMN IF NOT EXISTS bod_approved_by UUID REFERENCES users(id);
ALTER TABLE task_assignments ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Daily progress entry manager approval
ALTER TABLE daily_progress_entries ADD COLUMN IF NOT EXISTS approval_status  VARCHAR(30) NOT NULL DEFAULT 'PENDING_REVIEW';
ALTER TABLE daily_progress_entries ADD COLUMN IF NOT EXISTS approved_by      UUID REFERENCES users(id);
ALTER TABLE daily_progress_entries ADD COLUMN IF NOT EXISTS approved_at      TIMESTAMPTZ;
ALTER TABLE daily_progress_entries ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
