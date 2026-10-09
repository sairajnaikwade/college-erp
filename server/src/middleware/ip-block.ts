import { Request, Response, NextFunction } from 'express';
import { ipBlocklistRepository } from '../repositories/ip-blocklist.repository';
import { extractClientIp } from '../utils/client-ip';
import { env } from '../config/environment';
import { ApiError } from '../utils/api-error';
import { telemetryService } from '../services/telemetry.service';

/**
 * Middleware to enforce active IP blocklist restrictions.
 * Can be applied globally or to sensitive routes.
 */
export async function checkIpBlock(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const clientIp = extractClientIp(req);
    const websiteId = env.socCopilotWebsiteId || 'WEB-001';

    const activeBlock = await ipBlocklistRepository.findActiveBlock(
      clientIp,
      websiteId
    );

    if (activeBlock) {
      telemetryService.emit({
        eventType: 'LOGIN_FAILURE',
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
        'Access is temporarily restricted due to security policy.'
      );
    }

    next();
  } catch (error) {
    next(error);
  }
}
