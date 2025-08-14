// packages/api-services/user-service/src/middleware/audit.ts
// Audit logging middleware for sensitive operations

import { Request, Response, NextFunction } from 'express';
import { SecurityLogger, userLogger as logger } from '@yggdrasil/shared-utilities';
import { AuthRequest } from './auth';

export interface AuditEvent {
  action: string;
  resource: string;
  resourceId?: string;
  userId?: string;
  userEmail?: string;
  userRole?: string;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
  success: boolean;
  details?: Record<string, any>;
  sensitive?: boolean;
}

export interface AuditOptions {
  action: string;
  resource: string;
  includeRequestBody?: boolean;
  includeResponseData?: boolean;
  sensitive?: boolean;
}

/**
 * Creates audit logging middleware for sensitive operations
 */
export const auditLog = (options: AuditOptions) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    const startTime = Date.now();
    const auditEvent: Partial<AuditEvent> = {
      action: options.action,
      resource: options.resource,
      userId: req.user?.userId,
      userEmail: req.user?.email,
      userRole: req.user?.role,
      ipAddress: getClientIpAddress(req),
      userAgent: req.get('User-Agent'),
      timestamp: new Date(),
      sensitive: options.sensitive || false,
    };

    // Capture resource ID from URL params
    if (req.params?.['id']) {
      auditEvent.resourceId = req.params['id'];
    }

    // Capture additional details
    const details: Record<string, any> = {};

    if (options.includeRequestBody && req.body) {
      details['requestBody'] = sanitizeAuditData(req.body);
    }

    if (Object.keys(details).length > 0) {
      auditEvent.details = details;
    }

    // Override res.json to capture response
    const originalJson = res.json.bind(res);
    res.json = function (body: any) {
      const duration = Date.now() - startTime;

      // Determine success based on status code
      const success = res.statusCode >= 200 && res.statusCode < 400;

      // Complete audit event
      const finalAuditEvent: AuditEvent = {
        ...auditEvent,
        success,
        details: {
          ...auditEvent.details,
          statusCode: res.statusCode,
          duration: `${duration}ms`,
          ...(options.includeResponseData && body ? { responseData: sanitizeAuditData(body) } : {}),
        },
      } as AuditEvent;

      // Log the audit event
      logAuditEvent(finalAuditEvent);

      // Call original json method
      return originalJson(body);
    };

    next();
  };
};

/**
 * Pre-defined audit middleware for common operations
 */
export const auditUserCreation = auditLog({
  action: 'CREATE_USER',
  resource: 'user',
  includeRequestBody: true,
  sensitive: true,
});

export const auditUserUpdate = auditLog({
  action: 'UPDATE_USER',
  resource: 'user',
  includeRequestBody: true,
  sensitive: true,
});

export const auditUserDeletion = auditLog({
  action: 'DELETE_USER',
  resource: 'user',
  sensitive: true,
});

export const auditProfileUpdate = auditLog({
  action: 'UPDATE_PROFILE',
  resource: 'user_profile',
  includeRequestBody: true,
});

export const auditUserAccess = auditLog({
  action: 'ACCESS_USER',
  resource: 'user',
});

export const auditUserList = auditLog({
  action: 'LIST_USERS',
  resource: 'user',
});

export const auditPreferencesAccess = auditLog({
  action: 'ACCESS_PREFERENCES',
  resource: 'user_preferences',
});

/**
 * Security event logging for failed operations
 */
export const logSecurityEvent = (
  eventType: string,
  req: AuthRequest,
  details?: Record<string, any>,
): void => {
  const securityEvent = {
    event: eventType,
    userId: req.user?.userId || 'anonymous',
    userEmail: req.user?.email || 'unknown',
    ipAddress: getClientIpAddress(req),
    userAgent: req.get('User-Agent'),
    timestamp: new Date(),
    details: details || {},
  };

  SecurityLogger.logSecurityEvent(eventType, req.user?.email || 'unknown');

  logger.warn('Security Event', {
    eventType,
    ...securityEvent,
  });
};

/**
 * Helper function to get client IP address
 */
function getClientIpAddress(req: Request): string {
  return (
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    (req.headers['x-real-ip'] as string) ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    'unknown'
  );
}

/**
 * Sanitize audit data to remove sensitive information
 */
function sanitizeAuditData(data: any): any {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const sanitized = { ...data };

  // Remove sensitive fields
  const sensitiveFields = [
    'password',
    'accessToken',
    'refreshToken',
    'token',
    'secret',
    'key',
    'authorization',
  ];

  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  });

  // Recursively sanitize nested objects
  Object.keys(sanitized).forEach(key => {
    if (sanitized[key] && typeof sanitized[key] === 'object') {
      sanitized[key] = sanitizeAuditData(sanitized[key]);
    }
  });

  return sanitized;
}

/**
 * Central audit event logging
 */
function logAuditEvent(event: AuditEvent): void {
  // Log to security logger for sensitive operations
  if (event.sensitive) {
    SecurityLogger.logAuthOperation(event.action.toLowerCase(), event.userEmail || 'unknown');
  }

  // Always log to application logger
  logger.info('Audit Event', {
    action: event.action,
    resource: event.resource,
    resourceId: event.resourceId,
    userId: event.userId,
    success: event.success,
    duration: event.details?.['duration'],
    statusCode: event.details?.['statusCode'],
    ipAddress: event.ipAddress,
    timestamp: event.timestamp,
  });

  // Log failed operations with higher severity
  if (!event.success) {
    logger.warn('Failed Operation', {
      ...event,
      severity: 'WARNING',
    });
  }
}

/**
 * Middleware to track failed authentication attempts
 */
export const trackFailedAuth = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const originalJson = res.json.bind(res);

  res.json = function (body: any) {
    // Check if this is an authentication failure
    if (res.statusCode === 401 || res.statusCode === 403) {
      logSecurityEvent('AUTHENTICATION_FAILURE', req, {
        statusCode: res.statusCode,
        path: req.path,
        method: req.method,
        responseBody: sanitizeAuditData(body),
      });
    }

    return originalJson(body);
  };

  next();
};

/**
 * Rate limiting audit events
 */
export const auditRateLimit = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const originalJson = res.json.bind(res);

  res.json = function (body: any) {
    // Check if this is a rate limit response
    if (res.statusCode === 429) {
      logSecurityEvent('RATE_LIMIT_EXCEEDED', req, {
        path: req.path,
        method: req.method,
        headers: {
          'x-forwarded-for': req.get('x-forwarded-for'),
          'user-agent': req.get('user-agent'),
        },
      });
    }

    return originalJson(body);
  };

  next();
};
