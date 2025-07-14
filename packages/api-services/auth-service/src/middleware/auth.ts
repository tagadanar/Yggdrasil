// packages/api-services/auth-service/src/middleware/auth.ts
// Authentication middleware for protecting routes

import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/AuthService';
import { JWTHelper } from '../utils/JWTHelper';
import { ResponseHelper, HTTP_STATUS } from '@yggdrasil/shared-utilities';

// Extend Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

/**
 * Middleware to authenticate user using JWT token
 */
export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    const token = JWTHelper.extractTokenFromHeader(authHeader);

    if (!token) {
      res.status(HTTP_STATUS.UNAUTHORIZED).json(
        ResponseHelper.unauthorized('Access token is required')
      );
      return;
    }

    // Verify user with token
    const result = await AuthService.verifyUser(token);

    if (!result.success) {
      res.status(HTTP_STATUS.UNAUTHORIZED).json(
        ResponseHelper.unauthorized(result.error!)
      );
      return;
    }

    // Attach user to request object
    req.user = result.user;
    next();
  } catch (error) {
    console.error('Authentication middleware error:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
      ResponseHelper.error('Authentication failed')
    );
  }
};

/**
 * Middleware to check user role authorization
 */
export const authorize = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const user = req.user;

      if (!user) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json(
          ResponseHelper.unauthorized('User not authenticated')
        );
        return;
      }

      if (!allowedRoles.includes(user.role)) {
        res.status(HTTP_STATUS.FORBIDDEN).json(
          ResponseHelper.forbidden('Insufficient permissions')
        );
        return;
      }

      next();
    } catch (error) {
      console.error('Authorization middleware error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
        ResponseHelper.error('Authorization failed')
      );
    }
  };
};

/**
 * Optional authentication middleware - doesn't fail if no token
 */
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = JWTHelper.extractTokenFromHeader(authHeader);

    if (token) {
      const result = await AuthService.verifyUser(token);
      if (result.success) {
        req.user = result.user;
      }
    }

    next();
  } catch (error) {
    console.error('Optional auth middleware error:', error);
    // Don't fail the request, just continue without user
    next();
  }
};