-- Drop everything in the public schema cleanly
-- Run this BEFORE init_part1 / init_part2 / init_part3

-- Drop all triggers first (they depend on functions)
DO $$ DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT trigger_name, event_object_table
           FROM information_schema.triggers
           WHERE trigger_schema = 'public'
  LOOP
    EXECUTE 'DROP TRIGGER IF EXISTS ' || quote_ident(r.trigger_name) ||
            ' ON ' || quote_ident(r.event_object_table) || ' CASCADE';
  END LOOP;
END $$;

-- Drop all views
DO $$ DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT table_name FROM information_schema.views
           WHERE table_schema = 'public'
  LOOP
    EXECUTE 'DROP VIEW IF EXISTS ' || quote_ident(r.table_name) || ' CASCADE';
  END LOOP;
END $$;

-- Drop all tables
DO $$ DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT tablename FROM pg_tables
           WHERE schemaname = 'public'
  LOOP
    EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
  END LOOP;
END $$;

-- Drop all custom types (enums)
DO $$ DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT typname FROM pg_type
           WHERE typtype = 'e' AND typnamespace = 'public'::regnamespace
  LOOP
    EXECUTE 'DROP TYPE IF EXISTS ' || quote_ident(r.typname) || ' CASCADE';
  END LOOP;
END $$;

-- Drop all functions
DO $$ DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT proname, oidvectortypes(proargtypes) AS argtypes
           FROM pg_proc
           WHERE pronamespace = 'public'::regnamespace
  LOOP
    EXECUTE 'DROP FUNCTION IF EXISTS ' || quote_ident(r.proname) ||
            '(' || r.argtypes || ') CASCADE';
  END LOOP;
END $$;
