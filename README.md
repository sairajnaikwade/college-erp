# College ERP — SOC CoPilot Test Client

A modern, production-grade mini College ERP application designed to act as the primary test client and telemetry generator for **SOC CoPilot**.

---

## 🌟 Overview

College ERP provides realistic student, faculty, and administrative portals. The system generates real user behaviors, telemetry, and structured security event payloads to test SOC CoPilot features such as:
- User & Entity Behavior Analytics (UEBA)
- Anomaly & brute force detection
- RBAC violation & privilege escalation alerting
- Academic structure and administrative auditing

---

## 🛠️ Tech Stack

### Frontend (`/client`)
- **Framework**: React 19 + TypeScript
- **Bundler**: Vite
- **Styling**: Tailwind CSS v4 (with custom `@theme` tokens)
- **Routing**: React Router DOM v7
- **Icons**: Lucide React
- **HTTP Client**: Axios (with Bearer token interceptor)
- **State**: React Context API (`AuthContext`)

### Backend (`/server`)
- **Runtime**: Node.js + Express
- **Language**: TypeScript
- **Database**: PostgreSQL (pg client pool with raw SQL migrations)
- **Authentication**: JWT, bcryptjs password hashing, active DB session tracking
- **Security**: Helmet, CORS, Express-Rate-Limit, RBAC middleware
- **Logging**: Morgan + Structured Security Event Telemetry Logger

---

## 🚀 Quick Start

### Prerequisites
- Node.js (v18+)
- npm (v9+)
- PostgreSQL (Database URL configured in `server/.env`)

### 1. Installation

Run from the root directory:
```bash
# Install root, client, and server dependencies
npm run install:all
```

### 2. Environment Configuration

Backend configuration:
```bash
cd server
cp .env.example .env
```

Default `.env` configuration:
```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/college_erp
JWT_SECRET=college-erp-development-super-secret-key-2026!#
JWT_EXPIRES_IN=24h
BCRYPT_SALT_ROUNDS=10
LOG_LEVEL=info
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
```

### 3. Database Migrations & Seeding

```bash
# Run migrations (creates auth & academic tables)
npm run migrate:up

# Seed departments, classes, subjects, faculty, and students
npm run db:seed
```

#### Demo Seed Accounts:
| Role | Email / Username | Password | Department | Profile ID |
|---|---|---|---|---|
| **Admin** | `admin@college.edu` | `Admin@123` | System | SYS-ADMIN-01 |
| **Faculty / Staff** | `staff.jenkins@college.edu` | `Staff@123` | CSE | EMP-CSE-001 |
| **Faculty / Staff** | `staff.chen@college.edu` | `Staff@123` | ECE | EMP-ECE-002 |
| **Faculty / Staff** | `staff.patel@college.edu` | `Staff@123` | IT | EMP-IT-003 |
| **Student** | `alex.morgan@college.edu` | `Student@123` | CSE | 2024CS089 |
| **Student** | `jordan.lee@college.edu` | `Student@123` | ECE | 2024EC012 |

### 4. Running Locally

#### Development Mode

Start both client and server concurrently:
```bash
npm run dev
```

Or start individually:
```bash
# Terminal 1 - Backend Server (port 5000)
npm run dev:server

# Terminal 2 - Frontend Client (port 5173)
npm run dev:client
```

#### Running Automated Tests

```bash
# Run Phase 3 Academic & RBAC test suite
npm run test:academic
```

#### Production Build

```bash
# Build both frontend and backend
npm run build
```

---

## 🧭 API Endpoints Summary

### Authentication & Self-Scoping
| Method | Endpoint | Auth Required | Description |
|---|---|---|---|
| `POST` | `/api/auth/login` | No | Authenticates user, creates session, issues JWT |
| `POST` | `/api/auth/logout` | Yes | Revokes active session and logs logout telemetry |
| `GET` | `/api/auth/me` | Yes | Returns current authenticated user and linked academic profile |
| `GET` | `/api/students/me` | Student | Scoped student profile, cohort, and enrolled curriculum |
| `GET` | `/api/staff/me` | Staff | Scoped faculty profile and allocated teaching subjects |

### Academic & Administrative Management (`ADMIN` only)
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/admin/overview` | Institutional summary metrics (students, staff, depts, subjects, classes) |
| `GET`, `POST` | `/api/departments` | List departments and create a new department |
| `GET`, `PUT`, `DELETE` | `/api/departments/:id` | Read, update, and safely delete department |
| `GET`, `POST` | `/api/classes` | List class cohorts and create class |
| `GET`, `PUT`, `DELETE` | `/api/classes/:id` | Read, update, and safely delete class |
| `GET`, `POST` | `/api/subjects` | List curriculum subjects and create subject |
| `GET`, `PUT`, `DELETE` | `/api/subjects/:id` | Read, update, and safely delete subject |
| `GET`, `POST` | `/api/students` | List students (search/filters) and create student (transactional) |
| `GET`, `PUT` | `/api/students/:id` | Read and update student profile |
| `PATCH` | `/api/students/:id/status` | Toggle student account status (`ACTIVE`/`DISABLED`/`LOCKED`) |
| `POST` | `/api/students/:id/class` | Assign student to class cohort (department validated) |
| `GET`, `POST` | `/api/staff` | List staff and create faculty member (transactional) |
| `GET`, `PUT` | `/api/staff/:id` | Read and update faculty profile |
| `PATCH` | `/api/staff/:id/status` | Toggle faculty account status |
| `GET`, `POST`, `DELETE` | `/api/staff/:id/subjects[/:subjectId]` | Manage faculty subject allocations (department validated) |

### System & Monitoring
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | System health check (status, uptime, database check, memory) |

---

## 🔒 Security Events & SOC Telemetry

Structured security events are emitted on every security-sensitive action:
- `LOGIN_SUCCESS` / `LOGIN_FAILURE` (captures failed attempts, wrong passwords, locked accounts)
- `LOGOUT` (session lifecycle tracking)
- `UNAUTHORIZED_ACCESS_ATTEMPT` (RBAC violations, privilege escalation attempts)
- `DEPARTMENT_CREATE` / `DEPARTMENT_UPDATE` / `DEPARTMENT_DELETE`
- `CLASS_CREATE` / `CLASS_UPDATE` / `CLASS_DELETE`
- `SUBJECT_CREATE` / `SUBJECT_UPDATE` / `SUBJECT_DELETE`
- `STUDENT_CREATE` / `STUDENT_UPDATE` / `STUDENT_CLASS_ASSIGN`
- `STAFF_CREATE` / `STAFF_UPDATE` / `STAFF_SUBJECT_ASSIGN`

See [docs/architecture.md](docs/architecture.md) for full architecture details and future phase roadmaps.

---

## 📄 License
ISC / Internal Test Client for SOC CoPilot.
