// Path: packages/api-services/notification-service/src/services/NotificationService.ts
import {
  Notification,
  NotificationTemplate,
  NotificationPreference,
  NotificationQueue,
  CreateNotificationData,
  UpdateNotificationData,
  CreateTemplateData,
  UpdateTemplateData,
  UpdatePreferenceData,
  BulkNotificationRequest,
  NotificationFilter,
  NotificationResult,
  NotificationType,
  NotificationChannel,
  NotificationPriority,
  NotificationCategory,
  NotificationStatus,
  DeliveryState,
  QueueStatus,
  NotificationFrequency,
  ChannelPreference,
  CategoryPreference,
  QuietHours
} from '../types/notification';
import { v4 as uuidv4 } from 'uuid';
import moment from 'moment';

// In-memory storage for development/demo purposes
let notificationStorage: Notification[] = [];
let templateStorage: NotificationTemplate[] = [];
let preferenceStorage: NotificationPreference[] = [];
let queueStorage: NotificationQueue[] = [];
let notificationIdCounter = 1;
let templateIdCounter = 1;
let queueIdCounter = 1;
let preferenceIdCounter = 1;

export class NotificationService {
  /**
   * Create a new notification
   */
  static async createNotification(data: CreateNotificationData, senderId?: string): Promise<NotificationResult> {
    try {
      // Validate required fields
      if (!data.title || !data.message || !data.recipients || data.recipients.length === 0) {
        return { success: false, error: 'Title, message, and recipients are required' };
      }

      if (!data.channels || data.channels.length === 0) {
        return { success: false, error: 'At least one notification channel is required' };
      }

      const notification: Notification = {
        _id: `notification_${Date.now()}`,
        type: data.type,
        title: data.title,
        message: data.message,
        recipients: data.recipients,
        sender: senderId,
        channels: data.channels,
        priority: data.priority,
        category: data.category,
        data: data.data,
        metadata: {
          source: data.metadata?.source || 'api',
          sourceId: data.metadata?.sourceId,
          tags: data.metadata?.tags || [],
          relatedEntities: data.metadata?.relatedEntities || [],
          analytics: {
            sent: 0,
            delivered: 0,
            read: 0,
            clicked: 0,
            failed: 0,
            bounced: 0,
            openRate: 0,
            clickRate: 0,
            deliveryRate: 0
          },
          retryPolicy: data.metadata?.retryPolicy
        },
        status: 'draft',
        deliveryStatus: data.channels.map(channel => ({
          channel,
          status: 'pending',
          attempts: 0
        })),
        scheduledFor: data.scheduledFor || undefined,
        expiresAt: data.expiresAt,
        isRead: false,
        readBy: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Save to storage (in-memory for demo)
      notificationStorage.push(notification);

      // Queue for delivery if not scheduled for future
      if (!data.scheduledFor || data.scheduledFor <= new Date()) {
        await this.queueNotification(notification);
      }

      return { success: true, notification };
    } catch (error: any) {
      return { success: false, error: `Failed to create notification: ${error.message}` };
    }
  }

  /**
   * Get notification by ID
   */
  static async getNotification(notificationId: string, userId?: string): Promise<NotificationResult> {
    try {
      const notification = notificationStorage.find(n => n._id === notificationId) || null;

      if (!notification) {
        return { success: false, error: 'Notification not found' };
      }

      // Check if user is authorized to view this notification
      if (userId && !this.canUserViewNotification(notification, userId)) {
        return { success: false, error: 'Insufficient permissions to view this notification' };
      }

      return { success: true, notification };
    } catch (error: any) {
      return { success: false, error: `Failed to get notification: ${error.message}` };
    }
  }

  /**
   * Update notification
   */
  static async updateNotification(notificationId: string, updateData: UpdateNotificationData, userId?: string): Promise<NotificationResult> {
    return { success: false, error: 'MongoDB implementation required for NotificationService' };
    try {
      const notificationIndex = notificationStorage.findIndex(n => n._id === notificationId);
      if (notificationIndex === -1) {
        return { success: false, error: 'Notification not found' };
      }

      const notification = notificationStorage[notificationIndex];

      // Check permissions
      if (userId && notification.sender !== userId) {
        return { success: false, error: 'Insufficient permissions to update this notification' };
      }

      // Update notification
      const updatedNotification = {
        ...notification,
        ...updateData,
        updatedAt: new Date()
      };

      notificationStorage[notificationIndex] = updatedNotification;

      return { success: true, notification: updatedNotification };
    } catch (error: any) {
      return { success: false, error: `Failed to update notification: ${error.message}` };
    }
  }

  /**
   * Delete notification
   */
  static async deleteNotification(notificationId: string, userId?: string): Promise<NotificationResult> {
    try {
      const notificationIndex = notificationStorage.findIndex(n => n._id === notificationId);
      if (notificationIndex === -1) {
        return { success: false, error: 'Notification not found' };
      }

      const notification = notificationStorage[notificationIndex];

      // Check permissions
      if (userId && notification.sender !== userId) {
        return { success: false, error: 'Insufficient permissions to delete this notification' };
      }

      notificationStorage.splice(notificationIndex, 1);

      // Remove from queue if pending
      queueStorage = queueStorage.filter(q => q.notificationId !== notificationId);

      return { success: true, message: 'Notification deleted successfully' };
    } catch (error: any) {
      return { success: false, error: `Failed to delete notification: ${error.message}` };
    }
  }

  /**
   * Get all notifications for a user
   */
  static async getAllNotifications(userId?: string): Promise<NotificationResult> {
    try {
      let notifications = notificationStorage;

      // Apply user-specific filtering if userId provided
      if (userId) {
        notifications = notifications.filter(notification => 
          this.canUserViewNotification(notification, userId)
        );
      }

      return { success: true, notifications };
    } catch (error: any) {
      return { success: false, error: `Failed to get notifications: ${error.message}` };
    }
  }

  /**
   * Search notifications with filters
   */
  static async searchNotifications(filters: NotificationFilter, userId?: string): Promise<NotificationResult> {
    try {
      let filteredNotifications = notificationStorage;

      // Apply user-specific filtering if userId provided
      if (userId) {
        filteredNotifications = filteredNotifications.filter(notification => 
          this.canUserViewNotification(notification, userId)
        );
      }

      // Apply filters
      if (filters.types && filters.types.length > 0) {
        filteredNotifications = filteredNotifications.filter(n => filters.types!.includes(n.type));
      }

      if (filters.categories && filters.categories.length > 0) {
        filteredNotifications = filteredNotifications.filter(n => filters.categories!.includes(n.category));
      }

      if (filters.priorities && filters.priorities.length > 0) {
        filteredNotifications = filteredNotifications.filter(n => filters.priorities!.includes(n.priority));
      }

      if (filters.status && filters.status.length > 0) {
        filteredNotifications = filteredNotifications.filter(n => filters.status!.includes(n.status));
      }

      if (filters.channels && filters.channels.length > 0) {
        filteredNotifications = filteredNotifications.filter(n => 
          n.channels.some(channel => filters.channels!.includes(channel))
        );
      }

      if (filters.senderId) {
        filteredNotifications = filteredNotifications.filter(n => n.sender === filters.senderId);
      }

      if (filters.dateFrom) {
        filteredNotifications = filteredNotifications.filter(n => 
          new Date(n.createdAt) >= filters.dateFrom!
        );
      }

      if (filters.dateTo) {
        filteredNotifications = filteredNotifications.filter(n => 
          new Date(n.createdAt) <= filters.dateTo!
        );
      }

      if (filters.isRead !== undefined) {
        if (userId) {
          filteredNotifications = filteredNotifications.filter(n => {
            const userReadStatus = n.readBy.find(r => r.userId === userId);
            return filters.isRead ? !!userReadStatus : !userReadStatus;
          });
        }
      }

      if (filters.tags && filters.tags.length > 0) {
        filteredNotifications = filteredNotifications.filter(n => 
          filters.tags!.some(tag => n.metadata.tags.includes(tag))
        );
      }

      if (filters.source) {
        filteredNotifications = filteredNotifications.filter(n => n.metadata.source === filters.source);
      }

      if (filters.searchTerm) {
        const searchTerm = filters.searchTerm.toLowerCase();
        filteredNotifications = filteredNotifications.filter(n => 
          n.title.toLowerCase().includes(searchTerm) ||
          n.message.toLowerCase().includes(searchTerm) ||
          n.metadata.tags.some(tag => tag.toLowerCase().includes(searchTerm))
        );
      }

      // Sorting
      const sortField = filters.sortBy || 'createdAt';
      const sortOrder = filters.sortOrder === 'desc' ? -1 : 1;

      filteredNotifications.sort((a, b) => {
        let aValue = (a as any)[sortField];
        let bValue = (b as any)[sortField];

        if (sortField === 'priority') {
          const priorityOrder = { critical: 5, urgent: 4, high: 3, normal: 2, low: 1 };
          aValue = priorityOrder[a.priority];
          bValue = priorityOrder[b.priority];
        }

        if (aValue < bValue) return -sortOrder;
        if (aValue > bValue) return sortOrder;
        return 0;
      });

      // Pagination
      const limit = Math.min(filters.limit || 20, 100);
      const offset = filters.offset || 0;
      const total = filteredNotifications.length;
      const paginatedNotifications = filteredNotifications.slice(offset, offset + limit);

      return {
        success: true,
        notifications: paginatedNotifications,
        pagination: {
          limit,
          offset,
          total,
          hasMore: (offset + limit) < total
        }
      };
    } catch (error: any) {
      return { success: false, error: `Failed to search notifications: ${error.message}` };
    }
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(notificationId: string, userId: string, channel?: NotificationChannel): Promise<NotificationResult> {
    try {
      const notificationIndex = notificationStorage.findIndex(n => n._id === notificationId);
      if (notificationIndex === -1) {
        return { success: false, error: 'Notification not found' };
      }

      const notification = notificationStorage[notificationIndex];

      // Check if user can read this notification
      if (!this.canUserViewNotification(notification, userId)) {
        return { success: false, error: 'Insufficient permissions to read this notification' };
      }

      // Check if already read by this user
      const existingReadStatus = notification.readBy.find(r => r.userId === userId);
      if (!existingReadStatus) {
        notification.readBy.push({
          userId,
          readAt: new Date(),
          channel: channel || 'in_app'
        });

        notification.metadata.analytics.read++;
        notification.updatedAt = new Date();

        // Update read status for the notification
        if (notification.readBy.length === notification.recipients.length) {
          notification.isRead = true;
          notification.readAt = new Date();
        }
      }

      notificationStorage[notificationIndex] = notification;

      return { success: true, notification, message: 'Notification marked as read' };
    } catch (error: any) {
      return { success: false, error: `Failed to mark notification as read: ${error.message}` };
    }
  }

  /**
   * Send bulk notifications
   */
  static async sendBulkNotifications(request: BulkNotificationRequest, senderId?: string): Promise<NotificationResult> {
    try {
      if (!request.recipients || request.recipients.length === 0) {
        return { success: false, error: 'Recipients are required for bulk notifications' };
      }

      const notifications: Notification[] = [];

      // If using template, get template and merge data
      let title = request.title;
      let message = request.message;

      if (request.templateId) {
        const template = templateStorage.find(t => t._id === request.templateId);
        if (!template || !template.isActive) {
          return { success: false, error: 'Template not found or inactive' };
        }

        title = template.title;
        message = this.processTemplate(template.messageTemplate, request.data || {});
      }

      // Create notifications for each recipient
      for (const recipient of request.recipients) {
        const notificationData: CreateNotificationData = {
          type: request.type,
          title,
          message,
          recipients: [recipient],
          channels: request.channels,
          priority: request.priority,
          category: request.category,
          data: request.data,
          scheduledFor: request.scheduledFor,
          expiresAt: request.expiresAt,
          metadata: request.metadata
        };

        const result = await this.createNotification(notificationData, senderId);
        if (result.success && result.notification) {
          notifications.push(result.notification);
        }
      }

      return { 
        success: true, 
        notifications,
        message: `${notifications.length} notifications created successfully`
      };
    } catch (error: any) {
      return { success: false, error: `Failed to send bulk notifications: ${error.message}` };
    }
  }

  /**
   * Create notification template
   */
  static async createTemplate(templateData: CreateTemplateData, userId: string): Promise<NotificationResult> {
    try {
      // Validate required fields
      if (!templateData.name || !templateData.title || !templateData.messageTemplate) {
        return { success: false, error: 'Name, title, and message template are required' };
      }

      // Check for duplicate template name
      const existingTemplate = templateStorage.find(t => t.name === templateData.name);
      if (existingTemplate) {
        return { success: false, error: 'Template with this name already exists' };
      }

      const template: NotificationTemplate = {
        _id: `template_${templateIdCounter++}`,
        name: templateData.name,
        type: templateData.type,
        category: templateData.category,
        title: templateData.title,
        messageTemplate: templateData.messageTemplate,
        channels: templateData.channels,
        priority: templateData.priority,
        variables: templateData.variables,
        isActive: templateData.isActive !== false,
        createdBy: userId,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      templateStorage.push(template);

      return { success: true, template };
    } catch (error: any) {
      return { success: false, error: `Failed to create template: ${error.message}` };
    }
  }

  /**
   * Get user notification preferences
   */
  static async getUserPreferences(userId: string): Promise<NotificationResult> {
    try {
      let preferences = preferenceStorage.find(p => p.userId === userId);

      if (!preferences) {
        // Create default preferences
        preferences = this.createDefaultPreferences(userId);
        preferenceStorage.push(preferences);
      }

      return { success: true, preference: preferences };
    } catch (error: any) {
      return { success: false, error: `Failed to get user preferences: ${error.message}` };
    }
  }

  /**
   * Update user notification preferences
   */
  static async updateUserPreferences(userId: string, updateData: UpdatePreferenceData): Promise<NotificationResult> {
    try {
      let preferenceIndex = preferenceStorage.findIndex(p => p.userId === userId);

      if (preferenceIndex === -1) {
        // Create new preferences
        const newPreferences = this.createDefaultPreferences(userId);
        preferenceStorage.push(newPreferences);
        preferenceIndex = preferenceStorage.length - 1;
      }

      const preferences = preferenceStorage[preferenceIndex];
      const updatedPreferences = {
        ...preferences,
        ...updateData,
        updatedAt: new Date()
      };

      preferenceStorage[preferenceIndex] = updatedPreferences;

      return { success: true, preference: updatedPreferences };
    } catch (error: any) {
      return { success: false, error: `Failed to update user preferences: ${error.message}` };
    }
  }

  /**
   * Get notification statistics
   */
  static async getNotificationStats(userId?: string, timeframe: string = 'last_30_days'): Promise<NotificationResult> {
    try {
      let notifications = notificationStorage;

      // Filter by user if specified
      if (userId) {
        notifications = notifications.filter(n => 
          n.sender === userId || n.recipients.some(r => r.userId === userId)
        );
      }

      // Apply timeframe filter
      const now = moment();
      const startDate = this.getStartDateForTimeframe(timeframe, now);
      notifications = notifications.filter(n => 
        moment(n.createdAt) >= startDate
      );

      const stats = {
        total: notifications.length,
        sent: notifications.filter(n => n.status === 'sent').length,
        delivered: notifications.filter(n => n.status === 'delivered').length,
        read: notifications.filter(n => n.isRead).length,
        failed: notifications.filter(n => n.status === 'failed').length,
        byChannel: this.getChannelStats(notifications),
        byCategory: this.getCategoryStats(notifications),
        byPriority: this.getPriorityStats(notifications),
        deliveryRate: this.calculateDeliveryRate(notifications),
        readRate: this.calculateReadRate(notifications),
        timeframe,
        generatedAt: new Date()
      };

      return { success: true, data: stats } as any;
    } catch (error: any) {
      return { success: false, error: `Failed to get notification statistics: ${error.message}` };
    }
  }

  /**
   * Helper methods
   */
  private static async queueNotification(notification: Notification): Promise<void> {
    try {
      for (const recipient of notification.recipients) {
        for (const channel of notification.channels) {
          const queueItem: NotificationQueue = {
            _id: `queue_${queueIdCounter++}`,
            notificationId: notification._id,
            recipientId: recipient.userId,
            channel,
            priority: notification.priority,
            scheduledFor: notification.scheduledFor || new Date(),
            attempts: 0,
            maxAttempts: 3,
            status: 'pending',
            createdAt: new Date(),
            updatedAt: new Date()
          };

          queueStorage.push(queueItem);
        }
      }

      // Update notification status
      const notificationIndex = notificationStorage.findIndex(n => n._id === notification._id);
      if (notificationIndex !== -1) {
        notificationStorage[notificationIndex].status = 'queued';
        notificationStorage[notificationIndex].updatedAt = new Date();
      }
    } catch (error) {
      console.error('Failed to queue notification:', error);
    }
  }

  private static canUserViewNotification(notification: Notification, userId: string): boolean {
    // User can view if they are the sender or recipient
    return notification.sender === userId || 
           notification.recipients.some(r => r.userId === userId);
  }

  private static processTemplate(template: string, data: any): string {
    let processed = template;
    
    // Simple template variable replacement
    Object.keys(data).forEach(key => {
      const placeholder = `{{${key}}}`;
      processed = processed.replace(new RegExp(placeholder, 'g'), data[key]);
    });

    return processed;
  }

  private static createDefaultPreferences(userId: string): NotificationPreference {
    return {
      _id: `preference_${preferenceIdCounter++}`,
      userId,
      channels: [
        { channel: 'email', enabled: true },
        { channel: 'in_app', enabled: true },
        { channel: 'push', enabled: true },
        { channel: 'sms', enabled: false }
      ],
      categories: [
        { category: 'academic', enabled: true, priority: 'high' },
        { category: 'administrative', enabled: true, priority: 'normal' },
        { category: 'social', enabled: true, priority: 'low' },
        { category: 'technical', enabled: true, priority: 'normal' },
        { category: 'emergency', enabled: true, priority: 'urgent' }
      ],
      quietHours: {
        enabled: true,
        startTime: '22:00',
        endTime: '08:00',
        timezone: 'UTC',
        days: [0, 1, 2, 3, 4, 5, 6] // All days
      },
      frequency: 'immediate',
      language: 'en',
      timezone: 'UTC',
      isEnabled: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  private static getStartDateForTimeframe(timeframe: string, now: moment.Moment): moment.Moment {
    switch (timeframe) {
      case 'last_24h':
        return now.clone().subtract(24, 'hours');
      case 'last_7d':
        return now.clone().subtract(7, 'days');
      case 'last_30d':
        return now.clone().subtract(30, 'days');
      case 'last_90d':
        return now.clone().subtract(90, 'days');
      default:
        return now.clone().subtract(30, 'days');
    }
  }

  private static getChannelStats(notifications: Notification[]): any {
    const channelStats: any = {};
    notifications.forEach(n => {
      n.channels.forEach(channel => {
        if (!channelStats[channel]) {
          channelStats[channel] = { count: 0, delivered: 0 };
        }
        channelStats[channel].count++;
        if (n.status === 'delivered') {
          channelStats[channel].delivered++;
        }
      });
    });
    return channelStats;
  }

  private static getCategoryStats(notifications: Notification[]): any {
    const categoryStats: any = {};
    notifications.forEach(n => {
      if (!categoryStats[n.category]) {
        categoryStats[n.category] = { count: 0, read: 0 };
      }
      categoryStats[n.category].count++;
      if (n.isRead) {
        categoryStats[n.category].read++;
      }
    });
    return categoryStats;
  }

  private static getPriorityStats(notifications: Notification[]): any {
    const priorityStats: any = {};
    notifications.forEach(n => {
      if (!priorityStats[n.priority]) {
        priorityStats[n.priority] = 0;
      }
      priorityStats[n.priority]++;
    });
    return priorityStats;
  }

  private static calculateDeliveryRate(notifications: Notification[]): number {
    if (notifications.length === 0) return 0;
    const delivered = notifications.filter(n => n.status === 'delivered').length;
    return Math.round((delivered / notifications.length) * 100);
  }

  private static calculateReadRate(notifications: Notification[]): number {
    if (notifications.length === 0) return 0;
    const read = notifications.filter(n => n.isRead).length;
    return Math.round((read / notifications.length) * 100);
  }

  static async clearStorage(): Promise<void> {
    // MongoDB cleanup for testing - implement when models are available
    console.log('NotificationService: MongoDB cleanup not yet implemented');
  }
}