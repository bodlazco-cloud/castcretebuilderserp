-- Migration 033: Add phase_scope_id to developer_rate_cards and subcontractor_rate_cards
-- so that admin can link a rate card to a scope of work even without selecting a specific activity.
ALTER TABLE developer_rate_cards
  ADD COLUMN IF NOT EXISTS phase_scope_id UUID REFERENCES phase_scopes(id);

ALTER TABLE subcontractor_rate_cards
  ADD COLUMN IF NOT EXISTS phase_scope_id UUID REFERENCES phase_scopes(id);
