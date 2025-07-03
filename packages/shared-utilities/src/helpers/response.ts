// Path: packages/shared-utilities/src/helpers/response.ts
import { ApiResponse, PaginatedResponse } from '../types';
import { HTTP_STATUS } from '../constants';

export class ResponseHelper {
  /**
   * Create success response
   */
  static success<T>(data?: T, message?: string): ApiResponse<T> {
    return {
      success: true,
      data,
      message,
    };
  }

  /**
   * Create error response
   */
  static error(error: string, message?: string): ApiResponse {
    return {
      success: false,
      error,
      message,
    };
  }

  /**
   * Create paginated response
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
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  /**
   * Create validation error response
   */
  static validationError(errors: string[]): ApiResponse {
    return {
      success: false,
      error: 'Validation failed',
      message: errors.join('; '),
    };
  }

  /**
   * Create authentication error response
   */
  static authError(message = 'Authentication failed'): ApiResponse {
    return {
      success: false,
      error: 'Authentication error',
      message,
    };
  }

  /**
   * Create authorization error response
   */
  static authorizationError(message = 'Access denied'): ApiResponse {
    return {
      success: false,
      error: 'Authorization error',
      message,
    };
  }

  /**
   * Create not found error response
   */
  static notFound(resource = 'Resource'): ApiResponse {
    return {
      success: false,
      error: 'Not found',
      message: `${resource} not found`,
    };
  }

  /**
   * Create conflict error response
   */
  static conflict(message = 'Resource already exists'): ApiResponse {
    return {
      success: false,
      error: 'Conflict',
      message,
    };
  }

  /**
   * Create internal server error response
   */
  static internalError(message = 'Internal server error'): ApiResponse {
    return {
      success: false,
      error: 'Internal server error',
      message,
    };
  }

  /**
   * Get HTTP status code based on response type
   */
  static getStatusCode(response: ApiResponse): number {
    if (response.success) {
      return HTTP_STATUS.OK;
    }

    switch (response.error) {
      case 'Validation failed':
        return HTTP_STATUS.BAD_REQUEST;
      case 'Authentication error':
        return HTTP_STATUS.UNAUTHORIZED;
      case 'Authorization error':
        return HTTP_STATUS.FORBIDDEN;
      case 'Not found':
        return HTTP_STATUS.NOT_FOUND;
      case 'Conflict':
        return HTTP_STATUS.CONFLICT;
      case 'Internal server error':
        return HTTP_STATUS.INTERNAL_SERVER_ERROR;
      default:
        return HTTP_STATUS.BAD_REQUEST;
    }
  }

  /**
   * Create response with proper HTTP status
   */
  static createResponse(res: any, response: ApiResponse, statusCode?: number): any {
    const status = statusCode || this.getStatusCode(response);
    return res.status(status).json(response);
  }

  /**
   * Handle async route wrapper
   */
  static asyncHandler(fn: Function) {
    return (req: any, res: any, next: any) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }

  /**
   * Create standardized error for logging
   */
  static createLogError(error: any, context?: string): {
    message: string;
    stack?: string;
    context?: string;
    timestamp: string;
  } {
    return {
      message: error.message || 'Unknown error',
      stack: error.stack,
      context,
      timestamp: new Date().toISOString(),
    };
  }
}