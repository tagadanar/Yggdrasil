// Path: packages/api-services/user-service/src/controllers/UserController.ts
import { Request, Response } from 'express';
import { UserService } from '../services/UserService';
import { ResponseHelper, HTTP_STATUS } from '../../../../shared-utilities/src';

export class UserController {
  /**
   * Get user profile
   */
  static async getProfile(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.params.id || req.user?._id;
      
      if (!userId) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          ResponseHelper.error('User ID is required')
        );
        return;
      }

      const result = await UserService.getUserProfile(userId);

      if (!result.success) {
        const status = result.error?.includes('not found') ? HTTP_STATUS.NOT_FOUND : HTTP_STATUS.BAD_REQUEST;
        res.status(status).json(ResponseHelper.error(result.error!));
        return;
      }

      res.status(HTTP_STATUS.OK).json(ResponseHelper.success(result.user));
    } catch (error: any) {
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
        ResponseHelper.internalError('Failed to get user profile')
      );
    }
  }

  /**
   * Update user profile
   */
  static async updateProfile(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.params.id || req.user?._id;
      const updateData = req.body;

      if (!userId) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          ResponseHelper.error('User ID is required')
        );
        return;
      }

      const result = await UserService.updateUserProfile(userId, updateData);

      if (!result.success) {
        const status = result.error?.includes('not found') ? HTTP_STATUS.NOT_FOUND : HTTP_STATUS.BAD_REQUEST;
        res.status(status).json(ResponseHelper.error(result.error!));
        return;
      }

      res.status(HTTP_STATUS.OK).json(ResponseHelper.success(result.user));
    } catch (error: any) {
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
        ResponseHelper.internalError('Failed to update user profile')
      );
    }
  }

  /**
   * Update user preferences
   */
  static async updatePreferences(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?._id;
      const preferences = req.body;

      if (!userId) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json(
          ResponseHelper.error('Authentication required')
        );
        return;
      }

      const result = await UserService.updateUserPreferences(userId, preferences);

      if (!result.success) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(ResponseHelper.error(result.error!));
        return;
      }

      res.status(HTTP_STATUS.OK).json(ResponseHelper.success(result.user));
    } catch (error: any) {
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
        ResponseHelper.internalError('Failed to update user preferences')
      );
    }
  }

  /**
   * Upload profile photo
   */
  static async uploadPhoto(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?._id;
      const file = req.file;

      if (!userId) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json(
          ResponseHelper.error('Authentication required')
        );
        return;
      }

      if (!file) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          ResponseHelper.error('No file uploaded')
        );
        return;
      }

      const fileUpload = {
        buffer: file.buffer,
        mimetype: file.mimetype,
        originalname: file.originalname,
        size: file.size
      };

      const result = await UserService.uploadProfilePhoto(userId, fileUpload);

      if (!result.success) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(ResponseHelper.error(result.error!));
        return;
      }

      res.status(HTTP_STATUS.OK).json(ResponseHelper.success({ 
        photoUrl: result.photoUrl 
      }));
    } catch (error: any) {
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
        ResponseHelper.internalError('Failed to upload profile photo')
      );
    }
  }

  /**
   * Search users
   */
  static async searchUsers(req: Request, res: Response): Promise<void> {
    try {
      const { q: query = '', role, isActive, limit = 20, offset = 0 } = req.query;

      const filters = {
        role: role as string,
        isActive: isActive ? isActive === 'true' : undefined,
        limit: Math.min(parseInt(limit as string) || 20, 100),
        offset: parseInt(offset as string) || 0
      };

      const result = await UserService.searchUsers(query as string, filters);

      if (!result.success) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(ResponseHelper.error(result.error!));
        return;
      }

      res.status(HTTP_STATUS.OK).json(ResponseHelper.success({
        users: result.users,
        total: result.total,
        pagination: {
          limit: filters.limit,
          offset: filters.offset,
          hasMore: (filters.offset + filters.limit) < (result.total || 0)
        }
      }));
    } catch (error: any) {
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
        ResponseHelper.internalError('Failed to search users')
      );
    }
  }

  /**
   * Get user activity log
   */
  static async getActivity(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.params.id || req.user?._id;
      const { action, startDate, endDate, limit = 20, offset = 0 } = req.query;

      if (!userId) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          ResponseHelper.error('User ID is required')
        );
        return;
      }

      const parseDate = (dateString: string): Date | undefined => {
        const date = new Date(dateString);
        return isNaN(date.getTime()) ? undefined : date;
      };

      const filters = {
        action: action as string,
        startDate: startDate ? parseDate(startDate as string) : undefined,
        endDate: endDate ? parseDate(endDate as string) : undefined,
        limit: Math.min(parseInt(limit as string) || 20, 100),
        offset: parseInt(offset as string) || 0
      };

      const result = await UserService.getUserActivity(userId, filters);

      if (!result.success) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(ResponseHelper.error(result.error!));
        return;
      }

      res.status(HTTP_STATUS.OK).json(ResponseHelper.success({
        activities: result.activities,
        total: result.total,
        pagination: {
          limit: filters.limit,
          offset: filters.offset,
          hasMore: (filters.offset + filters.limit) < (result.total || 0)
        }
      }));
    } catch (error: any) {
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
        ResponseHelper.internalError('Failed to get user activity')
      );
    }
  }

  /**
   * Deactivate user (admin only)
   */
  static async deactivateUser(req: Request, res: Response): Promise<void> {
    try {
      const targetUserId = req.params.id;
      const adminUserId = req.user?._id;

      if (!targetUserId || !adminUserId) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          ResponseHelper.error('User ID is required')
        );
        return;
      }

      const result = await UserService.deactivateUser(targetUserId, adminUserId);

      if (!result.success) {
        const status = result.error?.includes('permission') ? HTTP_STATUS.FORBIDDEN : HTTP_STATUS.BAD_REQUEST;
        res.status(status).json(ResponseHelper.error(result.error!));
        return;
      }

      res.status(HTTP_STATUS.OK).json(ResponseHelper.success({ 
        message: result.message 
      }));
    } catch (error: any) {
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
        ResponseHelper.internalError('Failed to deactivate user')
      );
    }
  }

  /**
   * Reactivate user (admin only)
   */
  static async reactivateUser(req: Request, res: Response): Promise<void> {
    try {
      const targetUserId = req.params.id;
      const adminUserId = req.user?._id;

      if (!targetUserId || !adminUserId) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          ResponseHelper.error('User ID is required')
        );
        return;
      }

      const result = await UserService.reactivateUser(targetUserId, adminUserId);

      if (!result.success) {
        const status = result.error?.includes('permission') ? HTTP_STATUS.FORBIDDEN : HTTP_STATUS.BAD_REQUEST;
        res.status(status).json(ResponseHelper.error(result.error!));
        return;
      }

      res.status(HTTP_STATUS.OK).json(ResponseHelper.success({ 
        message: result.message 
      }));
    } catch (error: any) {
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
        ResponseHelper.internalError('Failed to reactivate user')
      );
    }
  }
}