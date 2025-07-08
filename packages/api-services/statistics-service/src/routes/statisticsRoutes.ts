// Path: packages/api-services/statistics-service/src/routes/statisticsRoutes.ts
import { Router } from 'express';
import { StatisticsController } from '../controllers/StatisticsController';
import { authMiddleware, requireRole, optionalAuth } from '../middleware/authMiddleware';

const router = Router();

// Public routes
router.get('/health', StatisticsController.healthCheck);

// System Statistics Routes (admin/staff only)
router.get('/system', authMiddleware, requireRole(['admin', 'staff']), StatisticsController.getSystemStats);
router.get('/dashboard', authMiddleware, requireRole(['admin', 'staff']), StatisticsController.getDashboardStats);

// User Statistics Routes (authenticated users can view their own, admin/staff can view others)
router.get('/users/:userId', authMiddleware, StatisticsController.getUserStats);
router.get('/widgets', authMiddleware, StatisticsController.getUserWidgets);
router.post('/widgets', authMiddleware, StatisticsController.createWidget);

// Course Statistics Routes (teachers can view their courses, admin/staff can view all)
router.get('/courses/:courseId', authMiddleware, StatisticsController.getCourseStats);

// Learning Analytics Routes (admin/staff/teachers)
router.get('/learning-analytics', authMiddleware, requireRole(['admin', 'staff', 'teacher']), StatisticsController.getLearningAnalytics);

// Reports Routes (admin/staff can generate and view all, teachers can generate for their courses)
router.post('/reports', authMiddleware, requireRole(['admin', 'staff', 'teacher']), StatisticsController.generateReport);
router.get('/reports', authMiddleware, requireRole(['admin', 'staff', 'teacher']), StatisticsController.searchReports);
router.get('/reports/:reportId', authMiddleware, requireRole(['admin', 'staff', 'teacher']), StatisticsController.getReport);

// Export Routes (admin/staff only)
router.get('/export', authMiddleware, requireRole(['admin', 'staff']), StatisticsController.exportStatistics);
router.post('/export', authMiddleware, requireRole(['admin', 'staff']), StatisticsController.exportStatisticsPost);

export default router;