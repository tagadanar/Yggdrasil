// packages/api-services/planning-service/src/controllers/ProgressController.ts
// HTTP request handling for progress tracking

import { Response } from 'express';
import { ProgressTrackingService } from '../services/ProgressTrackingService';
import { ResponseHelper, AuthRequest } from '@yggdrasil/shared-utilities';
import { z } from 'zod';

export class ProgressController {
  private static progressService = new ProgressTrackingService();

  // Validation schemas
  private static markAttendanceSchema = z.object({
    studentId: z.string().min(1, 'Student ID is required'),
    attended: z.boolean(),
    notes: z.string().optional(),
  });

  private static bulkAttendanceSchema = z.object({
    promotionId: z.string().min(1, 'Promotion ID is required'),
    attendanceRecords: z
      .array(
        z.object({
          studentId: z.string().min(1, 'Student ID is required'),
          attended: z.boolean(),
          notes: z.string().optional(),
        }),
      )
      .min(1, 'At least one attendance record is required'),
  });

  private static studentIdParamSchema = z.object({
    studentId: z.string().min(1, 'Student ID is required'),
  });

  private static eventIdParamSchema = z.object({
    eventId: z.string().min(1, 'Event ID is required'),
  });

  // Additional schemas can be added here as more endpoints are enhanced with validation

  // =============================================================================
  // ATTENDANCE ENDPOINTS
  // =============================================================================

  static async markAttendance(req: AuthRequest, res: Response): Promise<Response> {
    try {
      // Only teachers and admin can mark attendance
      if (
        req.user!.role !== 'teacher' &&
        req.user!.role !== 'admin' &&
        req.user!.role !== 'staff'
      ) {
        const errorResponse = ResponseHelper.forbidden(
          'Only teachers and admin can mark attendance',
        );
        return res.status(errorResponse.statusCode).json(errorResponse);
      }

      const { eventId } = req.params;

      // Validate request body
      const validation = ProgressController.markAttendanceSchema.safeParse(req.body);
      if (!validation.success) {
        const errorResponse = ResponseHelper.badRequest(validation.error.errors[0]!.message);
        return res.status(errorResponse.statusCode).json(errorResponse);
      }

      const { studentId, attended, notes } = validation.data;

      const attendance = await ProgressController.progressService.markStudentAttendance(
        eventId!,
        studentId,
        attended,
        req.user!._id.toString(),
        notes,
      );

      const successResponse = ResponseHelper.success(attendance, 'Attendance marked successfully');
      return res.status(200).json(successResponse);
    } catch (error: any) {
      const errorResponse = ResponseHelper.error(error.message);
      return res.status(errorResponse.statusCode).json(errorResponse);
    }
  }

  static async bulkMarkAttendance(req: AuthRequest, res: Response): Promise<Response> {
    try {
      // Only teachers and admin can mark attendance
      if (
        req.user!.role !== 'teacher' &&
        req.user!.role !== 'admin' &&
        req.user!.role !== 'staff'
      ) {
        const errorResponse = ResponseHelper.forbidden(
          'Only teachers and admin can mark attendance',
        );
        return res.status(errorResponse.statusCode).json(errorResponse);
      }

      // Validate event ID parameter
      const eventIdValidation = ProgressController.eventIdParamSchema.safeParse(req.params);
      if (!eventIdValidation.success) {
        const errorResponse = ResponseHelper.badRequest(eventIdValidation.error.errors[0]!.message);
        return res.status(errorResponse.statusCode).json(errorResponse);
      }

      // Validate request body
      const validation = ProgressController.bulkAttendanceSchema.safeParse(req.body);
      if (!validation.success) {
        const errorResponse = ResponseHelper.badRequest(validation.error.errors[0]!.message);
        return res.status(errorResponse.statusCode).json(errorResponse);
      }

      const { eventId } = eventIdValidation.data;
      const { promotionId, attendanceRecords } = validation.data;

      const result = await ProgressController.progressService.bulkMarkAttendance(
        eventId!,
        promotionId,
        attendanceRecords,
        req.user!._id.toString(),
      );

      const successResponse = ResponseHelper.success(result, 'Attendance marked successfully');
      return res.status(200).json(successResponse);
    } catch (error: any) {
      const errorResponse = ResponseHelper.error(error.message);
      return res.status(errorResponse.statusCode).json(errorResponse);
    }
  }

  static async getEventAttendance(req: AuthRequest, res: Response): Promise<Response> {
    try {
      // Validate event ID parameter
      const eventIdValidation = ProgressController.eventIdParamSchema.safeParse(req.params);
      if (!eventIdValidation.success) {
        const errorResponse = ResponseHelper.badRequest(eventIdValidation.error.errors[0]!.message);
        return res.status(errorResponse.statusCode).json(errorResponse);
      }

      const { eventId } = eventIdValidation.data;
      const attendance = await ProgressController.progressService.getEventAttendance(eventId);

      const successResponse = ResponseHelper.success(
        attendance,
        'Event attendance retrieved successfully',
      );
      return res.status(200).json(successResponse);
    } catch (error: any) {
      const errorResponse = ResponseHelper.error(error.message);
      return res.status(errorResponse.statusCode).json(errorResponse);
    }
  }

  static async getStudentAttendance(req: AuthRequest, res: Response): Promise<Response> {
    try {
      // Validate student ID parameter
      const studentIdValidation = ProgressController.studentIdParamSchema.safeParse(req.params);
      if (!studentIdValidation.success) {
        const errorResponse = ResponseHelper.badRequest(
          studentIdValidation.error.errors[0]!.message,
        );
        return res.status(errorResponse.statusCode).json(errorResponse);
      }

      const { studentId } = studentIdValidation.data;
      const { promotionId } = req.query;

      // Students can only view their own attendance
      if (req.user!.role === 'student' && req.user!._id.toString() !== studentId) {
        const errorResponse = ResponseHelper.forbidden(
          'Students can only view their own attendance',
        );
        return res.status(errorResponse.statusCode).json(errorResponse);
      }

      const attendance = await ProgressController.progressService.getStudentAttendance(
        studentId!,
        promotionId as string | undefined,
      );

      const successResponse = ResponseHelper.success(
        attendance,
        'Student attendance retrieved successfully',
      );
      return res.status(200).json(successResponse);
    } catch (error: any) {
      const errorResponse = ResponseHelper.error(error.message);
      return res.status(errorResponse.statusCode).json(errorResponse);
    }
  }

  // =============================================================================
  // PROGRESS ENDPOINTS
  // =============================================================================

  static async getStudentProgress(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { studentId } = req.params;
      const { promotionId } = req.query;

      // Students can only view their own progress
      if (req.user!.role === 'student' && req.user!._id.toString() !== studentId) {
        const errorResponse = ResponseHelper.forbidden('Students can only view their own progress');
        return res.status(errorResponse.statusCode).json(errorResponse);
      }

      if (!promotionId) {
        const errorResponse = ResponseHelper.badRequest('promotionId is required');
        return res.status(errorResponse.statusCode).json(errorResponse);
      }

      const progress = await ProgressController.progressService.getStudentProgress(
        studentId!,
        promotionId as string,
      );

      const successResponse = ResponseHelper.success(
        progress,
        'Student progress retrieved successfully',
      );
      return res.status(200).json(successResponse);
    } catch (error: any) {
      const errorResponse = ResponseHelper.error(error.message);
      return res.status(errorResponse.statusCode).json(errorResponse);
    }
  }

  static async getPromotionProgress(req: AuthRequest, res: Response): Promise<Response> {
    try {
      // Only admin, staff, and teachers can view promotion-wide progress
      if (req.user!.role === 'student') {
        const errorResponse = ResponseHelper.forbidden(
          'Students cannot view promotion-wide progress',
        );
        return res.status(errorResponse.statusCode).json(errorResponse);
      }

      const { promotionId } = req.params;

      const progress = await ProgressController.progressService.getPromotionProgress(promotionId!);

      const successResponse = ResponseHelper.success(
        progress,
        'Promotion progress retrieved successfully',
      );
      return res.status(200).json(successResponse);
    } catch (error: any) {
      const errorResponse = ResponseHelper.error(error.message);
      return res.status(errorResponse.statusCode).json(errorResponse);
    }
  }

  static async updateCourseProgress(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { studentId, promotionId, courseProgress } = req.body;

      // Only the system or admin can update course progress
      if (req.user!.role !== 'admin' && req.user!.role !== 'staff') {
        const errorResponse = ResponseHelper.forbidden(
          'Only admin can manually update course progress',
        );
        return res.status(errorResponse.statusCode).json(errorResponse);
      }

      if (!studentId || !promotionId || !courseProgress) {
        const errorResponse = ResponseHelper.badRequest(
          'studentId, promotionId, and courseProgress are required',
        );
        return res.status(errorResponse.statusCode).json(errorResponse);
      }

      const progress = await ProgressController.progressService.updateCourseProgress(
        studentId,
        promotionId,
        courseProgress,
      );

      const successResponse = ResponseHelper.success(
        progress,
        'Course progress updated successfully',
      );
      return res.status(200).json(successResponse);
    } catch (error: any) {
      const errorResponse = ResponseHelper.error(error.message);
      return res.status(errorResponse.statusCode).json(errorResponse);
    }
  }

  static async markCourseCompleted(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { studentId, promotionId, courseId } = req.body;

      // Only admin can mark courses as completed
      if (req.user!.role !== 'admin' && req.user!.role !== 'staff') {
        const errorResponse = ResponseHelper.forbidden('Only admin can mark courses as completed');
        return res.status(errorResponse.statusCode).json(errorResponse);
      }

      if (!studentId || !promotionId || !courseId) {
        const errorResponse = ResponseHelper.badRequest(
          'studentId, promotionId, and courseId are required',
        );
        return res.status(errorResponse.statusCode).json(errorResponse);
      }

      const progress = await ProgressController.progressService.markCourseCompleted(
        studentId,
        promotionId,
        courseId,
      );

      const successResponse = ResponseHelper.success(
        progress,
        'Course marked as completed successfully',
      );
      return res.status(200).json(successResponse);
    } catch (error: any) {
      const errorResponse = ResponseHelper.error(error.message);
      return res.status(errorResponse.statusCode).json(errorResponse);
    }
  }

  // =============================================================================
  // STATISTICS & REPORTS
  // =============================================================================

  static async getPromotionStatistics(req: AuthRequest, res: Response): Promise<Response> {
    try {
      // Only admin, staff, and teachers can view statistics
      if (req.user!.role === 'student') {
        const errorResponse = ResponseHelper.forbidden('Students cannot view promotion statistics');
        return res.status(errorResponse.statusCode).json(errorResponse);
      }

      const { promotionId } = req.params;

      const statistics = await ProgressController.progressService.getPromotionStatistics(
        promotionId!,
      );

      const successResponse = ResponseHelper.success(
        statistics,
        'Promotion statistics retrieved successfully',
      );
      return res.status(200).json(successResponse);
    } catch (error: any) {
      const errorResponse = ResponseHelper.error(error.message);
      return res.status(errorResponse.statusCode).json(errorResponse);
    }
  }

  static async getTopPerformers(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { promotionId } = req.params;
      const { limit } = req.query;

      const topPerformers = await ProgressController.progressService.getTopPerformers(
        promotionId!,
        limit ? parseInt(limit as string, 10) : 10,
      );

      const successResponse = ResponseHelper.success(
        topPerformers,
        'Top performers retrieved successfully',
      );
      return res.status(200).json(successResponse);
    } catch (error: any) {
      const errorResponse = ResponseHelper.error(error.message);
      return res.status(errorResponse.statusCode).json(errorResponse);
    }
  }

  static async getAtRiskStudents(req: AuthRequest, res: Response): Promise<Response> {
    try {
      // Only admin and staff can view at-risk students
      if (req.user!.role !== 'admin' && req.user!.role !== 'staff') {
        const errorResponse = ResponseHelper.forbidden(
          'Only admin and staff can view at-risk students',
        );
        return res.status(errorResponse.statusCode).json(errorResponse);
      }

      const { promotionId } = req.params;
      const { progressThreshold, attendanceThreshold } = req.query;

      const atRiskStudents = await ProgressController.progressService.getAtRiskStudents(
        promotionId!,
        progressThreshold ? parseInt(progressThreshold as string, 10) : 30,
        attendanceThreshold ? parseInt(attendanceThreshold as string, 10) : 70,
      );

      const successResponse = ResponseHelper.success(
        atRiskStudents,
        'At-risk students retrieved successfully',
      );
      return res.status(200).json(successResponse);
    } catch (error: any) {
      const errorResponse = ResponseHelper.error(error.message);
      return res.status(errorResponse.statusCode).json(errorResponse);
    }
  }

  static async generateProgressReport(req: AuthRequest, res: Response): Promise<Response> {
    try {
      // Only admin and staff can generate reports
      if (req.user!.role !== 'admin' && req.user!.role !== 'staff') {
        const errorResponse = ResponseHelper.forbidden(
          'Only admin and staff can generate progress reports',
        );
        return res.status(errorResponse.statusCode).json(errorResponse);
      }

      const { promotionId } = req.params;

      const report = await ProgressController.progressService.generateProgressReport(promotionId!);

      const successResponse = ResponseHelper.success(
        report,
        'Progress report generated successfully',
      );
      return res.status(200).json(successResponse);
    } catch (error: any) {
      const errorResponse = ResponseHelper.error(error.message);
      return res.status(errorResponse.statusCode).json(errorResponse);
    }
  }

  static async recalculateProgress(req: AuthRequest, res: Response): Promise<Response> {
    try {
      // Only admin can trigger recalculation
      if (req.user!.role !== 'admin') {
        const errorResponse = ResponseHelper.forbidden(
          'Only admin can trigger progress recalculation',
        );
        return res.status(errorResponse.statusCode).json(errorResponse);
      }

      const { promotionId } = req.params;

      await ProgressController.progressService.recalculatePromotionProgress(promotionId!);

      const successResponse = ResponseHelper.success(
        null,
        'Progress recalculation initiated successfully',
      );
      return res.status(200).json(successResponse);
    } catch (error: any) {
      const errorResponse = ResponseHelper.error(error.message);
      return res.status(errorResponse.statusCode).json(errorResponse);
    }
  }
}
