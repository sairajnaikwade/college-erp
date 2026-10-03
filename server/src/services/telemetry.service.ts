import { v4 as uuidv4 } from 'uuid';
import { Request } from 'express';
import { logger } from '../utils/logger';
import {
  SecurityEvent,
  SecurityEventType,
  EventResult,
  ResourceType,
  UserRole,
} from '../types/security-events';
import { socCopilotService } from './socCopilot.service';

export interface EmitEventParams {
  eventType: SecurityEventType;
  result: EventResult;
  req?: Request;
  userId?: string;
  userRole?: UserRole;
  resourceType?: ResourceType;
  resourceId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Telemetry Service — captures and structures security events for SOC CoPilot consumption.
 */
class TelemetryService {
  /**
   * Dispatches and logs a structured security event.
   */
  public emit(params: EmitEventParams): SecurityEvent {
    const {
      eventType,
      result,
      req,
      userId = 'anonymous',
      userRole = 'STUDENT',
      resourceType,
      resourceId,
      metadata = {},
    } = params;

    const sourceIp = req
      ? (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1'
      : '127.0.0.1';

    const userAgent = req ? req.headers['user-agent'] || 'unknown' : 'internal';
    const endpoint = req ? req.originalUrl || req.url : '/';
    const method = req ? req.method : 'INTERNAL';

    const event: SecurityEvent = {
      event_id: uuidv4(),
      user_id: userId,
      role: userRole,
      event_type: eventType,
      resource_type: resourceType,
      resource_id: resourceId,
      endpoint,
      method,
      result,
      ip_address: sourceIp.replace('::ffff:', ''),
      user_agent: userAgent,
      timestamp: new Date().toISOString(),
      metadata,
    };

    // Log structured event
    const logPrefix = `[SECURITY EVENT] [${event.result}] ${event.event_type}`;
    if (event.result === 'FAILURE' || event.result === 'DENIED') {
      logger.warn(logPrefix, JSON.stringify(event));
    } else {
      logger.info(logPrefix, JSON.stringify(event));
    }

    // Forward to SOC CoPilot (non-blocking, fail-safe async dispatch)
    if (['LOGIN_SUCCESS', 'LOGIN_FAILURE', 'LOGOUT'].includes(event.event_type)) {
      socCopilotService.sendSecurityEvent(event).catch((err) => {
        logger.warn(
          `[SOC] Async dispatch error for ${event.event_type}: ${err instanceof Error ? err.message : 'Unknown'}`
        );
      });
    }

    return event;
  }
}

export const telemetryService = new TelemetryService();
