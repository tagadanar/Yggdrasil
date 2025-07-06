// Path: packages/api-services/notification-service/src/controllers/NotificationController.ts
import { Request, Response } from 'express';

// Extend Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
      };
    }
  }
}
import { NotificationService } from '../services/NotificationService';
import {
  CreateNotificationData,
  UpdateNotificationData,
  CreateTemplateData,
  UpdateTemplateData,
  UpdatePreferenceData,
  BulkNotificationRequest,
  NotificationFilter,
  NotificationType,
  NotificationChannel,
  NotificationPriority,
  NotificationCategory,
  NotificationStatus
} from '../types/notification';

export class NotificationController {
  /**
   * Create a new notification
   */
  static async createNotification(req: Request, res: Response): Promise<void> {
    try {
      const notificationData: CreateNotificationData = req.body;
      const senderId = req.user?.id;

      // Validate required fields
      if (!notificationData.title || !notificationData.message || !notificationData.recipients) {
        res.status(400).json({
          success: false,
          error: 'Title, message, and recipients are required'
        });
        return;
      }

      const result = await NotificationService.createNotification(notificationData, senderId);

      if (result.success) {
        res.status(201).json({
          success: true,
          data: result.notification,
          message: 'Notification created successfully'
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error
        });
      }
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: `Failed to create notification: ${error.message}`
      });
    }
  }

  /**
   * Get notification by ID
   */
  static async getNotification(req: Request, res: Response): Promise<void> {
    try {
      const { notificationId } = req.params;
      const userId = req.user?.id;

      const result = await NotificationService.getNotification(notificationId, userId);

      if (result.success) {
        res.status(200).json({
          success: true,
          data: result.notification,
          message: 'Notification retrieved successfully'
        });
      } else {
        res.status(result.error?.includes('not found') ? 404 : 403).json({
          success: false,
          error: result.error
        });
      }
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: `Failed to get notification: ${error.message}`
      });
    }
  }

  /**
   * Update notification
   */
  static async updateNotification(req: Request, res: Response): Promise<void> {
    try {
      const { notificationId } = req.params;
      const updateData: UpdateNotificationData = req.body;
      const userId = req.user?.id;

      const result = await NotificationService.updateNotification(notificationId, updateData, userId);

      if (result.success) {
        res.status(200).json({
          success: true,
          data: result.notification,
          message: 'Notification updated successfully'
        });
      } else {
        res.status(result.error?.includes('not found') ? 404 : 403).json({
          success: false,
          error: result.error
        });
      }
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: `Failed to update notification: ${error.message}`
      });
    }
  }

  /**
   * Delete notification
   */
  static async deleteNotification(req: Request, res: Response): Promise<void> {
    try {
      const { notificationId } = req.params;
      const userId = req.user?.id;

      const result = await NotificationService.deleteNotification(notificationId, userId);

      if (result.success) {
        res.status(200).json({
          success: true,
          message: result.message
        });
      } else {
        res.status(result.error?.includes('not found') ? 404 : 403).json({
          success: false,
          error: result.error
        });
      }
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: `Failed to delete notification: ${error.message}`
      });
    }
  }

  /**
   * Search notifications
   */
  static async searchNotifications(req: Request, res: Response): Promise<void> {
    try {
      const filters: NotificationFilter = {
        types: req.query.types ? (req.query.types as string).split(',') as NotificationType[] : undefined,
        categories: req.query.categories ? (req.query.categories as string).split(',') as NotificationCategory[] : undefined,
        priorities: req.query.priorities ? (req.query.priorities as string).split(',') as NotificationPriority[] : undefined,
        status: req.query.status ? (req.query.status as string).split(',') as NotificationStatus[] : undefined,
        channels: req.query.channels ? (req.query.channels as string).split(',') as NotificationChannel[] : undefined,
        userId: req.query.userId as string,
        senderId: req.query.senderId as string,
        dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined,
        dateTo: req.query.dateTo ? new Date(req.query.dateTo as string) : undefined,
        isRead: req.query.isRead ? req.query.isRead === 'true' : undefined,
        tags: req.query.tags ? (req.query.tags as string).split(',') : undefined,
        source: req.query.source as string,
        searchTerm: req.query.searchTerm as string,
        sortBy: req.query.sortBy as string,
        sortOrder: req.query.sortOrder as 'asc' | 'desc',
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
        offset: req.query.offset ? parseInt(req.query.offset as string, 10) : undefined
      };

      const userId = req.user?.id;
      const result = await NotificationService.searchNotifications(filters, userId);

      if (result.success) {
        res.status(200).json({
          success: true,
          data: result.notifications,
          pagination: result.pagination,
          message: 'Notifications retrieved successfully'
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error
        });
      }
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: `Failed to search notifications: ${error.message}`
      });
    }
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(req: Request, res: Response): Promise<void> {
    try {
      const { notificationId } = req.params;
      const { channel } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      const result = await NotificationService.markAsRead(notificationId, userId, channel);

      if (result.success) {
        res.status(200).json({
          success: true,
          data: result.notification,
          message: result.message
        });
      } else {
        res.status(result.error?.includes('not found') ? 404 : 403).json({
          success: false,
          error: result.error
        });
      }
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: `Failed to mark notification as read: ${error.message}`
      });
    }
  }

  /**
   * Send bulk notifications
   */
  static async sendBulkNotifications(req: Request, res: Response): Promise<void> {
    try {
      const bulkRequest: BulkNotificationRequest = req.body;
      const senderId = req.user?.id;

      // Validate required fields
      if (!bulkRequest.title || !bulkRequest.message || !bulkRequest.recipients) {
        res.status(400).json({
          success: false,
          error: 'Title, message, and recipients are required'
        });
        return;
      }

      const result = await NotificationService.sendBulkNotifications(bulkRequest, senderId);

      if (result.success) {
        res.status(201).json({
          success: true,
          data: result.notifications,
          message: result.message
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error
        });
      }
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: `Failed to send bulk notifications: ${error.message}`
      });
    }
  }

  /**
   * Create notification template
   */
  static async createTemplate(req: Request, res: Response): Promise<void> {
    try {
      const templateData: CreateTemplateData = req.body;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      // Validate required fields
      if (!templateData.name || !templateData.title || !templateData.messageTemplate) {
        res.status(400).json({
          success: false,
          error: 'Name, title, and message template are required'
        });
        return;
      }

      const result = await NotificationService.createTemplate(templateData, userId);

      if (result.success) {
        res.status(201).json({
          success: true,
          data: result.template,
          message: 'Template created successfully'
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error
        });
      }
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: `Failed to create template: ${error.message}`
      });
    }
  }

  /**
   * Get user notification preferences
   */
  static async getUserPreferences(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      const result = await NotificationService.getUserPreferences(userId);

      if (result.success) {
        res.status(200).json({
          success: true,
          data: result.preference,
          message: 'Preferences retrieved successfully'
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error
        });
      }
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: `Failed to get user preferences: ${error.message}`
      });
    }
  }

  /**
   * Update user notification preferences
   */
  static async updateUserPreferences(req: Request, res: Response): Promise<void> {
    try {
      const updateData: UpdatePreferenceData = req.body;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      const result = await NotificationService.updateUserPreferences(userId, updateData);

      if (result.success) {
        res.status(200).json({
          success: true,
          data: result.preference,
          message: 'Preferences updated successfully'
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error
        });
      }
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: `Failed to update user preferences: ${error.message}`
      });
    }
  }

  /**
   * Get notification statistics
   */
  static async getNotificationStats(req: Request, res: Response): Promise<void> {
    try {
      const { timeframe = 'last_30_days' } = req.query;
      const userId = req.query.userId as string || req.user?.id;

      const result = await NotificationService.getNotificationStats(userId, timeframe as string);

      if (result.success) {
        res.status(200).json({
          success: true,
          data: (result as any).data,
          message: 'Statistics retrieved successfully'
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error
        });
      }
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: `Failed to get notification statistics: ${error.message}`
      });
    }
  }

  /**
   * Get user's unread notifications count
   */
  static async getUnreadCount(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      const filters: NotificationFilter = {
        userId,
        isRead: false
      };

      const result = await NotificationService.searchNotifications(filters, userId);

      if (result.success) {
        res.status(200).json({
          success: true,
          data: {
            unreadCount: result.notifications?.length || 0
          },
          message: 'Unread count retrieved successfully'
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error
        });
      }
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: `Failed to get unread count: ${error.message}`
      });
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  static async markAllAsRead(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      const filters: NotificationFilter = {
        userId,
        isRead: false
      };

      const result = await NotificationService.searchNotifications(filters, userId);

      if (result.success && result.notifications) {
        let markedCount = 0;
        for (const notification of result.notifications) {
          const markResult = await NotificationService.markAsRead(notification._id, userId);
          if (markResult.success) {
            markedCount++;
          }
        }

        res.status(200).json({
          success: true,
          data: {
            markedCount
          },
          message: `${markedCount} notifications marked as read`
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error || 'Failed to retrieve notifications'
        });
      }
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: `Failed to mark all as read: ${error.message}`
      });
    }
  }

  /**
   * Health check endpoint
   */
  static async healthCheck(req: Request, res: Response): Promise<void> {
    try {
      res.status(200).json({
        success: true,
        service: 'notification-service',
        status: 'healthy',
        timestamp: new Date(),
        version: '1.0.0'
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: `Health check failed: ${error.message}`
      });
    }
  }
}