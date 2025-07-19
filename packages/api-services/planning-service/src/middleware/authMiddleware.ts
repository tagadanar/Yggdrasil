// packages/api-services/planning-service/src/middleware/authMiddleware.ts
// Authentication middleware for planning service - now using shared utilities

import { AuthMiddleware } from '@yggdrasil/shared-utilities';
import { UserModel } from '@yggdrasil/database-schemas';

// Use centralized auth middleware with user lookup for consistency
export const authenticate = AuthMiddleware.verifyTokenWithUserLookup(
  async (id: string) => {
    return await UserModel.findById(id).select('-password');
  }
);

// Re-export role middleware from shared utilities
export const requireRole = AuthMiddleware.requireRole;