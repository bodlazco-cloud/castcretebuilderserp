-- Migration 017: WAR gross field optional; Employee monthly rate + MPF;
--               Materials min qty; Suppliers contact detail; Global Settings

-- ── Employee: monthly rate + MPF ──────────────────────────────────────────
ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS monthly_rate     NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS mpf_contribution NUMERIC(10,2) NOT NULL DEFAULT 0;

-- Back-fill monthly_rate from daily_rate (daily * 26) for existing rows
UPDATE employees SET monthly_rate = ROUND(daily_rate * 26, 2) WHERE monthly_rate IS NULL;

-- ── Materials: category optional, add minimum_quantity ───────────────────
ALTER TABLE materials ALTER COLUMN category DROP NOT NULL;
ALTER TABLE materials ALTER COLUMN category SET DEFAULT '';
ALTER TABLE materials
  ADD COLUMN IF NOT EXISTS minimum_quantity NUMERIC(15,4);

-- ── Suppliers: add contact detail columns ────────────────────────────────
ALTER TABLE suppliers
  ADD COLUMN IF NOT EXISTS address        TEXT,
  ADD COLUMN IF NOT EXISTS phone          VARCHAR(50),
  ADD COLUMN IF NOT EXISTS email          VARCHAR(150),
  ADD COLUMN IF NOT EXISTS contact_person VARCHAR(150);

-- ── Global Settings (key-value) ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS global_settings (
  key         VARCHAR(100) PRIMARY KEY,
  value       TEXT,
  label       VARCHAR(200) NOT NULL,
  description TEXT,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO global_settings (key, label, description, value) VALUES
  ('company_name',            'Company Name',               'Legal registered name of the company',        ''),
  ('company_address',         'Company Address',            'Registered office address',                   ''),
  ('vat_reg_no',              'VAT Registration No.',       'BIR VAT registration number',                 ''),
  ('tin',                     'TIN',                        'Tax identification number',                   ''),
  ('contact_no',              'Contact No.',                'Main company phone number',                   ''),
  ('bank_name',               'Bank Name',                  'Primary bank for transactions',               ''),
  ('bank_account',            'Bank Account No.',           'Primary bank account number',                 ''),
  ('fiscal_year_start',       'Fiscal Year Start (MM-DD)',  'e.g. 01-01 for January 1',                   '01-01'),
  ('working_days_per_month',  'Working Days / Month',       'Used to compute monthly rate from daily rate','26')
ON CONFLICT (key) DO NOTHING;
