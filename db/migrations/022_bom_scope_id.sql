-- Allow BOM entries to reference a scope directly (activity becomes optional)
ALTER TABLE master_bom_entries
  ADD COLUMN IF NOT EXISTS phase_scope_id UUID REFERENCES phase_scopes(id);
