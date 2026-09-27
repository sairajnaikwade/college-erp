import { Router } from 'express';
import { subjectController } from '../controllers/subject.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, (req, res, next) => subjectController.getAll(req, res, next));
router.get('/:id', authenticate, (req, res, next) => subjectController.getById(req, res, next));

router.post('/', authenticate, authorize('ADMIN'), (req, res, next) =>
  subjectController.create(req, res, next)
);
router.put('/:id', authenticate, authorize('ADMIN'), (req, res, next) =>
  subjectController.update(req, res, next)
);
router.delete('/:id', authenticate, authorize('ADMIN'), (req, res, next) =>
  subjectController.delete(req, res, next)
);

export default router;
