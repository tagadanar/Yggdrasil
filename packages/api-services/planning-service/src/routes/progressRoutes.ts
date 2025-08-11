// packages/api-services/planning-service/src/routes/progressRoutes.ts
// Progress tracking API routes

import { Router } from 'express';
import { ProgressController } from '../controllers/ProgressController';
import { AuthMiddleware } from '@yggdrasil/shared-utilities';
import { UserModel } from '@yggdrasil/database-schemas';

const router = Router();

// All progress routes require authentication
router.use(AuthMiddleware.verifyTokenWithUserLookup(async (id) => UserModel.findById(id)));

// =============================================================================
// Attendance Management
// =============================================================================

// POST /api/progress/events/:eventId/attendance - Mark single student attendance
router.post(
  '/events/:eventId/attendance',
  AuthMiddleware.requireRole('teacher', 'admin', 'staff'),
  ProgressController.markAttendance,
);

// POST /api/progress/events/:eventId/attendance/bulk - Bulk mark attendance
router.post(
  '/events/:eventId/attendance/bulk',
  AuthMiddleware.requireRole('teacher', 'admin', 'staff'),
  ProgressController.bulkMarkAttendance,
);

// GET /api/progress/events/:eventId/attendance - Get event attendance
router.get('/events/:eventId/attendance', ProgressController.getEventAttendance);

// GET /api/progress/students/:studentId/attendance - Get student attendance
router.get('/students/:studentId/attendance', ProgressController.getStudentAttendance);

// =============================================================================
// Progress Tracking
// =============================================================================

// GET /api/progress/my-progress - Get my own progress (students)
router.get('/my-progress', (req, res) => {
  const studentId = req.user!._id.toString();
  (req.params as any).studentId = studentId;
  return ProgressController.getStudentProgress(req, res);
});

// GET /api/progress/students/:studentId - Get student progress
router.get('/students/:studentId', ProgressController.getStudentProgress);

// GET /api/progress/promotions/:promotionId - Get all students' progress in promotion
router.get(
  '/promotions/:promotionId',
  AuthMiddleware.requireRole('teacher', 'admin', 'staff'),
  ProgressController.getPromotionProgress,
);

// PUT /api/progress/course - Update course progress
router.put(
  '/course',
  AuthMiddleware.requireRole('admin', 'staff'),
  ProgressController.updateCourseProgress,
);

// POST /api/progress/course/complete - Mark course as completed
router.post(
  '/course/complete',
  AuthMiddleware.requireRole('admin', 'staff'),
  ProgressController.markCourseCompleted,
);

// =============================================================================
// Statistics & Reports
// =============================================================================

// GET /api/progress/promotions/:promotionId/statistics - Get promotion statistics
router.get(
  '/promotions/:promotionId/statistics',
  AuthMiddleware.requireRole('teacher', 'admin', 'staff'),
  ProgressController.getPromotionStatistics,
);

// GET /api/progress/promotions/:promotionId/top-performers - Get top performers
router.get('/promotions/:promotionId/top-performers', ProgressController.getTopPerformers);

// GET /api/progress/promotions/:promotionId/at-risk - Get at-risk students
router.get(
  '/promotions/:promotionId/at-risk',
  AuthMiddleware.requireRole('admin', 'staff'),
  ProgressController.getAtRiskStudents,
);

// GET /api/progress/promotions/:promotionId/report - Generate progress report
router.get(
  '/promotions/:promotionId/report',
  AuthMiddleware.requireRole('admin', 'staff'),
  ProgressController.generateProgressReport,
);

// POST /api/progress/promotions/:promotionId/recalculate - Recalculate all progress
router.post(
  '/promotions/:promotionId/recalculate',
  AuthMiddleware.adminOnly,
  ProgressController.recalculateProgress,
);

export default router;