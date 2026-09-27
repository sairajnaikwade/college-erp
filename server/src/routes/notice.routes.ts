import { Router } from 'express';
import { noticeController } from '../controllers/notice.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// Read operations: authenticated users (STUDENT, STAFF, ADMIN)
router.get('/', authenticate, (req, res, next) => noticeController.getAll(req, res, next));
router.get('/:id', authenticate, (req, res, next) => noticeController.getById(req, res, next));

// Write operations: ADMIN or STAFF for notice creation / modification
router.post('/', authenticate, authorize('ADMIN', 'STAFF'), (req, res, next) =>
  noticeController.create(req, res, next)
);
router.put('/:id', authenticate, authorize('ADMIN', 'STAFF'), (req, res, next) =>
  noticeController.update(req, res, next)
);

// Delete operations: ADMIN only
router.delete('/:id', authenticate, authorize('ADMIN'), (req, res, next) =>
  noticeController.delete(req, res, next)
);

export default router;
