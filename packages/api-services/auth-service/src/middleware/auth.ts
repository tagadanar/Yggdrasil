// packages/api-services/auth-service/src/middleware/auth.ts
// Authentication middleware for protecting routes - now using shared utilities

import { AuthMiddleware } from '@yggdrasil/shared-utilities';
import { UserModel } from '@yggdrasil/database-schemas';

// Re-export shared middleware with user lookup for auth service
export const authenticateToken = AuthMiddleware.verifyTokenWithUserLookup(async (id: string) => {
  const user = await UserModel.findById(id);
  return user;
});

// Re-export other middleware from shared utilities for consistent naming
export const { requireRole, optionalAuth, adminOnly, staffOnly, teacherAndAbove, authenticated } =
  AuthMiddleware;
