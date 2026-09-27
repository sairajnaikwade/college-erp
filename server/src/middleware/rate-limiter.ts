import rateLimit from 'express-rate-limit';
import { env } from '../config/environment';

/**
 * Default rate limiter for general API endpoints.
 * Configurable per-route in future phases.
 */
export const defaultRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: env.isDevelopment ? 5000 : 100, // higher limit in development/test
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests, please try again later.',
    errors: null,
    timestamp: new Date().toISOString(),
  },
});

/**
 * Stricter rate limiter for authentication-related endpoints.
 * Will be applied to login, password reset, etc. in future phases.
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit each IP to 20 auth requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later.',
    errors: null,
    timestamp: new Date().toISOString(),
  },
});
