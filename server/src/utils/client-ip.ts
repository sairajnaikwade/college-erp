import { Request } from 'express';

/**
 * Normalizes an IP address by stripping IPv6-mapped IPv4 prefix (::ffff:)
 * and trimming whitespace.
 */
export function normalizeIp(ip: string): string {
  if (!ip) return '127.0.0.1';
  let cleaned = ip.trim();
  if (cleaned.startsWith('::ffff:')) {
    cleaned = cleaned.substring(7);
  }
  return cleaned;
}

/**
 * Extracts the verified client IP address from an incoming HTTP request.
 *
 * Proxy Resolution Hierarchy:
 * 1. Express `req.ip`: Populated and validated securely by Express based on `app.set('trust proxy', 1)`.
 * 2. `req.socket.remoteAddress`: Direct TCP connection remote IP when not behind proxy.
 * 3. Fallback to '127.0.0.1'.
 *
 * NOTE: Raw headers like `X-Forwarded-For` or `Render-Client-IP` are never read
 * directly without proxy validation to prevent header spoofing.
 */
export function extractClientIp(req?: Request): string {
  if (!req) return '127.0.0.1';

  // 1. Primary: Use Express trust-proxy evaluated IP (validated against configured proxy hops)
  if (req.ip && typeof req.ip === 'string') {
    return normalizeIp(req.ip);
  }

  // 2. Fallback: Socket direct connection remote address
  if (req.socket?.remoteAddress) {
    return normalizeIp(req.socket.remoteAddress);
  }

  return '127.0.0.1';
}
