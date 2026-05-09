-- Migration 018: Subcontractor rate cards table + developer rate cards activity_def_id

-- ── Subcontractor Rate Cards ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subcontractor_rate_cards (
    id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    subcon_id       UUID            NOT NULL REFERENCES subcontractors(id),
    project_id      UUID            NOT NULL REFERENCES projects(id),
    activity_def_id UUID            NOT NULL REFERENCES activity_definitions(id),
    rate_per_unit   NUMERIC(15,2)   NOT NULL,
    retention_pct   NUMERIC(5,4)    NOT NULL DEFAULT 0.10,
    version         INTEGER         NOT NULL DEFAULT 1,
    is_active       BOOLEAN         NOT NULL DEFAULT TRUE,
    approved_by     UUID            REFERENCES users(id),
    approved_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now()
);

-- ── Developer Rate Cards: add activity_def_id column ─────────────────────────
ALTER TABLE developer_rate_cards
    ADD COLUMN IF NOT EXISTS activity_def_id UUID REFERENCES activity_definitions(id);
