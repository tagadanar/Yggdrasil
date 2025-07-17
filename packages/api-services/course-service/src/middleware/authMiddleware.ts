// packages/api-services/course-service/src/middleware/authMiddleware.ts
// Authentication middleware for course service

import { Request, Response, NextFunction } from 'express';
import { SharedJWTHelper, ResponseHelper, HTTP_STATUS, type AuthRequest } from '@yggdrasil/shared-utilities';

export const authenticateToken = async (
  req: AuthRequest, 
  res: Response, 
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(HTTP_STATUS.UNAUTHORIZED).json(
        ResponseHelper.unauthorized('Access token required')
      );
      return;
    }

    const token = authHeader.substring(7); // Remove "Bearer " prefix
    
    try {
      const decoded = SharedJWTHelper.verifyAccessToken(token);
      req.user = decoded;
      next();
    } catch (jwtError: any) {
      if (jwtError.name === 'TokenExpiredError') {
        res.status(HTTP_STATUS.UNAUTHORIZED).json(
          ResponseHelper.unauthorized('Access token expired')
        );
      } else if (jwtError.name === 'JsonWebTokenError') {
        res.status(HTTP_STATUS.UNAUTHORIZED).json(
          ResponseHelper.unauthorized('Invalid access token')
        );
      } else {
        res.status(HTTP_STATUS.UNAUTHORIZED).json(
          ResponseHelper.unauthorized('Token verification failed')
        );
      }
    }
  } catch (error: any) {
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
      ResponseHelper.error('Authentication error')
    );
  }
};

// Optional authentication - adds user info if token is present but doesn't require it
export const optionalAuth = async (
  req: AuthRequest, 
  res: Response, 
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      
      try {
        const decoded = SharedJWTHelper.verifyAccessToken(token);
        req.user = decoded;
      } catch (jwtError) {
        // Ignore token errors for optional auth
        req.user = undefined;
      }
    }
    
    next();
  } catch (error) {
    // Don't fail on optional auth errors
    next();
  }
};

// Role-based authorization middleware
export const requireRole = (allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(HTTP_STATUS.UNAUTHORIZED).json(
        ResponseHelper.unauthorized('Authentication required')
      );
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(HTTP_STATUS.FORBIDDEN).json(
        ResponseHelper.forbidden(`Access denied. Required roles: ${allowedRoles.join(', ')}`)
      );
      return;
    }

    next();
  };
};

// Specific role middleware for common cases
export const requireTeacherOrAdmin = requireRole(['teacher', 'staff', 'admin']);
export const requireAdminOnly = requireRole(['admin']);
export const requireStudentOnly = requireRole(['student']);