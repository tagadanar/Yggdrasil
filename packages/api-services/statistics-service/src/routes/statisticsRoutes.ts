// Path: packages/api-services/statistics-service/src/routes/statisticsRoutes.ts
import { Router } from 'express';
import { StatisticsController } from '../controllers/StatisticsController';

const router = Router();

// System Statistics Routes
router.get('/system', StatisticsController.getSystemStats);
router.get('/dashboard', StatisticsController.getDashboardStats);

// User Statistics Routes
router.get('/users/:userId', StatisticsController.getUserStats);
router.get('/widgets', StatisticsController.getUserWidgets);
router.post('/widgets', StatisticsController.createWidget);

// Course Statistics Routes
router.get('/courses/:courseId', StatisticsController.getCourseStats);

// Learning Analytics Routes
router.get('/learning-analytics', StatisticsController.getLearningAnalytics);

// Reports Routes
router.post('/reports', StatisticsController.generateReport);
router.get('/reports', StatisticsController.searchReports);
router.get('/reports/:reportId', StatisticsController.getReport);

// Export Routes
router.get('/export', StatisticsController.exportStatistics);
router.post('/export', StatisticsController.exportStatisticsPost);

// Health Check
router.get('/health', StatisticsController.healthCheck);

export default router;