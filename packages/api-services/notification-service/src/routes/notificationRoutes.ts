// Path: packages/api-services/notification-service/src/routes/notificationRoutes.ts
import { Router } from 'express';
import { NotificationController } from '../controllers/NotificationController';

const router = Router();

// Notification CRUD Routes
router.post('/', NotificationController.createNotification);
router.get('/search', NotificationController.searchNotifications);
router.get('/stats', NotificationController.getNotificationStats);
router.get('/unread-count', NotificationController.getUnreadCount);
router.patch('/mark-all-read', NotificationController.markAllAsRead);
router.get('/:notificationId', NotificationController.getNotification);
router.patch('/:notificationId', NotificationController.updateNotification);
router.delete('/:notificationId', NotificationController.deleteNotification);
router.patch('/:notificationId/read', NotificationController.markAsRead);

// Bulk Operations
router.post('/bulk', NotificationController.sendBulkNotifications);

// Template Routes
router.post('/templates', NotificationController.createTemplate);

// User Preferences Routes
router.get('/preferences/me', NotificationController.getUserPreferences);
router.patch('/preferences/me', NotificationController.updateUserPreferences);

// Health Check
router.get('/health', NotificationController.healthCheck);

export default router;