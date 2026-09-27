import { Router } from 'express';
import { MarksController } from '../controllers/marks.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate);

// ─── Student Endpoints ─────────────────────────────────────────
router.get('/student', authorize('STUDENT'), MarksController.getStudentResults);
router.get('/student/:subjectId', authorize('STUDENT'), MarksController.getStudentSubjectResultDetails);

// ─── Staff & Admin Endpoints ───────────────────────────────────
router.get('/stats', authorize('STAFF', 'ADMIN'), MarksController.getResultsStats);
router.get('/class/:classId', authorize('STAFF', 'ADMIN'), MarksController.getClassResults);
router.get('/student-detail/:studentId', authorize('STAFF', 'ADMIN'), MarksController.getStudentResultsByStaff);
router.post('/:studentId/:subjectId/calculate', authorize('STAFF', 'ADMIN'), MarksController.calculateSubjectResult);
router.post('/:studentId/:subjectId/publish', authorize('STAFF', 'ADMIN'), MarksController.publishSubjectResult);

// ─── Admin Global Results ──────────────────────────────────────
router.get('/', authorize('ADMIN'), MarksController.getAllResults);

export default router;
