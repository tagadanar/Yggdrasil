import { Request, Response, NextFunction } from 'express';
import { AppError, ValidationError, RateLimitError } from '../errors/AppError';
import { logger } from '../logging/logger';
import { config } from '../config/env-validator';

interface ErrorResponse {
  success: false;
  error: {
    message: string;
    code?: string;
    statusCode: number;
    timestamp: string;
    requestId?: string;
    validationErrors?: Array<{ field: string; message: string }>;
    retryAfter?: number;
  };
  debug?: {
    stack?: string;
    context?: Record<string, any>;
  };
}

export class ErrorHandler {
  static handle(err: Error, req: Request, res: Response, _next: NextFunction) {
    // Log the error
    this.logError(err, req);

    // Prepare error response
    const errorResponse = this.prepareErrorResponse(err, req);

    // Send response
    res.status(errorResponse.error.statusCode).json(errorResponse);
  }

  private static logError(err: Error, req: Request) {
    const errorInfo = {
      requestId: req.id,
      method: req.method,
      url: req.originalUrl,
      userId: (req as any).user?.id,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    };

    if (err instanceof AppError && err.isOperational) {
      logger.warn('Operational error', {
        ...errorInfo,
        error: err.toJSON(),
      });
    } else {
      logger.error('Unexpected error', {
        ...errorInfo,
        error: {
          name: err.name,
          message: err.message,
          stack: err.stack,
        },
      });
    }
  }

  private static prepareErrorResponse(err: Error, req: Request): ErrorResponse {
    const timestamp = new Date().toISOString();
    const isDevelopment = config.NODE_ENV === 'development';

    // Handle known operational errors
    if (err instanceof AppError) {
      const response: ErrorResponse = {
        success: false,
        error: {
          message: err.message,
          code: err.name,
          statusCode: err.statusCode,
          timestamp,
          requestId: req.id,
        },
      };

      // Add specific error fields
      if (err instanceof ValidationError) {
        response.error.validationErrors = err.validationErrors;
      } else if (err instanceof RateLimitError) {
        response.error.retryAfter = err.retryAfter;
      }

      // Add debug info in development
      if (isDevelopment) {
        response.debug = {
          stack: err.stack,
          context: err.context,
        };
      }

      return response;
    }

    // Handle unexpected errors
    const response: ErrorResponse = {
      success: false,
      error: {
        message: isDevelopment ? err.message : 'Internal server error',
        code: 'INTERNAL_ERROR',
        statusCode: 500,
        timestamp,
        requestId: req.id,
      },
    };

    if (isDevelopment) {
      response.debug = {
        stack: err.stack,
      };
    }

    return response;
  }

  // Async error wrapper
  static asyncHandler(fn: Function) {
    return (req: Request, res: Response, next: NextFunction) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }

  // Not found handler
  static notFound(req: Request, res: Response) {
    const error = new NotFoundError('Route', req.originalUrl);
    res.status(404).json(this.prepareErrorResponse(error, req));
  }
}

// Import NotFoundError here to avoid circular dependencies
import { NotFoundError } from '../errors/AppError';
