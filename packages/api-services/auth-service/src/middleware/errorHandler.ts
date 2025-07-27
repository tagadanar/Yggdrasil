// packages/api-services/auth-service/src/middleware/errorHandler.ts
// Global error handling middleware

import { Request, Response, NextFunction } from 'express';
import { ResponseHelper, HTTP_STATUS } from '@yggdrasil/shared-utilities';
import { authLogger as logger } from '@yggdrasil/shared-utilities/logging';

export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  logger.error('Error:', {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString(),
  });

  // Don't expose error details in production
  const isDevelopment = process.env['NODE_ENV'] === 'development';

  res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
    ResponseHelper.error(
      isDevelopment ? error.message : 'Internal server error',
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      isDevelopment ? { stack: error.stack } : undefined,
    ),
  );
};
