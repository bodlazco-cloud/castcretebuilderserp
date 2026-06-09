-- Add PENDING_BOD to ntp_status enum for 2-tier NTP approval workflow
ALTER TYPE ntp_status ADD VALUE IF NOT EXISTS 'PENDING_BOD';

-- Add reviewer columns (from migration 037)
ALTER TABLE task_assignments
  ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
