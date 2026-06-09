-- Extend task_assignments status to support 2-tier NTP approval workflow
-- Drop existing check constraint (if any) and recreate with PENDING_BOD included
ALTER TABLE task_assignments DROP CONSTRAINT IF EXISTS task_assignments_status_check;

ALTER TABLE task_assignments
  ADD CONSTRAINT task_assignments_status_check
  CHECK (status IN (
    'DRAFT',
    'PENDING_REVIEW',
    'PENDING_BOD',
    'ACTIVE',
    'COMPLETED',
    'CANCELLED',
    'REJECTED'
  ));

-- Add reviewer columns for 2-tier approval (migration 037 combined here)
ALTER TABLE task_assignments
  ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
