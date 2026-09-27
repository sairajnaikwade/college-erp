import { Router } from 'express';
import { reportsController } from '../controllers/reports.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// ─── Student Routes ─────────────────────────────────────────
router.get(
  '/student/summary',
  authenticate,
  authorize('STUDENT'),
  (req, res, next) => reportsController.getStudentSummary(req, res, next)
);

router.get(
  '/student/attendance',
  authenticate,
  authorize('STUDENT'),
  (req, res, next) => reportsController.getStudentAttendance(req, res, next)
);

router.get(
  '/student/assignments',
  authenticate,
  authorize('STUDENT'),
  (req, res, next) => reportsController.getStudentAssignments(req, res, next)
);

router.get(
  '/student/quizzes',
  authenticate,
  authorize('STUDENT'),
  (req, res, next) => reportsController.getStudentQuizzes(req, res, next)
);

router.get(
  '/student/academic',
  authenticate,
  authorize('STUDENT'),
  (req, res, next) => reportsController.getStudentAcademic(req, res, next)
);

router.get(
  '/student/:studentId',
  authenticate,
  authorize('STAFF', 'ADMIN'),
  (req, res, next) => reportsController.getStudentAcademic(req, res, next)
);

// ─── Staff & Admin Routes ───────────────────────────────────
router.get(
  '/class/:classId/attendance',
  authenticate,
  authorize('STAFF', 'ADMIN'),
  (req, res, next) => reportsController.getClassAttendance(req, res, next)
);

router.get(
  '/class/:classId/performance',
  authenticate,
  authorize('STAFF', 'ADMIN'),
  (req, res, next) => reportsController.getClassPerformance(req, res, next)
);

router.get(
  '/subject/:subjectId/performance',
  authenticate,
  authorize('STAFF', 'ADMIN'),
  (req, res, next) => reportsController.getSubjectPerformance(req, res, next)
);

router.get(
  '/assignments/analytics',
  authenticate,
  authorize('STAFF', 'ADMIN'),
  (req, res, next) => reportsController.getAssignmentAnalytics(req, res, next)
);

router.get(
  '/assignments/:assignmentId/analytics',
  authenticate,
  authorize('STAFF', 'ADMIN'),
  (req, res, next) => reportsController.getAssignmentAnalytics(req, res, next)
);

router.get(
  '/quizzes/analytics',
  authenticate,
  authorize('STAFF', 'ADMIN'),
  (req, res, next) => reportsController.getQuizAnalytics(req, res, next)
);

router.get(
  '/quizzes/:quizId/analytics',
  authenticate,
  authorize('STAFF', 'ADMIN'),
  (req, res, next) => reportsController.getQuizAnalytics(req, res, next)
);

router.get(
  '/staff/activity',
  authenticate,
  authorize('STAFF', 'ADMIN'),
  (req, res, next) => reportsController.getStaffActivity(req, res, next)
);

router.get(
  '/staff/summary',
  authenticate,
  authorize('STAFF', 'ADMIN'),
  (req, res, next) => reportsController.getStaffActivity(req, res, next)
);

router.get(
  '/staff/:staffId/activity',
  authenticate,
  authorize('ADMIN'),
  (req, res, next) => reportsController.getStaffActivity(req, res, next)
);

// ─── Admin Institutional Routes ─────────────────────────────
router.get(
  '/admin/department',
  authenticate,
  authorize('ADMIN'),
  (req, res, next) => reportsController.getDepartmentReport(req, res, next)
);

router.get(
  '/admin/summary',
  authenticate,
  authorize('ADMIN'),
  (req, res, next) => reportsController.getAdminSummary(req, res, next)
);

export default router;
