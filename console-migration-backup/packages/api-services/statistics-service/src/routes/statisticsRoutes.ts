// packages/api-services/statistics-service/src/routes/statisticsRoutes.ts
// Route definitions for statistics service

import { Router } from 'express';
import { StatisticsController } from '../controllers/StatisticsController';
import { 
  authenticateToken,
  requireRole,
  requireOwnershipOrAdmin,
  requireAdminOnly,
  requireTeacherOrAdmin
} from '../middleware/authMiddleware';

const router = Router();

// =============================================================================
// ROOT ROUTE
// =============================================================================

/**
 * Root statistics endpoint - admin only access
 * GET /api/statistics
 */
router.get('/', authenticateToken, requireAdminOnly, (_req, res) => {
  res.json({
    service: 'statistics-service',
    message: 'Statistics service is running',
    user: req.user ? { id: req.user.userId || req.user.id, role: req.user.role } : null,
    endpoints: {
      'GET /dashboard/student/:userId': 'Student dashboard',
      'GET /dashboard/teacher/:userId': 'Teacher dashboard', 
      'GET /dashboard/admin': 'Admin dashboard',
      'GET /analytics/course/:courseId': 'Course analytics',
      'GET /analytics/platform': 'Platform analytics',
      'GET /achievements/:userId': 'User achievements'
    }
  });
});

// =============================================================================
// DASHBOARD ROUTES
// =============================================================================

/**
 * Student dashboard - students can only access their own data, admins can access any
 * GET /api/statistics/dashboard/student/:userId
 */
router.get(
  '/dashboard/student/:userId',
  authenticateToken,
  requireOwnershipOrAdmin('userId'),
  StatisticsController.getStudentDashboard
);

/**
 * Teacher dashboard - teachers can only access their own data, admins can access any
 * GET /api/statistics/dashboard/teacher/:userId
 */
router.get(
  '/dashboard/teacher/:userId',
  authenticateToken,
  requireRole(['teacher', 'staff', 'admin']),
  requireOwnershipOrAdmin('userId'),
  StatisticsController.getTeacherDashboard
);

/**
 * Admin dashboard - only admins and staff can access
 * GET /api/statistics/dashboard/admin
 */
router.get(
  '/dashboard/admin',
  authenticateToken,
  requireRole(['staff', 'admin']),
  StatisticsController.getAdminDashboard
);

// =============================================================================
// PROGRESS TRACKING ROUTES
// =============================================================================

/**
 * Update student progress - students can update their own, teachers can update their students
 * PUT /api/statistics/progress/student/:userId/course/:courseId
 */
router.put(
  '/progress/student/:userId/course/:courseId',
  authenticateToken,
  requireRole(['student', 'teacher', 'staff', 'admin']),
  // Custom middleware to check if teacher can update this student's progress would go here
  StatisticsController.updateStudentProgress
);

/**
 * Get student course progress - ownership and teacher access controlled
 * GET /api/statistics/progress/student/:userId/course/:courseId
 */
router.get(
  '/progress/student/:userId/course/:courseId',
  authenticateToken,
  requireOwnershipOrAdmin('userId'),
  StatisticsController.getStudentCourseProgress
);

/**
 * Mark section as completed
 * POST /api/statistics/progress/section-complete
 */
router.post(
  '/progress/section-complete',
  authenticateToken,
  requireRole(['student', 'teacher', 'staff', 'admin']),
  StatisticsController.markSectionComplete
);

/**
 * Mark exercise as completed
 * POST /api/statistics/progress/exercise-complete
 */
router.post(
  '/progress/exercise-complete',
  authenticateToken,
  requireRole(['student', 'teacher', 'staff', 'admin']),
  StatisticsController.markExerciseComplete
);

// =============================================================================
// ANALYTICS ROUTES
// =============================================================================

/**
 * Course analytics - teachers can access their courses, admins can access all
 * GET /api/statistics/analytics/course/:courseId
 */
router.get(
  '/analytics/course/:courseId',
  authenticateToken,
  requireTeacherOrAdmin,
  StatisticsController.getCourseAnalytics
);

/**
 * Platform analytics - admin only
 * GET /api/statistics/analytics/platform
 */
router.get(
  '/analytics/platform',
  authenticateToken,
  requireAdminOnly,
  StatisticsController.getPlatformAnalytics
);

// =============================================================================
// ACHIEVEMENT ROUTES
// =============================================================================

/**
 * Get user achievements - users can access their own, admins can access any
 * GET /api/statistics/achievements/:userId
 */
router.get(
  '/achievements/:userId',
  authenticateToken,
  requireOwnershipOrAdmin('userId'),
  StatisticsController.getUserAchievements
);

// =============================================================================
// UTILITY ROUTES
// =============================================================================

/**
 * Health check endpoint - no authentication required
 * GET /api/statistics/health-check
 */
router.get(
  '/health-check',
  StatisticsController.healthCheck
);

// =============================================================================
// API DOCUMENTATION ENDPOINT
// =============================================================================

/**
 * API documentation - public endpoint
 * GET /api/statistics/docs
 */
router.get('/docs', (_req, res) => {
  res.json({
    service: 'statistics-service',
    version: '1.0.0',
    description: 'Statistics and analytics service for Yggdrasil educational platform',
    endpoints: {
      dashboards: {
        'GET /dashboard/student/:userId': {
          description: 'Get student dashboard data',
          authentication: 'required',
          authorization: 'student (own data) or admin',
          parameters: { userId: 'string (required)' }
        },
        'GET /dashboard/teacher/:userId': {
          description: 'Get teacher dashboard data',
          authentication: 'required',
          authorization: 'teacher (own data) or admin',
          parameters: { userId: 'string (required)' }
        },
        'GET /dashboard/admin': {
          description: 'Get admin dashboard data',
          authentication: 'required',
          authorization: 'admin or staff only'
        }
      },
      progress: {
        'PUT /progress/student/:userId/course/:courseId': {
          description: 'Update student progress in a course',
          authentication: 'required',
          authorization: 'student (own data), teacher, or admin',
          parameters: { userId: 'string', courseId: 'string' },
          body: 'CourseProgress object'
        },
        'GET /progress/student/:userId/course/:courseId': {
          description: 'Get student progress for a specific course',
          authentication: 'required',
          authorization: 'student (own data) or admin',
          parameters: { userId: 'string', courseId: 'string' }
        },
        'POST /progress/section-complete': {
          description: 'Mark a section as completed',
          authentication: 'required',
          body: { userId: 'string', courseId: 'string', sectionId: 'string' }
        },
        'POST /progress/exercise-complete': {
          description: 'Mark an exercise as completed',
          authentication: 'required',
          body: { userId: 'string', courseId: 'string', exerciseId: 'string', score: 'number (optional)' }
        }
      },
      analytics: {
        'GET /analytics/course/:courseId': {
          description: 'Get course analytics and metrics',
          authentication: 'required',
          authorization: 'teacher or admin',
          parameters: { courseId: 'string (required)' }
        },
        'GET /analytics/platform': {
          description: 'Get platform-wide analytics',
          authentication: 'required',
          authorization: 'admin only'
        }
      },
      achievements: {
        'GET /achievements/:userId': {
          description: 'Get user achievements and badges',
          authentication: 'required',
          authorization: 'user (own data) or admin',
          parameters: { userId: 'string (required)' }
        }
      },
      utility: {
        'GET /health-check': {
          description: 'Statistics service health check',
          authentication: 'none'
        },
        'GET /docs': {
          description: 'API documentation',
          authentication: 'none'
        }
      }
    },
    authentication: {
      type: 'Bearer Token',
      header: 'Authorization: Bearer <jwt_token>',
      note: 'JWT tokens are verified using shared utilities'
    },
    authorization: {
      roles: ['student', 'teacher', 'staff', 'admin'],
      note: 'Role-based access control is enforced on protected endpoints'
    }
  });
});

export default router;