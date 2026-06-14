# AI Usage Disclosure

This project was developed with the assistance of **Antigravity**, a senior developer agentic AI coding assistant designed by Google DeepMind.

---

## 1. AI Tools Used

To build, verify, and document this application, the agent utilized the following developer tools:
* **`list_dir`**: Analyzed the project layout to verify file positions, assets, and folders.
* **`view_file`**: Read individual frontend and backend source files to check syntax, imports, and configuration logic.
* **`grep_search`**: Scanned the codebase for specific text matches, functions, and name references (e.g. searching for occurrences of "EqualShare" or unused imports).
* **`write_to_file`**: Created new project files, including staging files, config templates, and documentation.
* **`replace_file_content` & `multi_replace_file_content`**: Performed precise line-by-line modifications to routing configs, styles, and UI pages.
* **`run_command`**: Proposed terminal processes for local testing, frontend compilation builds (`npm run build`), file cleanups, and git operations (`git add`, `git push`).
* **`schedule`**: Triggered one-shot background alerts to monitor running build actions without blocking execution loop.

---

## 2. Key Prompts Provided

The following are the core user prompts that directed the design, requirements, file layout, and visual constraints of the application:

### Initial Architectural Prompt
```text
Act as a Senior Product Manager and Software Architect.

I need to build a Shared Expenses App 

Requirements:
- User authentication
- Create and manage groups
- Members can join and leave groups over time
- Create and manage expenses
- Support Equal Split, Percentage Split, Exact Amount Split, and Share-Based Split
- Multi-currency support (INR and USD)
- Group balance summary
- Individual balance breakdown
- Debt settlement functionality
- Import expenses from CSV
- Detect and report anomalies during import
- Use PostgreSQL as relational database

Generate:
1. Functional Requirements
2. Non-Functional Requirements
3. User Stories
4. Complete System Architecture
5. Database Schema
6. ER Diagram description
7. API Design
8. Folder Structure
9. Recommended Tech Stack(react, node, express)

The system should prioritize transparency and explainability of balances.
```

### Folder Hierarchy Prompt
```text
spreetail-shared-expenses-app/

├── frontend/
├── backend/
├── docs/
│   ├── SCOPE.md
│   ├── DECISIONS.md
│   └── AI_USAGE.md
│
├── README.md
└── .gitignore

structure should be like this
```

### Document Specifications Prompt
```text
SCOPE.md — your anomaly log (every data problem you found in the CSV and how you handled 
it) and your database schema

DECISIONS.md — a decision log: each significant decision, the options considered, and why you 
chose what you chose
```

### Main README Instructions Prompt
```text
Based on the following implementation plan for a Shared Expenses App, generate a professional README.md suitable for a GitHub repository and internship assignment submission. Include these sections: 1. Project Title 2. Project Overview 3. Problem Statement 4. Features 5. Tech Stack 6. System Architecture 7. Folder Structure 8. Database Overview 9. API Overview 10. CSV Import & Anomaly Handling 11. Setup Instructions 12. Environment Variables 13. Running the Project 14. Deployment 15. Example Screens/Workflows (text description is fine) 16. Assumptions and Limitations 17. AI Usage Disclosure 18. Future Improvements The tone should be professional and concise. Use Markdown formatting properly.
```

### Homepage Design Slogan
```text
Keep your shared expenses transparent.
```

---

## 3. Validation & Correction Cases (Incorrect AI Output)

During system generation, the AI assistant made several structural errors. These were caught via testing, log audits, and configuration analysis, and corrected as follows:

### Case 1: Misplaced Git Directory Tracker (`.gitkeep`)
* **Incorrect AI Output**: The AI created a `.gitkeep` file at the root level of the `backend/` directory (`backend/.gitkeep`) to register the folder in Git.
* **How It Was Caught**: During directory tree audits, we observed that `backend/` already had standard source files (`package.json`, `app.js`), meaning Git would track it automatically. However, the temporary directory where CSV files are saved before processing (`backend/uploads/`) was empty and lacked a tracker. Because Git ignores empty folders, the `uploads/` directory would not be pushed to GitHub, causing runtime upload failures when deployed to hosting platforms like Render.
* **What Was Changed**: Moved the `.gitkeep` file to `backend/uploads/.gitkeep` and removed the redundant root-level backend tracker.

### Case 2: Out-of-Spec DB Initialization Command in Documentation
* **Incorrect AI Output**: The AI generated database setup steps inside the root `README.md` recommending that developers initialize their PostgreSQL tables using Prisma ORM migrations (`npx prisma db push`).
* **How It Was Caught**: We inspected the dependencies in `backend/package.json` and noted that Prisma was not present in the node modules. Instead, the backend used a native PostgreSQL query pool wrapper (`pg` node-postgres). Inspecting `backend/src/scripts/` revealed a dedicated initialization script (`initDb.js`) containing raw SQL queries for table setups.
* **What Was Changed**: Rewrote the database instructions in `README.md` to point users to create a PostgreSQL database and run the correct native SQL initializer: `node src/scripts/initDb.js`.

### Case 3: Missing Root Route `/` causing Render Deployment Errors
* **Incorrect AI Output**: The AI designed the Express routing structure to only mount endpoints under the `/api/v1` route prefix, routing all other requests to a catch-all 404 Route Not Found error handler.
* **How It Was Caught**: After deployment, the Render server logs outputted continuous 404 stack trace errors (`Error: Route Not Found - /`). We realized that Render's health checkers and monitoring systems verify application status by pinging the root domain (`GET /`).
* **What Was Changed**: Inserted a dedicated, lightweight root handler in `backend/src/app.js` (`app.get('/', ...)`) returning a `200 OK` JSON indicator to gracefully respond to Render health checkers without logging 404 exceptions.
