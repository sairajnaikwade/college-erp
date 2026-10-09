import { Router } from 'express';
import { socEnforcementController } from '../controllers/socEnforcement.controller';
import { verifySocSignature } from '../middleware/soc-auth';

const router = Router();

// All server-to-server SOC enforcement routes require strict HMAC signature & timestamp verification
router.use(verifySocSignature);

router.post('/ip-block', (req, res, next) =>
  socEnforcementController.blockIp(req, res, next)
);

router.post('/ip-unblock', (req, res, next) =>
  socEnforcementController.unblockIp(req, res, next)
);

router.post('/account-block', (req, res, next) =>
  socEnforcementController.blockAccount(req, res, next)
);

router.post('/account-unblock', (req, res, next) =>
  socEnforcementController.unblockAccount(req, res, next)
);

router.get('/status', (req, res, next) =>
  socEnforcementController.getStatus(req, res, next)
);

export default router;
