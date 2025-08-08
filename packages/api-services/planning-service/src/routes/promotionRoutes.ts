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
  AuthMiddleware.requireRole(['admin', 'staff']),
  PromotionController.createPromotion,
);

// GET /api/promotions/my - Get student's own promotion (students only)
router.get(
  '/my',
  AuthMiddleware.requireRole(['student']),
  PromotionController.getMyPromotion,
);

// GET /api/promotions/:promotionId - Get promotion details
router.get('/:promotionId', PromotionController.getPromotion);

// PUT /api/promotions/:promotionId - Update promotion (admin/staff only)
router.put(
  '/:promotionId',
  AuthMiddleware.requireRole(['admin', 'staff']),
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
  AuthMiddleware.requireRole(['admin', 'staff']),
  PromotionController.addStudentsToPromotion,
);

// DELETE /api/promotions/:promotionId/students/:studentId - Remove student from promotion (admin/staff only)
router.delete(
  '/:promotionId/students/:studentId',
  AuthMiddleware.requireRole(['admin', 'staff']),
  PromotionController.removeStudentFromPromotion,
);

// =============================================================================
// Event Management
// =============================================================================

// POST /api/promotions/:promotionId/events - Link events to promotion (admin/staff only)
router.post(
  '/:promotionId/events',
  AuthMiddleware.requireRole(['admin', 'staff']),
  PromotionController.linkEventsToPromotion,
);

// DELETE /api/promotions/:promotionId/events/:eventId - Unlink event from promotion (admin/staff only)
router.delete(
  '/:promotionId/events/:eventId',
  AuthMiddleware.requireRole(['admin', 'staff']),
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
  AuthMiddleware.requireRole(['admin', 'staff']),
  PromotionController.progressStudent,
);

export default router;