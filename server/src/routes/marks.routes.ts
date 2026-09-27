import { Router } from 'express';
import { MarksController } from '../controllers/marks.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate);

// ─── Student Endpoint ──────────────────────────────────────────
router.get('/student', authorize('STUDENT'), MarksController.getStudentMarks);

// ─── Component Management ──────────────────────────────────────
router.get('/components', MarksController.getComponents);
router.post('/components', authorize('STAFF', 'ADMIN'), MarksController.createComponent);
router.put('/components/:id', authorize('STAFF', 'ADMIN'), MarksController.updateComponent);
router.delete('/components/:id', authorize('STAFF', 'ADMIN'), MarksController.deleteComponent);
router.get('/components/:componentId/students', authorize('STAFF', 'ADMIN'), MarksController.getComponentStudents);

// ─── Marks CRUD & Staff / Admin Endpoints ──────────────────────
router.get('/stats', authorize('STAFF', 'ADMIN'), MarksController.getMarksStats);
router.get('/student/:studentId', authorize('STAFF', 'ADMIN'), MarksController.getStudentMarksByStaff);
router.post('/', authorize('STAFF', 'ADMIN'), MarksController.enterMarks);
router.put('/:id', authorize('STAFF', 'ADMIN'), MarksController.updateMark);
router.post('/:id/publish', authorize('STAFF', 'ADMIN'), MarksController.publishMark);

// ─── Admin Global Marks Listing ────────────────────────────────
router.get('/', authorize('ADMIN'), MarksController.getComponents);

export default router;
