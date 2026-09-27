import { Router } from 'express';
import { attendanceController } from '../controllers/attendance.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// ─── Student Endpoints ────────────────────────────────────
router.get(
  '/student',
  authenticate,
  authorize('STUDENT'),
  (req, res, next) => attendanceController.getStudentAttendance(req, res, next)
);

// ─── Staff & Admin Endpoints ──────────────────────────────
router.get(
  '/class/:classId',
  authenticate,
  authorize('STAFF', 'ADMIN'),
  (req, res, next) => attendanceController.getClassAttendance(req, res, next)
);

router.get(
  '/class/:classId/date/:date',
  authenticate,
  authorize('STAFF', 'ADMIN'),
  (req, res, next) => attendanceController.getClassAttendanceByDate(req, res, next)
);

router.post(
  '/',
  authenticate,
  authorize('STAFF', 'ADMIN'),
  (req, res, next) => attendanceController.markAttendance(req, res, next)
);

router.put(
  '/:id',
  authenticate,
  authorize('STAFF', 'ADMIN'),
  (req, res, next) => attendanceController.updateAttendance(req, res, next)
);

// ─── Admin-Only Endpoints ─────────────────────────────────
router.get(
  '/',
  authenticate,
  authorize('ADMIN'),
  (req, res, next) => attendanceController.getAllAttendance(req, res, next)
);

router.delete(
  '/:id',
  authenticate,
  authorize('ADMIN'),
  (req, res, next) => attendanceController.deleteAttendance(req, res, next)
);

// ─── Single Record Lookup ─────────────────────────────────
router.get(
  '/:id',
  authenticate,
  authorize('STUDENT', 'STAFF', 'ADMIN'),
  (req, res, next) => attendanceController.getAttendanceById(req, res, next)
);

export default router;
