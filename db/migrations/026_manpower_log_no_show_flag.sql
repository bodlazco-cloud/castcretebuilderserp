-- Migration 026: Add No-Show flag to construction_manpower_logs
-- Flagged TRUE when subcon_headcount < committed_headcount * 0.80.
-- committed_headcount is provided at log time (from the task assignment or
-- the subcontractor's daily deployment commitment); not stored on the subcon
-- record because it can vary per assignment.

ALTER TABLE construction_manpower_logs
    ADD COLUMN IF NOT EXISTS committed_headcount  INTEGER,
    ADD COLUMN IF NOT EXISTS is_no_show_flagged   BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN construction_manpower_logs.committed_headcount IS
    'Expected headcount for this subcon on this day (from task assignment deployment plan)';
COMMENT ON COLUMN construction_manpower_logs.is_no_show_flagged IS
    'TRUE when actual subcon_headcount < committed_headcount * 0.80';
