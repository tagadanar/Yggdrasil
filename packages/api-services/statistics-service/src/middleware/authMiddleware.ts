// packages/api-services/statistics-service/src/middleware/authMiddleware.ts
// Authentication middleware for statistics service - now using shared utilities

import { AuthMiddleware } from '@yggdrasil/shared-utilities';
import { UserModel } from '@yggdrasil/database-schemas';
import { Request, Response, NextFunction } from 'express';
import { type AuthRequest } from '@yggdrasil/shared-utilities';

// Use centralized auth middleware with user lookup for consistency
export const authenticateToken = AuthMiddleware.verifyTokenWithUserLookup(
  async (id: string) => {
    return await UserModel.findById(id);
  }
);

// Re-export centralized middleware from shared utilities
export const {
  requireRole,
  adminOnly: requireAdminOnly,
  staffOnly: requireStaffOrAdmin,
  teacherAndAbove: requireTeacherOrAdmin,
} = AuthMiddleware;

// Custom role middleware for statistics service specific roles
export const requireStudentOnly = AuthMiddleware.requireRole('student');

// User ownership verification middleware - ensures users can only access their own data
export const requireOwnershipOrAdmin = (userIdParam: string = 'userId') => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
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
      res.status(403).json({
        success: false,
        error: 'Access denied: can only access your own data'
      });
      return;
    }

    next();
  };
};