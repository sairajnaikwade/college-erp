-- ============================================================================
-- Phase 4.3 Timetable Schema: Normalized Class Schedules & Teaching Slots
-- ============================================================================

CREATE TABLE IF NOT EXISTS timetable (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    academic_year VARCHAR(20) NOT NULL,
    semester INT NOT NULL CHECK (semester >= 1 AND semester <= 12),
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    division VARCHAR(10) NOT NULL DEFAULT 'A',
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    day_of_week VARCHAR(10) NOT NULL CHECK (day_of_week IN ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY')),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    room VARCHAR(50) NOT NULL,
    lecture_type VARCHAR(20) NOT NULL DEFAULT 'THEORY' CHECK (lecture_type IN ('THEORY', 'LAB', 'TUTORIAL', 'SEMINAR')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_timetable_time_range CHECK (start_time < end_time),
    CONSTRAINT uq_timetable_class_slot UNIQUE (class_id, day_of_week, start_time),
    CONSTRAINT uq_timetable_staff_slot UNIQUE (staff_id, day_of_week, start_time)
);

-- Performance and query optimization indexes
CREATE INDEX IF NOT EXISTS idx_timetable_academic_year ON timetable(academic_year);
CREATE INDEX IF NOT EXISTS idx_timetable_semester ON timetable(semester);
CREATE INDEX IF NOT EXISTS idx_timetable_class_id ON timetable(class_id);
CREATE INDEX IF NOT EXISTS idx_timetable_staff_id ON timetable(staff_id);
CREATE INDEX IF NOT EXISTS idx_timetable_subject_id ON timetable(subject_id);
CREATE INDEX IF NOT EXISTS idx_timetable_day_of_week ON timetable(day_of_week);
CREATE INDEX IF NOT EXISTS idx_timetable_department_id ON timetable(department_id);
