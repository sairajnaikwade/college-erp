import { Request, Response, NextFunction } from 'express';
import { socEnforcementService } from '../services/socEnforcement.service';
import { ApiResponse } from '../utils/api-response';

export class SocEnforcementController {
  /**
   * POST /api/soc/enforce/ip-block
   */
  public async blockIp(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const result = await socEnforcementService.enforceIpBlock(req.body);
      ApiResponse.success(res, result, result.message, 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/soc/enforce/ip-unblock
   */
  public async unblockIp(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const result = await socEnforcementService.enforceIpUnblock(req.body);
      ApiResponse.success(res, result, result.message, 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/soc/enforce/account-block
   */
  public async blockAccount(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const result = await socEnforcementService.enforceAccountBlock(req.body);
      ApiResponse.success(res, result, result.message, 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/soc/enforce/account-unblock
   */
  public async unblockAccount(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const result = await socEnforcementService.enforceAccountUnblock(req.body);
      ApiResponse.success(res, result, result.message, 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/soc/enforce/status
   */
  public async getStatus(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { ip_address, user_id, website_id } = req.query;
      const result = await socEnforcementService.getEnforcementStatus({
        ip_address: typeof ip_address === 'string' ? ip_address : undefined,
        user_id: typeof user_id === 'string' ? user_id : undefined,
        website_id: typeof website_id === 'string' ? website_id : undefined,
      });
      ApiResponse.success(res, result, 'Enforcement status retrieved', 200);
    } catch (error) {
      next(error);
    }
  }
}

export const socEnforcementController = new SocEnforcementController();
