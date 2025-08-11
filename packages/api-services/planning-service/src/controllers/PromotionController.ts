// packages/api-services/planning-service/src/controllers/PromotionController.ts
// HTTP request handling for promotion management

import { Response } from 'express';
import { PromotionService } from '../services/PromotionService';
import {
  ResponseHelper,
  promotionValidationSchemas,
  AuthRequest,
} from '@yggdrasil/shared-utilities';

export class PromotionController {
  private static promotionService = new PromotionService();

  // =============================================================================
  // PROMOTION CRUD
  // =============================================================================

  static async createPromotion(req: AuthRequest, res: Response): Promise<Response> {
    try {
      // Only admin and staff can create promotions
      if (req.user!.role !== 'admin' && req.user!.role !== 'staff') {
        const errorResponse = ResponseHelper.forbidden('Only admin and staff can create promotions');
        return res.status(errorResponse.statusCode).json(errorResponse);
      }

      const validation = promotionValidationSchemas.createPromotion.safeParse(req.body);
      if (!validation.success) {
        const errorResponse = ResponseHelper.badRequest(validation.error.errors[0]!.message);
        return res.status(errorResponse.statusCode).json(errorResponse);
      }

      const promotion = await PromotionController.promotionService.createPromotion(
        validation.data,
        req.user!._id.toString(),
      );

      const successResponse = ResponseHelper.success(promotion, 'Promotion created successfully');
      return res.status(201).json(successResponse);
    } catch (error: any) {
      const errorResponse = ResponseHelper.error(error.message);
      return res.status(errorResponse.statusCode).json(errorResponse);
    }
  }

  static async getPromotions(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const validation = promotionValidationSchemas.filters.safeParse(req.query);
      if (!validation.success) {
        const errorResponse = ResponseHelper.badRequest(validation.error.errors[0]!.message);
        return res.status(errorResponse.statusCode).json(errorResponse);
      }

      const promotions = await PromotionController.promotionService.getPromotions(validation.data);

      const successResponse = ResponseHelper.success(promotions, 'Promotions retrieved successfully');
      return res.status(200).json(successResponse);
    } catch (error: any) {
      const errorResponse = ResponseHelper.error(error.message);
      return res.status(errorResponse.statusCode).json(errorResponse);
    }
  }

  static async getPromotion(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { promotionId } = req.params;

      const promotion = await PromotionController.promotionService.getPromotionWithDetails(promotionId!);

      if (!promotion) {
        const errorResponse = ResponseHelper.notFound('Promotion not found');
        return res.status(errorResponse.statusCode).json(errorResponse);
      }

      const successResponse = ResponseHelper.success(promotion, 'Promotion retrieved successfully');
      return res.status(200).json(successResponse);
    } catch (error: any) {
      const errorResponse = ResponseHelper.error(error.message);
      return res.status(errorResponse.statusCode).json(errorResponse);
    }
  }

  static async updatePromotion(req: AuthRequest, res: Response): Promise<Response> {
    try {
      // Only admin and staff can update promotions
      if (req.user!.role !== 'admin' && req.user!.role !== 'staff') {
        const errorResponse = ResponseHelper.forbidden('Only admin and staff can update promotions');
        return res.status(errorResponse.statusCode).json(errorResponse);
      }

      const { promotionId } = req.params;
      const validation = promotionValidationSchemas.updatePromotion.safeParse(req.body);
      if (!validation.success) {
        const errorResponse = ResponseHelper.badRequest(validation.error.errors[0]!.message);
        return res.status(errorResponse.statusCode).json(errorResponse);
      }

      const promotion = await PromotionController.promotionService.updatePromotion(
        promotionId!,
        validation.data,
      );

      if (!promotion) {
        const errorResponse = ResponseHelper.notFound('Promotion not found');
        return res.status(errorResponse.statusCode).json(errorResponse);
      }

      const successResponse = ResponseHelper.success(promotion, 'Promotion updated successfully');
      return res.status(200).json(successResponse);
    } catch (error: any) {
      const errorResponse = ResponseHelper.error(error.message);
      return res.status(errorResponse.statusCode).json(errorResponse);
    }
  }

  static async deletePromotion(req: AuthRequest, res: Response): Promise<Response> {
    try {
      // Only admin can delete promotions
      if (req.user!.role !== 'admin') {
        const errorResponse = ResponseHelper.forbidden('Only admin can delete promotions');
        return res.status(errorResponse.statusCode).json(errorResponse);
      }

      const { promotionId } = req.params;

      const deleted = await PromotionController.promotionService.deletePromotion(promotionId!);

      if (!deleted) {
        const errorResponse = ResponseHelper.notFound('Promotion not found');
        return res.status(errorResponse.statusCode).json(errorResponse);
      }

      const successResponse = ResponseHelper.success(null, 'Promotion deleted successfully');
      return res.status(200).json(successResponse);
    } catch (error: any) {
      if (error.message.includes('Cannot delete promotion with enrolled students')) {
        const errorResponse = ResponseHelper.badRequest(error.message);
        return res.status(errorResponse.statusCode).json(errorResponse);
      }
      const errorResponse = ResponseHelper.error(error.message);
      return res.status(errorResponse.statusCode).json(errorResponse);
    }
  }

  // =============================================================================
  // STUDENT MANAGEMENT
  // =============================================================================

  static async addStudentsToPromotion(req: AuthRequest, res: Response): Promise<Response> {
    try {
      // Only admin and staff can manage promotion students
      if (req.user!.role !== 'admin' && req.user!.role !== 'staff') {
        const errorResponse = ResponseHelper.forbidden('Only admin and staff can manage promotion students');
        return res.status(errorResponse.statusCode).json(errorResponse);
      }

      const { promotionId } = req.params;
      const validation = promotionValidationSchemas.addStudents.safeParse(req.body);
      if (!validation.success) {
        const errorResponse = ResponseHelper.badRequest(validation.error.errors[0]!.message);
        return res.status(errorResponse.statusCode).json(errorResponse);
      }

      const promotion = await PromotionController.promotionService.addStudentsToPromotion(
        promotionId!,
        validation.data.studentIds,
      );

      if (!promotion) {
        const errorResponse = ResponseHelper.notFound('Promotion not found');
        return res.status(errorResponse.statusCode).json(errorResponse);
      }

      const successResponse = ResponseHelper.success(promotion, 'Students added successfully');
      return res.status(200).json(successResponse);
    } catch (error: any) {
      if (error.message.includes('already in other promotions')) {
        const errorResponse = ResponseHelper.badRequest(error.message);
        return res.status(errorResponse.statusCode).json(errorResponse);
      }
      const errorResponse = ResponseHelper.error(error.message);
      return res.status(errorResponse.statusCode).json(errorResponse);
    }
  }

  static async removeStudentFromPromotion(req: AuthRequest, res: Response): Promise<Response> {
    try {
      // Only admin and staff can manage promotion students
      if (req.user!.role !== 'admin' && req.user!.role !== 'staff') {
        const errorResponse = ResponseHelper.forbidden('Only admin and staff can manage promotion students');
        return res.status(errorResponse.statusCode).json(errorResponse);
      }

      const { promotionId, studentId } = req.params;

      const promotion = await PromotionController.promotionService.removeStudentFromPromotion(
        promotionId!,
        studentId!,
      );

      if (!promotion) {
        const errorResponse = ResponseHelper.notFound('Promotion not found');
        return res.status(errorResponse.statusCode).json(errorResponse);
      }

      const successResponse = ResponseHelper.success(promotion, 'Student removed successfully');
      return res.status(200).json(successResponse);
    } catch (error: any) {
      const errorResponse = ResponseHelper.error(error.message);
      return res.status(errorResponse.statusCode).json(errorResponse);
    }
  }

  // =============================================================================
  // EVENT MANAGEMENT
  // =============================================================================

  static async linkEventsToPromotion(req: AuthRequest, res: Response): Promise<Response> {
    try {
      // Only admin and staff can manage promotion events
      if (req.user!.role !== 'admin' && req.user!.role !== 'staff') {
        const errorResponse = ResponseHelper.forbidden('Only admin and staff can manage promotion events');
        return res.status(errorResponse.statusCode).json(errorResponse);
      }

      const { promotionId } = req.params;
      const validation = promotionValidationSchemas.linkEvents.safeParse(req.body);
      if (!validation.success) {
        const errorResponse = ResponseHelper.badRequest(validation.error.errors[0]!.message);
        return res.status(errorResponse.statusCode).json(errorResponse);
      }

      const promotion = await PromotionController.promotionService.linkEventsToPromotion(
        promotionId!,
        validation.data.eventIds,
      );

      if (!promotion) {
        const errorResponse = ResponseHelper.notFound('Promotion not found');
        return res.status(errorResponse.statusCode).json(errorResponse);
      }

      const successResponse = ResponseHelper.success(promotion, 'Events linked successfully');
      return res.status(200).json(successResponse);
    } catch (error: any) {
      const errorResponse = ResponseHelper.error(error.message);
      return res.status(errorResponse.statusCode).json(errorResponse);
    }
  }

  static async unlinkEventFromPromotion(req: AuthRequest, res: Response): Promise<Response> {
    try {
      // Only admin and staff can manage promotion events
      if (req.user!.role !== 'admin' && req.user!.role !== 'staff') {
        const errorResponse = ResponseHelper.forbidden('Only admin and staff can manage promotion events');
        return res.status(errorResponse.statusCode).json(errorResponse);
      }

      const { promotionId, eventId } = req.params;

      const promotion = await PromotionController.promotionService.unlinkEventFromPromotion(
        promotionId!,
        eventId!,
      );

      if (!promotion) {
        const errorResponse = ResponseHelper.notFound('Promotion not found');
        return res.status(errorResponse.statusCode).json(errorResponse);
      }

      const successResponse = ResponseHelper.success(promotion, 'Event unlinked successfully');
      return res.status(200).json(successResponse);
    } catch (error: any) {
      const errorResponse = ResponseHelper.error(error.message);
      return res.status(errorResponse.statusCode).json(errorResponse);
    }
  }

  // =============================================================================
  // STUDENT VIEWS
  // =============================================================================

  static async getMyPromotion(req: AuthRequest, res: Response): Promise<Response> {
    try {
      // Only students can access this endpoint
      if (req.user!.role !== 'student') {
        const errorResponse = ResponseHelper.forbidden('Only students can access their promotion');
        return res.status(errorResponse.statusCode).json(errorResponse);
      }

      // Use the correct ID field for the student
      const studentId = req.user!._id?.toString() || req.user!.userId || req.user!.id;

      const promotionView = await PromotionController.promotionService.getStudentPromotionView(
        studentId,
      );

      if (!promotionView) {
        const errorResponse = ResponseHelper.notFound('You are not assigned to any promotion');
        return res.status(errorResponse.statusCode).json(errorResponse);
      }

      const successResponse = ResponseHelper.success(promotionView, 'Promotion retrieved successfully');
      return res.status(200).json(successResponse);
    } catch (error: any) {
      const errorResponse = ResponseHelper.error(error.message);
      return res.status(errorResponse.statusCode).json(errorResponse);
    }
  }

  static async getPromotionCalendar(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { promotionId } = req.params;

      // Check if user has access to this promotion
      if (req.user!.role === 'student') {
        const studentPromotion = await PromotionController.promotionService.getStudentPromotion(
          req.user!._id.toString(),
        );
        if (!studentPromotion || studentPromotion._id.toString() !== promotionId) {
          const errorResponse = ResponseHelper.forbidden('You can only access your own promotion calendar');
          return res.status(errorResponse.statusCode).json(errorResponse);
        }
      }

      const promotion = await PromotionController.promotionService.getPromotionWithDetails(promotionId!);

      if (!promotion) {
        const errorResponse = ResponseHelper.notFound('Promotion not found');
        return res.status(errorResponse.statusCode).json(errorResponse);
      }

      // Return only the events (calendar)
      const successResponse = ResponseHelper.success(
        promotion.events || [],
        'Promotion calendar retrieved successfully',
      );
      return res.status(200).json(successResponse);
    } catch (error: any) {
      const errorResponse = ResponseHelper.error(error.message);
      return res.status(errorResponse.statusCode).json(errorResponse);
    }
  }

  // =============================================================================
  // PROGRESSION
  // =============================================================================

  static async progressStudent(req: AuthRequest, res: Response): Promise<Response> {
    try {
      // Only admin and staff can progress students
      if (req.user!.role !== 'admin' && req.user!.role !== 'staff') {
        const errorResponse = ResponseHelper.forbidden('Only admin and staff can progress students');
        return res.status(errorResponse.statusCode).json(errorResponse);
      }

      const { studentId, currentPromotionId } = req.body;

      const nextPromotion = await PromotionController.promotionService.progressStudentToNextSemester(
        studentId,
        currentPromotionId,
      );

      if (!nextPromotion) {
        const errorResponse = ResponseHelper.badRequest('Unable to progress student to next semester');
        return res.status(errorResponse.statusCode).json(errorResponse);
      }

      const successResponse = ResponseHelper.success(
        nextPromotion,
        'Student progressed to next semester successfully',
      );
      return res.status(200).json(successResponse);
    } catch (error: any) {
      const errorResponse = ResponseHelper.error(error.message);
      return res.status(errorResponse.statusCode).json(errorResponse);
    }
  }
}
