// Path: packages/api-services/auth-service/src/middleware/authMiddleware.ts
import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/AuthService';
import { ResponseHelper, HTTP_STATUS, UserRole, AuthHelper } from '../../../../shared-utilities/src';

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
        ResponseHelper.authError('No token provided')
      );
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Use shared secure validation method (same as other services)
    const validationResult = await AuthHelper.validateAccessTokenWithDatabase(token);
    
    if (!validationResult.success) {
      res.status(HTTP_STATUS.UNAUTHORIZED).json(
        ResponseHelper.authError(validationResult.error!)
      );
      return;
    }

    // Attach validated user to request object (same format as other services)
    req.user = {
      id: validationResult.user!._id.toString(),
      _id: validationResult.user!._id.toString(),
      email: validationResult.user!.email,
      role: validationResult.user!.role,
      isActive: validationResult.user!.isActive,
      profile: validationResult.user!.profile
    };
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
          ResponseHelper.authError('User not authenticated')
        );
        return;
      }

      if (!allowedRoles.includes(user.role)) {
        res.status(HTTP_STATUS.FORBIDDEN).json(
          ResponseHelper.authorizationError('Insufficient permissions')
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
    const validationResult = await AuthHelper.validateAccessTokenWithDatabase(token);

    if (validationResult.success && validationResult.user) {
      // Valid user with valid token
      req.user = {
        id: validationResult.user._id.toString(),
        _id: validationResult.user._id.toString(),
        email: validationResult.user.email,
        role: validationResult.user.role,
        isActive: validationResult.user.isActive,
        profile: validationResult.user.profile
      };
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
          ResponseHelper.authError('User not authenticated')
        );
        return;
      }

      // Allow if user is admin or owns the resource
      if (user.role === 'admin' || user._id.toString() === resourceUserId) {
        next();
        return;
      }

      res.status(HTTP_STATUS.FORBIDDEN).json(
        ResponseHelper.authorizationError('Access denied')
      );
    } catch (error: any) {
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
        ResponseHelper.internalError('Authorization failed')
      );
    }
  };
};