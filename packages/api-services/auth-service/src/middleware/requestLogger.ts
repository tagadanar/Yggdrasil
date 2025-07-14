// packages/api-services/auth-service/src/middleware/requestLogger.ts
// Request logging middleware

import { Request, Response, NextFunction } from 'express';

export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  next();
};