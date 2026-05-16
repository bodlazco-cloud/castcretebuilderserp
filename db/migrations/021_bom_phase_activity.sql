-- Allow BOM entries to reference master-list construction phases
ALTER TABLE master_bom_entries
  ADD COLUMN IF NOT EXISTS phase_activity_id UUID REFERENCES phase_activities(id),
  ALTER COLUMN activity_def_id DROP NOT NULL;
