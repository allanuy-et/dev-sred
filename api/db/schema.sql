-- SR&ED Manager schema. Idempotent: safe to re-run.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS companies (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  business_number TEXT,
  address1        TEXT,
  address2        TEXT,
  city            TEXT,
  province        TEXT,
  postal_code     TEXT,
  phone1          TEXT,
  phone2          TEXT,
  fax             TEXT,
  email           TEXT,
  website         TEXT,
  fiscal_year_end TEXT,
  financial_contact TEXT,
  technical_contact TEXT,
  timezone        TEXT NOT NULL DEFAULT 'America/Toronto',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id          UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  email               TEXT NOT NULL UNIQUE,
  password_hash       TEXT NOT NULL,
  first_name          TEXT NOT NULL,
  last_name           TEXT NOT NULL,
  role                TEXT,
  access_level        TEXT NOT NULL CHECK (access_level IN ('admin','standard','limited')),
  start_date          DATE,
  paid                TEXT NOT NULL DEFAULT 'hourly' CHECK (paid IN ('hourly','salary')),
  hours_per_year      INTEGER NOT NULL DEFAULT 2080,
  regular_rate        NUMERIC(10,2) NOT NULL DEFAULT 0,
  overtime_rate       NUMERIC(10,2) NOT NULL DEFAULT 0,
  holiday_rate        NUMERIC(10,2) NOT NULL DEFAULT 0,
  specified_employee  BOOLEAN NOT NULL DEFAULT FALSE,
  qualifications      TEXT,
  status              TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  language            TEXT NOT NULL DEFAULT 'en',
  timezone            TEXT NOT NULL DEFAULT 'America/Toronto',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS users_company_idx ON users(company_id);

CREATE TABLE IF NOT EXISTS projects (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id          UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name                TEXT NOT NULL,
  description         TEXT,
  type                TEXT NOT NULL CHECK (type IN ('sred','internal')),
  is_global           BOOLEAN NOT NULL DEFAULT TRUE,
  parent_project_id   UUID REFERENCES projects(id) ON DELETE SET NULL,
  status              TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  phase               TEXT NOT NULL DEFAULT 'concept' CHECK (phase IN ('concept','development','complete')),
  start_date          DATE,
  due_date            DATE,
  project_manager_id  UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS projects_company_idx ON projects(company_id);

CREATE TABLE IF NOT EXISTS labour_entries (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date                DATE NOT NULL,
  employee_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id          UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  hours               NUMERIC(5,2) NOT NULL CHECK (hours > 0 AND hours <= 24),
  labour_time         TEXT NOT NULL DEFAULT 'regular' CHECK (labour_time IN ('regular','overtime','double')),
  labour_type         TEXT NOT NULL,
  objective_evidence  TEXT NOT NULL DEFAULT 'none',
  notes               TEXT,
  file_path           TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS labour_employee_date_idx ON labour_entries(employee_id, date DESC);
CREATE INDEX IF NOT EXISTS labour_project_date_idx ON labour_entries(project_id, date DESC);
CREATE INDEX IF NOT EXISTS labour_date_idx ON labour_entries(date DESC);

CREATE TABLE IF NOT EXISTS expenses (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date                DATE NOT NULL,
  employee_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id          UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  cost                NUMERIC(12,2) NOT NULL CHECK (cost >= 0),
  po_number           TEXT,
  type                TEXT NOT NULL,
  objective_evidence  TEXT NOT NULL DEFAULT 'none',
  notes               TEXT,
  file_path           TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS expenses_project_date_idx ON expenses(project_id, date DESC);
CREATE INDEX IF NOT EXISTS expenses_date_idx ON expenses(date DESC);
