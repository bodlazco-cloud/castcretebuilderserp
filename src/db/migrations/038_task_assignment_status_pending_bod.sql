-- Add missing/new values to ntp_status enum for 2-tier NTP approval workflow
ALTER TYPE ntp_status ADD VALUE IF NOT EXISTS 'PENDING_REVIEW';
ALTER TYPE ntp_status ADD VALUE IF NOT EXISTS 'PENDING_BOD';
ALTER TYPE ntp_status ADD VALUE IF NOT EXISTS 'ACTIVE';
ALTER TYPE ntp_status ADD VALUE IF NOT EXISTS 'COMPLETED';
ALTER TYPE ntp_status ADD VALUE IF NOT EXISTS 'CANCELLED';
ALTER TYPE ntp_status ADD VALUE IF NOT EXISTS 'REJECTED';

-- Add reviewer columns for 2-tier approval
ALTER TABLE task_assignments
  ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
