import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../logging/logger';

/**
 * Request logging data structure for comprehensive HTTP request tracking.
 *
 * Contains all relevant information for request correlation, performance
 * monitoring, and security auditing across the platform.
 */
interface RequestLog {
  /** Unique identifier for request correlation across services */
  requestId: string;
  /** HTTP method (GET, POST, PUT, DELETE, etc.) */
  method: string;
  /** Full request URL including query parameters */
  url: string;
  /** Client IP address for security tracking */
  ip: string;
  /** User agent string for client identification */
  userAgent?: string;
  /** Authenticated user ID when available */
  userId?: string;
  /** Request processing duration in milliseconds */
  duration?: number;
  /** HTTP response status code */
  statusCode?: number;
  /** Error details when request fails */
  error?: any;
}

// Extend Express Request interface to include id
declare global {
  namespace Express {
    interface Request {
      id: string;
    }
  }
}

/**
 * Attach unique request ID to all incoming HTTP requests.
 *
 * Generates or reuses request correlation ID for distributed tracing.
 * The ID is returned in response headers for client-side correlation.
 *
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Next middleware function
 *
 * @example
 * ```typescript
 * // In Express app setup
 * app.use(attachRequestId);
 *
 * // Request ID available in subsequent middleware
 * app.use((req, res, next) => {
 *   console.log('Request ID:', req.id);
 *   next();
 * });
 * ```
 */
export function attachRequestId(req: Request, res: Response, next: NextFunction) {
  req.id = req.headers['x-request-id'] as string || uuidv4();
  res.setHeader('X-Request-ID', req.id);
  next();
}

/**
 * Comprehensive HTTP request and response logging middleware.
 *
 * Captures detailed request information, measures response time, and logs
 * based on response status. Includes automatic slow request detection
 * and security-relevant information tracking.
 *
 * Features:
 * - Request/response correlation with timing
 * - Status-based log levels (error 5xx, warn 4xx, info 2xx/3xx)
 * - Slow request detection (>1000ms threshold)
 * - User context when authenticated
 * - Security audit trail with IP and user agent
 *
 * @param req - Express request object (must have req.id from attachRequestId)
 * @param res - Express response object
 * @param next - Next middleware function
 *
 * @example
 * ```typescript
 * // Proper middleware order
 * app.use(attachRequestId);
 * app.use(logRequest);
 * app.use(authMiddleware); // Adds req.user
 * ```
 */
export function logRequest(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();

  const requestLog: RequestLog = {
    requestId: req.id,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip || req.connection.remoteAddress || 'unknown',
    userAgent: req.headers['user-agent'],
    userId: (req as any).user?.id,
  };

  // Log request
  logger.http('Incoming request', requestLog);

  // Capture response
  const originalSend = res.send;
  res.send = function(data: any) {
    res.send = originalSend;

    const duration = Date.now() - start;
    const responseLog = {
      ...requestLog,
      duration,
      statusCode: res.statusCode,
    };

    // Log based on status code
    if (res.statusCode >= 500) {
      logger.error('Request failed', responseLog);
    } else if (res.statusCode >= 400) {
      logger.warn('Request client error', responseLog);
    } else {
      logger.http('Request completed', responseLog);
    }

    // Log slow requests
    if (duration > 1000) {
      logger.warn('Slow request detected', {
        ...responseLog,
        threshold: 1000,
      });
    }

    return originalSend.call(this, data);
  };

  next();
}

/**
 * Error logging middleware for unhandled request errors.
 *
 * Captures complete error context including stack traces, request details,
 * and user information for debugging and security monitoring.
 *
 * Must be placed after all route handlers to catch unhandled errors.
 * Logs errors and passes them to the next error handler.
 *
 * @param err - Error object that was thrown or passed to next()
 * @param req - Express request object
 * @param _res - Express response object (unused, prefixed with _)
 * @param next - Next middleware function (forwards error)
 *
 * @example
 * ```typescript
 * // Place after all routes
 * app.use('/api', apiRoutes);
 * app.use(logError);
 * app.use(finalErrorHandler);
 * ```
 */
export function logError(err: Error, req: Request, _res: Response, next: NextFunction) {
  logger.error('Request error', {
    requestId: req.id,
    method: req.method,
    url: req.originalUrl,
    error: {
      message: err.message,
      stack: err.stack,
      name: err.name,
    },
    userId: (req as any).user?.id,
  });

  next(err);
}
