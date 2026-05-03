-- db/functions/issue_ntp_v2.sql
-- Issues NTPs (Notices to Proceed) for a batch of units under one subcontractor.
--
-- Gemini fixes applied:
--   unit_ids TEXT[]   → UUID[]  (project_units.id is UUID)
--   site_id UUID      → project_id UUID  (no site_id column in our schema)
--   sow_id UUID       → p_category work_category + p_work_type trade_type
--                       (task_assignments uses category + work_type enums, not a FK)
--   unit_type TEXT    → dropped (encoded in project_units.unit_model; not stored on NTP)
--   manpower_count    → dropped (logged per day on daily_progress_entries, not on NTP)
--   p_status TEXT     → ntp_status enum; function always creates in DRAFT
--                       (status = 'ACTIVE' fires the resource-forecast trigger)
--   single INSERT     → loop: one task_assignment row per unit (our schema design)
--   units.current_status = 'PENDING_NTP' → project_units.status = 'NTP_ISSUED'
--                       (current_category is a workCategoryEnum; status is varchar 30)
--
-- Capacity guard: subcontractor_capacity_matrix.rated_capacity for this work_type
-- is checked before inserting. Raises exception if headroom is insufficient.
--
-- Returns: JSONB  { "created": <count>, "ntp_ids": [<uuid>, ...] }

CREATE OR REPLACE FUNCTION issue_ntp_v2(
    p_project_id    UUID,
    p_unit_ids      UUID[],
    p_subcon_id     UUID,
    p_category      work_category,
    p_work_type     trade_type,
    p_start_date    DATE,
    p_end_date      DATE,
    p_issued_by     UUID
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_unit_id        UUID;
    v_ntp_id         UUID;
    v_ntp_ids        UUID[] := ARRAY[]::UUID[];
    v_rated_capacity INTEGER;
    v_active_count   INTEGER;
    v_headroom       INTEGER;
    v_requested      INTEGER := array_length(p_unit_ids, 1);
BEGIN
    -- ── Capacity guard ────────────────────────────────────────────────────────
    -- Rated capacity for this subcontractor + work type combination
    SELECT COALESCE(scm.rated_capacity, s.default_max_active_units)
    INTO   v_rated_capacity
    FROM   subcontractors s
    LEFT JOIN subcontractor_capacity_matrix scm
           ON scm.subcon_id  = s.id
          AND scm.work_type  = p_work_type
    WHERE  s.id = p_subcon_id
    LIMIT  1;

    IF v_rated_capacity IS NULL THEN
        RAISE EXCEPTION 'Subcontractor % not found', p_subcon_id;
    END IF;

    -- Count units currently under ACTIVE NTPs for this subcontractor
    SELECT COUNT(*)
    INTO   v_active_count
    FROM   task_assignments
    WHERE  subcon_id = p_subcon_id
    AND    status IN ('DRAFT', 'BOD_APPROVED', 'ACTIVE');

    v_headroom := v_rated_capacity - v_active_count;

    IF v_headroom < v_requested THEN
        RAISE EXCEPTION
            'Capacity exceeded: subcontractor has % slot(s) available, % requested',
            v_headroom, v_requested;
    END IF;

    -- ── Insert one task_assignment per unit ───────────────────────────────────
    FOREACH v_unit_id IN ARRAY p_unit_ids LOOP
        INSERT INTO task_assignments (
            project_id, unit_id, subcon_id,
            category, work_type,
            start_date, end_date,
            status, capacity_check_passed,
            issued_by
        ) VALUES (
            p_project_id, v_unit_id, p_subcon_id,
            p_category, p_work_type,
            p_start_date, p_end_date,
            'DRAFT', TRUE,
            p_issued_by
        )
        RETURNING id INTO v_ntp_id;

        v_ntp_ids := array_append(v_ntp_ids, v_ntp_id);
    END LOOP;

    -- ── Mark units as NTP_ISSUED ──────────────────────────────────────────────
    -- status (varchar 30) tracks workflow state; current_category tracks phase.
    -- 'PENDING_NTP' from Gemini → 'NTP_ISSUED' (clearer: NTP has been drafted)
    UPDATE project_units
    SET    status = 'NTP_ISSUED'
    WHERE  id = ANY(p_unit_ids);

    RETURN jsonb_build_object(
        'created',  v_requested,
        'ntp_ids',  to_jsonb(v_ntp_ids)
    );
END;
$$;
