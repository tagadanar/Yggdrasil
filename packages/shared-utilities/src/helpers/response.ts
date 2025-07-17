// packages/shared-utilities/src/helpers/response.ts
// Helper functions for creating consistent API responses

import { ApiResponse, ErrorResponse, PaginatedResponse } from '../types/api';
import { HTTP_STATUS } from '../constants';

export class ResponseHelper {
  /**
   * Create a successful API response
   */
  static success<T>(data: T, message?: string): ApiResponse<T> {
    return {
      success: true,
      data,
      message,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Create an error API response
   */
  static error(
    error: string,
    statusCode: number = HTTP_STATUS.INTERNAL_SERVER_ERROR,
    details?: Record<string, any>
  ): ErrorResponse {
    return {
      success: false,
      error,
      message: error,
      statusCode,
      timestamp: new Date().toISOString(),
      details,
    };
  }

  /**
   * Create a validation error response
   */
  static validationError(validationErrors: Array<{ field: string; message: string; value?: any }>): ErrorResponse {
    // Use the first validation error message as the primary error
    const primaryError = validationErrors.length > 0 
      ? validationErrors[0].message 
      : 'Validation failed';
    
    // If multiple errors, join them
    const errorMessage = validationErrors.length > 1 
      ? validationErrors.map(err => err.message).join(', ')
      : primaryError;

    return {
      success: false,
      error: errorMessage,
      message: errorMessage,
      statusCode: HTTP_STATUS.UNPROCESSABLE_ENTITY,
      timestamp: new Date().toISOString(),
      details: {
        validationErrors,
      },
    };
  }

  /**
   * Create a paginated response
   */
  static paginated<T>(
    data: T[],
    page: number,
    limit: number,
    total: number,
    message?: string
  ): PaginatedResponse<T> {
    const totalPages = Math.ceil(total / limit);
    
    return {
      success: true,
      data,
      message,
      timestamp: new Date().toISOString(),
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  /**
   * Create a not found error response
   */
  static notFound(resource: string = 'Resource'): ErrorResponse {
    return this.error(`${resource} not found`, HTTP_STATUS.NOT_FOUND);
  }

  /**
   * Create an unauthorized error response
   */
  static unauthorized(message: string = 'Unauthorized access'): ErrorResponse {
    return this.error(message, HTTP_STATUS.UNAUTHORIZED);
  }

  /**
   * Create a forbidden error response
   */
  static forbidden(message: string = 'Insufficient permissions'): ErrorResponse {
    return this.error(message, HTTP_STATUS.FORBIDDEN);
  }

  /**
   * Create a conflict error response
   */
  static conflict(message: string = 'Resource already exists'): ErrorResponse {
    return this.error(message, HTTP_STATUS.CONFLICT);
  }

  /**
   * Create a bad request error response
   */
  static badRequest(message: string = 'Bad request'): ErrorResponse {
    return this.error(message, HTTP_STATUS.BAD_REQUEST);
  }

  // Express response helpers (using different method names to avoid conflicts)
  /**
   * Send a successful response (Express compatible)
   */
  static sendSuccess<T>(res: any, message: string, data?: T): void {
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message,
      data,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Send a created response (Express compatible)
   */
  static sendCreated<T>(res: any, message: string, data?: T): void {
    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message,
      data,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Send an unauthorized response (Express compatible)
   */
  static sendUnauthorized(res: any, message: string): void {
    res.status(HTTP_STATUS.UNAUTHORIZED).json({
      success: false,
      error: message,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Send a forbidden response (Express compatible)
   */
  static sendForbidden(res: any, message: string): void {
    res.status(HTTP_STATUS.FORBIDDEN).json({
      success: false,
      error: message,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Send a not found response (Express compatible)
   */
  static sendNotFound(res: any, message: string): void {
    res.status(HTTP_STATUS.NOT_FOUND).json({
      success: false,
      error: message,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Send a bad request response (Express compatible)
   */
  static sendBadRequest(res: any, message: string, details?: any): void {
    res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      error: message,
      details,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Send a conflict response (Express compatible)
   */
  static sendConflict(res: any, message: string): void {
    res.status(HTTP_STATUS.CONFLICT).json({
      success: false,
      error: message,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Send a server error response (Express compatible)
   */
  static sendServerError(res: any, message: string, error?: string): void {
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: message,
      details: error,
      timestamp: new Date().toISOString()
    });
  }
}