import { Router } from 'express';
import { assignmentController } from '../controllers/assignment.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// ─── Student Routes ───────────────────────────────────────
router.get(
  '/student',
  authenticate,
  authorize('STUDENT'),
  (req, res, next) => assignmentController.getStudentAssignments(req, res, next)
);

router.get(
  '/:id/submission',
  authenticate,
  authorize('STUDENT'),
  (req, res, next) => assignmentController.getMySubmission(req, res, next)
);

router.post(
  '/:id/submit',
  authenticate,
  authorize('STUDENT'),
  (req, res, next) => assignmentController.submitAssignment(req, res, next)
);

// ─── Staff & Admin Routes ─────────────────────────────────
router.get(
  '/staff',
  authenticate,
  authorize('STAFF', 'ADMIN'),
  (req, res, next) => assignmentController.getStaffAssignments(req, res, next)
);

router.get(
  '/class/:classId',
  authenticate,
  authorize('STAFF', 'ADMIN'),
  (req, res, next) => assignmentController.getClassAssignments(req, res, next)
);

router.get(
  '/:id/submissions',
  authenticate,
  authorize('STAFF', 'ADMIN'),
  (req, res, next) => assignmentController.getAssignmentSubmissions(req, res, next)
);

router.get(
  '/submissions/:submissionId',
  authenticate,
  (req, res, next) => assignmentController.getSubmissionById(req, res, next)
);

router.put(
  '/submissions/:submissionId/grade',
  authenticate,
  authorize('STAFF', 'ADMIN'),
  (req, res, next) => assignmentController.gradeSubmission(req, res, next)
);

// ─── Common & Management Routes ───────────────────────────
router.get(
  '/:id',
  authenticate,
  (req, res, next) => assignmentController.getAssignmentById(req, res, next)
);

router.get(
  '/',
  authenticate,
  authorize('ADMIN'),
  (req, res, next) => assignmentController.getAllAssignments(req, res, next)
);

router.post(
  '/',
  authenticate,
  authorize('STAFF', 'ADMIN'),
  (req, res, next) => assignmentController.createAssignment(req, res, next)
);

router.put(
  '/:id',
  authenticate,
  authorize('STAFF', 'ADMIN'),
  (req, res, next) => assignmentController.updateAssignment(req, res, next)
);

router.delete(
  '/:id',
  authenticate,
  authorize('STAFF', 'ADMIN'),
  (req, res, next) => assignmentController.deleteAssignment(req, res, next)
);

export default router;
