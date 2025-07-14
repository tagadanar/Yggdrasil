// packages/api-services/user-service/src/controllers/UserController.ts
// Protected controller with authentication and authorization

import { Response } from 'express';
import { UserService, UserServiceResult } from '../services/UserService';
import { ResponseHelper, HttpStatus } from '@yggdrasil/shared-utilities';
import { AuthenticatedRequest } from '../middleware/auth';

export class UserController {
  // REFACTOR: Extract error mapping to private method
  private static handleServiceResult(res: Response, result: UserServiceResult, successMessage: string): void {
    if (result.success) {
      const response = ResponseHelper.success(result.data, successMessage);
      res.status(HttpStatus.OK).json(response);
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
}