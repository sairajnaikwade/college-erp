-- Migration: 008_quizzes.down.sql
-- Description: Drops quiz_answers, quiz_attempts, quiz_options, quiz_questions, and quizzes tables.

DROP TABLE IF EXISTS quiz_answers CASCADE;
DROP TABLE IF EXISTS quiz_attempts CASCADE;
DROP TABLE IF EXISTS quiz_options CASCADE;
DROP TABLE IF EXISTS quiz_questions CASCADE;
DROP TABLE IF EXISTS quizzes CASCADE;
