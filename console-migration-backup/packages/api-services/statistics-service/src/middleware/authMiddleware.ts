// packages/api-services/statistics-service/src/middleware/authMiddleware.ts
// Unified authentication middleware for statistics service using shared utilities

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
  requireOwnershipOrAdmin: requireOwnershipOrAdminOriginal,  // Ownership OR admin access
  requireOwnershipOrStaff,  // Ownership OR staff access
  requireOwnershipOrTeacher // Ownership OR teacher access
} = serviceAuth;

// Export request type for controllers
export type { AuthRequest };

// Backward compatible requireRole that accepts arrays or individual strings
export const requireRole = (roles: string[] | string) => {
  if (Array.isArray(roles)) {
    return requireRoleOriginal(...roles);
  }
  return requireRoleOriginal(roles);
};

// Statistics service specific convenience aliases (after requireRole is defined)
export const requireAdminOnly = adminOnly;
export const requireStaffOrAdmin = staffOnly;
export const requireTeacherOrAdmin = teacherAndAbove;
export const requireStudentOnly = requireRole('student');

// Backward compatible requireOwnershipOrAdmin that accepts parameter name
export const requireOwnershipOrAdmin = (userIdParam: string = 'id') => {
  return requireOwnership({ 
    userIdParam, 
    allowedRoles: ['admin', 'staff'], 
    bypassOwnership: true 
  });
};

// Legacy compatibility - custom parameter name for ownership validation
export const requireOwnershipOrAdminCustom = (userIdParam: string = 'userId') => {
  return requireOwnership({ 
    userIdParam, 
    allowedRoles: ['admin', 'staff'], 
    bypassOwnership: true 
  });
};