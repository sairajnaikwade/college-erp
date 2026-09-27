-- Migration: 009_marks_grades.down.sql
-- Description: Drops student_subject_results, student_marks, and mark_components tables.

DROP TABLE IF EXISTS student_subject_results CASCADE;
DROP TABLE IF EXISTS student_marks CASCADE;
DROP TABLE IF EXISTS mark_components CASCADE;
