import { Response, NextFunction } from 'express';
import { ApiError } from '../utils/api-error';
import { verifyToken } from '../utils/token';
import { userRepository } from '../repositories/user.repository';
import { ipBlocklistRepository } from '../repositories/ip-blocklist.repository';
import { telemetryService } from '../services/telemetry.service';
import { extractClientIp } from '../utils/client-ip';
import { env } from '../config/environment';
import {
  AuthenticatedRequest,
} from '../types/common';
import { UserRole } from '../types/security-events';

/**
 * Authentication middleware — verifies JWT, IP blocklist, and session validity.
 */
export async function authenticate(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // 1. IP Blocklist Enforcement Gate
    const clientIp = extractClientIp(req);
    const websiteId = env.socCopilotWebsiteId || 'WEB-001';
    const activeBlock = await ipBlocklistRepository.findActiveBlock(clientIp, websiteId);

    if (activeBlock) {
      telemetryService.emit({
        eventType: 'UNAUTHORIZED_ACCESS_ATTEMPT',
        result: 'DENIED',
        req,
        metadata: {
          reason: 'IP_BLOCKED',
          blockedIp: clientIp,
          blockReason: activeBlock.reason,
          expiresAt: activeBlock.expires_at,
          sourceIncidentId: activeBlock.source_incident_id,
        },
      });
      throw ApiError.forbidden(
        `Access from this IP address (${clientIp}) is temporarily blocked due to security policy. (Expires: ${activeBlock.expires_at.toISOString()})`
      );
    }

    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw ApiError.unauthorized('Authentication token missing or invalid format.');
    }

    const token = authHeader.substring(7).trim();
    const payload = verifyToken(token);

    if (!payload) {
      throw ApiError.unauthorized('Session has expired or token is invalid.');
    }

    const user = await userRepository.findById(payload.userId);
    if (!user) {
      throw ApiError.unauthorized('User associated with this token no longer exists.');
    }

    if (user.account_status !== 'ACTIVE') {
      telemetryService.emit({
        eventType: 'UNAUTHORIZED_ACCESS_ATTEMPT',
        result: 'DENIED',
        req,
        userId: user.id,
        userRole: user.role,
        resourceType: 'USER',
        resourceId: user.id,
        metadata: {
          reason: 'INACTIVE_ACCOUNT_ACCESS_ATTEMPT',
          accountStatus: user.account_status,
        },
      });
      throw ApiError.forbidden(`Account is ${user.account_status.toLowerCase()}. Access denied.`);
    }

    req.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      accountStatus: user.account_status,
      firstName: user.first_name,
      lastName: user.last_name,
      departmentId: user.department_id || undefined,
      sessionId: payload.sessionId,
    };
    req.sessionId = payload.sessionId;

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Authorization middleware factory — Role-Based Access Control (RBAC).
 */
export function authorize(...allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(ApiError.unauthorized('Authentication required.'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      telemetryService.emit({
        eventType: 'UNAUTHORIZED_ACCESS_ATTEMPT',
        result: 'DENIED',
        req,
        userId: req.user.id,
        userRole: req.user.role,
        resourceType: 'USER',
        metadata: {
          path: req.originalUrl,
          method: req.method,
          requiredRoles: allowedRoles,
          userRole: req.user.role,
        },
      });

      return next(
        ApiError.forbidden(
          `Forbidden: Role '${req.user.role}' is not authorized to access this resource.`
        )
      );
    }

    next();
  };
}
