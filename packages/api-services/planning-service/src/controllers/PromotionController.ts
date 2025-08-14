// packages/api-services/planning-service/src/controllers/PromotionController.ts
// HTTP request handling for promotion management

import { Response } from 'express';
import mongoose from 'mongoose';
import { PromotionService } from '../services/PromotionService';
import {
  ResponseHelper,
  promotionValidationSchemas,
  AuthRequest,
} from '@yggdrasil/shared-utilities';
import SemesterManagementService from '../services/SemesterManagementService';
import ValidationCriteriaEngine from '../services/ValidationCriteriaEngine';

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

  /**
   * Get student's own validation status and academic progress
   */
  static async getMyValidationStatus(req: AuthRequest, res: Response): Promise<Response> {
    try {
      // Only students can access this endpoint
      if (req.user!.role !== 'student') {
        const errorResponse = ResponseHelper.forbidden('Only students can access their validation status');
        return res.status(errorResponse.statusCode).json(errorResponse);
      }

      // Use the correct ID field for the student
      const studentId = req.user!._id?.toString() || req.user!.userId || req.user!.id;

      // Get student's promotion progress data
      const { PromotionProgressModel } = await import('@yggdrasil/database-schemas');
      
      const progressData = await PromotionProgressModel.findOne({
        studentId: new mongoose.Types.ObjectId(studentId)
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
            status: semester < progressData.currentSemester ? 'completed' :
                   semester === progressData.currentSemester ? 'current' : 'future',
            isCompleted: semester < progressData.currentSemester,
            isCurrent: semester === progressData.currentSemester
          };
        }),

        // Current vs required metrics
        validationCriteria: progressData.validationCriteria || {
          minGrade: 60,
          minAttendance: 70,
          coursesRequired: 1
        },

        // Performance indicators
        performance: {
          current: {
            grade: progressData.averageGrade || 0,
            attendance: progressData.attendanceRate || 0,
            coursesCompleted: progressData.coursesCompleted?.length || 0
          },
          required: {
            grade: progressData.validationCriteria?.minGrade || 60,
            attendance: progressData.validationCriteria?.minAttendance || 70,
            coursesCompleted: progressData.validationCriteria?.coursesRequired || 1
          }
        },

        // Validation history (last 5 decisions)
        validationHistory: (progressData.validationHistory || [])
          .slice(-5)
          .map(decision => ({
            date: decision.validatedAt,
            status: decision.status,
            reason: decision.reason,
            validatorId: decision.validatorId,
            semester: decision.nextSemester
          })),

        promotion: {
          _id: (progressData.promotionId as any)?._id,
          name: (progressData.promotionId as any)?.name,
          semester: (progressData.promotionId as any)?.semester,
          intake: (progressData.promotionId as any)?.intake
        }
      };

      const successResponse = ResponseHelper.success(validationStatus, 'Validation status retrieved successfully');
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

  /**
   * Get students enrolled in a course through promotions
   * Used by course management page to show real students
   */
  static async getCourseStudents(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { courseId } = req.params;

      if (!courseId) {
        const errorResponse = ResponseHelper.badRequest('Course ID is required');
        return res.status(errorResponse.statusCode).json(errorResponse);
      }

      const courseStudents = await PromotionController.promotionService.getCourseStudents(courseId);
      
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
  // SEMESTER VALIDATION SYSTEM
  // =============================================================================

  /**
   * Initialize semester system (S1-S10) 
   * Creates permanent semester promotions
   */
  static async initializeSemesters(req: AuthRequest, res: Response): Promise<Response> {
    try {
      // Only admin can initialize semesters
      if (req.user!.role !== 'admin') {
        const errorResponse = ResponseHelper.forbidden('Only admin can initialize semesters');
        return res.status(errorResponse.statusCode).json(errorResponse);
      }

      const { academicYear } = req.query;
      const result = await SemesterManagementService.initializeSemesters(academicYear as string);

      const successResponse = ResponseHelper.success(result, 'Semester system initialized successfully');
      return res.status(200).json(successResponse);
    } catch (error: any) {
      const errorResponse = ResponseHelper.error(error.message);
      return res.status(errorResponse.statusCode).json(errorResponse);
    }
  }

  /**
   * Get all semester promotions with statistics
   */
  static async getSemesters(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { academicYear } = req.query;
      const semesters = await SemesterManagementService.getAllSemesters(academicYear as string);
      const statistics = await SemesterManagementService.getSemesterStatistics(academicYear as string);

      const successResponse = ResponseHelper.success(
        { semesters: semesters.semesters, statistics },
        'Semesters retrieved successfully'
      );
      return res.status(200).json(successResponse);
    } catch (error: any) {
      const errorResponse = ResponseHelper.error(error.message);
      return res.status(errorResponse.statusCode).json(errorResponse);
    }
  }

  /**
   * Get students pending validation for a semester
   */
  static async getStudentsPendingValidation(req: AuthRequest, res: Response): Promise<Response> {
    try {
      console.log('🔍 getStudentsPendingValidation called');
      console.log('📋 User role:', req.user?.role);
      console.log('📋 Query params:', req.query);
      
      // Only admin and staff can view pending validations
      if (req.user!.role !== 'admin' && req.user!.role !== 'staff') {
        console.log('❌ Access denied: user role is not admin or staff');
        const errorResponse = ResponseHelper.forbidden('Only admin and staff can view pending validations');
        return res.status(errorResponse.statusCode).json(errorResponse);
      }

      const { promotionId } = req.query;
      console.log('📋 Promotion ID from query:', promotionId);
      
      const { PromotionProgressModel } = await import('@yggdrasil/database-schemas');
      console.log('✅ PromotionProgressModel imported successfully');
      
      const pendingStudents = await (PromotionProgressModel as any).getStudentsPendingValidation(
        promotionId ? new (await import('mongoose')).Types.ObjectId(promotionId as string) : undefined
      );
      console.log('✅ Pending students retrieved:', pendingStudents.length);
      
      // WRITE DEBUG INFO TO FILE for examination
      const fs = require('fs');
      const debugInfo = {
        timestamp: new Date().toISOString(),
        count: pendingStudents.length,
        firstStudent: pendingStudents.length > 0 ? {
          _id: pendingStudents[0]._id?.toString(),
          validationStatus: pendingStudents[0].validationStatus,
          studentId: pendingStudents[0].studentId,
          promotionId: pendingStudents[0].promotionId,
          keys: Object.keys(pendingStudents[0])
        } : null
      };
      
      try {
        fs.writeFileSync('/tmp/populate-debug.json', JSON.stringify(debugInfo, null, 2));
        console.log('📝 Debug info written to /tmp/populate-debug.json');
      } catch (e: any) {
        console.log('❌ Failed to write debug file:', e.message);
      }
      
      // Debug: Log first student's structure (avoid JSON.stringify to prevent transform errors)
      if (pendingStudents.length > 0) {
        console.log('🔍 First student keys:', Object.keys(pendingStudents[0]));
        console.log('🔍 First student _id:', pendingStudents[0]._id);
        console.log('🔍 First student validationStatus:', pendingStudents[0].validationStatus);
        if (pendingStudents[0].studentId) {
          console.log('🔍 First student.studentId keys:', Object.keys(pendingStudents[0].studentId));
          console.log('🔍 First student.studentId._id:', pendingStudents[0].studentId._id);
          if (pendingStudents[0].studentId.profile) {
            console.log('🔍 First student.studentId.profile:', pendingStudents[0].studentId.profile);
          }
        } else {
          console.log('🔍 First student.studentId is NULL!');
        }
        
        if (pendingStudents[0].promotionId) {
          console.log('🔍 First student.promotionId:', pendingStudents[0].promotionId);
        } else {
          console.log('🔍 First student.promotionId is NULL!');
        }
      }

      // Filter and transform data - only include students with valid references
      const validStudents = pendingStudents.filter((student: any) => {
        const hasValidStudent = student.studentId && student.studentId._id;
        const hasValidPromotion = student.promotionId && student.promotionId._id;
        
        if (!hasValidStudent || !hasValidPromotion) {
          console.log(`⚠️ Skipping student with missing data - studentId: ${!!hasValidStudent}, promotionId: ${!!hasValidPromotion}`);
          return false;
        }
        return true;
      });
      
      console.log(`📊 Filtered students: ${validStudents.length} valid out of ${pendingStudents.length} total`);
      
      const simplifiedStudents = validStudents.map((student: any, index: number) => {
        const result = {
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
            studentId: student.studentId.profile?.studentId || undefined
          }
        },
        // Include promotion data matching frontend interface
        promotionId: {
          _id: student.promotionId._id?.toString() || student.promotionId.toString(),
          name: student.promotionId.name || 'Unknown Promotion',
          semester: student.promotionId.semester || 1,
          intake: student.promotionId.intake || 'september'
        }
        };
        
        // Debug log the transformed data for first few students
        if (index < 3) {
          console.log(`🔍 Valid student ${index} - studentId:`, result.studentId);
          console.log(`🔍 Valid student ${index} - promotionId:`, result.promotionId);
        }
        
        return result;
      });

      const successResponse = ResponseHelper.success(
        simplifiedStudents,
        'Students pending validation retrieved successfully'
      );
      return res.status(200).json(successResponse);
    } catch (error: any) {
      console.error('❌ Error in getStudentsPendingValidation:', error);
      console.error('❌ Stack:', error.stack);
      const errorResponse = ResponseHelper.error(error.message);
      return res.status(errorResponse.statusCode).json(errorResponse);
    }
  }

  /**
   * Evaluate a single student against validation criteria
   */
  static async evaluateStudent(req: AuthRequest, res: Response): Promise<Response> {
    try {
      // Only admin and staff can evaluate students
      if (req.user!.role !== 'admin' && req.user!.role !== 'staff') {
        const errorResponse = ResponseHelper.forbidden('Only admin and staff can evaluate students');
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

  /**
   * Evaluate multiple students in batch
   */
  static async evaluateStudentsBatch(req: AuthRequest, res: Response): Promise<Response> {
    try {
      // Only admin and staff can evaluate students
      if (req.user!.role !== 'admin' && req.user!.role !== 'staff') {
        const errorResponse = ResponseHelper.forbidden('Only admin and staff can evaluate students');
        return res.status(errorResponse.statusCode).json(errorResponse);
      }

      const { studentIds, criteria } = req.body;

      if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
        const errorResponse = ResponseHelper.badRequest('Student IDs array is required');
        return res.status(errorResponse.statusCode).json(errorResponse);
      }

      const evaluations = await ValidationCriteriaEngine.evaluateStudentsBatch(studentIds, criteria);

      const successResponse = ResponseHelper.success(evaluations, 'Batch evaluation completed');
      return res.status(200).json(successResponse);
    } catch (error: any) {
      const errorResponse = ResponseHelper.error(error.message);
      return res.status(errorResponse.statusCode).json(errorResponse);
    }
  }

  /**
   * Perform bulk validation operation
   */
  static async performBulkValidation(req: AuthRequest, res: Response): Promise<Response> {
    try {
      // Only admin and staff can perform validations
      if (req.user!.role !== 'admin' && req.user!.role !== 'staff') {
        const errorResponse = ResponseHelper.forbidden('Only admin and staff can perform validations');
        return res.status(errorResponse.statusCode).json(errorResponse);
      }

      const { studentIds, decision, reason, notes, customCriteria } = req.body;

      if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
        const errorResponse = ResponseHelper.badRequest('Student IDs array is required');
        return res.status(errorResponse.statusCode).json(errorResponse);
      }

      if (!['approve', 'reject', 'conditional'].includes(decision)) {
        const errorResponse = ResponseHelper.badRequest('Decision must be approve, reject, or conditional');
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

  /**
   * Get validation statistics and insights
   */
  static async getValidationInsights(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { semesterId } = req.query;
      const insights = await ValidationCriteriaEngine.getValidationInsights(semesterId as string);

      const successResponse = ResponseHelper.success(insights, 'Validation insights retrieved successfully');
      return res.status(200).json(successResponse);
    } catch (error: any) {
      const errorResponse = ResponseHelper.error(error.message);
      return res.status(errorResponse.statusCode).json(errorResponse);
    }
  }

  /**
   * Flag students for validation review
   */
  static async flagStudentsForValidation(req: AuthRequest, res: Response): Promise<Response> {
    try {
      // Only admin and staff can flag students for validation
      if (req.user!.role !== 'admin' && req.user!.role !== 'staff') {
        const errorResponse = ResponseHelper.forbidden('Only admin and staff can flag students for validation');
        return res.status(errorResponse.statusCode).json(errorResponse);
      }

      const { semesterIds } = req.body;
      const totalFlagged = await SemesterManagementService.flagStudentsForValidation(semesterIds);

      const successResponse = ResponseHelper.success(
        { totalFlagged },
        `Flagged ${totalFlagged} students for validation`
      );
      return res.status(200).json(successResponse);
    } catch (error: any) {
      const errorResponse = ResponseHelper.error(error.message);
      return res.status(errorResponse.statusCode).json(errorResponse);
    }
  }

  /**
   * Process validated students for progression
   */
  static async processStudentProgressions(req: AuthRequest, res: Response): Promise<Response> {
    try {
      // Only admin and staff can process progressions
      if (req.user!.role !== 'admin' && req.user!.role !== 'staff') {
        const errorResponse = ResponseHelper.forbidden('Only admin and staff can process progressions');
        return res.status(errorResponse.statusCode).json(errorResponse);
      }

      const result = await SemesterManagementService.progressValidatedStudents();

      const successResponse = ResponseHelper.success(result, 'Student progressions processed successfully');
      return res.status(200).json(successResponse);
    } catch (error: any) {
      const errorResponse = ResponseHelper.error(error.message);
      return res.status(errorResponse.statusCode).json(errorResponse);
    }
  }

  /**
   * Assign new students to S1 (first semester)
   */
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
        `Assigned ${assigned} students to S1`
      );
      return res.status(200).json(successResponse);
    } catch (error: any) {
      const errorResponse = ResponseHelper.error(error.message);
      return res.status(errorResponse.statusCode).json(errorResponse);
    }
  }

  /**
   * Get auto-validation candidates
   */
  static async getAutoValidationCandidates(req: AuthRequest, res: Response): Promise<Response> {
    try {
      // Only admin and staff can view auto-validation candidates
      if (req.user!.role !== 'admin' && req.user!.role !== 'staff') {
        const errorResponse = ResponseHelper.forbidden('Only admin and staff can view auto-validation candidates');
        return res.status(errorResponse.statusCode).json(errorResponse);
      }

      const candidates = await ValidationCriteriaEngine.getAutoValidationCandidates();

      const successResponse = ResponseHelper.success(
        candidates,
        'Auto-validation candidates retrieved successfully'
      );
      return res.status(200).json(successResponse);
    } catch (error: any) {
      const errorResponse = ResponseHelper.error(error.message);
      return res.status(errorResponse.statusCode).json(errorResponse);
    }
  }

  /**
   * Process auto-validations
   */
  static async processAutoValidations(req: AuthRequest, res: Response): Promise<Response> {
    try {
      // Only admin can process auto-validations
      if (req.user!.role !== 'admin') {
        const errorResponse = ResponseHelper.forbidden('Only admin can process auto-validations');
        return res.status(errorResponse.statusCode).json(errorResponse);
      }

      const result = await ValidationCriteriaEngine.processAutoValidations();

      const successResponse = ResponseHelper.success(result, 'Auto-validations processed successfully');
      return res.status(200).json(successResponse);
    } catch (error: any) {
      const errorResponse = ResponseHelper.error(error.message);
      return res.status(errorResponse.statusCode).json(errorResponse);
    }
  }

  /**
   * Get semester system health check
   */
  static async getSemesterHealthCheck(_req: AuthRequest, res: Response): Promise<Response> {
    try {
      const healthCheck = await SemesterManagementService.performHealthCheck();

      const successResponse = ResponseHelper.success(healthCheck, 'Semester health check completed');
      return res.status(200).json(successResponse);
    } catch (error: any) {
      const errorResponse = ResponseHelper.error(error.message);
      return res.status(errorResponse.statusCode).json(errorResponse);
    }
  }
}
