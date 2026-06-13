# EqualShare: Transparent Shared Expenses Application

A full-stack, multi-currency shared expenses application designed to prioritize transparency, balance auditability, dynamic group memberships, and robust CSV validation.

---

## 1. Project Title
**EqualShare** — Transparent Shared Expenses & Multi-Currency Ledger

---

## 2. Project Overview
**EqualShare** is a modern, responsive web application that allows users to split bills, manage group balances, and settle debts in multiple currencies (USD and INR). Unlike standard expense-sharing utilities, EqualShare is built from the ground up for **absolute transparency and explainability**. Every single balance, debt, and settlement transaction is auditable through structured calculations and frozen historical parameters. It also supports CSV imports with detailed pre-commit anomaly detection and tracks group membership intervals to prevent incorrect back-dated expense assignments.

---

## 3. Problem Statement
Most peer-to-peer expense splitters operate as "black boxes," making it difficult for users to track down exactly *why* they owe a specific amount. Common pain points include:
* **Floating Exchange Rates**: Live exchange rate updates dynamically alter past transactions, leading to phantom balances.
* **Temporal Membership Changes**: If a member joins a group midway, platforms often split past expenses with them, or fail to handle historical data if a member leaves.
* **Bad Import Data**: Importing expenses via CSV usually results in silent failures, duplicate entries, or mathematical mismatches without warning the user.

EqualShare addresses these issues by preserving temporal membership ranges, freezing exchange rates at transaction time, implementing a mathematical balance explanation engine, and running a dry-run anomaly detector on CSV uploads.

---

## 4. Tech Stack
* **Frontend**: React.js (Vite), Vanilla CSS (Modular design system, sleek dark mode variables).
* **Backend**: Node.js, Express.js.
* **Database**: PostgreSQL (relational database for financial integrity and transactional consistency).
* **DB Client**: Prisma ORM / pg node-postgres.
* **CSV Parsing**: PapaParse (or standard streaming csv-parser for heavy payloads).

---

## 5. Folder Structure
The repository is organized as follows:

```text
shared_expenses_app/
├── backend/                # Express API Back-End (Node.js)
├── docs/                   # Detailed Architecture and Requirements Docs
│   ├── AI_USAGE.md         # AI assistance disclosure
│   ├── DECISIONS.md        # Technical Decision Log (ADRs)
│   └── SCOPE.md            # Functional/Non-functional specs & User Stories
├── frontend/               # React SPA Front-End (Vite)
├── .gitignore              # Git ignore rules
└── README.md               # High-level overview & setup guide
```

---

## 6. Detailed Specifications
For more detailed information regarding requirements, database structures, and design choices, please consult:
* [SCOPE.md](file:///c:/Users/mohdh/Desktop/shared_expenses_app/shared_expenses_app/docs/SCOPE.md): Contains Functional & Non-Functional Requirements, User Stories, Database Schema, and the CSV anomaly handling log.
* [DECISIONS.md](file:///c:/Users/mohdh/Desktop/shared_expenses_app/shared_expenses_app/docs/DECISIONS.md): Contains the Technical Decision Log (ADRs) explaining architecture, engine patterns, and trade-off rationale.
* [AI_USAGE.md](file:///c:/Users/mohdh/Desktop/shared_expenses_app/shared_expenses_app/docs/AI_USAGE.md): Contains AI tools usage disclosure.

---

## 7. Setup Instructions

### Prerequisites
* **Node.js** (v18.x or higher)
* **npm** (v9.x or higher)
* **PostgreSQL** (v14.x or higher) running locally or hosted in the cloud.

### Installation Steps

1. **Clone the Repository**
   ```bash
   git clone https://github.com/your-username/shared-expenses-app.git
   cd shared-expenses-app
   ```

2. **Backend Setup**
   ```bash
   cd backend
   npm install
   ```
   Create a `.env` file in the `backend` directory (see [Section 8](#8-environment-variables) for configuration details).

3. **Database Setup**
   Run the SQL schema definition commands found in [SCOPE.md](file:///c:/Users/mohdh/Desktop/shared_expenses_app/shared_expenses_app/docs/SCOPE.md) in your PostgreSQL shell or run Prisma migrations:
   ```bash
   npx prisma db push
   ```

4. **Frontend Setup**
   ```bash
   cd ../frontend
   npm install
   ```
   Create a `.env` file in the `frontend` directory (see [Section 8](#8-environment-variables) for details).

---

## 8. Environment Variables

### Server Configuration (`backend/.env`)
```env
PORT=5000
DATABASE_URL="postgresql://username:password@localhost:5432/equalshare_db?schema=public"
JWT_SECRET="your_jwt_signing_key_here"
NODE_ENV=development
```

### Client Configuration (`frontend/.env`)
```env
VITE_API_URL="http://localhost:5000/api"
```

---

## 9. Running the Project

To run both services concurrently in development mode:

### 1. Start the Server (Backend)
```bash
cd backend
npm run dev
```
The backend server will run on `http://localhost:5000`.

### 2. Start the Client (Frontend)
```bash
cd frontend
npm run dev
```
The frontend will start on `http://localhost:5173`. Open this URL in your browser to view the application.

---

## 10. Deployment

* **Backend**: Can be deployed to platforms like **Render**, **Railway**, or **Heroku**. Ensure the environment variables for `DATABASE_URL` and `JWT_SECRET` are set in the cloud provider's console.
* **Frontend**: Can be built and hosted on **Vercel**, **Netlify**, or **GitHub Pages**. Run `npm run build` in the `frontend` folder and deploy the generated static output (contained in the `dist/` directory).
* **Database**: Set up a managed database instance using **Supabase**, **Neon.tech**, or **Aiven**.
