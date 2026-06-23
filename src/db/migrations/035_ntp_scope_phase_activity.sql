-- Migration 035: NTP Scope + Phase Activity tracking
-- Run this in the Supabase SQL editor before deploying.

-- 1. Add Scope of Work to NTPs so activities can be filtered
ALTER TABLE task_assignments
  ADD COLUMN IF NOT EXISTS phase_scope_id UUID REFERENCES phase_scopes(id);

-- 2. Add phase activity reference to daily progress (new workflow)
ALTER TABLE daily_progress_entries
  ADD COLUMN IF NOT EXISTS phase_activity_id UUID REFERENCES phase_activities(id);

-- 3. Make unit_activity_id nullable so new entries only need phaseActivityId
ALTER TABLE daily_progress_entries
  ALTER COLUMN unit_activity_id DROP NOT NULL;
