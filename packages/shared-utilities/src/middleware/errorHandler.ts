// Path: packages/shared-utilities/src/middleware/errorHandler.ts
import { Request, Response, NextFunction } from 'express';
import { ResponseHelper } from '../helpers/response';
import { HTTP_STATUS } from '../constants';
import { AuditLogModel } from '../../../database-schemas/src';

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
  details?: any;
  isOperational?: boolean;
}

export class CustomError extends Error implements AppError {
  public statusCode: number;
  public code: string;
  public details?: any;
  public isOperational: boolean;

  constructor(
    message: string,
    statusCode: number = HTTP_STATUS.INTERNAL_SERVER_ERROR,
    code: string = 'UNKNOWN_ERROR',
    details?: any
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends CustomError {
  constructor(message: string, details?: any) {
    super(message, HTTP_STATUS.BAD_REQUEST, 'VALIDATION_ERROR', details);
  }
}

export class AuthenticationError extends CustomError {
  constructor(message: string = 'Authentication required') {
    super(message, HTTP_STATUS.UNAUTHORIZED, 'AUTHENTICATION_ERROR');
  }
}

export class AuthorizationError extends CustomError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, HTTP_STATUS.FORBIDDEN, 'AUTHORIZATION_ERROR');
  }
}

export class NotFoundError extends CustomError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, HTTP_STATUS.NOT_FOUND, 'NOT_FOUND');
  }
}

export class ConflictError extends CustomError {
  constructor(message: string, details?: any) {
    super(message, HTTP_STATUS.CONFLICT, 'CONFLICT_ERROR', details);
  }
}

export class RateLimitError extends CustomError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, HTTP_STATUS.TOO_MANY_REQUESTS, 'RATE_LIMIT_ERROR');
  }
}

export class ServiceUnavailableError extends CustomError {
  constructor(service: string = 'Service') {
    super(`${service} temporarily unavailable`, HTTP_STATUS.SERVICE_UNAVAILABLE, 'SERVICE_UNAVAILABLE');
  }
}

/**
 * Error handling middleware for Express applications
 */
export const errorHandler = (
  error: AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Default error properties
  const statusCode = error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
  const code = error.code || 'INTERNAL_ERROR';
  const message = error.message || 'Internal server error';

  // Log the error
  logError(error, req);

  // Audit log for security-related errors
  if (shouldAuditError(error, statusCode)) {
    auditError(error, req).catch(auditErr => {
      console.error('Failed to audit error:', auditErr);
    });
  }

  // Prepare error response
  const errorResponse: any = {
    success: false,
    error: message,
    code,
    timestamp: new Date().toISOString(),
    requestId: (req as any).requestId || 'unknown'
  };

  // Add details in development mode
  if (process.env.NODE_ENV === 'development') {
    errorResponse.details = error.details;
    errorResponse.stack = error.stack;
  }

  // Add validation errors if present
  if (error instanceof ValidationError && error.details) {
    errorResponse.validationErrors = error.details;
  }

  // Send error response
  res.status(statusCode).json(errorResponse);
};

/**
 * Async error wrapper for route handlers
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * 404 Not Found handler
 */
export const notFoundHandler = (req: Request, res: Response, next: NextFunction): void => {
  const error = new NotFoundError(`Route ${req.method} ${req.path}`);
  next(error);
};

/**
 * Validation error handler for Joi/Zod validation
 */
export const validationErrorHandler = (error: any): ValidationError => {
  if (error.name === 'ValidationError' || error.name === 'ZodError') {
    const details = error.issues || error.details || [{ message: error.message }];
    const messages = details.map((detail: any) => detail.message || detail.msg);
    return new ValidationError(messages.join('; '), details);
  }
  return error;
};

/**
 * MongoDB error handler
 */
export const mongoErrorHandler = (error: any): AppError => {
  if (error.name === 'MongoServerError' || error.name === 'MongoError') {
    switch (error.code) {
      case 11000: // Duplicate key error
        const field = Object.keys(error.keyPattern || {})[0] || 'field';
        return new ConflictError(`${field} already exists`, {
          field,
          value: error.keyValue?.[field]
        });
      case 16755: // Invalid ObjectId
        return new ValidationError('Invalid ID format');
      default:
        return new CustomError('Database operation failed', HTTP_STATUS.INTERNAL_SERVER_ERROR, 'DATABASE_ERROR');
    }
  }
  
  if (error.name === 'CastError') {
    return new ValidationError(`Invalid ${error.path}: ${error.value}`);
  }
  
  return error;
};

/**
 * JWT error handler
 */
export const jwtErrorHandler = (error: any): AppError => {
  if (error.name === 'JsonWebTokenError') {
    return new AuthenticationError('Invalid token');
  }
  
  if (error.name === 'TokenExpiredError') {
    return new AuthenticationError('Token expired');
  }
  
  return error;
};

/**
 * Log error with appropriate level
 */
const logError = (error: AppError, req: Request): void => {
  const logContext = {
    error: error.message,
    code: error.code,
    statusCode: error.statusCode,
    stack: error.stack,
    requestId: (req as any).requestId,
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    userId: (req as any).user?.id,
    timestamp: new Date().toISOString()
  };

  if (error.statusCode && error.statusCode >= 500) {
    console.error('Server Error:', logContext);
  } else if (error.statusCode && error.statusCode >= 400) {
    console.warn('Client Error:', logContext);
  } else {
    console.info('Error:', logContext);
  }
};

/**
 * Determine if error should be audited
 */
const shouldAuditError = (error: AppError, statusCode: number): boolean => {
  // Audit security-related errors
  if (error instanceof AuthenticationError || error instanceof AuthorizationError) {
    return true;
  }
  
  // Audit server errors
  if (statusCode >= 500) {
    return true;
  }
  
  // Audit suspicious client errors
  if (statusCode === HTTP_STATUS.TOO_MANY_REQUESTS) {
    return true;
  }
  
  return false;
};

/**
 * Create audit log entry for error
 */
const auditError = async (error: AppError, req: Request): Promise<void> => {
  try {
    const userId = (req as any).user?.id || 'anonymous';
    const action = determineErrorAction(error);
    
    await AuditLogModel.logAction(
      userId,
      action,
      'system',
      {
        error: {
          message: error.message,
          code: error.code,
          statusCode: error.statusCode
        },
        request: {
          method: req.method,
          url: req.url,
          userAgent: req.get('User-Agent'),
          requestId: (req as any).requestId
        }
      },
      {
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        sessionId: (req as any).sessionId,
        severity: determineSeverity(error),
        category: 'security'
      }
    );
  } catch (auditError) {
    console.error('Failed to create audit log for error:', auditError);
  }
};

/**
 * Determine audit action based on error type
 */
const determineErrorAction = (error: AppError): string => {
  if (error instanceof AuthenticationError) {
    return 'authentication_failed';
  }
  if (error instanceof AuthorizationError) {
    return 'access_denied';
  }
  if (error instanceof RateLimitError) {
    return 'rate_limit_exceeded';
  }
  if (error.statusCode && error.statusCode >= 500) {
    return 'system_error';
  }
  return 'client_error';
};

/**
 * Determine error severity for audit logs
 */
const determineSeverity = (error: AppError): string => {
  if (error.statusCode && error.statusCode >= 500) {
    return 'high';
  }
  if (error instanceof AuthenticationError || error instanceof AuthorizationError) {
    return 'medium';
  }
  if (error instanceof RateLimitError) {
    return 'medium';
  }
  return 'low';
};

/**
 * Error handling utilities
 */
export const ErrorUtils = {
  /**
   * Create a standardized error response
   */
  createErrorResponse: (error: AppError, requestId?: string) => {
    return ResponseHelper.error(error.message, error.code);
  },

  /**
   * Check if error is operational (expected) or programming error
   */
  isOperationalError: (error: AppError): boolean => {
    return error.isOperational === true;
  },

  /**
   * Chain multiple error handlers
   */
  chainErrorHandlers: (...handlers: Array<(error: any) => AppError>) => {
    return (error: any): AppError => {
      return handlers.reduce((err, handler) => {
        try {
          return handler(err);
        } catch (handlerError) {
          return err; // Return original error if handler fails
        }
      }, error);
    };
  }
};

// Export common error types for easy importing
// Note: HTTP_STATUS and ResponseHelper are already exported from their respective modules