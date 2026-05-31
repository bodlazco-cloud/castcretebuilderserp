-- Make subcon_id optional on subcontractor_rate_cards.
-- Rate cards are now project-level labor rate schedules, not per-subcontractor.
ALTER TABLE subcontractor_rate_cards
  ALTER COLUMN subcon_id DROP NOT NULL;
