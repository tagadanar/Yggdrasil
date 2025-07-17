// packages/api-services/user-service/src/controllers/UserController.ts
// Protected controller with authentication and authorization

import { Response } from 'express';
import { UserService, UserServiceResult } from '../services/UserService';
import { ResponseHelper, HTTP_STATUS } from '@yggdrasil/shared-utilities';
import { AuthenticatedRequest } from '../middleware/auth';

export class UserController {
  // REFACTOR: Extract error mapping to private method
  private static handleServiceResult(res: Response, result: UserServiceResult, successMessage: string): void {
    if (result.success) {
      const response = ResponseHelper.success(result.data, successMessage);
      res.status(HTTP_STATUS.OK).json(response);
    } else {
      // REFACTOR: Cleaner error mapping
      if (result.error?.includes('Invalid user ID') || result.error?.includes('Invalid profile data')) {
        const errorResponse = ResponseHelper.badRequest(result.error);
        res.status(errorResponse.statusCode).json(errorResponse);
      } else if (result.error === 'User not found') {
        const errorResponse = ResponseHelper.notFound('User');
        res.status(errorResponse.statusCode).json(errorResponse);
      } else {
        const errorResponse = ResponseHelper.error(result.error || 'Internal server error');
        res.status(errorResponse.statusCode).json(errorResponse);
      }
    }
  }

  // Protected: Get user by ID with authentication
  static async getUserById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const result = await UserService.getUserById(id);
      UserController.handleServiceResult(res, result, 'User retrieved successfully');
    } catch (error) {
      const errorResponse = ResponseHelper.error('Internal server error');
      res.status(errorResponse.statusCode).json(errorResponse);
    }
  }

  // Protected: Update user profile with authentication
  static async updateUserProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const profileData = req.body;
      
      const result = await UserService.updateUserProfile(id, profileData);
      UserController.handleServiceResult(res, result, 'Profile updated successfully');
    } catch (error) {
      const errorResponse = ResponseHelper.error('Internal server error');
      res.status(errorResponse.statusCode).json(errorResponse);
    }
  }

  // Protected: Get user preferences with authentication
  static async getUserPreferences(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const result = await UserService.getUserPreferences(id);
      UserController.handleServiceResult(res, result, 'Preferences retrieved successfully');
    } catch (error) {
      const errorResponse = ResponseHelper.error('Internal server error');
      res.status(errorResponse.statusCode).json(errorResponse);
    }
  }

  // Admin Only: Create new user
  static async createUser(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      // Check if user is admin
      if (!req.user || req.user.role !== 'admin') {
        const errorResponse = ResponseHelper.forbidden('Only administrators can create users');
        res.status(errorResponse.statusCode).json(errorResponse);
        return;
      }

      const userData = req.body;
      const result = await UserService.createUser(userData);
      
      if (result.success) {
        const response = ResponseHelper.success(result.data, 'User created successfully');
        res.status(HTTP_STATUS.CREATED).json(response);
      } else {
        if (result.error?.includes('already exists')) {
          const errorResponse = ResponseHelper.conflict(result.error);
          res.status(errorResponse.statusCode).json(errorResponse);
        } else if (result.error?.includes('Validation error')) {
          const errorResponse = ResponseHelper.validationError([{field: 'general', message: result.error}]);
          res.status(errorResponse.statusCode).json(errorResponse);
        } else {
          const errorResponse = ResponseHelper.error(result.error || 'Failed to create user');
          res.status(errorResponse.statusCode).json(errorResponse);
        }
      }
    } catch (error) {
      const errorResponse = ResponseHelper.error('Internal server error');
      res.status(errorResponse.statusCode).json(errorResponse);
    }
  }

  // Admin Only: List all users
  static async listUsers(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      // Check if user is admin
      if (!req.user || req.user.role !== 'admin') {
        const errorResponse = ResponseHelper.forbidden('Only administrators can list users');
        res.status(errorResponse.statusCode).json(errorResponse);
        return;
      }

      const { role, limit, offset } = req.query;
      const result = await UserService.listUsers({
        role: role as string,
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined
      });
      
      if (result.success) {
        const response = ResponseHelper.success(result.data, 'Users retrieved successfully');
        res.status(HTTP_STATUS.OK).json(response);
      } else {
        const errorResponse = ResponseHelper.error(result.error || 'Failed to retrieve users');
        res.status(errorResponse.statusCode).json(errorResponse);
      }
    } catch (error) {
      const errorResponse = ResponseHelper.error('Internal server error');
      res.status(errorResponse.statusCode).json(errorResponse);
    }
  }

  // Admin Only: Delete user
  static async deleteUser(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      // Check if user is admin
      if (!req.user || req.user.role !== 'admin') {
        const errorResponse = ResponseHelper.forbidden('Only administrators can delete users');
        res.status(errorResponse.statusCode).json(errorResponse);
        return;
      }

      const { id } = req.params;
      
      // Prevent self-deletion
      if (req.user.userId === id) {
        const errorResponse = ResponseHelper.forbidden('Cannot delete your own account');
        res.status(errorResponse.statusCode).json(errorResponse);
        return;
      }
      
      const result = await UserService.deleteUser(id);
      
      if (result.success) {
        const response = ResponseHelper.success(null, 'User deleted successfully');
        res.status(HTTP_STATUS.OK).json(response);
      } else {
        if (result.error === 'User not found') {
          const errorResponse = ResponseHelper.notFound('User');
          res.status(errorResponse.statusCode).json(errorResponse);
        } else {
          const errorResponse = ResponseHelper.error(result.error || 'Failed to delete user');
          res.status(errorResponse.statusCode).json(errorResponse);
        }
      }
    } catch (error) {
      const errorResponse = ResponseHelper.error('Internal server error');
      res.status(errorResponse.statusCode).json(errorResponse);
    }
  }

  // Protected: Get current user's profile
  static async getCurrentUserProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user || !req.user.userId) {
        const errorResponse = ResponseHelper.unauthorized('Authentication required');
        res.status(errorResponse.statusCode).json(errorResponse);
        return;
      }

      const result = await UserService.getUserById(req.user.userId);
      UserController.handleServiceResult(res, result, 'Profile retrieved successfully');
    } catch (error) {
      const errorResponse = ResponseHelper.error('Internal server error');
      res.status(errorResponse.statusCode).json(errorResponse);
    }
  }

  // Protected: Update current user's profile
  static async updateCurrentUserProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user || !req.user.userId) {
        const errorResponse = ResponseHelper.unauthorized('Authentication required');
        res.status(errorResponse.statusCode).json(errorResponse);
        return;
      }

      const profileData = req.body;
      const result = await UserService.updateUserProfile(req.user.userId, profileData);
      UserController.handleServiceResult(res, result, 'Profile updated successfully');
    } catch (error) {
      const errorResponse = ResponseHelper.error('Internal server error');
      res.status(errorResponse.statusCode).json(errorResponse);
    }
  }
}