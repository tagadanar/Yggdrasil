// packages/api-services/user-service/src/routes/userRoutes.ts
// Protected routes with authentication, authorization, and validation

import { Router } from 'express';
import { UserController } from '../controllers/UserController';
import {
  requireAuth,
  requireOwnershipOrTeacherRole,
  requireOwnershipForModification,
  requireRole,
} from '../middleware/auth';
import {
  validateBody,
  validateQuery,
  validateParams,
  sanitizeRequest,
  validateRequestSize,
} from '../middleware/validation';
import {
  auditUserCreation,
  auditUserUpdate,
  auditUserDeletion,
  auditProfileUpdate,
  auditUserAccess,
  auditUserList,
  auditPreferencesAccess,
  trackFailedAuth,
  auditRateLimit,
} from '../middleware/audit';
import {
  CreateUserSchema,
  UpdateUserSchema,
  UpdateUserProfileSchema,
  ListUsersQuerySchema,
  UserParamsSchema,
} from '../validation/user-schemas';

export const userRoutes = Router();

// Apply global middleware to all routes
userRoutes.use(requireAuth);
userRoutes.use(sanitizeRequest);
userRoutes.use(validateRequestSize(2 * 1024 * 1024)); // 2MB limit
userRoutes.use(trackFailedAuth); // Track authentication failures
userRoutes.use(auditRateLimit); // Track rate limiting events

// Admin Only Routes
// POST /api/users - Create new user (admin only)
userRoutes.post(
  '/',
  requireRole(['admin']),
  validateBody(CreateUserSchema, { sanitize: true }),
  auditUserCreation,
  UserController.createUser,
);

// GET /api/users - List all users (admin and staff)
userRoutes.get(
  '/',
  requireRole(['admin', 'staff']),
  validateQuery(ListUsersQuerySchema),
  auditUserList,
  UserController.listUsers,
);

// Current User Profile Routes (must come before /:id routes)
// GET /api/users/profile - Get current user's profile
userRoutes.get('/profile', auditUserAccess, UserController.getCurrentUserProfile);

// PUT /api/users/profile - Update current user's profile
userRoutes.put(
  '/profile',
  validateBody(UpdateUserProfileSchema, { sanitize: true }),
  auditProfileUpdate,
  UserController.updateCurrentUserProfile,
);

// DELETE /api/users/:id - Delete user (admin only)
userRoutes.delete(
  '/:id',
  requireRole(['admin']),
  validateParams(UserParamsSchema),
  auditUserDeletion,
  UserController.deleteUser,
);

// Individual User Routes
// GET /api/users/:id - View user profile
// Students can only view their own profile
// Teachers can view any student profile
// Admins can view any profile
userRoutes.get(
  '/:id',
  validateParams(UserParamsSchema),
  requireOwnershipOrTeacherRole,
  auditUserAccess,
  UserController.getUserById,
);

// PUT /api/users/:id - Full user update (admin only)
userRoutes.put(
  '/:id',
  requireRole(['admin']),
  validateParams(UserParamsSchema),
  validateBody(UpdateUserSchema, { sanitize: true }),
  auditUserUpdate,
  UserController.updateUser,
);

// PATCH /api/users/:id/profile - Update user profile
// Only the user themselves or admins can modify profiles
userRoutes.patch(
  '/:id/profile',
  validateParams(UserParamsSchema),
  validateBody(UpdateUserProfileSchema, { sanitize: true }),
  requireOwnershipForModification,
  auditProfileUpdate,
  UserController.updateUserProfile,
);

// GET /api/users/:id/preferences - Get user preferences
// Students can only view their own preferences
// Teachers can view any student preferences
// Admins can view any preferences
userRoutes.get(
  '/:id/preferences',
  validateParams(UserParamsSchema),
  requireOwnershipOrTeacherRole,
  auditPreferencesAccess,
  UserController.getUserPreferences,
);
