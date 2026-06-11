-- Link NTPs issued together (same form submission, multiple block/units)
-- so Log Progress can offer the full set of units for a single "NTP" selection.
ALTER TABLE task_assignments ADD COLUMN IF NOT EXISTS ntp_group_id uuid;
CREATE INDEX IF NOT EXISTS idx_task_assignments_ntp_group_id ON task_assignments (ntp_group_id);
