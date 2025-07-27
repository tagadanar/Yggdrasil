// packages/api-services/auth-service/src/middleware/requestLogger.ts
// Request logging middleware

import { Request, Response, NextFunction } from 'express';

export const requestLogger = (_req: Request, _res: Response, next: NextFunction): void => {
  next();
};
