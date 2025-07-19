// packages/api-services/course-service/src/middleware/authMiddleware.ts
// Authentication middleware for course service - now using shared utilities

import { AuthMiddleware } from '@yggdrasil/shared-utilities';
import { UserModel } from '@yggdrasil/database-schemas';

// Use centralized auth middleware with user lookup for consistency
export const authenticateToken = AuthMiddleware.verifyTokenWithUserLookup(
  async (id: string) => {
    return await UserModel.findById(id);
  }
);

// Re-export centralized middleware from shared utilities
export const {
  optionalAuth,
  requireRole,
  adminOnly: requireAdminOnly,
  teacherAndAbove: requireTeacherOrAdmin,
} = AuthMiddleware;

// Custom role middleware for course service specific roles
export const requireStudentOnly = AuthMiddleware.requireRole('student');