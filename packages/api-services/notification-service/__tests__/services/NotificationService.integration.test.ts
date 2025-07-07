import { NotificationService } from '../../src/services/NotificationService';
import { CreateNotificationData } from '../../src/types/notification';

describe('NotificationService Integration', () => {
  it('should create a notification with valid data', async () => {
    const notificationData: CreateNotificationData = {
      type: 'announcement',
      title: 'Test Notification',
      message: 'This is a test notification',
      recipients: ['user1', 'user2'],
      channels: ['email', 'push'],
      priority: 'normal',
      category: 'system'
    };

    const result = await NotificationService.createNotification(notificationData);
    
    expect(result.success).toBe(true);
    expect(result.notification).toBeDefined();
    expect(result.notification?.title).toBe('Test Notification');
  });

  it('should fail with missing required fields', async () => {
    const invalidData: any = {
      type: 'announcement'
      // Missing required fields
    };

    const result = await NotificationService.createNotification(invalidData);
    
    expect(result.success).toBe(false);
    expect(result.error).toContain('required');
  });

  it('should compile without TypeScript errors', () => {
    // This test will fail to compile if there are TypeScript errors
    expect(NotificationService.createNotification).toBeDefined();
    expect(NotificationService.getNotification).toBeDefined();
    expect(NotificationService.getAllNotifications).toBeDefined();
  });
});