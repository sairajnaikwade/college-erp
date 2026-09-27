import { Router } from 'express';
import { staffController } from '../controllers/staff.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// Staff self-profile (identity scoped)
router.get('/me', authenticate, authorize('STAFF'), (req, res, next) =>
  staffController.getMyProfile(req, res, next)
);

// Admin-only staff management
router.get('/', authenticate, authorize('ADMIN'), (req, res, next) =>
  staffController.getAll(req, res, next)
);
router.get('/:id', authenticate, authorize('ADMIN'), (req, res, next) =>
  staffController.getById(req, res, next)
);
router.get('/:id/subjects', authenticate, authorize('ADMIN'), (req, res, next) =>
  staffController.getSubjects(req, res, next)
);

router.post('/', authenticate, authorize('ADMIN'), (req, res, next) =>
  staffController.create(req, res, next)
);
router.put('/:id', authenticate, authorize('ADMIN'), (req, res, next) =>
  staffController.update(req, res, next)
);
router.patch('/:id/status', authenticate, authorize('ADMIN'), (req, res, next) =>
  staffController.updateStatus(req, res, next)
);
router.post('/:id/subjects/:subjectId', authenticate, authorize('ADMIN'), (req, res, next) =>
  staffController.assignSubject(req, res, next)
);
router.delete('/:id/subjects/:subjectId', authenticate, authorize('ADMIN'), (req, res, next) =>
  staffController.removeSubject(req, res, next)
);

export default router;
