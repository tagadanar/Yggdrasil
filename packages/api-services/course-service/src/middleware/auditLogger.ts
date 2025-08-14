// src/middleware/auditLogger.ts
// Audit logging middleware for sensitive operations

import { Request, Response, NextFunction } from 'express';
import { courseLogger as logger } from '@yggdrasil/shared-utilities';

interface AuditEvent {
  event: string;
  resource: string;
  resourceId?: string;
  action: string;
  userId?: string;
  userRole?: string;
  userEmail?: string;
  correlationId?: string;
  timestamp: string;
  ip: string;
  userAgent?: string;
  details?: Record<string, any>;
  success: boolean;
  error?: string;
}

class AuditLogger {
  private static instance: AuditLogger;

  public static getInstance(): AuditLogger {
    if (!AuditLogger.instance) {
      AuditLogger.instance = new AuditLogger();
    }
    return AuditLogger.instance;
  }

  /**
   * Logs an audit event with full context.
   */
  public logEvent(event: AuditEvent): void {
    const auditLog = {
      type: 'audit',
      ...event,
      service: 'course-service',
    };

    // Use appropriate log level based on success/failure
    if (event.success) {
      logger.info('Audit event', auditLog);
    } else {
      logger.warn('Audit event failed', auditLog);
    }

    // For critical operations, also log at error level
    if (this.isCriticalOperation(event.action)) {
      logger.error('Critical audit event', auditLog);
    }
  }

  /**
   * Creates audit event from request context.
   */
  public createAuditEvent(
    req: Request,
    resource: string,
    action: string,
    success: boolean,
    details?: Record<string, any>,
    error?: string,
  ): AuditEvent {
    const user = (req as any).user;

    return {
      event: 'course_operation',
      resource,
      resourceId: req.params['courseId'] || req.params['id'],
      action,
      userId: user?.id || user?.userId || user?._id,
      userRole: user?.role,
      userEmail: user?.email,
      correlationId: req.correlationId,
      timestamp: new Date().toISOString(),
      ip: req.ip || req.connection.remoteAddress || 'unknown',
      userAgent: req.headers['user-agent'],
      details,
      success,
      error,
    };
  }

  private isCriticalOperation(action: string): boolean {
    const criticalActions = ['delete', 'archive', 'publish', 'unpublish'];
    return criticalActions.includes(action);
  }
}

/**
 * Middleware to audit sensitive course operations.
 * Logs before and after operation execution.
 */
export const auditCourseOperation = (action: string, resource = 'course') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const auditor = AuditLogger.getInstance();
    const startTime = Date.now();

    // Log operation start
    const startEvent = auditor.createAuditEvent(req, resource, `${action}_start`, true, {
      method: req.method,
      path: req.path,
      body: action === 'create' || action === 'update' ? req.body : undefined,
    });
    auditor.logEvent(startEvent);

    // Override res.end to log completion
    const originalEnd = res.end;
    res.end = function (chunk?: any, encoding?: any, cb?: any) {
      const duration = Date.now() - startTime;
      const success = res.statusCode < 400;

      const endEvent = auditor.createAuditEvent(
        req,
        resource,
        `${action}_complete`,
        success,
        {
          statusCode: res.statusCode,
          duration,
          contentLength: res.getHeader('content-length'),
        },
        success ? undefined : res.statusMessage,
      );

      auditor.logEvent(endEvent);

      return originalEnd.call(this, chunk, encoding, cb);
    };

    next();
  };
};

/**
 * Middleware specifically for course CRUD operations.
 */
export const auditCourseCreate = auditCourseOperation('create');
export const auditCourseUpdate = auditCourseOperation('update');
export const auditCourseDelete = auditCourseOperation('delete');
export const auditCoursePublish = auditCourseOperation('publish');

/**
 * Middleware for chapter operations.
 */
export const auditChapterCreate = auditCourseOperation('chapter_create', 'chapter');
export const auditChapterUpdate = auditCourseOperation('chapter_update', 'chapter');
export const auditChapterDelete = auditCourseOperation('chapter_delete', 'chapter');

/**
 * Middleware for section operations.
 */
export const auditSectionCreate = auditCourseOperation('section_create', 'section');
export const auditSectionUpdate = auditCourseOperation('section_update', 'section');

/**
 * Middleware for content operations.
 */
export const auditContentCreate = auditCourseOperation('content_create', 'content');
export const auditContentUpdate = auditCourseOperation('content_update', 'content');

/**
 * Generic audit middleware for any sensitive operation.
 */
export const audit = (operation: string, resourceType?: string) => {
  return auditCourseOperation(operation, resourceType);
};

// Export singleton instance
export const auditLogger = AuditLogger.getInstance();
