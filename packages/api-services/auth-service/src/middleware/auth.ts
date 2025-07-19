// packages/api-services/auth-service/src/middleware/auth.ts
// Authentication middleware for protecting routes - now using shared utilities

import { AuthMiddleware } from '@yggdrasil/shared-utilities';
import { UserModel } from '@yggdrasil/database-schemas';

// Re-export shared middleware with user lookup for auth service
export const authenticateToken = AuthMiddleware.verifyTokenWithUserLookup(
  async (id: string) => {
    return await UserModel.findById(id);
  }
);

// Re-export other middleware from shared utilities
export const {
  requireRole: authorize,
  optionalAuth,
  adminOnly,
  staffOnly,
  teacherAndAbove,
  authenticated
} = AuthMiddleware;