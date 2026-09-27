import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import { ApiResponse } from '../utils/api-response';
import { AuthenticatedRequest } from '../types/common';
import { ApiError } from '../utils/api-error';

export class AuthController {
  /**
   * POST /api/auth/login
   */
  public async login(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { identifier, password, role, requestedRole } = req.body;
      const targetRole = role || requestedRole;

      if (targetRole !== undefined && targetRole !== null && targetRole !== '') {
        if (
          typeof targetRole !== 'string' ||
          !['STUDENT', 'STAFF', 'ADMIN'].includes(targetRole.toUpperCase())
        ) {
          throw ApiError.badRequest(
            'Invalid requested role. Must be STUDENT, STAFF, or ADMIN.'
          );
        }
      }

      const result = await authService.login({
        identifier,
        password,
        role: targetRole ? targetRole.toUpperCase() : undefined,
        req,
      });

      ApiResponse.success(res, result, 'Login successful', 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/auth/logout
   */
  public async logout(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user || !req.sessionId) {
        throw ApiError.unauthorized('Authentication required.');
      }

      await authService.logout({
        userId: req.user.id,
        sessionId: req.sessionId,
        req,
      });

      ApiResponse.success(res, null, 'Logged out successfully', 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/auth/me
   */
  public async getMe(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        throw ApiError.unauthorized('Authentication required.');
      }

      const user = await authService.getMe(req.user.id);
      ApiResponse.success(res, user, 'Profile retrieved', 200);
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();
