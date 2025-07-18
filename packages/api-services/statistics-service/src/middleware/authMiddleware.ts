// packages/api-services/statistics-service/src/middleware/authMiddleware.ts
// Authentication middleware for statistics service

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
    
    const verificationResult = SharedJWTHelper.verifyAccessToken(token);
    
    if (!verificationResult.success || !verificationResult.data) {
      res.status(HTTP_STATUS.UNAUTHORIZED).json(
        ResponseHelper.unauthorized(verificationResult.error || 'Invalid access token')
      );
      return;
    }

    req.user = verificationResult.data;
    next();
  } catch (error: any) {
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
      ResponseHelper.error('Authentication error')
    );
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

// User ownership verification middleware - ensures users can only access their own data
export const requireOwnershipOrAdmin = (userIdParam: string = 'userId') => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(HTTP_STATUS.UNAUTHORIZED).json(
        ResponseHelper.unauthorized('Authentication required')
      );
      return;
    }

    const requestedUserId = req.params[userIdParam];
    const currentUserId = req.user.userId || req.user.id || req.user._id; // Support multiple ID field formats
    const isAdmin = ['admin', 'staff'].includes(req.user.role);

    // Normalize both IDs to strings for comparison
    const normalizedRequestedId = String(requestedUserId || '').trim();
    const normalizedCurrentId = String(currentUserId || '').trim();

    // Admin/staff can access any user's data, users can only access their own
    if (!isAdmin && normalizedRequestedId !== normalizedCurrentId) {
      res.status(HTTP_STATUS.FORBIDDEN).json(
        ResponseHelper.forbidden('Access denied: can only access your own data')
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
export const requireStaffOrAdmin = requireRole(['staff', 'admin']);