// packages/api-services/planning-service/src/utils/planningServiceUtils.ts
// Planning service specific utilities

import mongoose from 'mongoose';
import { AuthRequest, ResponseHelper } from '@yggdrasil/shared-utilities';
import { PromotionService } from '../services/PromotionService';

// =============================================================================
// PROMOTION ACCESS UTILITIES
// =============================================================================

export class PromotionAccessValidator {
  private static promotionService = new PromotionService();

  /**
   * Validate that a student can only access their own promotion data
   */
  static async validateStudentPromotionAccess(
    req: AuthRequest,
    promotionId: string,
  ): Promise<any | null> {
    if (req.user!.role !== 'student') {
      return null; // Non-students don't need this validation
    }

    try {
      const studentPromotion = await this.promotionService.getStudentPromotion(
        req.user!._id.toString(),
      );

      if (!studentPromotion || studentPromotion._id.toString() !== promotionId) {
        return ResponseHelper.forbidden('You can only access your own promotion data');
      }

      return null;
    } catch (error) {
      return ResponseHelper.error('Failed to validate promotion access');
    }
  }

  /**
   * Get student's promotion ID for validation
   */
  static async getStudentPromotionId(studentId: string): Promise<string | null> {
    try {
      const promotion = await this.promotionService.getStudentPromotion(studentId);
      return promotion?._id.toString() || null;
    } catch (error) {
      return null;
    }
  }
}

// =============================================================================
// ATTENDANCE UTILITIES
// =============================================================================

export class AttendanceValidator {
  /**
   * Validate that an event exists and is linked to a promotion
   */
  static async validateEventPromotionLink(eventId: string): Promise<{
    isValid: boolean;
    promotionId?: string;
    error?: string;
  }> {
    try {
      const { EventModel } = await import('@yggdrasil/database-schemas');

      const event = await EventModel.findById(eventId);
      if (!event) {
        return { isValid: false, error: 'Event not found' };
      }

      if (!event.linkedCourse) {
        return { isValid: false, error: 'Event is not linked to any course' };
      }

      // Find promotion that contains courses for this event
      const { PromotionModel } = await import('@yggdrasil/database-schemas');
      const promotion = await PromotionModel.findOne({
        eventIds: new mongoose.Types.ObjectId(eventId),
      });

      if (!promotion) {
        return { isValid: false, error: 'Event is not linked to any promotion' };
      }

      return {
        isValid: true,
        promotionId: promotion._id.toString(),
      };
    } catch (error) {
      return { isValid: false, error: 'Failed to validate event-promotion link' };
    }
  }

  /**
   * Validate that a student is enrolled in the promotion for an event
   */
  static async validateStudentEventAccess(
    studentId: string,
    eventId: string,
  ): Promise<{ hasAccess: boolean; error?: string }> {
    try {
      const linkValidation = await this.validateEventPromotionLink(eventId);
      if (!linkValidation.isValid) {
        return { hasAccess: false, error: linkValidation.error };
      }

      const { PromotionModel } = await import('@yggdrasil/database-schemas');
      const promotion = await PromotionModel.findOne({
        _id: linkValidation.promotionId,
        studentIds: new mongoose.Types.ObjectId(studentId),
      });

      if (!promotion) {
        return {
          hasAccess: false,
          error: 'Student is not enrolled in the promotion for this event',
        };
      }

      return { hasAccess: true };
    } catch (error) {
      return { hasAccess: false, error: 'Failed to validate student event access' };
    }
  }
}

// =============================================================================
// VALIDATION UTILITIES
// =============================================================================

export class ProgressDataValidator {
  /**
   * Validate student progress data completeness
   */
  static validateProgressData(progressData: any): {
    isValid: boolean;
    missingFields: string[];
    warnings: string[];
  } {
    const requiredFields = ['studentId', 'promotionId', 'currentSemester'];
    const importantFields = ['averageGrade', 'attendanceRate', 'overallProgress'];

    const missingFields: string[] = [];
    const warnings: string[] = [];

    // Check required fields
    for (const field of requiredFields) {
      if (!progressData[field]) {
        missingFields.push(field);
      }
    }

    // Check important fields
    for (const field of importantFields) {
      if (progressData[field] === undefined || progressData[field] === null) {
        warnings.push(`${field} is missing or null`);
      }
    }

    // Validate data ranges
    if (
      progressData.averageGrade &&
      (progressData.averageGrade < 0 || progressData.averageGrade > 100)
    ) {
      warnings.push('averageGrade should be between 0 and 100');
    }

    if (
      progressData.attendanceRate &&
      (progressData.attendanceRate < 0 || progressData.attendanceRate > 100)
    ) {
      warnings.push('attendanceRate should be between 0 and 100');
    }

    if (
      progressData.overallProgress &&
      (progressData.overallProgress < 0 || progressData.overallProgress > 100)
    ) {
      warnings.push('overallProgress should be between 0 and 100');
    }

    return {
      isValid: missingFields.length === 0,
      missingFields,
      warnings,
    };
  }

  /**
   * Sanitize and normalize progress data
   */
  static sanitizeProgressData(progressData: any): any {
    return {
      ...progressData,
      averageGrade: Math.max(0, Math.min(100, progressData.averageGrade || 0)),
      attendanceRate: Math.max(0, Math.min(100, progressData.attendanceRate || 0)),
      overallProgress: Math.max(0, Math.min(100, progressData.overallProgress || 0)),
      currentSemester: Math.max(1, Math.min(10, progressData.currentSemester || 1)),
      targetSemester: Math.max(1, Math.min(10, progressData.targetSemester || 1)),
    };
  }
}

// =============================================================================
// DATABASE UTILITIES
// =============================================================================

export class DatabaseUtils {
  /**
   * Check if MongoDB ObjectId is valid
   */
  static isValidObjectId(id: string): boolean {
    return mongoose.Types.ObjectId.isValid(id);
  }

  /**
   * Convert string to ObjectId safely
   */
  static toObjectId(id: string): mongoose.Types.ObjectId | null {
    try {
      return new mongoose.Types.ObjectId(id);
    } catch (error) {
      return null;
    }
  }

  /**
   * Aggregate pipeline for student progress statistics
   */
  static getProgressStatsPipeline(promotionId?: string) {
    const matchStage = promotionId
      ? { $match: { promotionId: new mongoose.Types.ObjectId(promotionId) } }
      : { $match: {} };

    return [
      matchStage,
      {
        $group: {
          _id: null,
          totalStudents: { $sum: 1 },
          averageGrade: { $avg: '$averageGrade' },
          averageAttendance: { $avg: '$attendanceRate' },
          averageProgress: { $avg: '$overallProgress' },
          studentsAtRisk: {
            $sum: {
              $cond: [
                { $or: [{ $lt: ['$averageGrade', 60] }, { $lt: ['$attendanceRate', 70] }] },
                1,
                0,
              ],
            },
          },
          studentsExcelling: {
            $sum: {
              $cond: [
                { $and: [{ $gte: ['$averageGrade', 85] }, { $gte: ['$attendanceRate', 90] }] },
                1,
                0,
              ],
            },
          },
        },
      },
    ];
  }

  /**
   * Common aggregation pipeline for populated student data
   */
  static getStudentPopulationPipeline() {
    return [
      {
        $lookup: {
          from: 'users',
          localField: 'studentId',
          foreignField: '_id',
          as: 'studentData',
        },
      },
      {
        $lookup: {
          from: 'promotions',
          localField: 'promotionId',
          foreignField: '_id',
          as: 'promotionData',
        },
      },
      {
        $match: {
          studentData: { $ne: [] },
          promotionData: { $ne: [] },
        },
      },
      {
        $addFields: {
          student: { $arrayElemAt: ['$studentData', 0] },
          promotion: { $arrayElemAt: ['$promotionData', 0] },
        },
      },
      {
        $project: {
          studentData: 0,
          promotionData: 0,
        },
      },
    ];
  }
}

// =============================================================================
// ERROR HANDLING UTILITIES
// =============================================================================

export class PlanningErrorHandler {
  /**
   * Handle common database errors with user-friendly messages
   */
  static handleDatabaseError(error: any): any {
    if (error.name === 'CastError') {
      return ResponseHelper.badRequest('Invalid ID format');
    }

    if (error.code === 11000) {
      return ResponseHelper.badRequest('Duplicate entry - resource already exists');
    }

    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map((err: any) => err.message);
      return ResponseHelper.badRequest(`Validation failed: ${validationErrors.join(', ')}`);
    }

    if (error.message.includes('not found')) {
      return ResponseHelper.notFound(error.message);
    }

    if (error.message.includes('permission') || error.message.includes('access')) {
      return ResponseHelper.forbidden(error.message);
    }

    // Generic error for unknown cases
    return ResponseHelper.error(error.message || 'An unexpected error occurred');
  }

  /**
   * Wrap service operations with consistent error handling
   */
  static async withErrorHandling<T>(operation: () => Promise<T>, context: string): Promise<T> {
    try {
      return await operation();
    } catch (error: any) {
      // Log the error for debugging
      console.error(`Error in ${context}:`, error);

      // Re-throw with enhanced context
      if (error.name || error.code) {
        throw error; // Keep database errors as-is
      } else {
        throw new Error(`${context}: ${error.message}`);
      }
    }
  }
}
