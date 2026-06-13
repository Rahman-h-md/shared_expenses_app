# Technical Decision Log

This document serves as the project's Architectural Decision Record (ADR) log. It details every significant architectural and design decision, the options considered, and the rationale behind the selected approach.

---

## Decision 1: Real-time Dynamic Balance Calculations vs. Pre-aggregated Totals

* **Context**: The application requires group balances and individual debt breakdowns. We need to decide how to store and compute these values.
* **Options Considered**:
  * **Option A: Pre-aggregated Totals (Database Columns)**
    * *Pros*: Faster read query times (simple `SELECT balance FROM group_memberships`).
    * *Cons*: Prone to data corruption and synchronization drift if backend tasks crash mid-update. Lacks auditability; it is impossible to easily explain *how* a single balance number was arrived at without reconstructing historical logs anyway.
  * **Option B: Real-time Dynamic Calculations (On-the-fly Ledger Aggregation)**
    * *Pros*: Guaranteed correctness. Zero risk of cache drift or sync errors. Enables the **Explainability Engine** by allowing the backend to trace every transaction contributing to a balance and return it to the user.
    * *Cons*: Performance overhead when groups grow very large.
* **Decision**: **Option B (Real-time Dynamic Calculations)**. 
* **Rationale**: The core requirement is balance transparency and explainability. Option B allows us to generate a mathematically sound "ledger proof" for every balance calculation. Read speed concerns are mitigated by indexing foreign keys and timestamps (`group_id`, `expense_date`).

---

## Decision 2: Multi-Currency Exchange Rates — Live Dynamic Fetching vs. Transaction-time Locking

* **Context**: The system must support USD and INR. Exchange rates change constantly. We need to determine how exchange rates are applied to expenses and settlements.
* **Options Considered**:
  * **Option A: Live Currency Rates (Fetch on Demand)**
    * *Pros*: Always utilizes the absolute latest market rates.
    * *Cons*: Destroys historical audit trails. An expense settled six months ago could suddenly show an imbalance today because the USD/INR exchange rate changed. This violates financial auditability and explainability.
  * **Option B: Transaction-time Rate Locking (Stored with Transaction)**
    * *Pros*: Immutable ledger. The rate used to convert the transaction is saved directly in the `expenses` or `settlements` row. Balances are frozen in time and remain consistent forever.
    * *Cons*: Requires saving a rate column (`exchange_rate_to_base`) for every record.
* **Decision**: **Option B (Transaction-time Rate Locking)**.
* **Rationale**: Transparency and explainability require immutability. By locking the exchange rate on creation (e.g., storing `exchange_rate_to_base = 83.50` on the expense record), we guarantee that calculations are consistent, repeatable, and explainable regardless of future currency movements.

---

## Decision 3: Dynamic Group Membership — Simple Groups vs. Temporal Tracking

* **Context**: Members join and leave groups over time. We need to prevent new members from being charged for historical expenses incurred before their arrival, or after they leave.
* **Options Considered**:
  * **Option A: Standard Membership (No Timestamps)**
    * *Pros*: Simple schema structure.
    * *Cons*: Any expense logged in the group is split among all current members. New members are unfairly charged for past bills, and members who leave cannot be removed without deleting their historical contributions.
  * **Option B: Temporal Membership (Tracking `joined_at` and `left_at`)**
    * *Pros*: Allows precise expense targeting. An expense is only split among members whose active group window `[joined_at, left_at]` overlaps with the `expense_date`.
    * *Cons*: Increases query complexity when joining tables for balance reports.
* **Decision**: **Option B (Temporal Membership)**.
* **Rationale**: This is a direct functional requirement for handling members joining/leaving over time fairly. A user cannot leave a group unless their balance is verified as zero, at which point their membership status updates to `LEFT` and their `left_at` timestamp is set to freeze their participation.

---

## Decision 4: Database Access Strategy — Raw PostgreSQL client (pg) vs. Prisma ORM

* **Context**: We need to define how the Node.js Express server interfaces with the PostgreSQL database.
* **Options Considered**:
  * **Option A: Raw SQL using `pg` driver**
    * *Pros*: Maximum performance and complete control over database queries.
    * *Cons*: No type safety out of the box, manual writing of migration scripts, and repetitive boilerplate code for CRUD routes.
  * **Option B: Prisma ORM**
    * *Pros*: Auto-generated type safety, clear declarative schema model, automated migration tracking, and rapid API development. Supports raw SQL query escapes (`prisma.$queryRaw`) for complex ledger math.
    * *Cons*: Small performance overhead compared to raw driver queries.
* **Decision**: **Option B (Prisma ORM)**.
* **Rationale**: The database schema must be cleanly maintained and documented. Prisma provides excellent schema modeling and handles regular queries safely, while allowing us to fallback to raw SQL queries for optimized ledger computations.

---

## Decision 5: CSV Import Flow — Instant Commit vs. Two-Step Review Interface

* **Context**: Importing expenses from CSV files can introduce errors or duplicate data. We must design the user flow for imports.
* **Options Considered**:
  * **Option A: Direct Import & Save**
    * *Pros*: Fewer user clicks; immediate action.
    * *Cons*: Silent failures. If formatting errors or duplicate values exist, they are written to the database directly, making cleanup difficult for the user.
  * **Option B: Two-Step Review Interface (Preview and Confirm)**
    * *Pros*: High transparency. Users upload the CSV, the server executes dry-run validation rules, and returns a detailed report flagging warnings and critical errors. The user can review, resolve anomalies, and then click "Confirm" to commit.
    * *Cons*: Requires building front-end preview components and back-end dry-run routes.
* **Decision**: **Option B (Two-Step Review Interface)**.
* **Rationale**: Prioritizing error detection and explainability during import aligns with the core product focus on auditability and data cleanliness.
