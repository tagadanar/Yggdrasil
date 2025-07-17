// packages/api-services/user-service/src/routes/userRoutes.ts
// Protected routes with authentication and authorization

import { Router } from 'express';
import { UserController } from '../controllers/UserController';
import { 
  requireAuth, 
  requireOwnershipOrTeacherRole, 
  requireOwnershipForModification 
} from '../middleware/auth';

export const userRoutes = Router();

// Apply authentication to all routes
userRoutes.use(requireAuth);

// Admin Only Routes
// POST /api/users - Create new user (admin only)
userRoutes.post('/', UserController.createUser);

// GET /api/users - List all users (admin only)
userRoutes.get('/', UserController.listUsers);

// DELETE /api/users/:id - Delete user (admin only)
userRoutes.delete('/:id', UserController.deleteUser);

// Individual User Routes
// GET /api/users/:id - View user profile
// Students can only view their own profile
// Teachers can view any student profile
// Admins can view any profile
userRoutes.get('/:id', requireOwnershipOrTeacherRole, UserController.getUserById);

// PATCH /api/users/:id/profile - Update user profile
// Only the user themselves or admins can modify profiles
userRoutes.patch('/:id/profile', requireOwnershipForModification, UserController.updateUserProfile);

// GET /api/users/:id/preferences - Get user preferences
// Students can only view their own preferences
// Teachers can view any student preferences
// Admins can view any preferences
userRoutes.get('/:id/preferences', requireOwnershipOrTeacherRole, UserController.getUserPreferences);

// Current User Profile Routes
// GET /api/users/profile - Get current user's profile
userRoutes.get('/profile', UserController.getCurrentUserProfile);

// PUT /api/users/profile - Update current user's profile
userRoutes.put('/profile', UserController.updateCurrentUserProfile);