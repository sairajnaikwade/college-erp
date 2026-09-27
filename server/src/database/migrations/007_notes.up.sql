-- ============================================================================
-- Phase 4.6 Notes & Study Material Management Schema
-- ============================================================================

-- 1. Notes Table
CREATE TABLE IF NOT EXISTS notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(200) NOT NULL,
    description TEXT NULL,
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    uploaded_by UUID NOT NULL REFERENCES staff(id) ON DELETE RESTRICT,
    academic_year VARCHAR(20) NOT NULL,
    semester INT NOT NULL CHECK (semester >= 1 AND semester <= 12),
    category VARCHAR(30) NOT NULL CHECK (category IN ('LECTURE_NOTES', 'STUDY_MATERIAL', 'PRACTICAL', 'REFERENCE', 'QUESTION_BANK', 'SYLLABUS', 'OTHER')),
    status VARCHAR(20) NOT NULL DEFAULT 'PUBLISHED' CHECK (status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED')),
    file_name VARCHAR(255) NULL,
    file_url TEXT NULL,
    file_type VARCHAR(100) NULL,
    file_size BIGINT NULL,
    published_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance & query optimization
CREATE INDEX IF NOT EXISTS idx_notes_class_id ON notes(class_id);
CREATE INDEX IF NOT EXISTS idx_notes_subject_id ON notes(subject_id);
CREATE INDEX IF NOT EXISTS idx_notes_department_id ON notes(department_id);
CREATE INDEX IF NOT EXISTS idx_notes_uploaded_by ON notes(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_notes_category ON notes(category);
CREATE INDEX IF NOT EXISTS idx_notes_status ON notes(status);
CREATE INDEX IF NOT EXISTS idx_notes_academic_year ON notes(academic_year);
CREATE INDEX IF NOT EXISTS idx_notes_semester ON notes(semester);
CREATE INDEX IF NOT EXISTS idx_notes_created_at ON notes(created_at);
