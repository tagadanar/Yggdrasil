// packages/api-services/user-service/src/routes/userRoutes.ts
// Protected routes with authentication and authorization

import { Router } from 'express';
import { UserController } from '../controllers/UserController';
import { 
  requireAuth, 
  requireOwnershipOrTeacherRole, 
  requireOwnershipForModification,
  requireRole
} from '../middleware/auth';

export const userRoutes = Router();

// Apply authentication to all routes
userRoutes.use(requireAuth);

// Admin Only Routes
// POST /api/users - Create new user (admin only)
userRoutes.post('/', requireRole(['admin']), UserController.createUser);

// GET /api/users - List all users (admin and staff)
userRoutes.get('/', requireRole(['admin', 'staff']), UserController.listUsers);

// Current User Profile Routes (must come before /:id routes)
// GET /api/users/profile - Get current user's profile
userRoutes.get('/profile', UserController.getCurrentUserProfile);

// PUT /api/users/profile - Update current user's profile
userRoutes.put('/profile', UserController.updateCurrentUserProfile);

// DELETE /api/users/:id - Delete user (admin only)
userRoutes.delete('/:id', requireRole(['admin']), UserController.deleteUser);

// Individual User Routes
// GET /api/users/:id - View user profile
// Students can only view their own profile
// Teachers can view any student profile
// Admins can view any profile
userRoutes.get('/:id', requireOwnershipOrTeacherRole, UserController.getUserById);

// PUT /api/users/:id - Full user update (admin only)
userRoutes.put('/:id', requireRole(['admin']), UserController.updateUser);

// PATCH /api/users/:id/profile - Update user profile
// Only the user themselves or admins can modify profiles
userRoutes.patch('/:id/profile', requireOwnershipForModification, UserController.updateUserProfile);

// GET /api/users/:id/preferences - Get user preferences
// Students can only view their own preferences
// Teachers can view any student preferences
// Admins can view any preferences
userRoutes.get('/:id/preferences', requireOwnershipOrTeacherRole, UserController.getUserPreferences);