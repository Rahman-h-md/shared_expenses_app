# Project Scope, Requirements, & Database Schema

This document details the functional and non-functional requirements, user stories, relational database schema, and the CSV anomaly handling log of the **EqualShare** application.

---

## 1. Functional Requirements

### 1.1 User Authentication & Profile
* **User Accounts**: Registration and login using JWT (JSON Web Tokens) with passwords hashed via `bcrypt`.
* **Preferences**: Custom display settings such as base currency preference (INR or USD).

### 1.2 Group Management
* **Group Creation**: Create a group with a Name, Description, and **Base Currency** (USD or INR).
* **Temporal Membership**:
  * Members can be added (recording a `joined_at` timestamp).
  * Members can leave (recording a `left_at` timestamp).
  * A user is only eligible for expense splits if the expense date $T_e$ satisfies $T_e \ge joined\_at$ and ($left\_at$ is null or $T_e \le left\_at$).
  * A user cannot leave a group (cannot set `left_at`) if they have a non-zero net balance.

### 1.3 Expense Management
* **Logging Expenses**: Input fields for description, total amount, currency (USD or INR), payer, expense date, split type, and participant weights.
* **Exchange Rate Locking**: The rate relative to the group base currency must be captured at the moment of entry (`exchange_rate_to_base`) and saved immutably.
* **Split Methods**:
  * **Equal**: Splitting costs evenly among selected active participants.
  * **Percentage**: Custom percentages for each participant (must sum to exactly 100%).
  * **Exact Amount**: Direct currency values (must sum to the total expense amount).
  * **Share-Based**: Ratios allocated to each participant (e.g. 1 share vs. 3 shares).

### 1.4 Balance Calculation & Settlements
* **Explainable Balance Summary**: Real-time calculation of net balances with step-by-step arithmetic explanations (debit ledger breakdown).
* **Debt Settlements**: Record payments from user A to user B. Settlement exchange rates are also locked at creation.

---

## 2. Non-Functional Requirements

* **Financial Precision**: Use the `NUMERIC` data type in PostgreSQL for all monetary attributes.
* **Auditability & Explainability**: Every calculation must be back-traceable via raw ledger entries to provide users with an audit trail.
* **Transaction Safety**: Multi-row operations (like saving an expense and its splits) must be wrapped in ACID transactions.
* **Performance**: Indexing queries on temporal parameters (`joined_at`, `left_at`) and foreign keys (`group_id`, `user_id`) to ensure fast response times.

---

## 3. User Stories

1. **Secure Onboarding**: *As a new user*, I want to create a secure account so that my shared financial records are private.
2. **Standardized Group Views**: *As a group creator*, I want to specify a base currency for the group so that all conversions from foreign currencies (INR/USD) consolidate cleanly.
3. **Temporal Fairness**: *As a member joining a trip group late*, I want to ensure I am only split into expenses created after my join date.
4. **Historical Locking**: *As a member leaving a group*, I want to settle my balance to zero and leave the group without altering historical splits or calculations for remaining members.
5. **Flexible Splits**: *As a group member*, I want to choose between equal, exact, percentage, or share splits because different expenses (like groceries vs. restaurant bills) require different splitting structures.
6. **Detailed Verification**: *As a member verifying my bills*, I want a step-by-step mathematical explanation of why I owe another member $15.50 so I can verify its accuracy.

---

## 4. Database Schema (PostgreSQL)

Below is the database schema definition with constraints and indexing rules to ensure relational integrity:

```sql
-- Database Schema for EqualShare App

-- 1. Users Table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Groups Table
CREATE TABLE groups (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    base_currency VARCHAR(3) DEFAULT 'USD' CHECK (base_currency IN ('USD', 'INR')),
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Group Memberships (Enforces Temporal Tracking)
CREATE TABLE group_memberships (
    id SERIAL PRIMARY KEY,
    group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE NOT NULL,
    left_at TIMESTAMP WITH TIME ZONE, -- NULL means currently active
    status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'LEFT')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_left_after_joined CHECK (left_at IS NULL OR left_at >= joined_at)
);

CREATE INDEX idx_memberships_group_user ON group_memberships(group_id, user_id);

-- 4. Expenses Table
CREATE TABLE expenses (
    id SERIAL PRIMARY KEY,
    group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE,
    paid_by_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    description VARCHAR(255) NOT NULL,
    total_amount NUMERIC(12, 2) NOT NULL CHECK (total_amount > 0),
    currency VARCHAR(3) NOT NULL CHECK (currency IN ('USD', 'INR')),
    exchange_rate_to_base NUMERIC(10, 6) NOT NULL DEFAULT 1.0, -- Multiplier to convert to Group base_currency
    split_type VARCHAR(20) NOT NULL CHECK (split_type IN ('EQUAL', 'PERCENTAGE', 'EXACT', 'SHARE')),
    expense_date TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_expenses_group_date ON expenses(group_id, expense_date);

-- 5. Expense Splits Table
CREATE TABLE expense_splits (
    id SERIAL PRIMARY KEY,
    expense_id INTEGER REFERENCES expenses(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    share_value NUMERIC(12, 4) NOT NULL, -- Holds percentage, exact value, or share number
    calculated_amount_original NUMERIC(12, 2) NOT NULL, -- Owed amount in the expense currency
    calculated_amount_base NUMERIC(12, 2) NOT NULL, -- Owed amount in the group's base currency
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_splits_expense_user ON expense_splits(expense_id, user_id);

-- 6. Settlements Table
CREATE TABLE settlements (
    id SERIAL PRIMARY KEY,
    group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE,
    payer_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    payee_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(3) NOT NULL CHECK (currency IN ('USD', 'INR')),
    exchange_rate_to_base NUMERIC(10, 6) NOT NULL DEFAULT 1.0,
    settlement_date TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(20) DEFAULT 'SETTLED' CHECK (status IN ('PENDING', 'SETTLED', 'CANCELLED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_settlements_group_members ON settlements(group_id, payer_id, payee_id);
```

---

## 5. CSV Import & Anomaly Handling Log

When users upload an expense list via CSV, the system parses the file in dry-run mode and runs validation routines to identify data issues. Below is the anomaly log specifying each data problem detected and its exact handling behavior.

### Anomaly Registry & Handling Logic:

| Anomaly Code | Data Problem Description | Severity | System Handling Action |
| :--- | :--- | :--- | :--- |
| **ERR_TMP_01** | **Payer Temporal Mismatch**: The expense date is earlier than the payer's `joined_at` or later than their `left_at` date. | **CRITICAL** | **Block Entry**: The system flags the row as invalid. The user cannot import this row unless the date is edited or the row is omitted. |
| **ERR_TMP_02** | **Participant Temporal Mismatch**: A split participant was not an active group member at the time of the expense. | **CRITICAL** | **Block Entry**: The system highlights the invalid participant email. The user must remove the participant from the split or skip the row. |
| **ERR_MTH_01** | **Percentage Split Total Mismatch**: The sum of participant split percentages does not equal 100.00%. | **CRITICAL** | **Block Entry**: Fails mathematical integrity. The row is marked in red with the calculated sum shown (e.g. "99.50%"). Must edit or skip. |
| **ERR_MTH_02** | **Exact Split Sum Mismatch**: The sum of participant exact split amounts does not equal the `total_amount` declared in the row. | **CRITICAL** | **Block Entry**: Fails mathematical consistency. Row is blocked. The user must manually adjust the amounts to balance. |
| **ERR_ENT_01** | **Unregistered User Email**: The CSV refers to a payer or participant email that is not in the system database. | **CRITICAL** | **Block Entry**: The row is blocked. A warning directs the user to invite the email to the platform first or map it to an existing user. |
| **ERR_ENT_02** | **Non-Member Participant**: The email is registered in the app, but they are not a member of the target group. | **CRITICAL** | **Block Entry**: Row is blocked. The user is prompted to add the user to the group first before proceeding. |
| **WRN_DUP_01** | **Duplicate Expense Warning**: The database already contains a transaction with the same payer, amount, description, and date. | **WARNING** | **Bypass Allowed**: The system highlights the row in yellow, warning of a potential duplicate. The user can check a "Force Import" checkbox. |
| **WRN_RAT_01** | **Exchange Rate Outlier**: The manually declared exchange rate deviates by more than 10% from standard historical ratios. | **WARNING** | **Bypass Allowed**: Warns of a potential typo in the FX rate. User can check "Verify FX and Import" to authorize the bypass. |
| **ERR_FMT_01** | **Format/Value Anomaly**: Negative total amounts, missing description fields, or corrupt date/number formats. | **CRITICAL** | **Block Entry**: Row parser fails immediately. The row cannot be imported. |
