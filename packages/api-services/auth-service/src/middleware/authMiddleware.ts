// Path: packages/api-services/auth-service/src/middleware/authMiddleware.ts
import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/AuthService';
import { ResponseHelper, HTTP_STATUS, UserRole } from '../../../../shared-utilities/src';

// Extend Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

/**
 * Authentication middleware to verify JWT token and attach user to request
 */
export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(HTTP_STATUS.UNAUTHORIZED).json(
        ResponseHelper.error('Access token required')
      );
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Validate token and get user
    const result = await AuthService.validateAccessToken(token);

    if (!result.success) {
      res.status(HTTP_STATUS.UNAUTHORIZED).json(
        ResponseHelper.error(result.error!)
      );
      return;
    }

    // Attach user to request object
    req.user = result.user;
    next();
  } catch (error: any) {
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
      ResponseHelper.internalError('Authentication failed')
    );
  }
};

/**
 * Role-based authorization middleware
 * @param allowedRoles - Array of roles that are allowed to access the route
 */
export const requireRole = (allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const user = req.user;

      if (!user) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json(
          ResponseHelper.error('User not authenticated')
        );
        return;
      }

      if (!allowedRoles.includes(user.role)) {
        res.status(HTTP_STATUS.FORBIDDEN).json(
          ResponseHelper.error('Insufficient permissions')
        );
        return;
      }

      next();
    } catch (error: any) {
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
        ResponseHelper.internalError('Authorization failed')
      );
    }
  };
};

/**
 * Optional authentication middleware - doesn't fail if no token provided
 * Useful for routes that work with or without authentication
 */
export const optionalAuthMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // No token provided, continue without user
      next();
      return;
    }

    const token = authHeader.substring(7);
    const result = await AuthService.validateAccessToken(token);

    if (result.success) {
      req.user = result.user;
    }
    // Continue regardless of token validation result

    next();
  } catch (error: any) {
    // Don't fail the request, just continue without user
    next();
  }
};

/**
 * Middleware to check if user owns the resource or has admin privileges
 * @param getUserIdFromParams - Function to extract user ID from request params
 */
export const requireOwnershipOrAdmin = (
  getUserIdFromParams: (req: Request) => string
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const user = req.user;
      const resourceUserId = getUserIdFromParams(req);

      if (!user) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json(
          ResponseHelper.error('User not authenticated')
        );
        return;
      }

      // Allow if user is admin or owns the resource
      if (user.role === 'admin' || user._id.toString() === resourceUserId) {
        next();
        return;
      }

      res.status(HTTP_STATUS.FORBIDDEN).json(
        ResponseHelper.error('Access denied')
      );
    } catch (error: any) {
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
        ResponseHelper.internalError('Authorization failed')
      );
    }
  };
};