-- Migration 031: Add missing columns to developer_rate_cards
-- Migration 019 used CREATE TABLE IF NOT EXISTS (table already existed from 003),
-- so phase_activity_id, unit_model, and unit_type were never added.

ALTER TABLE developer_rate_cards
  ADD COLUMN IF NOT EXISTS phase_activity_id UUID REFERENCES phase_activities(id),
  ADD COLUMN IF NOT EXISTS unit_model        VARCHAR(50),
  ADD COLUMN IF NOT EXISTS unit_type         unit_type;
