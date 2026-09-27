import { Router } from 'express';
import { departmentController } from '../controllers/department.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// Read operations require authentication
router.get('/', authenticate, (req, res, next) => departmentController.getAll(req, res, next));
router.get('/:id', authenticate, (req, res, next) => departmentController.getById(req, res, next));

// Admin-only management operations
router.post('/', authenticate, authorize('ADMIN'), (req, res, next) =>
  departmentController.create(req, res, next)
);
router.put('/:id', authenticate, authorize('ADMIN'), (req, res, next) =>
  departmentController.update(req, res, next)
);
router.delete('/:id', authenticate, authorize('ADMIN'), (req, res, next) =>
  departmentController.delete(req, res, next)
);

export default router;
