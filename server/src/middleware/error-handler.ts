import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/api-error';
import { logger } from '../utils/logger';

/**
 * Centralized error handling middleware.
 * Catches all errors thrown in route handlers and sends a standardized response.
 */
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // Log the error
  if (err instanceof ApiError) {
    if (!err.isOperational) {
      logger.error('Non-operational error:', err.message, err.stack);
    } else {
      logger.warn(`API Error [${err.statusCode}]: ${err.message}`);
    }

    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      errors: null,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // Unknown/unexpected errors
  logger.error('Unhandled error:', err.message, err.stack);

  res.status(500).json({
    success: false,
    message: 'Internal Server Error',
    errors: null,
    timestamp: new Date().toISOString(),
  });
}
