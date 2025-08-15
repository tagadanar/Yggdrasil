// packages/api-services/planning-service/src/routes/promotionRoutes.ts
// Promotion API routes

import { Router } from 'express';
import { PromotionCrudController } from '../controllers/PromotionCrudController';
import { PromotionStudentController } from '../controllers/PromotionStudentController';
import { SemesterValidationController } from '../controllers/SemesterValidationController';
import { AuthMiddleware } from '@yggdrasil/shared-utilities';
import { UserModel } from '@yggdrasil/database-schemas';

const router = Router();

// All promotion routes require authentication
router.use(AuthMiddleware.verifyTokenWithUserLookup(async id => UserModel.findById(id)));

// =============================================================================
// CRUD Operations
// =============================================================================

// GET /api/promotions - Get all promotions (filtered)
router.get('/', PromotionCrudController.getPromotions);

// POST /api/promotions - Create a new promotion (admin/staff only)
router.post(
  '/',
  AuthMiddleware.requireRole('admin', 'staff'),
  PromotionCrudController.createPromotion,
);

// GET /api/promotions/my - Get student's own promotion (students only)
router.get('/my', AuthMiddleware.requireRole('student'), PromotionStudentController.getMyPromotion);

// GET /api/promotions/my/validation-status - Get student's own validation status and progress (students only)
router.get(
  '/my/validation-status',
  AuthMiddleware.requireRole('student'),
  PromotionStudentController.getMyValidationStatus,
);

// GET /api/promotions/:promotionId - Get promotion details
router.get('/:promotionId', PromotionCrudController.getPromotion);

// PUT /api/promotions/:promotionId - Update promotion (admin/staff only)
router.put(
  '/:promotionId',
  AuthMiddleware.requireRole('admin', 'staff'),
  PromotionCrudController.updatePromotion,
);

// DELETE /api/promotions/:promotionId - Delete promotion (admin only)
router.delete('/:promotionId', AuthMiddleware.adminOnly, PromotionCrudController.deletePromotion);

// =============================================================================
// Student Management
// =============================================================================

// POST /api/promotions/:promotionId/students - Add students to promotion (admin/staff only)
router.post(
  '/:promotionId/students',
  AuthMiddleware.requireRole('admin', 'staff'),
  PromotionStudentController.addStudentsToPromotion,
);

// DELETE /api/promotions/:promotionId/students/:studentId - Remove student from promotion (admin/staff only)
router.delete(
  '/:promotionId/students/:studentId',
  AuthMiddleware.requireRole('admin', 'staff'),
  PromotionStudentController.removeStudentFromPromotion,
);

// GET /api/promotions/course/:courseId/students - Get students enrolled in course through promotions (teacher/admin/staff)
router.get(
  '/course/:courseId/students',
  AuthMiddleware.requireRole('teacher', 'admin', 'staff'),
  PromotionStudentController.getCourseStudents,
);

// =============================================================================
// Event Management
// =============================================================================

// POST /api/promotions/:promotionId/events - Link events to promotion (admin/staff only)
router.post(
  '/:promotionId/events',
  AuthMiddleware.requireRole('admin', 'staff'),
  PromotionCrudController.linkEventsToPromotion,
);

// DELETE /api/promotions/:promotionId/events/:eventId - Unlink event from promotion (admin/staff only)
router.delete(
  '/:promotionId/events/:eventId',
  AuthMiddleware.requireRole('admin', 'staff'),
  PromotionCrudController.unlinkEventFromPromotion,
);

// GET /api/promotions/:promotionId/calendar - Get promotion calendar (events)
router.get('/:promotionId/calendar', PromotionCrudController.getPromotionCalendar);

// =============================================================================
// Student Progression
// =============================================================================

// POST /api/promotions/progress - Progress student to next semester (admin/staff only)
router.post(
  '/progress',
  AuthMiddleware.requireRole('admin', 'staff'),
  PromotionStudentController.progressStudent,
);

// =============================================================================
// Semester Validation System
// =============================================================================

// POST /api/promotions/semester/initialize - Initialize semester system (admin only)
router.post(
  '/semester/initialize',
  AuthMiddleware.adminOnly,
  SemesterValidationController.initializeSemesters,
);

// GET /api/promotions/semester/all - Get all semesters with statistics
router.get('/semester/all', SemesterValidationController.getSemesters);

// GET /api/promotions/semester/health - Get semester system health check
router.get('/semester/health', SemesterValidationController.getSemesterHealthCheck);

// GET /api/promotions/validation/pending - Get students pending validation (admin/staff only)
router.get(
  '/validation/pending',
  AuthMiddleware.requireRole('admin', 'staff'),
  SemesterValidationController.getStudentsPendingValidation,
);

// GET /api/promotions/validation/insights - Get validation statistics and insights
router.get('/validation/insights', SemesterValidationController.getValidationInsights);

// POST /api/promotions/validation/evaluate/:studentId - Evaluate single student (admin/staff only)
router.post(
  '/validation/evaluate/:studentId',
  AuthMiddleware.requireRole('admin', 'staff'),
  SemesterValidationController.evaluateStudent,
);

// POST /api/promotions/validation/evaluate-batch - Evaluate multiple students (admin/staff only)
router.post(
  '/validation/evaluate-batch',
  AuthMiddleware.requireRole('admin', 'staff'),
  SemesterValidationController.evaluateStudentsBatch,
);

// POST /api/promotions/validation/bulk-validate - Perform bulk validation (admin/staff only)
router.post(
  '/validation/bulk-validate',
  AuthMiddleware.requireRole('admin', 'staff'),
  SemesterValidationController.performBulkValidation,
);

// POST /api/promotions/validation/flag-students - Flag students for validation (admin/staff only)
router.post(
  '/validation/flag-students',
  AuthMiddleware.requireRole('admin', 'staff'),
  SemesterValidationController.flagStudentsForValidation,
);

// POST /api/promotions/validation/process-progressions - Process validated students for progression (admin/staff only)
router.post(
  '/validation/process-progressions',
  AuthMiddleware.requireRole('admin', 'staff'),
  SemesterValidationController.processStudentProgressions,
);

// POST /api/promotions/semester/assign-s1 - Assign new students to S1 (admin/staff only)
router.post(
  '/semester/assign-s1',
  AuthMiddleware.requireRole('admin', 'staff'),
  SemesterValidationController.assignNewStudentsToS1,
);

// GET /api/promotions/validation/auto-candidates - Get auto-validation candidates (admin/staff only)
router.get(
  '/validation/auto-candidates',
  AuthMiddleware.requireRole('admin', 'staff'),
  SemesterValidationController.getAutoValidationCandidates,
);

// POST /api/promotions/validation/process-auto - Process auto-validations (admin only)
router.post(
  '/validation/process-auto',
  AuthMiddleware.adminOnly,
  SemesterValidationController.processAutoValidations,
);

export default router;
