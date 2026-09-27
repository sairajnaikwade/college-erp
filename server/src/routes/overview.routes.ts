import { Router } from 'express';
import { overviewController } from '../controllers/overview.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.get('/overview', authenticate, authorize('ADMIN'), (req, res, next) =>
  overviewController.getOverview(req, res, next)
);

export default router;
