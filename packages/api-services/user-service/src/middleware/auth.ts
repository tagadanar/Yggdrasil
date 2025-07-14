// packages/api-services/user-service/src/middleware/auth.ts
// Authentication middleware for user service

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserModel } from '@yggdrasil/database-schemas';
import { ResponseHelper } from '@yggdrasil/shared-utilities';

interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
    tokenVersion?: number;
  };
}

export interface JWTPayload {
  id: string;  // Changed from userId to id to match auth service
  email: string;
  role: string;
  type: 'access' | 'refresh';
  tokenVersion?: number;
  iat: number;
  exp: number;
}

export const requireAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      const errorResponse = ResponseHelper.error('No token provided', 401);
      return res.status(errorResponse.statusCode).json(errorResponse);
    }

    if (!authHeader.startsWith('Bearer ')) {
      const errorResponse = ResponseHelper.error('Invalid authorization format', 401);
      return res.status(errorResponse.statusCode).json(errorResponse);
    }

    const token = authHeader.slice(7); // Remove 'Bearer ' prefix

    if (!token) {
      const errorResponse = ResponseHelper.error('No token provided', 401);
      return res.status(errorResponse.statusCode).json(errorResponse);
    }

    // Verify JWT token
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error('JWT_SECRET environment variable is not set');
      const errorResponse = ResponseHelper.error('Internal server error', 500);
      return res.status(errorResponse.statusCode).json(errorResponse);
    }

    let decoded: JWTPayload;
    try {
      decoded = jwt.verify(token, jwtSecret) as JWTPayload;
    } catch (jwtError: any) {
      let errorMessage = 'Invalid token';
      if (jwtError.name === 'TokenExpiredError') {
        errorMessage = 'Token expired';
      } else if (jwtError.name === 'JsonWebTokenError') {
        errorMessage = 'Invalid token';
      }
      
      const errorResponse = ResponseHelper.error(errorMessage, 401);
      return res.status(errorResponse.statusCode).json(errorResponse);
    }

    // Validate token type
    if (decoded.type !== 'access') {
      const errorResponse = ResponseHelper.error('Invalid token type', 401);
      return res.status(errorResponse.statusCode).json(errorResponse);
    }

    // Verify user exists and is active
    const user = await UserModel.findById(decoded.id);
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
      userId: decoded.id,
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