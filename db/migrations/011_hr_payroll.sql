-- Migration 011: HR & Payroll — employees, DTR, payroll records, leave schedules
-- Labor costs are mapped to Departmental P&L centers via cost_center_id.

-- ─── Employees ────────────────────────────────────────────────────────────────
CREATE TABLE employees (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                 UUID            REFERENCES users(id),
    employee_code           VARCHAR(50)     NOT NULL UNIQUE,
    full_name               VARCHAR(150)    NOT NULL,
    dept_id                 UUID            NOT NULL REFERENCES departments(id),
    cost_center_id          UUID            NOT NULL REFERENCES cost_centers(id),
    position                VARCHAR(100)    NOT NULL,
    employment_type         VARCHAR(20)     NOT NULL CHECK (employment_type IN ('REGULAR','CONTRACTUAL','PROBATIONARY')),
    daily_rate              NUMERIC(12,2)   NOT NULL,
    -- Government-mandated deductions (monthly)
    sss_contribution        NUMERIC(10,2)   NOT NULL DEFAULT 0,
    philhealth_contribution NUMERIC(10,2)   NOT NULL DEFAULT 0,
    pagibig_contribution    NUMERIC(10,2)   NOT NULL DEFAULT 0,
    hire_date               DATE            NOT NULL,
    separation_date         DATE,
    is_active               BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ     NOT NULL DEFAULT now()
);

-- Back-fill the deferred FK on departments
ALTER TABLE departments
    DROP CONSTRAINT fk_dept_head;
ALTER TABLE departments
    ADD CONSTRAINT fk_dept_head FOREIGN KEY (head_employee_id) REFERENCES employees(id);

-- ─── Daily time records (DTR) ─────────────────────────────────────────────────
-- Each DTR row maps a work day to a specific cost center and (optionally) a unit.
-- Feeds payroll accrual. DTR compliance = % employees with verified records for the period.
CREATE TABLE daily_time_records (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id     UUID            NOT NULL REFERENCES employees(id),
    work_date       DATE            NOT NULL,
    unit_id         UUID            REFERENCES project_units(id),
    cost_center_id  UUID            NOT NULL REFERENCES cost_centers(id),
    time_in         TIME,
    time_out        TIME,
    hours_worked    NUMERIC(5,2),
    overtime_hours  NUMERIC(5,2)    NOT NULL DEFAULT 0,
    is_verified     BOOLEAN         NOT NULL DEFAULT FALSE,
    verified_by     UUID            REFERENCES users(id),
    verified_at     TIMESTAMPTZ,
    file_url        TEXT,           -- uploaded DTR document / biometric export
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE (employee_id, work_date)
);

-- ─── Payroll records ──────────────────────────────────────────────────────────
-- Each record covers one pay period per employee, mapped to a cost center P&L.
CREATE TABLE payroll_records (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id             UUID            NOT NULL REFERENCES employees(id),
    cost_center_id          UUID            NOT NULL REFERENCES cost_centers(id),
    period_start            DATE            NOT NULL,
    period_end              DATE            NOT NULL,
    days_worked             NUMERIC(5,2)    NOT NULL DEFAULT 0,
    overtime_hours          NUMERIC(7,2)    NOT NULL DEFAULT 0,
    gross_pay               NUMERIC(12,2)   NOT NULL,
    tax_deduction           NUMERIC(10,2)   NOT NULL DEFAULT 0,
    sss_deduction           NUMERIC(10,2)   NOT NULL DEFAULT 0,
    philhealth_deduction    NUMERIC(10,2)   NOT NULL DEFAULT 0,
    pagibig_deduction       NUMERIC(10,2)   NOT NULL DEFAULT 0,
    other_deductions        NUMERIC(10,2)   NOT NULL DEFAULT 0,
    net_pay                 NUMERIC(12,2)   NOT NULL,
    status                  VARCHAR(20)     NOT NULL DEFAULT 'DRAFT'
                                CHECK (status IN ('DRAFT','APPROVED','PAID')),
    approved_by             UUID            REFERENCES users(id),
    approved_at             TIMESTAMPTZ,
    paid_at                 TIMESTAMPTZ,
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE (employee_id, period_start, period_end)
);

-- ─── Leave schedules ──────────────────────────────────────────────────────────
-- Tracked to prevent manpower drops on site.
CREATE TABLE leave_schedules (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id     UUID            NOT NULL REFERENCES employees(id),
    leave_type      VARCHAR(30)     NOT NULL CHECK (leave_type IN ('SICK','VACATION','EMERGENCY','MATERNITY','PATERNITY')),
    start_date      DATE            NOT NULL,
    end_date        DATE            NOT NULL,
    days_count      INTEGER         NOT NULL
        GENERATED ALWAYS AS ((end_date - start_date) + 1) STORED,
    status          VARCHAR(20)     NOT NULL DEFAULT 'PENDING'
                        CHECK (status IN ('PENDING','APPROVED','REJECTED')),
    approved_by     UUID            REFERENCES users(id),
    approved_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now()
);
