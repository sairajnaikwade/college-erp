# College ERP

A robust, full-stack Academic Enterprise Resource Planning (ERP) platform architected for higher-education institutions. Built with modern TypeScript across both client and server, backed by PostgreSQL authoritative storage, and protected by strict multi-tenant Role-Based Access Control (RBAC).

![Project Status](https://img.shields.io/badge/Status-Complete%20%26%20Frozen-success?style=for-the-badge&logo=checkmarx&logoColor=white)
![React](https://img.shields.io/badge/React%2019-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express.js-404D59?style=for-the-badge)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS_v4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![License](https://img.shields.io/badge/License-ISC-blue?style=for-the-badge)

---

## 📌 Project Overview

**College ERP** is a unified academic management system engineered to centralize, streamline, and secure core collegiate operations. In traditional educational institutions, academic workflows—such as student registration, lecture scheduling, attendance tracking, coursework evaluation, examination grading, and official report generation—are often fragmented across disparate spreadsheets, paper records, and disconnected software tools. This fragmentation introduces data duplication, human calculation errors, security vulnerabilities, and communication bottlenecks between administrative bodies, academic staff, and students.

This platform resolves these challenges by introducing a centralized, relational data architecture governed by explicit business invariants and transactional consistency. Every interaction within the system is strictly scoped to one of three distinct stakeholder roles:
1. **Students** interact with a self-service academic portal to monitor attendance percentages in real-time, submit coursework, participate in timed multi-choice quizzes, access verified course notes/manuals, inspect detailed grade breakdowns, view class timetables, and download verifiable academic scorecards.
2. **Faculty / Academic Staff** manage their assigned classes and subjects, conduct daily attendance sessions, publish and grade assignments with personalized feedback, distribute curriculum materials, construct timed assessments with server-side answer protection, and record decimal component marks with automatic weighted GPA calculation.
3. **Institutional Administrators** oversee global academic structures—including departments, class cohorts, subjects, student admissions, faculty appointments, department subject allocations, institution-wide attendance audits, and cumulative grade rosters.

Beyond standard administrative workflows, College ERP incorporates an enterprise-grade telemetry pipeline that emits structured security events on every critical operation. This audit log provides end-to-end traceability, anomaly detection baselines, and proactive protection against unauthorized access or privilege escalation attempts.

---

## 🏛️ System Architecture

The application follows a clean layered architecture with complete separation of concerns between client presentation, API routing, business services, database repositories, and telemetry dispatchers.

```mermaid
flowchart TD
    U[Users<br/>Student / Faculty / Admin]

    FE[React + TypeScript Frontend<br/>Vite + Tailwind CSS v4]

    API[Axios API Layer<br/>Bearer Token Interceptor]

    BE[Node.js + Express Backend<br/>TypeScript]

    AUTH[Authentication Pipeline<br/>JWT + Active DB Sessions + bcryptjs]

    RBAC[RBAC Authorization Middleware<br/>STUDENT / STAFF / ADMIN]

    CTRL[Controllers<br/>Request Validation & HTTP Mapping]

    SERVICE[Domain Services<br/>Business Logic & Invariants]

    REPO[Repositories<br/>Raw SQL & Parameterized pg Pool]

    DB[(PostgreSQL Database<br/>Authoritative Storage)]

    AUDIT[Security & Audit Telemetry<br/>Structured Event Engine]

    MIG[Database Migrations<br/>001_initial to 009_marks_grades]

    U --> FE
    FE --> API
    API --> BE
    BE --> AUTH
    AUTH --> RBAC
    RBAC --> CTRL
    CTRL --> SERVICE
    SERVICE --> REPO
    REPO --> DB
    BE --> AUDIT
    MIG --> DB
```

### Architectural Guarantees
- **Repository Pattern & Zero ORM Overhead**: All database queries utilize direct, parameterized SQL statements via `pg.Pool` (`$1, $2, ...`), preventing SQL injection attacks while maintaining optimal execution plans.
- **Transactional Atomicity**: Multi-table operations (such as student admissions, staff appointments, batch attendance marking, and grade publishing) are wrapped in explicit PostgreSQL `BEGIN ... COMMIT / ROLLBACK` transactions.
- **Strict Invariant Enforcement**: Department consistency rules are verified across the database layer (e.g., faculty can only be assigned to subjects within their department, and students can only be enrolled in classes belonging to their home department).
- **IDOR Protection & Identity Scoping**: Self-service endpoints (`/api/students/me`, `/api/staff/me`) resolve user identity directly from the cryptographically verified JWT session, rejecting arbitrary path parameter traversal.

---

## ⚡ Key Capabilities & Role Matrix

| Module | Student | Faculty / Staff | Institutional Admin |
|---|:---:|:---:|:---:|
| **Authentication & Profile** | View & update scoped profile | View & update faculty profile | Manage all system accounts |
| **Academic Structure** | View enrolled class & subjects | View allocated subjects & cohorts | Manage Departments, Classes, Subjects |
| **Attendance Management** | View percentage & 75% threshold status | Mark daily lecture sessions (Batch) | View institution-wide attendance audits |
| **Assignments & Submissions** | Submit files & view feedback | Create, update, grade, and review | Global assignment catalog & audits |
| **Notes & Study Material** | Browse & download published PDFs | Upload (PDF), publish, draft, archive | Full repository oversight |
| **Quizzes & Online Tests** | Take timed tests & view attempts | Create quizzes, add questions, analytics | View institution quiz metrics |
| **Marks & Evaluations** | View component breakdown & GPA | Enter decimal marks & compute letter grades | Audit marks & publish rosters |
| **Semester Results** | Inspect official semester result cards | Generate & publish subject results | Global results directory & GPA rosters |
| **Timetable & Schedules** | View weekly class schedule matrix | View teaching periods & room slots | Manage class schedules & conflict checks |
| **Notices & Bulletins** | View department & campus notices | Post staff/student notices & bulletins | Publish campus-wide pinned notices |
| **Academic Reports & Analytics** | Download/Print Student Scorecard | Class attendance & performance rosters | Department KPIs & faculty summaries |

---

## 💻 Technology Stack

### Frontend Client (`/client`)
- **Core Framework**: React `19.2.8` + TypeScript `6.0.2`
- **Build Tooling**: Vite `8.3.0`
- **Styling Engine**: Tailwind CSS `v4.3.3` (with modern `@theme` token definitions)
- **Client Routing**: React Router DOM `7.18.4` (Role-based `ProtectedRoute` guards)
- **Icons**: Lucide React `1.47.0`
- **HTTP Client**: Axios `1.20.0` (with automated JWT Bearer injection & 401 interceptors)
- **State Management**: React Context API (`AuthContext`)

### Backend Server (`/server`)
- **Runtime Environment**: Node.js (LTS) + Express `4.21.2`
- **Language**: TypeScript `5.7.3` (Executed with `tsx`)
- **Authoritative Database**: PostgreSQL `14+` / `16+` (`pg` driver pool `8.13.1`)
- **Authentication**: JSON Web Tokens (`jsonwebtoken 9.0.3`) + `bcryptjs 3.0.3` (10 salt rounds)
- **File Upload Engine**: Multer `2.4.0` (with MIME-type validation and isolated storage)
- **Security Middleware**: Helmet `8.0.0`, CORS `2.8.5`, Express Rate Limit `7.5.0`
- **Audit & Logging**: Morgan `1.10.0` + Structured Security Event Telemetry Engine

---

## 🗄️ Database Migrations

The database schema is managed via 9 atomic, bi-directional (up/down) raw SQL migrations executed through the custom runner (`server/src/database/migrator.ts`):

```
server/src/database/migrations/
├── 001_initial_schema.up.sql        # Core users, sessions, departments, security logs
├── 002_academic_structure.up.sql    # Classes, subjects, students, staff, allocations
├── 003_notices.up.sql               # Institutional notices, target roles, pinning
├── 004_timetable.up.sql             # Timetable slots, day/period mapping, room slots
├── 005_attendance.up.sql            # Daily attendance sessions and student records
├── 006_assignments.up.sql           # Assignments, submissions, grading, feedback
├── 007_notes.up.sql                 # Study materials, categories, PDF file metadata
├── 008_quizzes.up.sql               # Quizzes, questions, options, student attempts
└── 009_marks_grades.up.sql          # Multi-component evaluation, decimal marks, results
```

---

## 📁 Repository Structure

```text
college-erp/
├── client/                          # React + TypeScript Frontend
│   ├── public/                      # Static assets and icons
│   ├── src/
│   │   ├── assets/                  # Institutional branding & imagery
│   │   ├── components/              # Shared UI components & modals
│   │   ├── hooks/                   # Custom hooks (useAuth, etc.)
│   │   ├── layouts/                 # DashboardLayout & navigational shells
│   │   ├── pages/                   # Feature views (Student, Staff, Admin)
│   │   │   └── admin/               # Department, Class, Subject, User management
│   │   ├── routes/                  # AppRouter & ProtectedRoute definitions
│   │   ├── services/                # Axios API services for all ERP modules
│   │   ├── types/                   # TypeScript domain models & interfaces
│   │   └── utils/                   # Formatting, date & calculation utilities
│   ├── index.html                   # HTML entry point
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
├── server/                          # Node.js + Express API Backend
│   ├── src/
│   │   ├── config/                  # DB pool configuration & environment validation
│   │   ├── controllers/             # REST controllers for all 18 routes
│   │   ├── database/
│   │   │   ├── migrations/          # 001-009 Up/Down SQL migration files
│   │   │   ├── seeds/               # Idempotent seed data (departments, users, records)
│   │   │   └── migrator.ts          # CLI migration engine
│   │   ├── middleware/              # Auth, RBAC, Rate Limiter, Error Handler, Multer
│   │   ├── repositories/            # Parameterized SQL data access layer
│   │   ├── routes/                  # Express route modular definitions
│   │   ├── services/                # Business logic, GPA engines, validations
│   │   ├── tests/                   # Automated test suites (398 assertions)
│   │   ├── types/                   # Backend contracts & security event taxonomy
│   │   ├── utils/                   # ApiResponse, ApiError, Token & Password helpers
│   │   ├── app.ts                   # Express app setup & middleware stack
│   │   └── server.ts                # HTTP listener & lifecycle management
│   ├── .env.example                 # Environment configuration template
│   ├── package.json
│   └── tsconfig.json
├── docs/
│   └── architecture.md              # Deep-dive architecture & telemetry spec
├── ERP_FINAL_AUDIT_REPORT.md        # Formal system freeze audit report
├── package.json                     # Root orchestrator scripts
└── README.md
```

---

## 🚀 Quick Start Guide

### Prerequisites
- **Node.js**: `v18.0.0` or higher
- **npm**: `v9.0.0` or higher
- **PostgreSQL**: `v14.0` or higher running locally or accessible via network URI

---

### 1. Installation
Clone the repository and install dependencies across the root, client, and server:

```bash
git clone https://github.com/sairajnaikwade/college-erp.git
cd college-erp
npm run install:all
```

---

### 2. Environment Configuration
Create a `.env` file in the `server` directory from the provided template:

```bash
cd server
cp .env.example .env
```

Configure your PostgreSQL credentials in `server/.env`:

```env
# Server Configuration
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173

# Database Connection (PostgreSQL)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/college_erp

# Authentication & Security
JWT_SECRET=your-secure-256-bit-secret-key-here
JWT_EXPIRES_IN=24h
BCRYPT_SALT_ROUNDS=10

# Logging & Rate Limiting
LOG_LEVEL=info
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
```

---

### 3. Database Initialization & Seeding
Apply database migrations and populate realistic academic records:

```bash
# Apply all 9 schema migrations
npm run migrate:up

# Seed academic structure, faculty, students, attendance, quizzes & marks
npm run db:seed
```

---

### 4. Running the Application

#### Concurrent Development Mode (Recommended)
From the root directory, launch both backend and frontend servers simultaneously:

```bash
npm run dev
```

- **Frontend Client**: [http://localhost:5173](http://localhost:5173)
- **Backend API**: [http://localhost:5000/api](http://localhost:5000/api)
- **Health Check**: [http://localhost:5000/api/health](http://localhost:5000/api/health)

#### Individual Service Startup
```bash
# Terminal 1 — Backend API
npm run dev:server

# Terminal 2 — Frontend Client
npm run dev:client
```

---

## 🔑 Demo Seed Accounts

The database seed provides ready-to-use accounts across all three roles:

| Role | Username / Email | Password | Department | Profile Identifier |
|---|---|---|---|---|
| **Institutional Admin** | `admin@college.edu` | `Admin@123` | System Administration | `SYS-ADMIN-01` |
| **Faculty / Staff** | `staff.jenkins@college.edu` | `Staff@123` | Computer Science (CSE) | `EMP-CSE-001` |
| **Faculty / Staff** | `staff.chen@college.edu` | `Staff@123` | Electronics (ECE) | `EMP-ECE-002` |
| **Faculty / Staff** | `staff.patel@college.edu` | `Staff@123` | Information Tech (IT) | `EMP-IT-003` |
| **Student** | `alex.morgan@college.edu` | `Student@123` | Computer Science (CSE) | `2024CS089` |
| **Student** | `jordan.lee@college.edu` | `Student@123` | Electronics (ECE) | `2024EC012` |
| **Student** | `priya.sharma@college.edu` | `Student@123` | Computer Science (CSE) | `2024CS090` |

---

## 🧪 Automated Testing & Verification

The backend includes comprehensive automated test suites covering all academic domain services, relational constraints, security validations, and RBAC policies.

Run the complete test suite:

```bash
cd server
npm test
```

### Verification Results Summary

```text
======================================================================
                  COLLEGE ERP AUTOMATED TEST SUITE
======================================================================
  Suite File           Module Description                  Passed
----------------------------------------------------------------------
  academic.test.ts     Phase 4.1 Academic & Identity         32 / 32
  notice.test.ts       Phase 4.2 Notices & Bulletins         16 / 16
  timetable.test.ts    Phase 4.3 Timetable Scheduling        27 / 27
  attendance.test.ts   Phase 4.4 Attendance Management       41 / 41
  assignment.test.ts   Phase 4.5 Assignments & Submissions   37 / 37
  note.test.ts         Phase 4.6 Notes & Study Materials     43 / 43
  quiz.test.ts         Phase 4.7 Quizzes & Online Tests      68 / 68
  marks.test.ts        Phase 4.8 Marks & Grades Engine       45 / 45
  reports.test.ts      Phase 4.9 Reports & Analytics         89 / 89
----------------------------------------------------------------------
  TOTAL ASSERTIONS PASSED                                  398 / 398
  FAILURES                                                         0
======================================================================
```

### Production Build Validation
```bash
# Verify Backend TypeScript Compilation
cd server && npm run build

# Verify Frontend TypeScript Compilation & Vite Bundle
cd client && npm run build
```

---

## 🌐 API Reference Summary

### Authentication & Identity
- `POST /api/auth/login` — Authenticate user, issue JWT, register active session.
- `POST /api/auth/logout` — Revoke active token session and record logout audit.
- `GET /api/auth/me` — Retrieve active user identity and linked profile details.
- `GET /api/students/me` — Scoped student profile, current cohort, and enrolled curriculum.
- `GET /api/staff/me` — Scoped faculty profile and allocated teaching subjects.

### Academic & Institutional Administration (`ADMIN`)
- `GET /api/admin/overview` — Institution-level KPI metrics and counts.
- `GET, POST /api/departments` — List and create academic departments.
- `GET, PUT, DELETE /api/departments/:id` — Department management.
- `GET, POST /api/classes` — Manage class cohorts and academic years.
- `GET, POST /api/subjects` — Manage curriculum subjects and credit allocations.
- `GET, POST /api/students` — Register and filter student admissions.
- `POST /api/students/:id/class` — Assign student to class cohort (department checked).
- `GET, POST /api/staff` — Faculty appointment directory.
- `POST, DELETE /api/staff/:id/subjects` — Allocate teaching subjects to faculty.

### Academic Workflows (`STAFF` & `STUDENT`)
- `GET, POST /api/attendance` — Retrieve and record daily lecture attendance.
- `GET /api/attendance/student/:studentId` — Student attendance percentage & threshold audit.
- `GET, POST /api/assignments` — Create course assignments and list submissions.
- `POST /api/assignments/:id/submit` — Student assignment file submission.
- `POST /api/assignments/submissions/:id/grade` — Grade submission with feedback.
- `GET, POST /api/notes` — Course study materials and PDF file upload (`multer`).
- `GET, POST /api/quizzes` — Create timed multi-choice quizzes with answer protection.
- `POST /api/quizzes/:id/attempt` — Student timed quiz submission & auto-scoring.
- `GET, POST /api/marks` — Multi-component decimal marks entry and GPA computation.
- `GET, POST /api/results` — Official semester result card generation and publishing.
- `GET, POST /api/timetable` — Weekly lecture schedules and room allocations.
- `GET, POST /api/notices` — Multi-target institutional bulletins and alerts.
- `GET /api/reports/*` — Student scorecards, class rosters, grade distributions, and KPI summaries.

---

## 🔒 Security & Telemetry Architecture

Every authenticated request and administrative mutation generates structured audit telemetry conforming to the `SecurityEvent` schema:

```typescript
export interface SecurityEvent {
  event_id: string;          // UUID v4
  user_id: string;
  role: 'STUDENT' | 'STAFF' | 'ADMIN';
  event_type: SecurityEventType;
  resource_type?: ResourceType;
  resource_id?: string;
  endpoint: string;
  method: string;
  result: 'SUCCESS' | 'FAILURE' | 'DENIED';
  ip_address?: string;
  user_agent?: string;
  timestamp: string;        // ISO 8601 UTC
  metadata?: Record<string, unknown>;
}
```

- **RBAC Violation Trapping**: Attempts by unauthorized roles to access administrative or cross-department routes trigger `UNAUTHORIZED_ACCESS_ATTEMPT` security alerts.
- **Answer Anti-Leak**: Quiz answer keys are filtered out of student payloads at the database repository layer and only evaluated server-side upon attempt submission.
- **Sensitive Data Scrubbing**: Password hashes, JWT secrets, and personal identification tokens are excluded from all logging and API output models.

---

## 📄 License

This project is licensed under the [ISC License](package.json).
