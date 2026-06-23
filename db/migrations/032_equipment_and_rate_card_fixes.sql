-- Migration 032: Three fixes in one:
--
-- 1. developer_rate_cards.milestone_category was NOT NULL (from migration 003)
--    but the Drizzle schema never inserts it → every INSERT failed.
--    Make it nullable so new rate cards can be saved.
--
-- 2. equipment table: add image_url column (present in Drizzle schema but never
--    migrated) and expand the status CHECK constraint to include 'DEPLOYED'
--    (the code sets status=DEPLOYED on assignment but the constraint only allowed
--    AVAILABLE/ON_SITE/MAINTENANCE/SOLD/RETIRED).
--
-- 3. equipment_assignments: add rate_type column so operators can record
--    whether the entered rate is daily, weekly, or monthly.

-- ── Fix 1: developer_rate_cards ──────────────────────────────────────────────
DO $$ BEGIN
  ALTER TABLE developer_rate_cards ALTER COLUMN milestone_category DROP NOT NULL;
EXCEPTION WHEN undefined_column THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE developer_rate_cards ALTER COLUMN activity_def_id DROP NOT NULL;
EXCEPTION WHEN undefined_column THEN NULL;
END $$;

-- ── Fix 2a: equipment.image_url ───────────────────────────────────────────────
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS image_url TEXT;

-- ── Fix 2b: expand equipment.status CHECK to include DEPLOYED ────────────────
DO $$ BEGIN
  ALTER TABLE equipment DROP CONSTRAINT equipment_status_check;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;
ALTER TABLE equipment
  ADD CONSTRAINT equipment_status_check
  CHECK (status IN ('AVAILABLE', 'ON_SITE', 'DEPLOYED', 'MAINTENANCE', 'SOLD', 'RETIRED'));

-- ── Fix 3: equipment_assignments.rate_type ────────────────────────────────────
ALTER TABLE equipment_assignments
  ADD COLUMN IF NOT EXISTS rate_type VARCHAR(10) NOT NULL DEFAULT 'DAILY'
    CHECK (rate_type IN ('DAILY', 'WEEKLY', 'MONTHLY'));

-- ── Fix 4: equipment_assignments.operator_id FK ───────────────────────────────
-- Original migration 010 set operator_id REFERENCES users(id) but the assign
-- form populates operators from the employees table. Change FK to employees.
DO $$ BEGIN
  ALTER TABLE equipment_assignments
    DROP CONSTRAINT equipment_assignments_operator_id_users_id_fk;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE equipment_assignments
    DROP CONSTRAINT equipment_assignments_operator_id_fkey;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;
ALTER TABLE equipment_assignments
  ADD CONSTRAINT IF NOT EXISTS equipment_assignments_operator_id_fk
    FOREIGN KEY (operator_id) REFERENCES employees(id);

-- ── Fix 5: activity_definitions.project_id ───────────────────────────────────
-- Column exists in Drizzle schema but was missing from the original DB migration.
ALTER TABLE activity_definitions
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id);
