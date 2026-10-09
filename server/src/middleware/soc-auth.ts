import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { env } from '../config/environment';
import { ApiError } from '../utils/api-error';
import { logger } from '../utils/logger';

const MAX_TIMESTAMP_SKEW_MS = 300 * 1000; // 5 minutes

/**
 * Server-to-server authentication middleware for SOC CoPilot enforcement requests.
 *
 * Validates:
 * 1. API Key matching (X-SOC-API-Key)
 * 2. Request Timestamp (X-SOC-Timestamp within 5 minutes to prevent replay attacks)
 * 3. HMAC-SHA256 Signature (X-SOC-Signature) using shared secret and timing-safe comparison.
 */
export function verifySocSignature(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  try {
    // 1. Check if SOC integration is enabled
    if (!env.socEnabled) {
      throw ApiError.forbidden('SOC CoPilot integration is currently disabled on this server.');
    }

    const expectedApiKey = env.socCopilotApiKey;
    const secret = env.socCopilotSecret;

    if (!expectedApiKey || !secret) {
      logger.error('[SOC-AUTH] Missing SOC_COPILOT_API_KEY or SOC_COPILOT_SECRET in environment.');
      throw ApiError.internal('SOC enforcement credentials not configured on ERP server.');
    }

    // 2. Extract headers
    const apiKey = (req.headers['x-soc-api-key'] as string) || '';
    const timestamp = (req.headers['x-soc-timestamp'] as string) || '';
    const signature = (req.headers['x-soc-signature'] as string) || '';

    if (!apiKey || !timestamp || !signature) {
      throw ApiError.unauthorized(
        'Missing required SOC authentication headers (X-SOC-API-Key, X-SOC-Timestamp, X-SOC-Signature).'
      );
    }

    // 3. Constant-time API Key check
    const apiKeyBuffer = Buffer.from(apiKey);
    const expectedKeyBuffer = Buffer.from(expectedApiKey);
    if (
      apiKeyBuffer.length !== expectedKeyBuffer.length ||
      !crypto.timingSafeEqual(apiKeyBuffer, expectedKeyBuffer)
    ) {
      logger.warn('[SOC-AUTH] Invalid X-SOC-API-Key provided.');
      throw ApiError.unauthorized('Invalid SOC API Key.');
    }

    // 4. Timestamp / Replay Protection check
    const reqTime = new Date(timestamp).getTime();
    if (isNaN(reqTime)) {
      throw ApiError.badRequest('Invalid X-SOC-Timestamp header format. Expected ISO 8601 string.');
    }

    const now = Date.now();
    if (Math.abs(now - reqTime) > MAX_TIMESTAMP_SKEW_MS) {
      logger.warn(
        `[SOC-AUTH] Timestamp skew exceeded limit. Request: ${new Date(reqTime).toISOString()}, Server: ${new Date(now).toISOString()}`
      );
      throw ApiError.unauthorized(
        'Request timestamp expired or skewed beyond permitted 5-minute window (replay prevention).'
      );
    }

    // 5. Signature verification
    const canonicalMessage = `${timestamp}.${JSON.stringify(req.body || {})}`;
    const hmacKey = crypto.createHash('sha256').update(secret).digest('hex');
    const expectedSignature = crypto
      .createHmac('sha256', hmacKey)
      .update(canonicalMessage)
      .digest('hex');

    const signatureBuffer = Buffer.from(signature.toLowerCase());
    const expectedSignatureBuffer = Buffer.from(expectedSignature.toLowerCase());

    if (
      signatureBuffer.length !== expectedSignatureBuffer.length ||
      !crypto.timingSafeEqual(signatureBuffer, expectedSignatureBuffer)
    ) {
      logger.warn('[SOC-AUTH] Signature mismatch on enforcement request.');
      throw ApiError.unauthorized('Invalid SOC HMAC signature.');
    }

    next();
  } catch (error) {
    next(error);
  }
}
