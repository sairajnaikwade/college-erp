import { Router } from 'express';
import { timetableController } from '../controllers/timetable.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// Student-specific timetable
router.get('/student', authenticate, authorize('STUDENT'), (req, res, next) =>
  timetableController.getStudentTimetable(req, res, next)
);

// Staff-specific teaching schedule
router.get('/staff', authenticate, authorize('STAFF'), (req, res, next) =>
  timetableController.getStaffTimetable(req, res, next)
);

// Class timetable (Admin & Staff)
router.get('/class/:classId', authenticate, authorize('ADMIN', 'STAFF'), (req, res, next) =>
  timetableController.getByClass(req, res, next)
);

// Admin listing
router.get('/', authenticate, authorize('ADMIN'), (req, res, next) =>
  timetableController.getAll(req, res, next)
);

// Single slot view
router.get('/:id', authenticate, (req, res, next) =>
  timetableController.getById(req, res, next)
);

// Admin-only management operations
router.post('/', authenticate, authorize('ADMIN'), (req, res, next) =>
  timetableController.create(req, res, next)
);
router.put('/:id', authenticate, authorize('ADMIN'), (req, res, next) =>
  timetableController.update(req, res, next)
);
router.delete('/:id', authenticate, authorize('ADMIN'), (req, res, next) =>
  timetableController.delete(req, res, next)
);

export default router;
