-- Make subcon_id optional on subcontractor_rate_cards.
-- Rate cards are now project-level labor rate schedules, not per-subcontractor.
-- Also drop NOT NULL on activity_def_id (not required by new form),
-- and add phase_activity_id, unit_model, unit_type columns that were missing.
ALTER TABLE subcontractor_rate_cards
  ALTER COLUMN subcon_id      DROP NOT NULL,
  ALTER COLUMN activity_def_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS phase_activity_id UUID REFERENCES phase_activities(id),
  ADD COLUMN IF NOT EXISTS unit_model        VARCHAR(50),
  ADD COLUMN IF NOT EXISTS unit_type         unit_type;
