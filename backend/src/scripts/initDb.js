const db = require('../config/db');
require('dotenv').config();

const schemaSql = `
-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Groups Table
CREATE TABLE IF NOT EXISTS groups (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    base_currency VARCHAR(10) DEFAULT 'USD' CHECK (base_currency IN ('USD', 'EUR', 'GBP', 'INR', 'AUD', 'CAD', 'JPY', 'SGD')),
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Memberships Table
CREATE TABLE IF NOT EXISTS memberships (
    id SERIAL PRIMARY KEY,
    group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE NOT NULL,
    left_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'LEFT')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_left_after_joined CHECK (left_at IS NULL OR left_at >= joined_at),
    CONSTRAINT unique_group_user UNIQUE (group_id, user_id, left_at)
);

CREATE INDEX IF NOT EXISTS idx_memberships_group_user ON memberships(group_id, user_id);

-- 4. Expenses Table
CREATE TABLE IF NOT EXISTS expenses (
    id SERIAL PRIMARY KEY,
    group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE,
    paid_by_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    description VARCHAR(255) NOT NULL,
    total_amount NUMERIC(12, 2) NOT NULL CHECK (total_amount > 0),
    currency VARCHAR(10) NOT NULL CHECK (currency IN ('USD', 'EUR', 'GBP', 'INR', 'AUD', 'CAD', 'JPY', 'SGD')),
    exchange_rate_to_base NUMERIC(10, 6) NOT NULL DEFAULT 1.0,
    split_type VARCHAR(20) NOT NULL CHECK (split_type IN ('EQUAL', 'PERCENTAGE', 'EXACT', 'SHARE')),
    expense_date TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_expenses_group_date ON expenses(group_id, expense_date);

-- 5. ExpenseParticipants Table
CREATE TABLE IF NOT EXISTS expense_participants (
    id SERIAL PRIMARY KEY,
    expense_id INTEGER REFERENCES expenses(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    share_value NUMERIC(12, 4) NOT NULL,
    calculated_amount_original NUMERIC(12, 2) NOT NULL,
    calculated_amount_base NUMERIC(12, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_participants_expense_user ON expense_participants(expense_id, user_id);

-- 6. Settlements Table
CREATE TABLE IF NOT EXISTS settlements (
    id SERIAL PRIMARY KEY,
    group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE,
    payer_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    payee_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(10) NOT NULL CHECK (currency IN ('USD', 'EUR', 'GBP', 'INR', 'AUD', 'CAD', 'JPY', 'SGD')),
    exchange_rate_to_base NUMERIC(10, 6) NOT NULL DEFAULT 1.0,
    settlement_date TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(20) DEFAULT 'SETTLED' CHECK (status IN ('PENDING', 'SETTLED', 'CANCELLED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_settlements_group_members ON settlements(group_id, payer_id, payee_id);

-- 7. ImportJobs Table
CREATE TABLE IF NOT EXISTS import_jobs (
    id SERIAL PRIMARY KEY,
    group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE,
    uploaded_by_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    file_name VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED')),
    total_rows INTEGER DEFAULT 0,
    successful_rows INTEGER DEFAULT 0,
    failed_rows INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_import_jobs_group ON import_jobs(group_id);

-- 8. ImportAnomalies Table
CREATE TABLE IF NOT EXISTS import_anomalies (
    id SERIAL PRIMARY KEY,
    job_id INTEGER REFERENCES import_jobs(id) ON DELETE CASCADE,
    row_number INTEGER NOT NULL,
    raw_data JSONB NOT NULL,
    anomaly_code VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('CRITICAL', 'WARNING')),
    status VARCHAR(20) DEFAULT 'UNRESOLVED' CHECK (status IN ('UNRESOLVED', 'RESOLVED', 'SKIPPED')),
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_import_anomalies_job ON import_anomalies(job_id);
`;

async function initDb() {
  console.log('Starting Database Initialization...');
  try {
    await db.query(schemaSql);
    console.log('Database Tables initialized successfully!');
  } catch (err) {
    console.error('Error during Database Initialization:', err);
    process.exit(1);
  } finally {
    await db.pool.end();
    console.log('Database Pool ended.');
  }
}

initDb();
