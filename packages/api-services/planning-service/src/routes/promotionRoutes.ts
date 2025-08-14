// packages/api-services/planning-service/src/routes/promotionRoutes.ts
// Promotion API routes

import { Router } from 'express';
import { PromotionController } from '../controllers/PromotionController';
import { AuthMiddleware } from '@yggdrasil/shared-utilities';
import { UserModel } from '@yggdrasil/database-schemas';

const router = Router();

// All promotion routes require authentication
router.use(AuthMiddleware.verifyTokenWithUserLookup(async (id) => UserModel.findById(id)));

// =============================================================================
// CRUD Operations
// =============================================================================

// GET /api/promotions - Get all promotions (filtered)
router.get('/', PromotionController.getPromotions);

// POST /api/promotions - Create a new promotion (admin/staff only)
router.post(
  '/',
  AuthMiddleware.requireRole('admin', 'staff'),
  PromotionController.createPromotion,
);

// GET /api/promotions/my - Get student's own promotion (students only)
router.get(
  '/my',
  AuthMiddleware.requireRole('student'),
  PromotionController.getMyPromotion,
);

// GET /api/promotions/my/validation-status - Get student's own validation status and progress (students only)
router.get(
  '/my/validation-status',
  AuthMiddleware.requireRole('student'),
  PromotionController.getMyValidationStatus,
);

// GET /api/promotions/:promotionId - Get promotion details
router.get('/:promotionId', PromotionController.getPromotion);

// PUT /api/promotions/:promotionId - Update promotion (admin/staff only)
router.put(
  '/:promotionId',
  AuthMiddleware.requireRole('admin', 'staff'),
  PromotionController.updatePromotion,
);

// DELETE /api/promotions/:promotionId - Delete promotion (admin only)
router.delete(
  '/:promotionId',
  AuthMiddleware.adminOnly,
  PromotionController.deletePromotion,
);

// =============================================================================
// Student Management
// =============================================================================

// POST /api/promotions/:promotionId/students - Add students to promotion (admin/staff only)
router.post(
  '/:promotionId/students',
  AuthMiddleware.requireRole('admin', 'staff'),
  PromotionController.addStudentsToPromotion,
);

// DELETE /api/promotions/:promotionId/students/:studentId - Remove student from promotion (admin/staff only)
router.delete(
  '/:promotionId/students/:studentId',
  AuthMiddleware.requireRole('admin', 'staff'),
  PromotionController.removeStudentFromPromotion,
);

// GET /api/promotions/course/:courseId/students - Get students enrolled in course through promotions (teacher/admin/staff)
router.get(
  '/course/:courseId/students',
  AuthMiddleware.requireRole('teacher', 'admin', 'staff'),
  PromotionController.getCourseStudents,
);

// =============================================================================
// Event Management
// =============================================================================

// POST /api/promotions/:promotionId/events - Link events to promotion (admin/staff only)
router.post(
  '/:promotionId/events',
  AuthMiddleware.requireRole('admin', 'staff'),
  PromotionController.linkEventsToPromotion,
);

// DELETE /api/promotions/:promotionId/events/:eventId - Unlink event from promotion (admin/staff only)
router.delete(
  '/:promotionId/events/:eventId',
  AuthMiddleware.requireRole('admin', 'staff'),
  PromotionController.unlinkEventFromPromotion,
);

// GET /api/promotions/:promotionId/calendar - Get promotion calendar (events)
router.get('/:promotionId/calendar', PromotionController.getPromotionCalendar);

// =============================================================================
// Student Progression
// =============================================================================

// POST /api/promotions/progress - Progress student to next semester (admin/staff only)
router.post(
  '/progress',
  AuthMiddleware.requireRole('admin', 'staff'),
  PromotionController.progressStudent,
);

// =============================================================================
// Semester Validation System
// =============================================================================

// POST /api/promotions/semester/initialize - Initialize semester system (admin only)
router.post(
  '/semester/initialize',
  AuthMiddleware.adminOnly,
  PromotionController.initializeSemesters,
);

// GET /api/promotions/semester/all - Get all semesters with statistics
router.get('/semester/all', PromotionController.getSemesters);

// GET /api/promotions/semester/health - Get semester system health check
router.get('/semester/health', PromotionController.getSemesterHealthCheck);

// GET /api/promotions/validation/pending - Get students pending validation (admin/staff only)
router.get(
  '/validation/pending',
  AuthMiddleware.requireRole('admin', 'staff'),
  PromotionController.getStudentsPendingValidation,
);

// GET /api/promotions/validation/insights - Get validation statistics and insights
router.get('/validation/insights', PromotionController.getValidationInsights);

// POST /api/promotions/validation/evaluate/:studentId - Evaluate single student (admin/staff only)
router.post(
  '/validation/evaluate/:studentId',
  AuthMiddleware.requireRole('admin', 'staff'),
  PromotionController.evaluateStudent,
);

// POST /api/promotions/validation/evaluate-batch - Evaluate multiple students (admin/staff only)
router.post(
  '/validation/evaluate-batch',
  AuthMiddleware.requireRole('admin', 'staff'),
  PromotionController.evaluateStudentsBatch,
);

// POST /api/promotions/validation/bulk-validate - Perform bulk validation (admin/staff only)
router.post(
  '/validation/bulk-validate',
  AuthMiddleware.requireRole('admin', 'staff'),
  PromotionController.performBulkValidation,
);

// POST /api/promotions/validation/flag-students - Flag students for validation (admin/staff only)
router.post(
  '/validation/flag-students',
  AuthMiddleware.requireRole('admin', 'staff'),
  PromotionController.flagStudentsForValidation,
);

// POST /api/promotions/validation/process-progressions - Process validated students for progression (admin/staff only)
router.post(
  '/validation/process-progressions',
  AuthMiddleware.requireRole('admin', 'staff'),
  PromotionController.processStudentProgressions,
);

// POST /api/promotions/semester/assign-s1 - Assign new students to S1 (admin/staff only)
router.post(
  '/semester/assign-s1',
  AuthMiddleware.requireRole('admin', 'staff'),
  PromotionController.assignNewStudentsToS1,
);

// GET /api/promotions/validation/auto-candidates - Get auto-validation candidates (admin/staff only)
router.get(
  '/validation/auto-candidates',
  AuthMiddleware.requireRole('admin', 'staff'),
  PromotionController.getAutoValidationCandidates,
);

// POST /api/promotions/validation/process-auto - Process auto-validations (admin only)
router.post(
  '/validation/process-auto',
  AuthMiddleware.adminOnly,
  PromotionController.processAutoValidations,
);

export default router;