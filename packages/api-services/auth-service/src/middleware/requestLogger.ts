// packages/api-services/auth-service/src/middleware/requestLogger.ts
// Request logging middleware

import { Request, Response, NextFunction } from 'express';
import { authLogger as logger } from '@yggdrasil/shared-utilities';

export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = Date.now();
  const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Log incoming request
  logger.debug('Incoming request', {
    requestId,
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip || req.connection.remoteAddress,
    timestamp: new Date().toISOString(),
  });

  // Override res.end to log response
  const originalEnd = res.end;
  res.end = function (chunk?: any, encoding?: any): any {
    const duration = Date.now() - startTime;

    logger.debug('Request completed', {
      requestId,
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration,
      timestamp: new Date().toISOString(),
    });

    // Call original end method and return its result
    return originalEnd.call(this, chunk, encoding);
  };

  next();
};
