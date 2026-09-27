import { Request, Response, NextFunction } from 'express';
import { getHealthStatus } from '../services/health.service';
import { ApiResponse } from '../utils/api-response';

/**
 * Health check controller.
 * GET /api/health
 */
export async function healthCheck(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const health = await getHealthStatus();
    ApiResponse.success(res, health, 'Service is running');
  } catch (error) {
    next(error);
  }
}
