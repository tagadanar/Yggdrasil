// packages/api-services/user-service/src/middleware/auth.ts
// Authentication middleware for user service - now using shared JWT utilities

import { Request, Response, NextFunction } from 'express';
import { UserModel } from '@yggdrasil/database-schemas';
import { ResponseHelper, SharedJWTHelper } from '@yggdrasil/shared-utilities';

interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
    tokenVersion?: number;
  };
}

export const requireAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    // Extract token from Authorization header using shared utility
    const authHeader = req.headers.authorization;
    const token = SharedJWTHelper.extractTokenFromHeader(authHeader);
    
    if (!token) {
      const errorResponse = ResponseHelper.error('No token provided', 401);
      return res.status(errorResponse.statusCode).json(errorResponse);
    }

    // Verify JWT token using shared utility
    const verificationResult = SharedJWTHelper.verifyAccessToken(token);
    
    if (!verificationResult.success || !verificationResult.data) {
      const errorResponse = ResponseHelper.error(
        verificationResult.error || 'Invalid token', 
        401
      );
      return res.status(errorResponse.statusCode).json(errorResponse);
    }

    const decoded = verificationResult.data;

    // Get user ID (with fallback for backward compatibility)
    const userId = decoded.userId || decoded.id;
    
    if (!userId) {
      const errorResponse = ResponseHelper.error('Invalid token payload', 401);
      return res.status(errorResponse.statusCode).json(errorResponse);
    }

    // Verify user exists and is active
    const user = await UserModel.findById(userId);
    if (!user) {
      const errorResponse = ResponseHelper.error('User not found', 401);
      return res.status(errorResponse.statusCode).json(errorResponse);
    }

    if (!user.isActive) {
      const errorResponse = ResponseHelper.error('Account has been deactivated', 403);
      return res.status(errorResponse.statusCode).json(errorResponse);
    }

    // Validate token version if present (for logout from all devices)
    if (decoded.tokenVersion !== undefined && user.tokenVersion !== decoded.tokenVersion) {
      const errorResponse = ResponseHelper.error('Invalid token', 401);
      return res.status(errorResponse.statusCode).json(errorResponse);
    }

    // Validate role consistency between token and database
    if (decoded.role !== user.role) {
      const errorResponse = ResponseHelper.error('Token role mismatch with current user role', 403);
      return res.status(errorResponse.statusCode).json(errorResponse);
    }

    // Add user info to request object
    req.user = {
      userId: userId,
      email: decoded.email,
      role: decoded.role,
      tokenVersion: decoded.tokenVersion
    };

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    const errorResponse = ResponseHelper.error('Internal server error', 500);
    return res.status(errorResponse.statusCode).json(errorResponse);
  }
};

export const requireRole = (allowedRoles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      const errorResponse = ResponseHelper.error('Authentication required', 401);
      return res.status(errorResponse.statusCode).json(errorResponse);
    }

    if (!allowedRoles.includes(req.user.role)) {
      const errorResponse = ResponseHelper.error('Insufficient permissions for this operation', 403);
      return res.status(errorResponse.statusCode).json(errorResponse);
    }

    next();
  };
};

export const requireOwnershipOrRole = (allowedRoles: string[] = ['admin']) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      const errorResponse = ResponseHelper.error('Authentication required', 401);
      return res.status(errorResponse.statusCode).json(errorResponse);
    }

    const requestedUserId = req.params.id;
    const isOwner = req.user.userId === requestedUserId;
    const hasPermittedRole = allowedRoles.includes(req.user.role);

    // Allow if user is accessing their own data OR has permitted role
    if (isOwner || hasPermittedRole) {
      next();
    } else {
      const errorResponse = ResponseHelper.error('Insufficient permissions to access this resource', 403);
      return res.status(errorResponse.statusCode).json(errorResponse);
    }
  };
};

export const requireOwnershipOrTeacherRole = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    const errorResponse = ResponseHelper.error('Authentication required', 401);
    return res.status(errorResponse.statusCode).json(errorResponse);
  }

  const requestedUserId = req.params.id;
  const isOwner = req.user.userId === requestedUserId;
  const isTeacherOrAdmin = ['teacher', 'admin'].includes(req.user.role);

  if (isOwner || isTeacherOrAdmin) {
    next();
  } else {
    const errorResponse = ResponseHelper.error('Insufficient permissions to access this resource', 403);
    return res.status(errorResponse.statusCode).json(errorResponse);
  }
};

export const requireOwnershipForModification = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    const errorResponse = ResponseHelper.error('Authentication required', 401);
    return res.status(errorResponse.statusCode).json(errorResponse);
  }

  const requestedUserId = req.params.id;
  const isOwner = req.user.userId === requestedUserId;
  const isAdmin = req.user.role === 'admin';

  // Only owners or admins can modify user data
  if (isOwner || isAdmin) {
    next();
  } else {
    const errorResponse = ResponseHelper.error('Insufficient permissions to modify this resource', 403);
    return res.status(errorResponse.statusCode).json(errorResponse);
  }
};

export type { AuthenticatedRequest };