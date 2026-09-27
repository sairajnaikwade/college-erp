import { Router } from 'express';
import { studentController } from '../controllers/student.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// Student self-profile (identity scoped)
router.get('/me', authenticate, authorize('STUDENT'), (req, res, next) =>
  studentController.getMyProfile(req, res, next)
);

// Admin & Staff read access
router.get('/', authenticate, authorize('ADMIN', 'STAFF'), (req, res, next) =>
  studentController.getAll(req, res, next)
);
router.get('/:id', authenticate, authorize('ADMIN', 'STAFF'), (req, res, next) =>
  studentController.getById(req, res, next)
);
router.get('/:id/class', authenticate, authorize('ADMIN', 'STAFF'), (req, res, next) =>
  studentController.getClass(req, res, next)
);

// Admin-only management operations
router.post('/', authenticate, authorize('ADMIN'), (req, res, next) =>
  studentController.create(req, res, next)
);
router.put('/:id', authenticate, authorize('ADMIN'), (req, res, next) =>
  studentController.update(req, res, next)
);
router.patch('/:id/status', authenticate, authorize('ADMIN'), (req, res, next) =>
  studentController.updateStatus(req, res, next)
);
router.post('/:id/class', authenticate, authorize('ADMIN'), (req, res, next) =>
  studentController.assignClass(req, res, next)
);
router.delete('/:id/class', authenticate, authorize('ADMIN'), (req, res, next) =>
  studentController.removeClass(req, res, next)
);

export default router;
