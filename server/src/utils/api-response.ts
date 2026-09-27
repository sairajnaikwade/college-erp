import { Response } from 'express';

/**
 * Standardized API response structure.
 * All API responses should use this class for consistency.
 */
export class ApiResponse {
  /**
   * Send a success response.
   */
  static success<T>(res: Response, data: T, message = 'Success', statusCode = 200): void {
    res.status(statusCode).json({
      success: true,
      message,
      data,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Send a created response (201).
   */
  static created<T>(res: Response, data: T, message = 'Created'): void {
    ApiResponse.success(res, data, message, 201);
  }

  /**
   * Send an error response.
   */
  static error(res: Response, message: string, statusCode = 500, errors?: unknown): void {
    res.status(statusCode).json({
      success: false,
      message,
      errors: errors || null,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Send a paginated response.
   */
  static paginated<T>(
    res: Response,
    data: T[],
    total: number,
    page: number,
    limit: number,
    message = 'Success',
  ): void {
    res.status(200).json({
      success: true,
      message,
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      timestamp: new Date().toISOString(),
    });
  }
}
