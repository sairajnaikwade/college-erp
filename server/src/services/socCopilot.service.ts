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
  private readonly timeoutMs = 3500;
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
      // 1. Filter only currently supported events
      if (!this.allowedEventTypes.has(event.event_type)) {
        return {
          success: false,
          error: `Event type ${event.event_type} is not in active SOC integration scope`,
        };
      }

      logger.info(`[SOC] Preparing ${event.event_type}`);

      // 2. Check if SOC integration is enabled
      const isEnabled = env.socEnabled;
      if (!isEnabled) {
        logger.info(
          `[SOC] SOC integration is disabled (SOC_ENABLED=${process.env.SOC_ENABLED || 'unset'}). Skipping ${event.event_type}.`
        );
        return { success: false, error: 'SOC integration is disabled' };
      }

      const baseUrl = env.socCopilotUrl;
      const apiKey = env.socCopilotApiKey;
      const secret = env.socCopilotSecret;
      const websiteId = env.socCopilotWebsiteId || 'WEB-003';

      if (!baseUrl || !apiKey || !secret) {
        logger.warn(
          `[SOC] Missing required configuration (URL: ${Boolean(baseUrl)}, Key: ${Boolean(apiKey)}, Secret: ${Boolean(secret)}). Skipping ${event.event_type}.`
        );
        return { success: false, error: 'Missing SOC configuration' };
      }

      // 3. Format endpoint URL
      let endpointUrl = baseUrl;
      if (!endpointUrl.startsWith('http://') && !endpointUrl.startsWith('https://')) {
        endpointUrl = `https://${endpointUrl}`;
      }
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
        resource_type:
          event.resource_type ||
          (event.event_type.startsWith('LOGIN') ? 'USER' : 'SESSION'),
        resource_id: event.resource_id,
        endpoint: event.endpoint || '/api/auth/login',
        method: event.method || 'POST',
        result: event.result || 'SUCCESS',
        ip_address: event.ip_address,
        user_agent: event.user_agent,
        timestamp,
        metadata: event.metadata || {},
      };

      // 5. Generate HMAC signature
      const signature = this.generateSignature(payload, timestamp, secret);

      // 6. Execute request with short timeout (3.5s)
      logger.info(`[SOC] Sending ${payload.event_type} to SOC CoPilot`);

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

        logger.info(`[SOC] Response status: ${response.status}`);

        if (response.ok) {
          logger.info(`[SOC] ${payload.event_type} delivered successfully`);
          return { success: true, status: response.status };
        } else {
          logger.warn(`[SOC] Failed to send ${payload.event_type}`);
          logger.warn(`[SOC] HTTP status: ${response.status}`);
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
        logger.warn(`[SOC] Failed to send ${payload.event_type}`);
        logger.warn(`[SOC] Request failed: ${errMsg}`);
        return { success: false, error: errMsg };
      }
    } catch (err: unknown) {
      // Fail-safe: ERP operation is never disrupted
      const errMsg = err instanceof Error ? err.message : 'Unknown error';
      logger.warn(`[SOC] Unexpected error in sendSecurityEvent: ${errMsg}`);
      return { success: false, error: errMsg };
    }
  }
}

export const socCopilotService = new SocCopilotService();
