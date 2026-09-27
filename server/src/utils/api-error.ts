/**
 * Custom error class for API errors.
 * Extends the native Error class with an HTTP status code.
 */
export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(statusCode: number, message: string, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.name = 'ApiError';

    // Preserve proper stack trace
    Error.captureStackTrace(this, this.constructor);
  }

  // Common HTTP error factories
  static badRequest(message = 'Bad Request'): ApiError {
    return new ApiError(400, message);
  }

  static unauthorized(message = 'Unauthorized'): ApiError {
    return new ApiError(401, message);
  }

  static forbidden(message = 'Forbidden'): ApiError {
    return new ApiError(403, message);
  }

  static notFound(message = 'Not Found'): ApiError {
    return new ApiError(404, message);
  }

  static conflict(message = 'Conflict'): ApiError {
    return new ApiError(409, message);
  }

  static tooManyRequests(message = 'Too Many Requests'): ApiError {
    return new ApiError(429, message);
  }

  static internal(message = 'Internal Server Error'): ApiError {
    return new ApiError(500, message, false);
  }
}
