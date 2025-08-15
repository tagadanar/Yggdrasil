// packages/api-services/planning-service/src/controllers/SemesterValidationController.ts
// HTTP request handling for semester validation system

import { Response } from 'express';
import { ResponseHelper, AuthRequest } from '@yggdrasil/shared-utilities';
import SemesterManagementService from '../services/SemesterManagementService';
import ValidationCriteriaEngine from '../services/ValidationCriteriaEngine';

export class SemesterValidationController {
  // =============================================================================
  // SEMESTER VALIDATION SYSTEM
  // =============================================================================

  static async initializeSemesters(req: AuthRequest, res: Response): Promise<Response> {
    try {
      // Only admin can initialize semesters
      if (req.user!.role !== 'admin') {
        const errorResponse = ResponseHelper.forbidden('Only admin can initialize semesters');
        return res.status(errorResponse.statusCode).json(errorResponse);
      }

      const { academicYear } = req.query;
      const result = await SemesterManagementService.initializeSemesters(academicYear as string);

      const successResponse = ResponseHelper.success(
        result,
        'Semester system initialized successfully',
      );
      return res.status(200).json(successResponse);
    } catch (error: any) {
      const errorResponse = ResponseHelper.error(error.message);
      return res.status(errorResponse.statusCode).json(errorResponse);
    }
  }

  static async getSemesters(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { academicYear } = req.query;
      const semesters = await SemesterManagementService.getAllSemesters(academicYear as string);
      const statistics = await SemesterManagementService.getSemesterStatistics(
        academicYear as string,
      );

      const successResponse = ResponseHelper.success(
        { semesters: semesters.semesters, statistics },
        'Semesters retrieved successfully',
      );
      return res.status(200).json(successResponse);
    } catch (error: any) {
      const errorResponse = ResponseHelper.error(error.message);
      return res.status(errorResponse.statusCode).json(errorResponse);
    }
  }

  static async getSemesterHealthCheck(_req: AuthRequest, res: Response): Promise<Response> {
    try {
      const healthCheck = await SemesterManagementService.performHealthCheck();

      const successResponse = ResponseHelper.success(
        healthCheck,
        'Semester health check completed',
      );
      return res.status(200).json(successResponse);
    } catch (error: any) {
      const errorResponse = ResponseHelper.error(error.message);
      return res.status(errorResponse.statusCode).json(errorResponse);
    }
  }

  // =============================================================================
  // VALIDATION MANAGEMENT
  // =============================================================================

  static async getStudentsPendingValidation(req: AuthRequest, res: Response): Promise<Response> {
    try {
      // Only admin and staff can view pending validations
      if (req.user!.role !== 'admin' && req.user!.role !== 'staff') {
        const errorResponse = ResponseHelper.forbidden(
          'Only admin and staff can view pending validations',
        );
        return res.status(errorResponse.statusCode).json(errorResponse);
      }

      const { promotionId } = req.query;

      const { PromotionProgressModel } = await import('@yggdrasil/database-schemas');

      const pendingStudents = await (PromotionProgressModel as any).getStudentsPendingValidation(
        promotionId
          ? new (await import('mongoose')).Types.ObjectId(promotionId as string)
          : undefined,
      );

      // Filter and transform data - only include students with valid references
      const validStudents = pendingStudents.filter((student: any) => {
        const hasValidStudent = student.studentId && student.studentId._id;
        const hasValidPromotion = student.promotionId && student.promotionId._id;
        return hasValidStudent && hasValidPromotion;
      });

      const simplifiedStudents = validStudents.map((student: any) => ({
        _id: student._id?.toString() || 'unknown',
        validationStatus: student.validationStatus || 'pending_validation',
        averageGrade: student.averageGrade || 0,
        attendanceRate: student.attendanceRate || 0,
        currentSemester: student.currentSemester || 1,
        targetSemester: student.targetSemester || 2,
        nextValidationDate: student.nextValidationDate || null,
        // Include populated student data matching frontend interface
        studentId: {
          _id: student.studentId._id?.toString() || student.studentId.toString(),
          email: student.studentId.email || 'no-email@example.com',
          profile: student.studentId.profile || {
            firstName: 'Test',
            lastName: 'User',
            studentId: student.studentId.profile?.studentId || undefined,
          },
        },
        // Include promotion data matching frontend interface
        promotionId: {
          _id: student.promotionId._id?.toString() || student.promotionId.toString(),
          name: student.promotionId.name || 'Unknown Promotion',
          semester: student.promotionId.semester || 1,
          intake: student.promotionId.intake || 'september',
        },
      }));

      const successResponse = ResponseHelper.success(
        simplifiedStudents,
        'Students pending validation retrieved successfully',
      );
      return res.status(200).json(successResponse);
    } catch (error: any) {
      const errorResponse = ResponseHelper.error(error.message);
      return res.status(errorResponse.statusCode).json(errorResponse);
    }
  }

  static async getValidationInsights(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { semesterId } = req.query;
      const insights = await ValidationCriteriaEngine.getValidationInsights(semesterId as string);

      const successResponse = ResponseHelper.success(
        insights,
        'Validation insights retrieved successfully',
      );
      return res.status(200).json(successResponse);
    } catch (error: any) {
      const errorResponse = ResponseHelper.error(error.message);
      return res.status(errorResponse.statusCode).json(errorResponse);
    }
  }

  static async evaluateStudent(req: AuthRequest, res: Response): Promise<Response> {
    try {
      // Only admin and staff can evaluate students
      if (req.user!.role !== 'admin' && req.user!.role !== 'staff') {
        const errorResponse = ResponseHelper.forbidden(
          'Only admin and staff can evaluate students',
        );
        return res.status(errorResponse.statusCode).json(errorResponse);
      }

      const { studentId } = req.params;
      const customCriteria = req.body.criteria;

      if (!studentId) {
        const errorResponse = ResponseHelper.badRequest('Student ID is required');
        return res.status(errorResponse.statusCode).json(errorResponse);
      }

      const evaluation = await ValidationCriteriaEngine.evaluateStudent(studentId, customCriteria);

      const successResponse = ResponseHelper.success(evaluation, 'Student evaluation completed');
      return res.status(200).json(successResponse);
    } catch (error: any) {
      const errorResponse = ResponseHelper.error(error.message);
      return res.status(errorResponse.statusCode).json(errorResponse);
    }
  }

  static async evaluateStudentsBatch(req: AuthRequest, res: Response): Promise<Response> {
    try {
      // Only admin and staff can evaluate students
      if (req.user!.role !== 'admin' && req.user!.role !== 'staff') {
        const errorResponse = ResponseHelper.forbidden(
          'Only admin and staff can evaluate students',
        );
        return res.status(errorResponse.statusCode).json(errorResponse);
      }

      const { studentIds, criteria } = req.body;

      if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
        const errorResponse = ResponseHelper.badRequest('Student IDs array is required');
        return res.status(errorResponse.statusCode).json(errorResponse);
      }

      const evaluations = await ValidationCriteriaEngine.evaluateStudentsBatch(
        studentIds,
        criteria,
      );

      const successResponse = ResponseHelper.success(evaluations, 'Batch evaluation completed');
      return res.status(200).json(successResponse);
    } catch (error: any) {
      const errorResponse = ResponseHelper.error(error.message);
      return res.status(errorResponse.statusCode).json(errorResponse);
    }
  }

  static async performBulkValidation(req: AuthRequest, res: Response): Promise<Response> {
    try {
      // Only admin and staff can perform validations
      if (req.user!.role !== 'admin' && req.user!.role !== 'staff') {
        const errorResponse = ResponseHelper.forbidden(
          'Only admin and staff can perform validations',
        );
        return res.status(errorResponse.statusCode).json(errorResponse);
      }

      const { studentIds, decision, reason, notes, customCriteria } = req.body;

      if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
        const errorResponse = ResponseHelper.badRequest('Student IDs array is required');
        return res.status(errorResponse.statusCode).json(errorResponse);
      }

      if (!['approve', 'reject', 'conditional'].includes(decision)) {
        const errorResponse = ResponseHelper.badRequest(
          'Decision must be approve, reject, or conditional',
        );
        return res.status(errorResponse.statusCode).json(errorResponse);
      }

      const bulkValidationRequest = {
        studentIds,
        validatorId: req.user!._id.toString(),
        decision,
        reason,
        notes,
        customCriteria,
      };

      const result = await ValidationCriteriaEngine.performBulkValidation(bulkValidationRequest);

      const successResponse = ResponseHelper.success(result, 'Bulk validation completed');
      return res.status(200).json(successResponse);
    } catch (error: any) {
      const errorResponse = ResponseHelper.error(error.message);
      return res.status(errorResponse.statusCode).json(errorResponse);
    }
  }

  static async flagStudentsForValidation(req: AuthRequest, res: Response): Promise<Response> {
    try {
      // Only admin and staff can flag students for validation
      if (req.user!.role !== 'admin' && req.user!.role !== 'staff') {
        const errorResponse = ResponseHelper.forbidden(
          'Only admin and staff can flag students for validation',
        );
        return res.status(errorResponse.statusCode).json(errorResponse);
      }

      const { semesterIds } = req.body;
      const totalFlagged = await SemesterManagementService.flagStudentsForValidation(semesterIds);

      const successResponse = ResponseHelper.success(
        { totalFlagged },
        `Flagged ${totalFlagged} students for validation`,
      );
      return res.status(200).json(successResponse);
    } catch (error: any) {
      const errorResponse = ResponseHelper.error(error.message);
      return res.status(errorResponse.statusCode).json(errorResponse);
    }
  }

  static async processStudentProgressions(req: AuthRequest, res: Response): Promise<Response> {
    try {
      // Only admin and staff can process progressions
      if (req.user!.role !== 'admin' && req.user!.role !== 'staff') {
        const errorResponse = ResponseHelper.forbidden(
          'Only admin and staff can process progressions',
        );
        return res.status(errorResponse.statusCode).json(errorResponse);
      }

      const result = await SemesterManagementService.progressValidatedStudents();

      const successResponse = ResponseHelper.success(
        result,
        'Student progressions processed successfully',
      );
      return res.status(200).json(successResponse);
    } catch (error: any) {
      const errorResponse = ResponseHelper.error(error.message);
      return res.status(errorResponse.statusCode).json(errorResponse);
    }
  }

  static async assignNewStudentsToS1(req: AuthRequest, res: Response): Promise<Response> {
    try {
      // Only admin and staff can assign students
      if (req.user!.role !== 'admin' && req.user!.role !== 'staff') {
        const errorResponse = ResponseHelper.forbidden('Only admin and staff can assign students');
        return res.status(errorResponse.statusCode).json(errorResponse);
      }

      const { studentIds, intake } = req.body;

      if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
        const errorResponse = ResponseHelper.badRequest('Student IDs array is required');
        return res.status(errorResponse.statusCode).json(errorResponse);
      }

      const assigned = await SemesterManagementService.assignNewStudentsToS1(studentIds, intake);

      const successResponse = ResponseHelper.success(
        { assigned },
        `Assigned ${assigned} students to S1`,
      );
      return res.status(200).json(successResponse);
    } catch (error: any) {
      const errorResponse = ResponseHelper.error(error.message);
      return res.status(errorResponse.statusCode).json(errorResponse);
    }
  }

  static async getAutoValidationCandidates(req: AuthRequest, res: Response): Promise<Response> {
    try {
      // Only admin and staff can view auto-validation candidates
      if (req.user!.role !== 'admin' && req.user!.role !== 'staff') {
        const errorResponse = ResponseHelper.forbidden(
          'Only admin and staff can view auto-validation candidates',
        );
        return res.status(errorResponse.statusCode).json(errorResponse);
      }

      const candidates = await ValidationCriteriaEngine.getAutoValidationCandidates();

      const successResponse = ResponseHelper.success(
        candidates,
        'Auto-validation candidates retrieved successfully',
      );
      return res.status(200).json(successResponse);
    } catch (error: any) {
      const errorResponse = ResponseHelper.error(error.message);
      return res.status(errorResponse.statusCode).json(errorResponse);
    }
  }

  static async processAutoValidations(req: AuthRequest, res: Response): Promise<Response> {
    try {
      // Only admin can process auto-validations
      if (req.user!.role !== 'admin') {
        const errorResponse = ResponseHelper.forbidden('Only admin can process auto-validations');
        return res.status(errorResponse.statusCode).json(errorResponse);
      }

      const result = await ValidationCriteriaEngine.processAutoValidations();

      const successResponse = ResponseHelper.success(
        result,
        'Auto-validations processed successfully',
      );
      return res.status(200).json(successResponse);
    } catch (error: any) {
      const errorResponse = ResponseHelper.error(error.message);
      return res.status(errorResponse.statusCode).json(errorResponse);
    }
  }
}
