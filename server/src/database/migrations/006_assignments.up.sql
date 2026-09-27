-- ============================================================================
-- Phase 4.5 Assignments & Submission Management Schema
-- ============================================================================

-- 1. Assignments Table
CREATE TABLE IF NOT EXISTS assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES staff(id) ON DELETE RESTRICT,
    academic_year VARCHAR(20) NOT NULL,
    semester INT NOT NULL CHECK (semester >= 1 AND semester <= 12),
    due_date TIMESTAMPTZ NOT NULL,
    max_marks NUMERIC(6,2) NOT NULL DEFAULT 100.00 CHECK (max_marks > 0),
    status VARCHAR(20) NOT NULL DEFAULT 'PUBLISHED' CHECK (status IN ('DRAFT', 'PUBLISHED', 'CLOSED')),
    attachment_name VARCHAR(255) NULL,
    attachment_url TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Assignment Submissions Table
CREATE TABLE IF NOT EXISTS assignment_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    submitted_at TIMESTAMPTZ NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'NOT_SUBMITTED' CHECK (status IN ('NOT_SUBMITTED', 'SUBMITTED', 'LATE', 'GRADED')),
    submission_text TEXT NULL,
    attachment_name VARCHAR(255) NULL,
    attachment_url TEXT NULL,
    marks NUMERIC(6,2) NULL CHECK (marks IS NULL OR marks >= 0),
    feedback TEXT NULL,
    graded_by UUID NULL REFERENCES staff(id) ON DELETE SET NULL,
    graded_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_assignment_submission UNIQUE (assignment_id, student_id)
);

-- Indexes for performance & query optimization
CREATE INDEX IF NOT EXISTS idx_assignments_class_id ON assignments(class_id);
CREATE INDEX IF NOT EXISTS idx_assignments_subject_id ON assignments(subject_id);
CREATE INDEX IF NOT EXISTS idx_assignments_department_id ON assignments(department_id);
CREATE INDEX IF NOT EXISTS idx_assignments_created_by ON assignments(created_by);
CREATE INDEX IF NOT EXISTS idx_assignments_due_date ON assignments(due_date);
CREATE INDEX IF NOT EXISTS idx_assignments_status ON assignments(status);
CREATE INDEX IF NOT EXISTS idx_assignments_academic_year ON assignments(academic_year);
CREATE INDEX IF NOT EXISTS idx_assignments_semester ON assignments(semester);

CREATE INDEX IF NOT EXISTS idx_submissions_assignment_id ON assignment_submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_submissions_student_id ON assignment_submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON assignment_submissions(status);
CREATE INDEX IF NOT EXISTS idx_submissions_submitted_at ON assignment_submissions(submitted_at);
