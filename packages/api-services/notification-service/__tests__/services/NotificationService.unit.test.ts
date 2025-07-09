// Path: packages/api-services/notification-service/__tests__/services/NotificationService.unit.test.ts
import { NotificationService } from '../../src/services/NotificationService';
import {
  CreateNotificationData,
  UpdateNotificationData,
  CreateTemplateData,
  UpdatePreferenceData,
  BulkNotificationRequest,
  NotificationFilter,
  NotificationChannel,
  NotificationPriority,
  NotificationCategory,
  NotificationType
} from '../../src/types/notification';

describe('NotificationService', () => {
  beforeEach(async () => {
    // Clear storage before each test
    await NotificationService.clearStorage();
  });

  describe('createNotification', () => {
    const validNotificationData: CreateNotificationData = {
      type: 'system' as NotificationType,
      title: 'Test Notification',
      message: 'This is a test notification',
      recipients: [{ userId: 'user123', email: 'test@example.com' }],
      channels: ['email', 'in_app'] as NotificationChannel[],
      priority: 'normal' as NotificationPriority,
      category: 'academic' as NotificationCategory,
      data: { courseId: 'course123' },
      metadata: {
        source: 'test-suite',
        sourceId: 'test-123',
        tags: ['test', 'unit']
      }
    };

    it('should create a notification with valid data', async () => {
      const result = await NotificationService.createNotification(validNotificationData, 'sender123');

      expect(result.success).toBe(true);
      expect(result.notification).toBeDefined();
      expect(result.notification!.title).toBe('Test Notification');
      expect(result.notification!.message).toBe('This is a test notification');
      expect(result.notification!.recipients).toEqual([{ userId: 'user123', email: 'test@example.com' }]);
      expect(result.notification!.sender).toBe('sender123');
      expect(result.notification!.channels).toEqual(['email', 'in_app']);
      expect(result.notification!.priority).toBe('normal');
      expect(result.notification!.category).toBe('academic');
      expect(result.notification!.status).toBe('queued');
      expect(result.notification!.isRead).toBe(false);
      expect(result.notification!.readBy).toEqual([]);
      expect(result.notification!.createdAt).toBeInstanceOf(Date);
      expect(result.notification!.updatedAt).toBeInstanceOf(Date);
    });

    it('should fail when title is missing', async () => {
      const invalidData = { ...validNotificationData, title: '' };
      
      const result = await NotificationService.createNotification(invalidData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Title, message, and recipients are required');
    });

    it('should fail when message is missing', async () => {
      const invalidData = { ...validNotificationData, message: '' };
      
      const result = await NotificationService.createNotification(invalidData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Title, message, and recipients are required');
    });

    it('should fail when recipients are empty', async () => {
      const invalidData = { ...validNotificationData, recipients: [] };
      
      const result = await NotificationService.createNotification(invalidData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Title, message, and recipients are required');
    });

    it('should fail when channels are empty', async () => {
      const invalidData = { ...validNotificationData, channels: [] };
      
      const result = await NotificationService.createNotification(invalidData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('At least one notification channel is required');
    });

    it('should create notification with scheduled delivery', async () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now
      const scheduledData = { ...validNotificationData, scheduledFor: futureDate };
      
      const result = await NotificationService.createNotification(scheduledData);

      expect(result.success).toBe(true);
      expect(result.notification!.scheduledFor).toEqual(futureDate);
      expect(result.notification!.status).toBe('draft'); // Should remain draft until scheduled time
    });

    it('should create notification with expiration date', async () => {
      const expirationDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
      const expiringData = { ...validNotificationData, expiresAt: expirationDate };
      
      const result = await NotificationService.createNotification(expiringData);

      expect(result.success).toBe(true);
      expect(result.notification!.expiresAt).toEqual(expirationDate);
    });

    it('should initialize delivery status for all channels', async () => {
      const result = await NotificationService.createNotification(validNotificationData);

      expect(result.success).toBe(true);
      expect(result.notification!.deliveryStatus).toHaveLength(2);
      expect(result.notification!.deliveryStatus[0]).toMatchObject({
        channel: 'email',
        status: 'pending',
        attempts: 0
      });
      expect(result.notification!.deliveryStatus[1]).toMatchObject({
        channel: 'in_app',
        status: 'pending',
        attempts: 0
      });
    });

    it('should initialize analytics metadata', async () => {
      const result = await NotificationService.createNotification(validNotificationData);

      expect(result.success).toBe(true);
      expect(result.notification!.metadata.analytics).toEqual({
        sent: 0,
        delivered: 0,
        read: 0,
        clicked: 0,
        failed: 0,
        bounced: 0,
        openRate: 0,
        clickRate: 0,
        deliveryRate: 0
      });
    });
  });

  describe('getNotification', () => {
    it('should retrieve existing notification', async () => {
      const createResult = await NotificationService.createNotification({
        type: 'system' as NotificationType,
        title: 'Test Notification',
        message: 'Test message',
        recipients: [{ userId: 'user123', email: 'test@example.com' }],
        channels: ['email'] as NotificationChannel[],
        priority: 'normal' as NotificationPriority,
        category: 'academic' as NotificationCategory
      });

      const notificationId = createResult.notification!._id;
      const getResult = await NotificationService.getNotification(notificationId);

      expect(getResult.success).toBe(true);
      expect(getResult.notification!._id).toBe(notificationId);
      expect(getResult.notification!.title).toBe('Test Notification');
    });

    it('should return error for non-existent notification', async () => {
      const result = await NotificationService.getNotification('non-existent-id');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Notification not found');
    });

    it('should check user permissions when userId is provided', async () => {
      const createResult = await NotificationService.createNotification({
        type: 'system' as NotificationType,
        title: 'Private Notification',
        message: 'Private message',
        recipients: [{ userId: 'user123', email: 'test@example.com' }],
        channels: ['email'] as NotificationChannel[],
        priority: 'normal' as NotificationPriority,
        category: 'academic' as NotificationCategory
      }, 'sender123');

      const notificationId = createResult.notification!._id;

      // User who is recipient should be able to view
      const userResult = await NotificationService.getNotification(notificationId, 'user123');
      expect(userResult.success).toBe(true);

      // User who is sender should be able to view
      const senderResult = await NotificationService.getNotification(notificationId, 'sender123');
      expect(senderResult.success).toBe(true);

      // Unauthorized user should not be able to view
      const unauthorizedResult = await NotificationService.getNotification(notificationId, 'unauthorized123');
      expect(unauthorizedResult.success).toBe(false);
      expect(unauthorizedResult.error).toBe('Insufficient permissions to view this notification');
    });
  });

  describe('getAllNotifications', () => {
    it('should return all notifications when no userId provided', async () => {
      await NotificationService.createNotification({
        type: 'system' as NotificationType,
        title: 'Notification 1',
        message: 'Message 1',
        recipients: [{ userId: 'user123', email: 'test@example.com' }],
        channels: ['email'] as NotificationChannel[],
        priority: 'normal' as NotificationPriority,
        category: 'academic' as NotificationCategory
      });

      await NotificationService.createNotification({
        type: 'system' as NotificationType,
        title: 'Notification 2',
        message: 'Message 2',
        recipients: [{ userId: 'user456', email: 'test2@example.com' }],
        channels: ['email'] as NotificationChannel[],
        priority: 'high' as NotificationPriority,
        category: 'administrative' as NotificationCategory
      });

      const result = await NotificationService.getAllNotifications();

      expect(result.success).toBe(true);
      expect(result.notifications).toHaveLength(2);
    });

    it('should filter notifications by user when userId provided', async () => {
      await NotificationService.createNotification({
        type: 'system' as NotificationType,
        title: 'User 123 Notification',
        message: 'Message for user 123',
        recipients: [{ userId: 'user123', email: 'test@example.com' }],
        channels: ['email'] as NotificationChannel[],
        priority: 'normal' as NotificationPriority,
        category: 'academic' as NotificationCategory
      });

      await NotificationService.createNotification({
        type: 'system' as NotificationType,
        title: 'User 456 Notification',
        message: 'Message for user 456',
        recipients: [{ userId: 'user456', email: 'test2@example.com' }],
        channels: ['email'] as NotificationChannel[],
        priority: 'high' as NotificationPriority,
        category: 'administrative' as NotificationCategory
      });

      const result = await NotificationService.getAllNotifications('user123');

      expect(result.success).toBe(true);
      expect(result.notifications).toHaveLength(1);
      expect(result.notifications![0].title).toBe('User 123 Notification');
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read for user', async () => {
      const createResult = await NotificationService.createNotification({
        type: 'system' as NotificationType,
        title: 'Test Notification',
        message: 'Test message',
        recipients: [{ userId: 'user123', email: 'test@example.com' }],
        channels: ['email'] as NotificationChannel[],
        priority: 'normal' as NotificationPriority,
        category: 'academic' as NotificationCategory
      });

      const notificationId = createResult.notification!._id;
      const result = await NotificationService.markAsRead(notificationId, 'user123', 'email');

      expect(result.success).toBe(true);
      expect(result.notification!.readBy).toHaveLength(1);
      expect(result.notification!.readBy[0]).toMatchObject({
        userId: 'user123',
        channel: 'email'
      });
      expect(result.notification!.readBy[0].readAt).toBeInstanceOf(Date);
      expect(result.notification!.metadata.analytics.read).toBe(1);
      expect(result.notification!.isRead).toBe(true);
    });

    it('should not duplicate read status for same user', async () => {
      const createResult = await NotificationService.createNotification({
        type: 'system' as NotificationType,
        title: 'Test Notification',
        message: 'Test message',
        recipients: [{ userId: 'user123', email: 'test@example.com' }],
        channels: ['email'] as NotificationChannel[],
        priority: 'normal' as NotificationPriority,
        category: 'academic' as NotificationCategory
      });

      const notificationId = createResult.notification!._id;
      
      // Mark as read first time
      await NotificationService.markAsRead(notificationId, 'user123', 'email');
      
      // Mark as read second time
      const result = await NotificationService.markAsRead(notificationId, 'user123', 'email');

      expect(result.success).toBe(true);
      expect(result.notification!.readBy).toHaveLength(1);
      expect(result.notification!.metadata.analytics.read).toBe(1);
    });

    it('should return error for non-existent notification', async () => {
      const result = await NotificationService.markAsRead('non-existent-id', 'user123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Notification not found');
    });

    it('should check user permissions', async () => {
      const createResult = await NotificationService.createNotification({
        type: 'system' as NotificationType,
        title: 'Private Notification',
        message: 'Private message',
        recipients: [{ userId: 'user123', email: 'test@example.com' }],
        channels: ['email'] as NotificationChannel[],
        priority: 'normal' as NotificationPriority,
        category: 'academic' as NotificationCategory
      });

      const notificationId = createResult.notification!._id;
      const result = await NotificationService.markAsRead(notificationId, 'unauthorized123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Insufficient permissions to read this notification');
    });
  });

  describe('searchNotifications', () => {
    beforeEach(async () => {
      // Create test notifications
      await NotificationService.createNotification({
        type: 'system' as NotificationType,
        title: 'Academic Notification',
        message: 'Course assignment due',
        recipients: [{ userId: 'user123', email: 'test@example.com' }],
        channels: ['email'] as NotificationChannel[],
        priority: 'high' as NotificationPriority,
        category: 'academic' as NotificationCategory,
        metadata: { source: 'course-service', tags: ['assignment', 'due'] }
      });

      await NotificationService.createNotification({
        type: 'announcement' as NotificationType,
        title: 'Administrative Notice',
        message: 'System maintenance scheduled',
        recipients: [{ userId: 'user456', email: 'test2@example.com' }],
        channels: ['push'] as NotificationChannel[],
        priority: 'normal' as NotificationPriority,
        category: 'administrative' as NotificationCategory,
        metadata: { source: 'admin-service', tags: ['maintenance'] }
      });
    });

    it('should filter by notification types', async () => {
      const filters: NotificationFilter = {
        types: ['system']
      };

      const result = await NotificationService.searchNotifications(filters);

      expect(result.success).toBe(true);
      expect(result.notifications).toHaveLength(1);
      expect(result.notifications![0].type).toBe('system');
    });

    it('should filter by categories', async () => {
      const filters: NotificationFilter = {
        categories: ['academic']
      };

      const result = await NotificationService.searchNotifications(filters);

      expect(result.success).toBe(true);
      expect(result.notifications).toHaveLength(1);
      expect(result.notifications![0].category).toBe('academic');
    });

    it('should filter by priorities', async () => {
      const filters: NotificationFilter = {
        priorities: ['high']
      };

      const result = await NotificationService.searchNotifications(filters);

      expect(result.success).toBe(true);
      expect(result.notifications).toHaveLength(1);
      expect(result.notifications![0].priority).toBe('high');
    });

    it('should filter by channels', async () => {
      const filters: NotificationFilter = {
        channels: ['email']
      };

      const result = await NotificationService.searchNotifications(filters);

      expect(result.success).toBe(true);
      expect(result.notifications).toHaveLength(1);
      expect(result.notifications![0].channels).toContain('email');
    });

    it('should filter by source', async () => {
      const filters: NotificationFilter = {
        source: 'course-service'
      };

      const result = await NotificationService.searchNotifications(filters);

      expect(result.success).toBe(true);
      expect(result.notifications).toHaveLength(1);
      expect(result.notifications![0].metadata.source).toBe('course-service');
    });

    it('should filter by tags', async () => {
      const filters: NotificationFilter = {
        tags: ['assignment']
      };

      const result = await NotificationService.searchNotifications(filters);

      expect(result.success).toBe(true);
      expect(result.notifications).toHaveLength(1);
      expect(result.notifications![0].metadata.tags).toContain('assignment');
    });

    it('should search by term in title and message', async () => {
      const filters: NotificationFilter = {
        searchTerm: 'course'
      };

      const result = await NotificationService.searchNotifications(filters);

      expect(result.success).toBe(true);
      expect(result.notifications).toHaveLength(1);
      expect(result.notifications![0].message).toContain('Course');
    });

    it('should sort by priority', async () => {
      const filters: NotificationFilter = {
        sortBy: 'priority',
        sortOrder: 'desc'
      };

      const result = await NotificationService.searchNotifications(filters);

      expect(result.success).toBe(true);
      expect(result.notifications).toHaveLength(2);
      expect(result.notifications![0].priority).toBe('high');
      expect(result.notifications![1].priority).toBe('normal');
    });

    it('should handle pagination', async () => {
      const filters: NotificationFilter = {
        limit: 1,
        offset: 0
      };

      const result = await NotificationService.searchNotifications(filters);

      expect(result.success).toBe(true);
      expect(result.notifications).toHaveLength(1);
      expect(result.pagination).toEqual({
        limit: 1,
        offset: 0,
        total: 2,
        hasMore: true
      });
    });

    it('should filter by user permissions', async () => {
      const filters: NotificationFilter = {};

      const result = await NotificationService.searchNotifications(filters, 'user123');

      expect(result.success).toBe(true);
      expect(result.notifications!.length).toBeGreaterThan(0);
      // All returned notifications should be for the specific user
      result.notifications!.forEach(notification => {
        expect(notification.recipients.some(r => r.userId === 'user123')).toBe(true);
      });
    });
  });

  describe('createTemplate', () => {
    const validTemplateData: CreateTemplateData = {
      name: 'Course Assignment',
      type: 'system' as NotificationType,
      category: 'academic' as NotificationCategory,
      title: 'Assignment Due',
      messageTemplate: 'Your assignment {{assignmentName}} is due on {{dueDate}}',
      channels: ['email', 'in_app'] as NotificationChannel[],
      priority: 'high' as NotificationPriority,
      variables: ['assignmentName', 'dueDate']
    };

    it('should create template with valid data', async () => {
      const result = await NotificationService.createTemplate(validTemplateData, 'user123');

      expect(result.success).toBe(true);
      expect(result.template).toBeDefined();
      expect(result.template!.name).toBe('Course Assignment');
      expect(result.template!.messageTemplate).toBe('Your assignment {{assignmentName}} is due on {{dueDate}}');
      expect(result.template!.createdBy).toBe('user123');
      expect(result.template!.isActive).toBe(true);
    });

    it('should fail when required fields are missing', async () => {
      const invalidData = { ...validTemplateData, name: '' };
      
      const result = await NotificationService.createTemplate(invalidData, 'user123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Name, title, and message template are required');
    });

    it('should fail when template name already exists', async () => {
      await NotificationService.createTemplate(validTemplateData, 'user123');
      
      const result = await NotificationService.createTemplate(validTemplateData, 'user123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Template with this name already exists');
    });

    it('should create template with default active status', async () => {
      const result = await NotificationService.createTemplate(validTemplateData, 'user123');

      expect(result.success).toBe(true);
      expect(result.template!.isActive).toBe(true);
    });

    it('should create template with explicit inactive status', async () => {
      const inactiveData = { ...validTemplateData, isActive: false };
      
      const result = await NotificationService.createTemplate(inactiveData, 'user123');

      expect(result.success).toBe(true);
      expect(result.template!.isActive).toBe(false);
    });
  });

  describe('sendBulkNotifications', () => {
    const validBulkRequest: BulkNotificationRequest = {
      type: 'system' as NotificationType,
      title: 'Bulk Notification',
      message: 'This is a bulk notification',
      recipients: [
        { userId: 'user123', email: 'test1@example.com' },
        { userId: 'user456', email: 'test2@example.com' }
      ],
      channels: ['email'] as NotificationChannel[],
      priority: 'normal' as NotificationPriority,
      category: 'administrative' as NotificationCategory
    };

    it('should send bulk notifications to all recipients', async () => {
      const result = await NotificationService.sendBulkNotifications(validBulkRequest, 'sender123');

      expect(result.success).toBe(true);
      expect(result.notifications).toHaveLength(2);
      expect(result.message).toBe('2 notifications created successfully');
    });

    it('should fail when no recipients provided', async () => {
      const invalidRequest = { ...validBulkRequest, recipients: [] };
      
      const result = await NotificationService.sendBulkNotifications(invalidRequest);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Recipients are required for bulk notifications');
    });

    it('should use template when templateId provided', async () => {
      // Create template first
      const templateResult = await NotificationService.createTemplate({
        name: 'Bulk Template',
        type: 'system' as NotificationType,
        category: 'administrative' as NotificationCategory,
        title: 'Template Title',
        messageTemplate: 'Hello {{name}}, this is your notification.',
        channels: ['email'] as NotificationChannel[],
        priority: 'normal' as NotificationPriority,
        variables: ['name']
      }, 'user123');

      const bulkRequestWithTemplate: BulkNotificationRequest = {
        ...validBulkRequest,
        templateId: templateResult.template!._id,
        data: { name: 'User' }
      };

      const result = await NotificationService.sendBulkNotifications(bulkRequestWithTemplate, 'sender123');

      expect(result.success).toBe(true);
      expect(result.notifications).toHaveLength(2);
      expect(result.notifications![0].title).toBe('Template Title');
      expect(result.notifications![0].message).toBe('Hello User, this is your notification.');
    });

    it('should fail when template not found', async () => {
      const bulkRequestWithInvalidTemplate: BulkNotificationRequest = {
        ...validBulkRequest,
        templateId: 'non-existent-template'
      };

      const result = await NotificationService.sendBulkNotifications(bulkRequestWithInvalidTemplate);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Template not found or inactive');
    });
  });

  describe('getUserPreferences', () => {
    it('should create default preferences for new user', async () => {
      const result = await NotificationService.getUserPreferences('user123');

      expect(result.success).toBe(true);
      expect(result.preference).toBeDefined();
      expect(result.preference!.userId).toBe('user123');
      expect(result.preference!.isEnabled).toBe(true);
      expect(result.preference!.channels).toHaveLength(4);
      expect(result.preference!.categories).toHaveLength(5);
      expect(result.preference!.quietHours.enabled).toBe(true);
    });

    it('should return existing preferences', async () => {
      // Get preferences first time (creates default)
      await NotificationService.getUserPreferences('user123');
      
      // Get preferences second time (returns existing)
      const result = await NotificationService.getUserPreferences('user123');

      expect(result.success).toBe(true);
      expect(result.preference!.userId).toBe('user123');
    });
  });

  describe('updateUserPreferences', () => {
    it('should update existing preferences', async () => {
      // Create initial preferences
      await NotificationService.getUserPreferences('user123');
      
      const updateData: UpdatePreferenceData = {
        isEnabled: false,
        frequency: 'daily' as any,
        language: 'fr'
      };

      const result = await NotificationService.updateUserPreferences('user123', updateData);

      expect(result.success).toBe(true);
      expect(result.preference!.isEnabled).toBe(false);
      expect(result.preference!.frequency).toBe('daily');
      expect(result.preference!.language).toBe('fr');
      expect(result.preference!.updatedAt).toBeInstanceOf(Date);
    });

    it('should create preferences if they do not exist', async () => {
      const updateData: UpdatePreferenceData = {
        isEnabled: false,
        language: 'es'
      };

      const result = await NotificationService.updateUserPreferences('user456', updateData);

      expect(result.success).toBe(true);
      expect(result.preference!.userId).toBe('user456');
      expect(result.preference!.isEnabled).toBe(false);
      expect(result.preference!.language).toBe('es');
    });
  });

  describe('getNotificationStats', () => {
    beforeEach(async () => {
      // Create test notifications with different statuses
      await NotificationService.createNotification({
        type: 'system' as NotificationType,
        title: 'Delivered Notification',
        message: 'This was delivered',
        recipients: [{ userId: 'user123', email: 'test@example.com' }],
        channels: ['email'] as NotificationChannel[],
        priority: 'normal' as NotificationPriority,
        category: 'academic' as NotificationCategory
      });

      // Mark as read
      const allNotifications = await NotificationService.getAllNotifications();
      if (allNotifications.notifications && allNotifications.notifications.length > 0) {
        await NotificationService.markAsRead(allNotifications.notifications[0]._id, 'user123');
      }
    });

    it('should return notification statistics', async () => {
      const result = await NotificationService.getNotificationStats();

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.total).toBeGreaterThan(0);
      expect(result.data.read).toBeGreaterThan(0);
      expect(result.data.byChannel).toBeDefined();
      expect(result.data.byCategory).toBeDefined();
      expect(result.data.byPriority).toBeDefined();
      expect(result.data.timeframe).toBe('last_30_days');
      expect(result.data.generatedAt).toBeInstanceOf(Date);
    });

    it('should filter statistics by user', async () => {
      const result = await NotificationService.getNotificationStats('user123');

      expect(result.success).toBe(true);
      expect(result.data.total).toBeGreaterThan(0);
    });

    it('should handle different timeframes', async () => {
      const result = await NotificationService.getNotificationStats(undefined, 'last_7d');

      expect(result.success).toBe(true);
      expect(result.data.timeframe).toBe('last_7d');
    });

    it('should calculate rates correctly', async () => {
      const result = await NotificationService.getNotificationStats();

      expect(result.success).toBe(true);
      expect(result.data.readRate).toBeGreaterThanOrEqual(0);
      expect(result.data.readRate).toBeLessThanOrEqual(100);
      expect(result.data.deliveryRate).toBeGreaterThanOrEqual(0);
      expect(result.data.deliveryRate).toBeLessThanOrEqual(100);
    });
  });
});