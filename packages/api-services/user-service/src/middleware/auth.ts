// packages/api-services/user-service/src/middleware/auth.ts
// Unified authentication middleware for user service using shared utilities

import { AuthFactory, AuthRequest } from '@yggdrasil/shared-utilities';
import { UserModel } from '@yggdrasil/database-schemas';

// Create service-specific auth middleware using the factory
const serviceAuth = AuthFactory.createServiceAuth(async (id: string) => {
  return await UserModel.findById(id);
});

// Export all standard auth middleware
export const {
  authenticateToken,        // Full auth with DB lookup
  verifyToken,              // Fast token-only verification
  optionalAuth,             // Optional authentication
  requireRole: requireRoleOriginal, // Role-based access control (renamed to avoid conflict)
  adminOnly,                // Admin only access
  staffOnly,                // Staff and admin access
  teacherAndAbove,          // Teacher, staff, and admin access
  authenticated,            // Basic authentication requirement
  requireOwnership,         // Resource ownership validation
  requireOwnershipOrAdmin,  // Ownership OR admin access
  requireOwnershipOrStaff,  // Ownership OR staff access
  requireOwnershipOrTeacher // Ownership OR teacher access
} = serviceAuth;

// Export the main authentication middleware
export const requireAuth = authenticateToken;

// Legacy compatibility exports for existing routes
export const requireOwnershipOrTeacherRole = requireOwnershipOrTeacher;
export const requireOwnershipForModification = requireOwnershipOrAdmin;

// Backward compatible requireRole that accepts arrays or individual strings
export const requireRole = (roles: string[] | string) => {
  if (Array.isArray(roles)) {
    return requireRoleOriginal(...roles);
  }
  return requireRoleOriginal(roles);
};

// Export request type for controllers
export type { AuthRequest };

// Legacy compatibility type exports
export type AuthenticatedRequest = AuthRequest;