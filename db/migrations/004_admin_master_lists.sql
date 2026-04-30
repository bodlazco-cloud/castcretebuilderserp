-- Migration 004: Admin master lists — materials, suppliers, BOM standards
-- These are read-only for operational modules; only Admin can modify with sign-off.

-- ─── Suppliers ────────────────────────────────────────────────────────────────
CREATE TABLE suppliers (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(150)  NOT NULL,
    contact_info    JSONB,
    preferred_materials JSONB,   -- advisory list
    is_active       BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- ─── Materials (Admin-controlled master list) ─────────────────────────────────
CREATE TABLE materials (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code            VARCHAR(50)   NOT NULL UNIQUE,
    name            VARCHAR(150)  NOT NULL,
    unit            VARCHAR(30)   NOT NULL,   -- bags, kg, m3, pcs, liters
    category        VARCHAR(50)   NOT NULL,   -- CEMENT, REBAR, TILES, AGGREGATE, etc.
    admin_price     NUMERIC(15,2) NOT NULL,   -- Admin-fixed; Procurement cannot override
    price_version   INTEGER       NOT NULL DEFAULT 1,
    preferred_supplier_id UUID    REFERENCES suppliers(id),
    is_active       BOOLEAN       NOT NULL DEFAULT TRUE,
    approved_by     UUID          REFERENCES users(id),
    approved_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- Price history — every admin_price change creates a new version row
CREATE TABLE material_price_history (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    material_id     UUID          NOT NULL REFERENCES materials(id),
    old_price       NUMERIC(15,2) NOT NULL,
    new_price       NUMERIC(15,2) NOT NULL,
    version         INTEGER       NOT NULL,
    changed_by      UUID          NOT NULL REFERENCES users(id),
    approved_by     UUID          REFERENCES users(id),
    approved_at     TIMESTAMPTZ,
    effective_from  DATE          NOT NULL,
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- ─── BOM Standards (Admin-controlled per unit model / activity) ───────────────
-- Planning reads this to auto-generate PRs. Cannot be edited mid-project without BOD sign-off.
CREATE TABLE bom_standards (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id          UUID            NOT NULL REFERENCES projects(id),
    unit_model          VARCHAR(50)     NOT NULL,   -- MID_UNIT, END_UNIT, CORNER_UNIT
    category            work_category   NOT NULL,
    scope_code          VARCHAR(100)    NOT NULL,   -- e.g. GF_COLUMNS, RF_SLAB
    activity_code       VARCHAR(100)    NOT NULL,   -- e.g. REBAR_TYING, CONCRETE_POURING
    material_id         UUID            NOT NULL REFERENCES materials(id),
    quantity_per_unit   NUMERIC(15,4)   NOT NULL,
    version             INTEGER         NOT NULL DEFAULT 1,
    is_active           BOOLEAN         NOT NULL DEFAULT TRUE,
    approved_by         UUID            REFERENCES users(id),
    approved_at         TIMESTAMPTZ,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE (project_id, unit_model, activity_code, material_id, version)
);

-- ─── Activity definitions (the granular building blocks of work) ──────────────
-- Spec hierarchy: Category > Scope of Work (SOW) > Activity
CREATE TABLE activity_definitions (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id              UUID            NOT NULL REFERENCES projects(id),
    category                work_category   NOT NULL,
    scope_code              VARCHAR(100)    NOT NULL,
    scope_name              VARCHAR(150)    NOT NULL,
    activity_code           VARCHAR(100)    NOT NULL,
    activity_name           VARCHAR(150)    NOT NULL,
    standard_duration_days  INTEGER         NOT NULL,
    weight_in_scope_pct     NUMERIC(5,2)    NOT NULL,   -- % this activity contributes to SOW completion
    sequence_order          INTEGER         NOT NULL,
    is_active               BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE (project_id, activity_code)
);

-- ─── Milestone definitions (billing-trigger points) ──────────────────────────
CREATE TABLE milestone_definitions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id          UUID            NOT NULL REFERENCES projects(id),
    name                VARCHAR(150)    NOT NULL,
    category            work_category   NOT NULL,
    sequence_order      INTEGER         NOT NULL,
    triggers_billing    BOOLEAN         NOT NULL DEFAULT FALSE,
    weight_pct          NUMERIC(5,2)    NOT NULL,   -- % of category completion
    is_active           BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE (project_id, name, category)
);
