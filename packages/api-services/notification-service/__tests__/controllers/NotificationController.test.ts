import { Request, Response } from 'express';
import { NotificationController } from '../../src/controllers/NotificationController';
import { NotificationService } from '../../src/services/NotificationService';

// Mock the NotificationService
jest.mock('../../src/services/NotificationService');

describe('NotificationController', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;

  beforeEach(() => {
    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson });
    
    mockRequest = {
      body: {},
      params: {},
      query: {},
      user: { id: 'user123' }
    } as any;
    
    mockResponse = {
      status: mockStatus,
      json: mockJson
    } as any;
    
    jest.clearAllMocks();
  });

  describe('createNotification', () => {
    const validNotificationData = {
      title: 'Test Notification',
      message: 'This is a test notification',
      recipients: ['user1', 'user2'],
      type: 'info' as const,
      priority: 'medium' as const
    };

    it('should create notification successfully', async () => {
      mockRequest.body = validNotificationData;
      const mockResult = {
        success: true,
        notification: { id: 'notif123', ...validNotificationData }
      };
      
      (NotificationService.createNotification as jest.Mock).mockResolvedValue(mockResult);
      
      await NotificationController.createNotification(mockRequest as Request, mockResponse as Response);
      
      expect(NotificationService.createNotification).toHaveBeenCalledWith(validNotificationData, 'user123');
      expect(mockStatus).toHaveBeenCalledWith(201);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: mockResult.notification,
        message: 'Notification created successfully'
      });
    });

    it('should return 400 for missing required fields', async () => {
      mockRequest.body = { title: 'Test' }; // Missing message and recipients
      
      await NotificationController.createNotification(mockRequest as Request, mockResponse as Response);
      
      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: 'Title, message, and recipients are required'
      });
      expect(NotificationService.createNotification).not.toHaveBeenCalled();
    });

    it('should return 400 when service returns error', async () => {
      mockRequest.body = validNotificationData;
      const mockResult = {
        success: false,
        error: 'Invalid recipients'
      };
      
      (NotificationService.createNotification as jest.Mock).mockResolvedValue(mockResult);
      
      await NotificationController.createNotification(mockRequest as Request, mockResponse as Response);
      
      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid recipients'
      });
    });

    it('should handle service exceptions', async () => {
      mockRequest.body = validNotificationData;
      (NotificationService.createNotification as jest.Mock).mockRejectedValue(new Error('Database error'));
      
      await NotificationController.createNotification(mockRequest as Request, mockResponse as Response);
      
      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to create notification: Database error'
      });
    });
  });

  describe('getNotification', () => {
    it('should get notification successfully', async () => {
      mockRequest.params = { notificationId: 'notif123' };
      const mockResult = {
        success: true,
        notification: { id: 'notif123', title: 'Test Notification' }
      };
      
      (NotificationService.getNotification as jest.Mock).mockResolvedValue(mockResult);
      
      await NotificationController.getNotification(mockRequest as Request, mockResponse as Response);
      
      expect(NotificationService.getNotification).toHaveBeenCalledWith('notif123', 'user123');
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: mockResult.notification,
        message: 'Notification retrieved successfully'
      });
    });

    it('should return 404 for not found notification', async () => {
      mockRequest.params = { notificationId: 'notif123' };
      const mockResult = {
        success: false,
        error: 'Notification not found'
      };
      
      (NotificationService.getNotification as jest.Mock).mockResolvedValue(mockResult);
      
      await NotificationController.getNotification(mockRequest as Request, mockResponse as Response);
      
      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: 'Notification not found'
      });
    });

    it('should return 403 for access denied', async () => {
      mockRequest.params = { notificationId: 'notif123' };
      const mockResult = {
        success: false,
        error: 'Access denied'
      };
      
      (NotificationService.getNotification as jest.Mock).mockResolvedValue(mockResult);
      
      await NotificationController.getNotification(mockRequest as Request, mockResponse as Response);
      
      expect(mockStatus).toHaveBeenCalledWith(403);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: 'Access denied'
      });
    });
  });

  describe('updateNotification', () => {
    it('should update notification successfully', async () => {
      mockRequest.params = { notificationId: 'notif123' };
      mockRequest.body = { title: 'Updated Title' };
      const mockResult = {
        success: true,
        notification: { id: 'notif123', title: 'Updated Title' }
      };
      
      (NotificationService.updateNotification as jest.Mock).mockResolvedValue(mockResult);
      
      await NotificationController.updateNotification(mockRequest as Request, mockResponse as Response);
      
      expect(NotificationService.updateNotification).toHaveBeenCalledWith('notif123', { title: 'Updated Title' }, 'user123');
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: mockResult.notification,
        message: 'Notification updated successfully'
      });
    });
  });

  describe('deleteNotification', () => {
    it('should delete notification successfully', async () => {
      mockRequest.params = { notificationId: 'notif123' };
      const mockResult = {
        success: true,
        message: 'Notification deleted successfully'
      };
      
      (NotificationService.deleteNotification as jest.Mock).mockResolvedValue(mockResult);
      
      await NotificationController.deleteNotification(mockRequest as Request, mockResponse as Response);
      
      expect(NotificationService.deleteNotification).toHaveBeenCalledWith('notif123', 'user123');
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        message: 'Notification deleted successfully'
      });
    });
  });

  describe('searchNotifications', () => {
    it('should search notifications with filters', async () => {
      mockRequest.query = {
        types: 'info,warning',
        priorities: 'high,medium',
        isRead: 'false',
        limit: '10',
        offset: '0'
      };
      
      const expectedFilters = {
        types: ['info', 'warning'],
        categories: undefined,
        priorities: ['high', 'medium'],
        status: undefined,
        channels: undefined,
        userId: undefined,
        senderId: undefined,
        dateFrom: undefined,
        dateTo: undefined,
        isRead: false,
        tags: undefined,
        source: undefined,
        searchTerm: undefined,
        sortBy: undefined,
        sortOrder: undefined,
        limit: 10,
        offset: 0
      };
      
      const mockResult = {
        success: true,
        notifications: [{ id: 'notif1' }, { id: 'notif2' }],
        pagination: { total: 2, page: 1, limit: 10 }
      };
      
      (NotificationService.searchNotifications as jest.Mock).mockResolvedValue(mockResult);
      
      await NotificationController.searchNotifications(mockRequest as Request, mockResponse as Response);
      
      expect(NotificationService.searchNotifications).toHaveBeenCalledWith(expectedFilters, 'user123');
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: mockResult.notifications,
        pagination: mockResult.pagination,
        message: 'Notifications retrieved successfully'
      });
    });

    it('should handle date filters', async () => {
      mockRequest.query = {
        dateFrom: '2024-01-01',
        dateTo: '2024-01-31'
      };
      
      const mockResult = {
        success: true,
        notifications: [],
        pagination: { total: 0, page: 1, limit: 10 }
      };
      
      (NotificationService.searchNotifications as jest.Mock).mockResolvedValue(mockResult);
      
      await NotificationController.searchNotifications(mockRequest as Request, mockResponse as Response);
      
      const callArgs = (NotificationService.searchNotifications as jest.Mock).mock.calls[0][0];
      expect(callArgs.dateFrom).toBeInstanceOf(Date);
      expect(callArgs.dateTo).toBeInstanceOf(Date);
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read successfully', async () => {
      mockRequest.params = { notificationId: 'notif123' };
      mockRequest.body = { channel: 'web' };
      const mockResult = {
        success: true,
        notification: { id: 'notif123', isRead: true },
        message: 'Notification marked as read'
      };
      
      (NotificationService.markAsRead as jest.Mock).mockResolvedValue(mockResult);
      
      await NotificationController.markAsRead(mockRequest as Request, mockResponse as Response);
      
      expect(NotificationService.markAsRead).toHaveBeenCalledWith('notif123', 'user123', 'web');
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: mockResult.notification,
        message: mockResult.message
      });
    });

    it('should return 401 when user not authenticated', async () => {
      mockRequest.user = undefined;
      
      await NotificationController.markAsRead(mockRequest as Request, mockResponse as Response);
      
      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: 'Authentication required'
      });
      expect(NotificationService.markAsRead).not.toHaveBeenCalled();
    });
  });

  describe('sendBulkNotifications', () => {
    const validBulkData = {
      title: 'Bulk Notification',
      message: 'This is a bulk notification',
      recipients: ['user1', 'user2', 'user3'],
      type: 'announcement' as const
    };

    it('should send bulk notifications successfully', async () => {
      mockRequest.body = validBulkData;
      const mockResult = {
        success: true,
        notifications: [{ id: 'notif1' }, { id: 'notif2' }],
        message: '2 notifications sent successfully'
      };
      
      (NotificationService.sendBulkNotifications as jest.Mock).mockResolvedValue(mockResult);
      
      await NotificationController.sendBulkNotifications(mockRequest as Request, mockResponse as Response);
      
      expect(NotificationService.sendBulkNotifications).toHaveBeenCalledWith(validBulkData, 'user123');
      expect(mockStatus).toHaveBeenCalledWith(201);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: mockResult.notifications,
        message: mockResult.message
      });
    });

    it('should return 400 for missing required fields', async () => {
      mockRequest.body = { title: 'Test' }; // Missing message and recipients
      
      await NotificationController.sendBulkNotifications(mockRequest as Request, mockResponse as Response);
      
      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: 'Title, message, and recipients are required'
      });
    });
  });

  describe('createTemplate', () => {
    const validTemplateData = {
      name: 'Welcome Template',
      title: 'Welcome {{username}}!',
      messageTemplate: 'Welcome to our platform, {{username}}!',
      type: 'info' as const
    };

    it('should create template successfully', async () => {
      mockRequest.body = validTemplateData;
      const mockResult = {
        success: true,
        template: { id: 'template123', ...validTemplateData }
      };
      
      (NotificationService.createTemplate as jest.Mock).mockResolvedValue(mockResult);
      
      await NotificationController.createTemplate(mockRequest as Request, mockResponse as Response);
      
      expect(NotificationService.createTemplate).toHaveBeenCalledWith(validTemplateData, 'user123');
      expect(mockStatus).toHaveBeenCalledWith(201);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: mockResult.template,
        message: 'Template created successfully'
      });
    });

    it('should return 401 when user not authenticated', async () => {
      mockRequest.user = undefined;
      
      await NotificationController.createTemplate(mockRequest as Request, mockResponse as Response);
      
      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: 'Authentication required'
      });
    });

    it('should return 400 for missing required fields', async () => {
      mockRequest.body = { name: 'Test' }; // Missing title and messageTemplate
      
      await NotificationController.createTemplate(mockRequest as Request, mockResponse as Response);
      
      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: 'Name, title, and message template are required'
      });
    });
  });

  describe('getUserPreferences', () => {
    it('should get user preferences successfully', async () => {
      const mockResult = {
        success: true,
        preference: {
          userId: 'user123',
          channels: ['web', 'email'],
          frequency: 'immediate'
        }
      };
      
      (NotificationService.getUserPreferences as jest.Mock).mockResolvedValue(mockResult);
      
      await NotificationController.getUserPreferences(mockRequest as Request, mockResponse as Response);
      
      expect(NotificationService.getUserPreferences).toHaveBeenCalledWith('user123');
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: mockResult.preference,
        message: 'Preferences retrieved successfully'
      });
    });

    it('should return 401 when user not authenticated', async () => {
      mockRequest.user = undefined;
      
      await NotificationController.getUserPreferences(mockRequest as Request, mockResponse as Response);
      
      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: 'Authentication required'
      });
    });
  });

  describe('updateUserPreferences', () => {
    it('should update user preferences successfully', async () => {
      const updateData = {
        channels: ['web'],
        frequency: 'daily'
      };
      mockRequest.body = updateData;
      
      const mockResult = {
        success: true,
        preference: {
          userId: 'user123',
          ...updateData
        }
      };
      
      (NotificationService.updateUserPreferences as jest.Mock).mockResolvedValue(mockResult);
      
      await NotificationController.updateUserPreferences(mockRequest as Request, mockResponse as Response);
      
      expect(NotificationService.updateUserPreferences).toHaveBeenCalledWith('user123', updateData);
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: mockResult.preference,
        message: 'Preferences updated successfully'
      });
    });
  });

  describe('getNotificationStats', () => {
    it('should get notification statistics successfully', async () => {
      mockRequest.query = { timeframe: 'last_7_days' };
      const mockResult = {
        success: true,
        data: {
          totalSent: 100,
          totalRead: 80,
          readRate: 0.8
        }
      };
      
      (NotificationService.getNotificationStats as jest.Mock).mockResolvedValue(mockResult);
      
      await NotificationController.getNotificationStats(mockRequest as Request, mockResponse as Response);
      
      expect(NotificationService.getNotificationStats).toHaveBeenCalledWith('user123', 'last_7_days');
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: mockResult.data,
        message: 'Statistics retrieved successfully'
      });
    });

    it('should use default timeframe when not specified', async () => {
      const mockResult = {
        success: true,
        data: { totalSent: 50 }
      };
      
      (NotificationService.getNotificationStats as jest.Mock).mockResolvedValue(mockResult);
      
      await NotificationController.getNotificationStats(mockRequest as Request, mockResponse as Response);
      
      expect(NotificationService.getNotificationStats).toHaveBeenCalledWith('user123', 'last_30_days');
    });
  });

  describe('getUnreadCount', () => {
    it('should get unread count successfully', async () => {
      const mockResult = {
        success: true,
        notifications: [{ id: 'notif1' }, { id: 'notif2' }]
      };
      
      (NotificationService.searchNotifications as jest.Mock).mockResolvedValue(mockResult);
      
      await NotificationController.getUnreadCount(mockRequest as Request, mockResponse as Response);
      
      expect(NotificationService.searchNotifications).toHaveBeenCalledWith({
        userId: 'user123',
        isRead: false
      }, 'user123');
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: { unreadCount: 2 },
        message: 'Unread count retrieved successfully'
      });
    });

    it('should handle zero unread notifications', async () => {
      const mockResult = {
        success: true,
        notifications: []
      };
      
      (NotificationService.searchNotifications as jest.Mock).mockResolvedValue(mockResult);
      
      await NotificationController.getUnreadCount(mockRequest as Request, mockResponse as Response);
      
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: { unreadCount: 0 },
        message: 'Unread count retrieved successfully'
      });
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all notifications as read successfully', async () => {
      const mockSearchResult = {
        success: true,
        notifications: [
          { _id: 'notif1' },
          { _id: 'notif2' },
          { _id: 'notif3' }
        ]
      };
      
      const mockMarkResult = { success: true };
      
      (NotificationService.searchNotifications as jest.Mock).mockResolvedValue(mockSearchResult);
      (NotificationService.markAsRead as jest.Mock).mockResolvedValue(mockMarkResult);
      
      await NotificationController.markAllAsRead(mockRequest as Request, mockResponse as Response);
      
      expect(NotificationService.searchNotifications).toHaveBeenCalledWith({
        userId: 'user123',
        isRead: false
      }, 'user123');
      expect(NotificationService.markAsRead).toHaveBeenCalledTimes(3);
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: { markedCount: 3 },
        message: '3 notifications marked as read'
      });
    });

    it('should handle partial failures when marking as read', async () => {
      const mockSearchResult = {
        success: true,
        notifications: [
          { _id: 'notif1' },
          { _id: 'notif2' }
        ]
      };
      
      (NotificationService.searchNotifications as jest.Mock).mockResolvedValue(mockSearchResult);
      (NotificationService.markAsRead as jest.Mock)
        .mockResolvedValueOnce({ success: true })
        .mockResolvedValueOnce({ success: false });
      
      await NotificationController.markAllAsRead(mockRequest as Request, mockResponse as Response);
      
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: { markedCount: 1 },
        message: '1 notifications marked as read'
      });
    });
  });

  describe('healthCheck', () => {
    it('should return health status successfully', async () => {
      await NotificationController.healthCheck(mockRequest as Request, mockResponse as Response);
      
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        service: 'notification-service',
        status: 'healthy',
        timestamp: expect.any(Date),
        version: '1.0.0'
      });
    });

    it('should handle health check exceptions', async () => {
      // Force an exception by mocking Date constructor to throw
      const originalDate = global.Date;
      global.Date = jest.fn().mockImplementation(() => {
        throw new Error('Date error');
      }) as any;
      
      await NotificationController.healthCheck(mockRequest as Request, mockResponse as Response);
      
      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: 'Health check failed: Date error'
      });
      
      // Restore original Date
      global.Date = originalDate;
    });
  });

  describe('Error Handling', () => {
    it('should handle various error scenarios consistently', async () => {
      const methods = [
        'createNotification',
        'getNotification',
        'updateNotification',
        'deleteNotification',
        'searchNotifications'
      ];
      
      for (const method of methods) {
        // Reset mocks
        jest.clearAllMocks();
        
        // Set up mock request with required data for each method
        if (method === 'createNotification') {
          mockRequest.body = {
            title: 'Test Notification',
            message: 'Test message',
            recipients: ['user1', 'user2']
          };
        } else if (method === 'getNotification' || method === 'updateNotification' || method === 'deleteNotification') {
          mockRequest.params = { notificationId: 'notif123' };
          mockRequest.body = method === 'updateNotification' ? { title: 'Updated title' } : {};
        } else {
          mockRequest.params = {};
          mockRequest.body = {};
        }
        
        // Mock service to throw error
        (NotificationService[method as keyof typeof NotificationService] as jest.Mock)
          ?.mockRejectedValue(new Error('Service error'));
        
        // Call controller method
        await (NotificationController as any)[method](mockRequest, mockResponse);
        
        // Verify error response
        expect(mockStatus).toHaveBeenCalledWith(500);
        expect(mockJson).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            error: expect.stringContaining('Service error')
          })
        );
      }
    });
  });
});