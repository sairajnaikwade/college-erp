-- Migration: 009_marks_grades.up.sql
-- Description: Creates mark_components, student_marks, and student_subject_results tables.

-- 1. Mark Components Table
CREATE TABLE IF NOT EXISTS mark_components (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  code VARCHAR(50) NOT NULL,
  description TEXT NULL,
  department_id UUID NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  academic_year VARCHAR(20) NOT NULL,
  semester INTEGER NOT NULL,
  max_marks NUMERIC(8,2) NOT NULL CHECK (max_marks > 0),
  weightage NUMERIC(5,2) NULL,
  component_type VARCHAR(30) NOT NULL CHECK (
    component_type IN ('ASSIGNMENT', 'QUIZ', 'INTERNAL', 'PRACTICAL', 'PROJECT', 'OTHER')
  ),
  created_by UUID NOT NULL REFERENCES staff(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_component_logical_identity UNIQUE (subject_id, class_id, academic_year, semester, code)
);

-- 2. Student Marks Table
CREATE TABLE IF NOT EXISTS student_marks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  component_id UUID NOT NULL REFERENCES mark_components(id) ON DELETE CASCADE,
  marks_obtained NUMERIC(8,2) NOT NULL CHECK (marks_obtained >= 0),
  status VARCHAR(20) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PUBLISHED')),
  remarks TEXT NULL,
  entered_by UUID NOT NULL REFERENCES staff(id) ON DELETE RESTRICT,
  published_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_student_component_mark UNIQUE (student_id, component_id)
);

-- 3. Student Subject Results Table
CREATE TABLE IF NOT EXISTS student_subject_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  academic_year VARCHAR(20) NOT NULL,
  semester INTEGER NOT NULL,
  total_marks NUMERIC(8,2) NOT NULL DEFAULT 0 CHECK (total_marks >= 0),
  max_marks NUMERIC(8,2) NOT NULL DEFAULT 0 CHECK (max_marks >= 0),
  percentage NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (percentage >= 0),
  grade VARCHAR(5) NULL,
  grade_point NUMERIC(4,2) NULL,
  result_status VARCHAR(20) NOT NULL DEFAULT 'DRAFT' CHECK (result_status IN ('DRAFT', 'PUBLISHED')),
  published_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_student_subject_result UNIQUE (student_id, subject_id, academic_year, semester)
);

-- Indexes for performance & query filtering
CREATE INDEX IF NOT EXISTS idx_mark_components_subject_class ON mark_components(subject_id, class_id);
CREATE INDEX IF NOT EXISTS idx_mark_components_academic_sem ON mark_components(academic_year, semester);
CREATE INDEX IF NOT EXISTS idx_mark_components_type ON mark_components(component_type);
CREATE INDEX IF NOT EXISTS idx_mark_components_created_by ON mark_components(created_by);

CREATE INDEX IF NOT EXISTS idx_student_marks_student ON student_marks(student_id);
CREATE INDEX IF NOT EXISTS idx_student_marks_component ON student_marks(component_id);
CREATE INDEX IF NOT EXISTS idx_student_marks_status ON student_marks(status);

CREATE INDEX IF NOT EXISTS idx_subject_results_student ON student_subject_results(student_id);
CREATE INDEX IF NOT EXISTS idx_subject_results_subject ON student_subject_results(subject_id);
CREATE INDEX IF NOT EXISTS idx_subject_results_class ON student_subject_results(class_id);
CREATE INDEX IF NOT EXISTS idx_subject_results_status ON student_subject_results(result_status);
CREATE INDEX IF NOT EXISTS idx_subject_results_academic ON student_subject_results(academic_year, semester);
