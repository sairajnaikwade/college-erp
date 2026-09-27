import { Router } from 'express';
import { classController } from '../controllers/class.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, (req, res, next) => classController.getAll(req, res, next));
router.get('/:id', authenticate, (req, res, next) => classController.getById(req, res, next));

router.post('/', authenticate, authorize('ADMIN'), (req, res, next) =>
  classController.create(req, res, next)
);
router.put('/:id', authenticate, authorize('ADMIN'), (req, res, next) =>
  classController.update(req, res, next)
);
router.delete('/:id', authenticate, authorize('ADMIN'), (req, res, next) =>
  classController.delete(req, res, next)
);

export default router;
