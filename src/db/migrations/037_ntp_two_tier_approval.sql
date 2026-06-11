-- 2-tier NTP approval: DRAFT → PENDING_REVIEW (manager) → PENDING_BOD (BOD) → ACTIVE
ALTER TABLE task_assignments
  ADD COLUMN IF NOT EXISTS reviewed_by  UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS reviewed_at  TIMESTAMPTZ;
