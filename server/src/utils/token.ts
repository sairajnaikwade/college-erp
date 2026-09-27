import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config/environment';
import { AuthTokenPayload } from '../types/common';

/**
 * Signs a JWT access token with user details and active session ID.
 */
export function generateToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn as jwt.SignOptions['expiresIn'],
  });
}

/**
 * Verifies a JWT access token and decodes payload.
 */
export function verifyToken(token: string): AuthTokenPayload | null {
  try {
    const decoded = jwt.verify(token, env.jwtSecret) as AuthTokenPayload;
    return decoded;
  } catch (_error) {
    return null;
  }
}

/**
 * Produces a SHA-256 hash of a session token for secure database indexing/storage.
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Generates a high-entropy random string for session tokens.
 */
export function generateSessionSecret(): string {
  return crypto.randomBytes(32).toString('hex');
}
