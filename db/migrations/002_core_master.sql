-- Migration 002: Core master tables
-- departments, cost_centers, users

-- ─── Departments ─────────────────────────────────────────────────────────────
CREATE TABLE departments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code            dept_code        NOT NULL UNIQUE,
    name            VARCHAR(100)     NOT NULL,
    head_employee_id UUID,           -- FK added after employees table
    created_at      TIMESTAMPTZ      NOT NULL DEFAULT now()
);

-- ─── Cost centers ─────────────────────────────────────────────────────────────
-- Each department maps to one or more cost centers for P&L segregation.
CREATE TABLE cost_centers (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code        VARCHAR(50)      NOT NULL UNIQUE,
    name        VARCHAR(100)     NOT NULL,
    dept_id     UUID             NOT NULL REFERENCES departments(id),
    type        cost_center_type NOT NULL,
    is_active   BOOLEAN          NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ      NOT NULL DEFAULT now()
);

-- ─── Users (system access accounts) ──────────────────────────────────────────
-- Separated from employees so contractors/admins can have accounts without payroll records.
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           VARCHAR(200)  NOT NULL UNIQUE,
    full_name       VARCHAR(150)  NOT NULL,
    dept_id         UUID          REFERENCES departments(id),
    role            VARCHAR(50)   NOT NULL,    -- e.g. ADMIN, PLANNER, SITE_ENGINEER, AUDITOR
    is_active       BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- Back-fill the self-referencing FK on departments
ALTER TABLE departments
    ADD CONSTRAINT fk_dept_head FOREIGN KEY (head_employee_id) REFERENCES users(id);

-- ─── Admin settings (version-controlled key-value store) ──────────────────────
-- Any change requires a secondary admin sign-off (Board Resolution policy).
CREATE TABLE admin_settings (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID,               -- NULL = global setting
    setting_key     VARCHAR(100)        NOT NULL,
    setting_value   JSONB               NOT NULL,
    version         INTEGER             NOT NULL DEFAULT 1,
    is_active       BOOLEAN             NOT NULL DEFAULT TRUE,
    created_by      UUID                NOT NULL REFERENCES users(id),
    approved_by     UUID                REFERENCES users(id),
    approved_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ         NOT NULL DEFAULT now(),
    UNIQUE (project_id, setting_key, version)
);
