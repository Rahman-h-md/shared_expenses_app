# CSV Import Module Design Specification

This document details the architecture, workflow, and anomaly detection strategy for the CSV Expense Import module. The primary directive of this module is **absolute transparency**: no data is silently modified, dropped, or inferred. Every anomaly is explicitly surfaced to the user for resolution.

---

## 1. Import Workflow (Two-Phase Process)

To guarantee data integrity, the import process is split into a **Dry Run (Preview)** phase and a **Commit** phase.

### Phase 1: Upload & Dry Run
1. **Upload**: User uploads a CSV file via `POST /api/groups/:groupId/imports`.
2. **Initialize**: An `import_jobs` record is created with status `PROCESSING`.
3. **Stream Parsing**: The file is streamed (using a library like `csv-parser` or `PapaParse`) to handle large files efficiently without memory bloat.
4. **Pipeline Execution**: Each row passes through the Validation Pipeline.
5. **Log Anomalies**: Any row failing a check is logged in `import_anomalies`. Valid rows are tracked via JSONB payload in the anomalies table with a `VALID` tag or held in a temporary cache.
6. **Report Generation**: The job status updates to `REVIEW_REQUIRED`, and an Import Report is returned to the client.

### Phase 2: Review & Commit
1. **User Review**: The client displays the Import Report. The user maps unknown emails, corrects dates, or explicitly checks "Ignore/Bypass" on warnings (like duplicates).
2. **Download CSV Report**: The client provides a local download function to export the dry-run validation results as a new CSV report containing row status, error messages, and warnings for spreadsheet-based auditing.
3. **Commit**: User submits the resolved rows via `POST /api/groups/:groupId/imports/:jobId/commit`.
4. **Database Transaction**: A single PostgreSQL `BEGIN ... COMMIT` transaction inserts all valid `expenses` and `expense_participants`.
5. **Finalize**: The `import_jobs` status updates to `COMPLETED`.

---

## 2. Validation Pipeline

Each row passes through a strict sequential pipeline:

1. **Structural Parser**: Validates CSV schema (headers match expected columns). Drops empty lines.
2. **Type Coercion & Format Checker**:
   * Ensures amounts are valid floating-point strings.
   * Parses ISO-8601 or standard date strings. Fails immediately on unparseable dates.
3. **Business Logic & Relational Checker**:
   * Queries DB for Payer and Participant emails.
   * Checks temporal boundaries (`expense_date` against `joined_at` and `left_at`).
4. **Anomaly Scoring**: Assigns an Anomaly Code and Severity (`CRITICAL` vs `WARNING`).

---

## 3. Anomaly Detection Strategy

Every anomaly triggers a specific code and severity. `CRITICAL` anomalies block the row entirely. `WARNING` anomalies allow the user to explicitly force the import.

| Anomaly Type | Detection Logic | Code | Severity |
| :--- | :--- | :--- | :--- |
| **Missing Values** | Null or empty values in required fields (Amount, Date, Payer, Description). | `ERR_MISSING_VAL` | **CRITICAL** |
| **Negative Amounts** | `amount <= 0`. Expenses cannot be negative. | `ERR_NEG_AMT` | **CRITICAL** |
| **Invalid Dates** | Date string cannot be parsed into a valid timestamp, or date is in the future. | `ERR_INV_DATE` | **CRITICAL** |
| **Inconsistent Users** | Email does not exist in DB, or fuzzy matching on name fails to yield a high-confidence match. | `ERR_USER_NOT_FOUND` | **CRITICAL** |
| **Membership Conflicts** | `expense_date` is outside the `[joined_at, left_at]` range for the Payer or any split participant. | `ERR_MEMBERSHIP_RANGE`| **CRITICAL** |
| **Multi-Currency Constraints**| `currency` is not the group's base currency, AND no `exchange_rate` is provided in the CSV. | `ERR_MISSING_FX` | **CRITICAL** |
| **Settlements logged as Expenses** | Description contains keywords (e.g., "settle", "paid back", "venmo"). | `WRN_SETTLEMENT` | **WARNING** |
| **Duplicate Expenses** | Exact match on `(group_id, expense_date, total_amount, paid_by_id, description)` within a 24-hour window. | `WRN_DUPLICATE` | **WARNING** |

---

## 4. Import Report Structure

The API responds to Phase 1 with a highly structured JSON report designed for UI consumption:

```json
{
  "jobId": 105,
  "status": "REVIEW_REQUIRED",
  "summary": {
    "totalRows": 50,
    "validRows": 42,
    "criticalErrors": 5,
    "warnings": 3
  },
  "anomalies": [
    {
      "rowNumber": 12,
      "rawData": { "Date": "InvalidDate", "Amount": "50", "Desc": "Uber", "PaidBy": "bob@example.com" },
      "anomalyCode": "ERR_INV_DATE",
      "message": "The date 'InvalidDate' could not be parsed.",
      "severity": "CRITICAL"
    },
    {
      "rowNumber": 15,
      "rawData": { "Date": "2026-06-10", "Amount": "100", "Desc": "Dinner Settle", "PaidBy": "alice@example.com" },
      "anomalyCode": "WRN_SETTLEMENT",
      "message": "Description implies a settlement. Are you sure this is an expense?",
      "severity": "WARNING"
    }
  ]
}
```

---

## 5. Error Handling & Edge Cases

* **Transaction Rollbacks**: During the Commit phase, if inserting row 45 out of 50 fails due to a sudden DB constraint violation, the entire batch rolls back. Partial commits are not allowed to prevent dangling ledgers.
* **Large File OOM (Out of Memory)**: The validation pipeline uses Node.js streams. Extremely large files will not crash the server.
* **No Silent Corrections**: If an exchange rate is missing for a foreign currency transaction, the system will *not* fetch a live rate silently. It will throw `ERR_MISSING_FX` and prompt the user to input the rate manually in the UI.

---

## 6. Database Storage Strategy

To avoid polluting the main `expenses` ledger with unverified data, the import module utilizes a staging pattern using the tables we previously defined:

1. **`import_jobs` Table**: Tracks the metadata of the import attempt (`status`, `total_rows`, `failed_rows`).
2. **`import_anomalies` Table**: Acts as the staging area. 
   * It contains a `JSONB` column named `raw_data`.
   * When the CSV is parsed, the JSON representation of the row is saved here.
   * This allows the frontend to fetch the exact row data, render it in a table, let the user edit the cell, and submit a `PATCH` to update the `raw_data` JSON object.
3. **Commit Flush**: When the user clicks "Commit", the backend reads the finalized `JSONB` payloads from `import_anomalies` where `status = 'RESOLVED'` or rows that had no anomalies, maps them to the relational `expenses` schema, executes the mass `INSERT`, and then marks the job as `COMPLETED`.
