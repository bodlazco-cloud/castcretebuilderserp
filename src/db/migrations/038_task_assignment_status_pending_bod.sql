-- task_assignments.status uses the approval_status enum (not ntp_status)
-- Add the NTP workflow values that are missing from approval_status
ALTER TYPE approval_status ADD VALUE IF NOT EXISTS 'PENDING_BOD';
ALTER TYPE approval_status ADD VALUE IF NOT EXISTS 'ACTIVE';
ALTER TYPE approval_status ADD VALUE IF NOT EXISTS 'COMPLETED';

-- Add reviewer columns for 2-tier NTP approval
ALTER TABLE task_assignments
  ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
