# College ERP — System Architecture & SOC CoPilot Integration

## 1. Executive Summary & Purpose

**College ERP** is a modern, modular educational institution management system purpose-built to act as the primary live telemetry and behavioural test client for **SOC CoPilot**.

Instead of generating synthetic, isolated, or uncoordinated security logs, College ERP simulates real-world day-to-day academic and administrative workflows:
- Student interactions (enrollments, assignment submissions, quiz attempts, attendance views, profile checks)
- Faculty interactions (grading, notes publishing, attendance marking, subject assignments, roster management)
- Administrative actions (department CRUD, class cohort management, curriculum/subject management, student/staff lifecycle)

Every user action, edge case, and simulated attack vector produces structured security event payloads captured and transmitted to the SOC CoPilot telemetry pipeline.

---

## 2. System Architecture Overview

```
                      ┌────────────────────────────────────────┐
                      │              Web Client                │
                      │   (React 19 + TypeScript + Tailwind)   │
                      └───────────────────┬────────────────────┘
                                          │
                                   HTTP / REST JSON
                               (JWT in Authorization)
                                          │
                                          ▼
                      ┌────────────────────────────────────────┐
                      │             Backend API                │
                      │        (Express + TypeScript)          │
                      │                                        │
                      │  ┌──────────────────────────────────┐  │
                      │  │       Middleware Pipeline        │  │
                      │  │  - Helmet / CORS / Rate Limiter  │  │
                      │  │  - authenticate (JWT + Session)  │  │
                      │  │  - authorize(RBAC Roles)         │  │
                      │  │  - Error Handling & Logging      │  │
                      │  └──────────────────┬───────────────┘  │
                      │                     │                  │
                      │  ┌──────────────────▼───────────────┐  │
                      │  │      Controllers & Services      │  │
                      │  │  - Health & System Monitoring    │  │
                      │  │  - Authentication & Sessions     │  │
                      │  │  - Telemetry Service (SOC logs)  │  │
                      │  │  - Academic Structure (Phase 3)  │  │
                      │  │    * Departments, Classes        │  │
                      │  │    * Subjects, Staff, Students   │  │
                      │  └──────────────────┬───────────────┘  │
                      └─────────────────────┼──────────────────┘
                                            │
                      ┌─────────────────────┴──────────────────┐
                      │                                        │
                      ▼                                        ▼
        ┌───────────────────────────┐            ┌───────────────────────────┐
        │        PostgreSQL         │            │        SOC CoPilot        │
        │      Database Store       │            │    Telemetry Collector    │
        │  (Raw SQL / node-postgres)│            │ (Async Event Pipeline)    │
        └───────────────────────────┘            └───────────────────────────┘
```

---

## 3. Database Schema & Entity Relationships

```
              ┌─────────────────────────────┐
              │         departments         │
              ├─────────────────────────────┤
              │ id (UUID, PK)               │
              │ name (VARCHAR, UNIQUE)      │
              │ code (VARCHAR, UNIQUE)      │
              │ description (TEXT)          │
              │ created_at, updated_at      │
              └──────┬───────┬───────┬──────┘
                     │ 1     │ 1     │ 1
                     │       │       │
                     │ N     │ N     │ N
       ┌─────────────▼─┐   ┌─▼───────┴───┐   ┌─────────────▼─┐
       │     classes   │   │   subjects  │   │     users     │
       ├───────────────┤   ├─────────────┤   ├───────────────┤
       │ id (UUID, PK) │   │ id (UUID,PK)│   │ id (UUID, PK) │
       │ department_id │   │department_id│   │ username (UQ) │
       │ name          │   │ name        │   │ email (UQ)    │
       │ year, semester│   │ code (UQ)   │   │ password_hash │
       │ division      │   │ semester    │   │ role          │
       │ academic_year │   │ credits     │   │ account_status│
       │ created_at    │   │ created_at  │   │ department_id │
       └───────┬───────┘   └───┬─────────┘   └───────┬───────┘
               │ 1             │ 1                   │ 1
               │               │                     │
               │ N             │ N                 1 │
       ┌───────▼───────────┐ ┌─▼────────────────┐ ┌──▼───────────┐ ┌─────────────┐
       │  student_classes  │ │  staff_subjects  │ │   students    │ │    staff    │
       ├───────────────────┤ ├──────────────────┤ ├───────────────┤ ├─────────────┤
       │ id (UUID, PK)     │ │ id (UUID, PK)    │ │ id (UUID, PK) │ │ id (UUID,PK)│
       │ student_id (FK)   │ │ staff_id (FK)    │ │ user_id (UQ)  │ │ user_id(UQ) │
       │ class_id (FK)     │ │ subject_id (FK)  │ │ student_roll  │ │ employee_id │
       │ academic_year     │ │ academic_year    │ │ enrollment_no │ │ designation │
       │ is_current (BOOL) │ │ assigned_at      │ │ year, sem, div│ │qualification│
       │ enrolled_at       │ └──────────────────┘ └───────┬───────┘ └──────┬──────┘
       └───────────────────┘                              │ 1              │ 1
                                                          │ N              │ N
                                              (enrolled via classes)   (assigned)
```

---

## 4. Academic Constraints & Invariants

1. **Transaction Guarantees**: Student and Staff creation atomicity across `users`, `students`, and `staff` tables is strictly enforced via PostgreSQL `BEGIN ... COMMIT / ROLLBACK` transactions.
2. **Student Department Matching**: When assigning a student to a class cohort, the student's home department must match the class's department.
3. **Staff Department Matching**: When allocating teaching subjects to a faculty member, the faculty's home department must match the subject's department.
4. **Dependency-Aware Deletion**: Entities with active academic dependencies (e.g., classes with students, subjects with assigned staff) reject destructive deletion with `400 Bad Request` and require deactivation or status suspension instead.
5. **Identity Scoping**: `/api/students/me` and `/api/staff/me` resolve strictly to the authenticated user's scoped database ID, eliminating horizontal identifier tampering.
6. **Strict RBAC**: All administrative management endpoints (`/api/departments`, `/api/classes`, `/api/subjects`, `/api/students`, `/api/staff`, `/api/admin/overview`) require active `ADMIN` authorization.

---

## 5. REST API Specification

### Authentication & Self-Scoping
- `POST /api/auth/login` — Authenticate user, issue JWT, register session.
- `POST /api/auth/logout` — Revoke session token.
- `GET /api/auth/me` — Retrieve active authenticated user session.
- `GET /api/students/me` — Scoped student profile, current cohort, and enrolled curriculum.
- `GET /api/staff/me` — Scoped faculty profile and allocated teaching subjects.

### Administrative Management (`ADMIN` only)
- `GET /api/admin/overview` — High-level institution summary metrics.
- `GET, POST /api/departments` — List and create academic departments.
- `GET, PUT, DELETE /api/departments/:id` — Read, update, and safely delete departments.
- `GET, POST /api/classes` — List and create academic classes/cohorts.
- `GET, PUT, DELETE /api/classes/:id` — Read, update, and safely delete classes.
- `GET, POST /api/subjects` — List and create curriculum subjects.
- `GET, PUT, DELETE /api/subjects/:id` — Read, update, and safely delete subjects.
- `GET, POST /api/students` — List (with search/filters) and create students (transactional).
- `GET, PUT /api/students/:id` — Read and update student profiles.
- `PATCH /api/students/:id/status` — Toggle student account status (ACTIVE/DISABLED/LOCKED).
- `POST /api/students/:id/class` — Assign student to class cohort (department validated).
- `GET, POST /api/staff` — List and create faculty (transactional).
- `GET, PUT /api/staff/:id` — Read and update faculty profiles.
- `PATCH /api/staff/:id/status` — Toggle faculty account status.
- `GET, POST, DELETE /api/staff/:id/subjects[/:subjectId]` — Allocate and remove faculty subjects (department validated).

---

## 6. Security Telemetry Specification (SOC CoPilot Test Payloads)

Every event emitted conforms to the `SecurityEvent` standard defined in `server/src/types/security-events.ts`:

```typescript
export interface SecurityEvent {
  event_id: string;          // UUID v4
  user_id: string;
  role: UserRole;
  event_type: SecurityEventType;
  resource_type?: ResourceType;
  resource_id?: string;
  endpoint: string;
  method: string;
  result: 'SUCCESS' | 'FAILURE' | 'DENIED';
  ip_address?: string;
  user_agent?: string;
  timestamp: string;        // ISO 8601
  metadata?: Record<string, unknown>;
}
```

### Event Taxonomy
| Event Type | Resource Type | Description | SOC Detection Scenario |
|---|---|---|---|
| `LOGIN_SUCCESS` | `AUTH` | Valid credentials submitted | Baseline user authentication |
| `LOGIN_FAILURE` | `AUTH` | Invalid password or user | Brute-force & credential stuffing |
| `LOGOUT` | `AUTH` | User session ended | Session lifecycle tracking |
| `UNAUTHORIZED_ACCESS_ATTEMPT` | Any | Role violation / cross-tenant attempt | Privilege escalation / horizontal traversal |
| `DEPARTMENT_CREATE` | `DEPARTMENT` | New academic department created | Administrative change monitoring |
| `DEPARTMENT_UPDATE` | `DEPARTMENT` | Department modified | Institution metadata drift |
| `DEPARTMENT_DELETE` | `DEPARTMENT` | Department removed | Destructive admin action detection |
| `CLASS_CREATE` | `CLASS` | New class cohort added | Academic structure modifications |
| `SUBJECT_CREATE` | `SUBJECT` | New subject curriculum added | Curriculum change tracking |
| `STUDENT_CREATE` | `STUDENT` | New student account created | Identity provisioning audit |
| `STUDENT_UPDATE` | `STUDENT` | Student details updated | Identity modification audit |
| `STUDENT_CLASS_ASSIGN` | `STUDENT` | Student assigned to class | Cohort change anomaly detection |
| `STAFF_CREATE` | `STAFF` | New faculty account created | Faculty onboarding tracking |
| `STAFF_SUBJECT_ASSIGN` | `STAFF` | Faculty assigned to teach subject | Teaching allocation changes |

---

## 7. Implementation Roadmap

- **Phase 1: Project Foundation** — Scaffolding, build pipelines, health endpoints, layout design system, routing. *(Completed)*
- **Phase 2: Database Schema & Authentication** — PostgreSQL schema, raw SQL migrations, bcrypt hashing, JWT auth, RBAC middleware, SOC telemetry foundation. *(Completed)*
- **Phase 3: Academic Structure & Student/Staff Management** — Departments, classes, subjects, faculty allocations, student cohorts, transactional creation, identity scoping, admin management portals. *(Completed)*
- **Phase 4: Academic Workflows** — Attendance marking, Assignments submission & grading, Notes sharing, Quizzes, and Marks. *(Next Phase)*
- **Phase 5: SOC CoPilot Integration** — Automated event dispatchers, webhook pipelines, attack scenario simulators.
