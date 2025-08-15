// packages/api-services/planning-service/src/controllers/PromotionStudentController.ts
// HTTP request handling for promotion student management

import { Response } from 'express';
import mongoose from 'mongoose';
import { PromotionService } from '../services/PromotionService';
import {
  ResponseHelper,
  promotionValidationSchemas,
  AuthRequest,
} from '@yggdrasil/shared-utilities';

export class PromotionStudentController {
  private static promotionService = new PromotionService();

  // =============================================================================
  // STUDENT MANAGEMENT
  // =============================================================================

  static async addStudentsToPromotion(req: AuthRequest, res: Response): Promise<Response> {
    try {
      // Only admin and staff can manage promotion students
      if (req.user!.role !== 'admin' && req.user!.role !== 'staff') {
        const errorResponse = ResponseHelper.forbidden(
          'Only admin and staff can manage promotion students',
        );
        return res.status(errorResponse.statusCode).json(errorResponse);
      }

      const { promotionId } = req.params;
      const validation = promotionValidationSchemas.addStudents.safeParse(req.body);
      if (!validation.success) {
        const errorResponse = ResponseHelper.badRequest(validation.error.errors[0]!.message);
        return res.status(errorResponse.statusCode).json(errorResponse);
      }

      const promotion = await PromotionStudentController.promotionService.addStudentsToPromotion(
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
        const errorResponse = ResponseHelper.forbidden(
          'Only admin and staff can manage promotion students',
        );
        return res.status(errorResponse.statusCode).json(errorResponse);
      }

      const { promotionId, studentId } = req.params;

      const promotion =
        await PromotionStudentController.promotionService.removeStudentFromPromotion(
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

  static async getCourseStudents(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { courseId } = req.params;

      if (!courseId) {
        const errorResponse = ResponseHelper.badRequest('Course ID is required');
        return res.status(errorResponse.statusCode).json(errorResponse);
      }

      const courseStudents =
        await PromotionStudentController.promotionService.getCourseStudents(courseId);

      const successResponse = ResponseHelper.success(
        courseStudents,
        'Course students retrieved successfully',
      );
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

      const promotionView =
        await PromotionStudentController.promotionService.getStudentPromotionView(studentId);

      if (!promotionView) {
        const errorResponse = ResponseHelper.notFound('You are not assigned to any promotion');
        return res.status(errorResponse.statusCode).json(errorResponse);
      }

      const successResponse = ResponseHelper.success(
        promotionView,
        'Promotion retrieved successfully',
      );
      return res.status(200).json(successResponse);
    } catch (error: any) {
      const errorResponse = ResponseHelper.error(error.message);
      return res.status(errorResponse.statusCode).json(errorResponse);
    }
  }

  static async getMyValidationStatus(req: AuthRequest, res: Response): Promise<Response> {
    try {
      // Only students can access this endpoint
      if (req.user!.role !== 'student') {
        const errorResponse = ResponseHelper.forbidden(
          'Only students can access their validation status',
        );
        return res.status(errorResponse.statusCode).json(errorResponse);
      }

      // Use the correct ID field for the student
      const studentId = req.user!._id?.toString() || req.user!.userId || req.user!.id;

      // Get student's promotion progress data
      const { PromotionProgressModel } = await import('@yggdrasil/database-schemas');

      const progressData = await PromotionProgressModel.findOne({
        studentId: new mongoose.Types.ObjectId(studentId),
      }).populate('promotionId', 'name semester intake');

      if (!progressData) {
        const errorResponse = ResponseHelper.notFound('No validation progress found');
        return res.status(errorResponse.statusCode).json(errorResponse);
      }

      // Prepare validation status response
      const validationStatus = {
        currentSemester: progressData.currentSemester,
        targetSemester: progressData.targetSemester,
        validationStatus: progressData.validationStatus,
        averageGrade: progressData.averageGrade || 0,
        attendanceRate: progressData.attendanceRate || 0,
        overallProgress: progressData.overallProgress || 0,
        nextValidationDate: progressData.nextValidationDate,

        // Semester progression path (S1-S10)
        semesterProgression: Array.from({ length: 10 }, (_, i) => {
          const semester = i + 1;
          return {
            semester: `S${semester}`,
            status:
              semester < progressData.currentSemester
                ? 'completed'
                : semester === progressData.currentSemester
                  ? 'current'
                  : 'future',
            isCompleted: semester < progressData.currentSemester,
            isCurrent: semester === progressData.currentSemester,
          };
        }),

        // Current vs required metrics
        validationCriteria: progressData.validationCriteria || {
          minGrade: 60,
          minAttendance: 70,
          coursesRequired: 1,
        },

        // Performance indicators
        performance: {
          current: {
            grade: progressData.averageGrade || 0,
            attendance: progressData.attendanceRate || 0,
            coursesCompleted: progressData.coursesCompleted?.length || 0,
          },
          required: {
            grade: progressData.validationCriteria?.minGrade || 60,
            attendance: progressData.validationCriteria?.minAttendance || 70,
            coursesCompleted: progressData.validationCriteria?.coursesRequired || 1,
          },
        },

        // Validation history (last 5 decisions)
        validationHistory: (progressData.validationHistory || []).slice(-5).map(decision => ({
          date: decision.validatedAt,
          status: decision.status,
          reason: decision.reason,
          validatorId: decision.validatorId,
          semester: decision.nextSemester,
        })),

        promotion: {
          _id: (progressData.promotionId as any)?._id,
          name: (progressData.promotionId as any)?.name,
          semester: (progressData.promotionId as any)?.semester,
          intake: (progressData.promotionId as any)?.intake,
        },
      };

      const successResponse = ResponseHelper.success(
        validationStatus,
        'Validation status retrieved successfully',
      );
      return res.status(200).json(successResponse);
    } catch (error: any) {
      const errorResponse = ResponseHelper.error(error.message);
      return res.status(errorResponse.statusCode).json(errorResponse);
    }
  }

  // =============================================================================
  // STUDENT PROGRESSION
  // =============================================================================

  static async progressStudent(req: AuthRequest, res: Response): Promise<Response> {
    try {
      // Only admin and staff can progress students
      if (req.user!.role !== 'admin' && req.user!.role !== 'staff') {
        const errorResponse = ResponseHelper.forbidden(
          'Only admin and staff can progress students',
        );
        return res.status(errorResponse.statusCode).json(errorResponse);
      }

      const { studentId, currentPromotionId } = req.body;

      const nextPromotion =
        await PromotionStudentController.promotionService.progressStudentToNextSemester(
          studentId,
          currentPromotionId,
        );

      if (!nextPromotion) {
        const errorResponse = ResponseHelper.badRequest(
          'Unable to progress student to next semester',
        );
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
