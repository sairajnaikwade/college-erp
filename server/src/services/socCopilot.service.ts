import crypto from 'crypto';
import { env } from '../config/environment';
import { logger } from '../utils/logger';
import { SecurityEvent } from '../types/security-events';

export interface SocEventPayload {
  website_id: string;
  event_id: string;
  user_id: string;
  role?: string;
  event_type: string;
  resource_type?: string;
  resource_id?: string;
  endpoint: string;
  method: string;
  result: string;
  ip_address?: string;
  user_agent?: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface SocDeliveryResult {
  success: boolean;
  status?: number;
  error?: string;
}

/**
 * SOC CoPilot Service — Handles secure, HMAC-signed security telemetry dispatch to the SOC Ingestion pipeline.
 */
export class SocCopilotService {
  private readonly timeoutMs = 3000;
  private readonly allowedEventTypes: ReadonlySet<string> = new Set([
    'LOGIN_SUCCESS',
    'LOGIN_FAILURE',
    'LOGOUT',
  ]);

  /**
   * Generates HMAC-SHA256 signature for canonical message: `${timestamp}.${JSON.stringify(payload)}`
   */
  public generateSignature(
    payload: SocEventPayload,
    timestamp: string,
    secret: string
  ): string {
    const canonicalMessage = `${timestamp}.${JSON.stringify(payload)}`;
    const hmacKey = crypto
      .createHash('sha256')
      .update(secret)
      .digest('hex');

    return crypto
      .createHmac('sha256', hmacKey)
      .update(canonicalMessage)
      .digest('hex');
  }

  /**
   * Sends a structured security event to the SOC CoPilot Ingestion endpoint.
   * Fail-safe: Any errors or timeouts are caught and logged safely without breaking ERP flow.
   */
  public async sendSecurityEvent(
    event: SecurityEvent | SocEventPayload
  ): Promise<SocDeliveryResult> {
    try {
      // 1. Check if SOC integration is enabled
      const isEnabled = env.socEnabled ?? (process.env.SOC_ENABLED === 'true');
      if (!isEnabled) {
        return { success: false, error: 'SOC integration is disabled' };
      }

      // 2. Filter only currently supported events
      if (!this.allowedEventTypes.has(event.event_type)) {
        return {
          success: false,
          error: `Event type ${event.event_type} is not in active SOC integration scope`,
        };
      }

      const baseUrl = (env.socCopilotUrl || process.env.SOC_COPILOT_URL || '').trim();
      const apiKey = (env.socCopilotApiKey || process.env.SOC_COPILOT_API_KEY || '').trim();
      const secret = (env.socCopilotSecret || process.env.SOC_COPILOT_SECRET || '').trim();
      const websiteId =
        (env.socCopilotWebsiteId || process.env.SOC_COPILOT_WEBSITE_ID || 'WEB-003').trim();

      if (!baseUrl || !apiKey || !secret) {
        logger.warn(
          `[SOC CoPilot] Missing configuration (URL, API Key, or Secret). Skipping event delivery for ${event.event_type}.`
        );
        return { success: false, error: 'Missing SOC configuration' };
      }

      // 3. Format endpoint URL
      let endpointUrl = baseUrl;
      if (!endpointUrl.includes('/api/ingestion/events')) {
        endpointUrl = `${endpointUrl.replace(/\/+$/, '')}/api/ingestion/events`;
      }

      // 4. Construct safe payload (ensure website_id is included and credentials excluded)
      const timestamp = event.timestamp || new Date().toISOString();
      const payload: SocEventPayload = {
        website_id: websiteId,
        event_id: event.event_id,
        user_id: event.user_id || 'anonymous',
        role: event.role,
        event_type: event.event_type,
        resource_type: event.resource_type,
        resource_id: event.resource_id,
        endpoint: event.endpoint || '/',
        method: event.method || 'POST',
        result: event.result || 'SUCCESS',
        ip_address: event.ip_address,
        user_agent: event.user_agent,
        timestamp,
        metadata: event.metadata || {},
      };

      // 5. Generate HMAC signature
      const signature = this.generateSignature(payload, timestamp, secret);

      // 6. Execute request with short timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

      try {
        const response = await fetch(endpointUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-SOC-API-Key': apiKey,
            'X-SOC-Timestamp': timestamp,
            'X-SOC-Signature': signature,
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          logger.info(
            `[SOC CoPilot] Successfully sent ${payload.event_type} (${payload.event_id}) to SOC (Status: ${response.status})`
          );
          return { success: true, status: response.status };
        } else {
          logger.warn(
            `[SOC CoPilot] Event delivery returned HTTP ${response.status} for ${payload.event_type}`
          );
          return {
            success: false,
            status: response.status,
            error: `SOC responded with HTTP ${response.status}`,
          };
        }
      } catch (fetchError: unknown) {
        clearTimeout(timeoutId);
        const errMsg =
          fetchError instanceof Error ? fetchError.message : 'Network request failed';
        logger.warn(
          `[SOC CoPilot] Event delivery failed for ${payload.event_type}: ${errMsg}`
        );
        return { success: false, error: errMsg };
      }
    } catch (err: unknown) {
      // Fail-safe: ERP operation is never disrupted
      const errMsg = err instanceof Error ? err.message : 'Unknown error';
      logger.warn(`[SOC CoPilot] Unexpected error in sendSecurityEvent: ${errMsg}`);
      return { success: false, error: errMsg };
    }
  }
}

export const socCopilotService = new SocCopilotService();
