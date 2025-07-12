import { Request, Response, NextFunction } from 'express';
import { ResponseHelper, HTTP_STATUS, AuthHelper } from '../../../../shared-utilities/src';
import mongoose from 'mongoose';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    _id?: string;
    email: string;
    role: string;
    isActive?: boolean;
  };
}

/**
 * SECURE Authentication middleware that validates JWT tokens against the database
 * This ensures deactivated and deleted users cannot access the system
 */
export const authMiddleware = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      res.status(HTTP_STATUS.UNAUTHORIZED).json(
        ResponseHelper.authError('No token provided')
      );
      return;
    }

    // Use shared secure validation method
    const validationResult = await AuthHelper.validateAccessTokenWithDatabase(token);
    
    if (!validationResult.success) {
      res.status(HTTP_STATUS.UNAUTHORIZED).json(
        ResponseHelper.authError(validationResult.error!)
      );
      return;
    }

    // Attach validated user to request object
    req.user = {
      id: validationResult.user!._id.toString(),
      _id: validationResult.user!._id.toString(),
      email: validationResult.user!.email,
      role: validationResult.user!.role,
      isActive: validationResult.user!.isActive
    };

    next();
  } catch (error: any) {
    console.error('Auth middleware error:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
      ResponseHelper.internalError('Authentication failed')
    );
  }
};

export const requireRole = (roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(HTTP_STATUS.UNAUTHORIZED).json(
        ResponseHelper.authError('Authentication required')
      );
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(HTTP_STATUS.FORBIDDEN).json(
        ResponseHelper.authorizationError('Insufficient permissions')
      );
      return;
    }

    next();
  };
};

/**
 * Optional authentication middleware - doesn't fail if no token provided
 * Useful for routes that work with or without authentication
 * SECURITY: Rejects deleted/invalid users even in optional mode
 */
export const optionalAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      // No token provided, continue without user
      next();
      return;
    }

    // Use shared secure validation method
    const validationResult = await AuthHelper.validateAccessTokenWithDatabase(token);
    
    if (validationResult.success && validationResult.user) {
      // Valid user with valid token
      req.user = {
        id: validationResult.user._id.toString(),
        _id: validationResult.user._id.toString(),
        email: validationResult.user.email,
        role: validationResult.user.role,
        isActive: validationResult.user.isActive
      };
      next();
    } else {
      // Invalid token or deleted/inactive user - REJECT completely
      res.status(HTTP_STATUS.UNAUTHORIZED).json(
        ResponseHelper.authError(validationResult.error || 'Authentication failed')
      );
      return;
    }
  } catch (error: any) {
    // Token validation failed - REJECT completely  
    res.status(HTTP_STATUS.UNAUTHORIZED).json(
      ResponseHelper.authError('Token validation failed')
    );
    return;
  }
};