import { Router } from 'express';
import healthRoutes from './health.routes';
import authRoutes from './auth.routes';
import departmentRoutes from './department.routes';
import classRoutes from './class.routes';
import subjectRoutes from './subject.routes';
import studentRoutes from './student.routes';
import staffRoutes from './staff.routes';
import overviewRoutes from './overview.routes';
import noticeRoutes from './notice.routes';
import timetableRoutes from './timetable.routes';
import attendanceRoutes from './attendance.routes';
import assignmentRoutes from './assignment.routes';
import noteRoutes from './note.routes';
import quizRoutes from './quiz.routes';
import marksRoutes from './marks.routes';
import resultsRoutes from './results.routes';
import reportsRoutes from './reports.routes';

const router = Router();

// ─── Health & Authentication ──────────────────────────────
router.use('/', healthRoutes);
router.use('/auth', authRoutes);

// ─── Academic Structure & Management ──────────────────────
router.use('/departments', departmentRoutes);
router.use('/classes', classRoutes);
router.use('/subjects', subjectRoutes);
router.use('/students', studentRoutes);
router.use('/staff', staffRoutes);
router.use('/admin', overviewRoutes);
router.use('/notices', noticeRoutes);
router.use('/timetable', timetableRoutes);
router.use('/attendance', attendanceRoutes);
router.use('/assignments', assignmentRoutes);
router.use('/notes', noteRoutes);
router.use('/quizzes', quizRoutes);
router.use('/marks', marksRoutes);
router.use('/results', resultsRoutes);
router.use('/reports', reportsRoutes);

export default router;

