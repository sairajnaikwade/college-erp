import { Response, NextFunction } from 'express';
import { overviewService } from '../services/overview.service';
import { ApiResponse } from '../utils/api-response';
import { AuthenticatedRequest } from '../types/common';

export class OverviewController {
  public async getOverview(_req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await overviewService.getOverview();
      ApiResponse.success(res, data, 'System overview retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
}

export const overviewController = new OverviewController();
