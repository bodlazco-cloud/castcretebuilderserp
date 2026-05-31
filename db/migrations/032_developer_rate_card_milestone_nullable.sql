-- Migration 032: Make milestone_category nullable on developer_rate_cards
-- Original migration 003 created this column as NOT NULL. The form no longer
-- supplies it (replaced by phase_activity_id). Drop the NOT NULL so inserts work.
ALTER TABLE developer_rate_cards
  ALTER COLUMN milestone_category DROP NOT NULL;
