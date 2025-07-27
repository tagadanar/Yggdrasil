// packages/api-services/planning-service/src/middleware/authMiddleware.ts
// Unified authentication middleware for planning service using shared utilities

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
  requireRole,              // Role-based access control
  adminOnly,                // Admin only access
  staffOnly,                // Staff and admin access
  teacherAndAbove,          // Teacher, staff, and admin access
  authenticated,            // Basic authentication requirement
  requireOwnership,         // Resource ownership validation
  requireOwnershipOrAdmin,  // Ownership OR admin access
  requireOwnershipOrStaff,  // Ownership OR staff access
  requireOwnershipOrTeacher, // Ownership OR teacher access
} = serviceAuth;

// Main authentication middleware (full auth with DB lookup)
export const authenticate = authenticateToken;

// Export request type for controllers
export type { AuthRequest };
