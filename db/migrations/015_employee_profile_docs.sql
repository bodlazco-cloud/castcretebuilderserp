-- 015: Employee personal info columns + document management table

ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS phone                   VARCHAR(30),
  ADD COLUMN IF NOT EXISTS email                   VARCHAR(150),
  ADD COLUMN IF NOT EXISTS address                 TEXT,
  ADD COLUMN IF NOT EXISTS birthday                DATE,
  ADD COLUMN IF NOT EXISTS civil_status            VARCHAR(20),
  ADD COLUMN IF NOT EXISTS gender                  VARCHAR(10),
  ADD COLUMN IF NOT EXISTS emergency_contact_name  VARCHAR(150),
  ADD COLUMN IF NOT EXISTS emergency_contact_phone VARCHAR(30);

CREATE TABLE IF NOT EXISTS employee_documents (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id  UUID         NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  doc_type     VARCHAR(30)  NOT NULL DEFAULT 'OTHER',
  title        VARCHAR(200) NOT NULL,
  file_url     TEXT         NOT NULL,
  uploaded_by  UUID         REFERENCES users(id),
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_employee_documents_employee
  ON employee_documents(employee_id);
