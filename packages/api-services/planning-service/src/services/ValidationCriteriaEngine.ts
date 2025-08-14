// packages/api-services/planning-service/src/services/ValidationCriteriaEngine.ts
// Engine for managing student validation criteria and progression logic

import mongoose from 'mongoose';
import {
  PromotionProgressModel,
} from '@yggdrasil/database-schemas';
import { planningLogger as logger } from '@yggdrasil/shared-utilities';

export interface ValidationCriteria {
  minGrade: number;
  minAttendance: number;
  coursesRequired: number;
  autoValidation: boolean;
  customRules?: CustomValidationRule[];
}

export interface CustomValidationRule {
  ruleId: string;
  description: string;
  required: boolean;
  validator: (studentProgress: any) => Promise<boolean>;
}

export interface ValidationResult {
  studentId: string;
  currentSemester: number;
  canProgress: boolean;
  criteria: {
    gradeCheck: {
      passed: boolean;
      required: number;
      actual: number;
      difference: number;
    };
    attendanceCheck: {
      passed: boolean;
      required: number;
      actual: number;
      difference: number;
    };
    completionCheck: {
      passed: boolean;
      required: number;
      actual: number;
      difference: number;
    };
  };
  overallScore: number; // 0-100 score based on criteria
  recommendation: 'approve' | 'conditional' | 'reject' | 'retake';
  reason: string;
  suggestedActions?: string[];
}

export interface BulkValidationRequest {
  studentIds: string[];
  validatorId: string;
  decision: 'approve' | 'reject' | 'conditional';
  reason?: string;
  notes?: string;
  customCriteria?: Partial<ValidationCriteria>;
}

export interface BulkValidationResult {
  successful: ValidationResult[];
  failed: Array<{ studentId: string; error: string }>;
  summary: {
    total: number;
    approved: number;
    rejected: number;
    conditional: number;
    errors: number;
  };
}

export class ValidationCriteriaEngine {

  /**
   * Evaluate a single student against validation criteria
   */
  async evaluateStudent(
    studentId: string,
    customCriteria?: Partial<ValidationCriteria>
  ): Promise<ValidationResult> {
    try {
      logger.info(`🔍 Evaluating student ${studentId} for validation...`);

      // Get student's progress record
      const studentProgress = await PromotionProgressModel.findOne({
        studentId: new mongoose.Types.ObjectId(studentId),
      }).populate('promotionId');

      if (!studentProgress) {
        throw new Error('Student progress record not found');
      }

      // Get default criteria from promotion or use custom criteria
      const defaultCriteria = (studentProgress as any).validationCriteria || {
        minGrade: 60,
        minAttendance: 70,
        coursesRequired: 1,
        autoValidation: false,
      };

      const criteria = { ...defaultCriteria, ...customCriteria };

      // Perform detailed evaluation
      const evaluation = await this.performDetailedEvaluation(studentProgress, criteria);

      // Generate recommendation
      const recommendation = this.generateRecommendation(evaluation);

      return {
        studentId,
        currentSemester: (studentProgress as any).currentSemester,
        canProgress: evaluation.canProgress,
        criteria: evaluation.criteria,
        overallScore: evaluation.overallScore,
        recommendation: recommendation.decision,
        reason: recommendation.reason,
        suggestedActions: recommendation.actions,
      };

    } catch (error: any) {
      logger.error(`❌ Failed to evaluate student ${studentId}: ${error.message}`);
      throw new Error(`Evaluation failed: ${error.message}`);
    }
  }

  /**
   * Evaluate multiple students in batch
   */
  async evaluateStudentsBatch(
    studentIds: string[],
    customCriteria?: Partial<ValidationCriteria>
  ): Promise<ValidationResult[]> {
    logger.info(`📊 Batch evaluating ${studentIds.length} students...`);

    const results: ValidationResult[] = [];
    const batchSize = 5; // Process in small batches to avoid overwhelming the system

    for (let i = 0; i < studentIds.length; i += batchSize) {
      const batch = studentIds.slice(i, i + batchSize);
      
      const batchPromises = batch.map(studentId => 
        this.evaluateStudent(studentId, customCriteria).catch(error => ({
          studentId,
          currentSemester: 0,
          canProgress: false,
          criteria: {
            gradeCheck: { passed: false, required: 0, actual: 0, difference: 0 },
            attendanceCheck: { passed: false, required: 0, actual: 0, difference: 0 },
            completionCheck: { passed: false, required: 0, actual: 0, difference: 0 },
          },
          overallScore: 0,
          recommendation: 'reject' as const,
          reason: `Evaluation error: ${error.message}`,
        }))
      );

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Small delay between batches to avoid overloading
      if (i + batchSize < studentIds.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    logger.info(`✅ Batch evaluation completed: ${results.length} students processed`);
    return results;
  }

  /**
   * Perform bulk validation operation
   */
  async performBulkValidation(request: BulkValidationRequest): Promise<BulkValidationResult> {
    logger.info(`🏭 Processing bulk validation for ${request.studentIds.length} students...`);

    const result: BulkValidationResult = {
      successful: [],
      failed: [],
      summary: {
        total: request.studentIds.length,
        approved: 0,
        rejected: 0,
        conditional: 0,
        errors: 0,
      },
    };

    try {
      // First, evaluate all students
      const evaluations = await this.evaluateStudentsBatch(
        request.studentIds,
        request.customCriteria
      );

      // Then apply the validation decisions
      for (const evaluation of evaluations) {
        try {
          const studentProgress = await PromotionProgressModel.findOne({
            studentId: new mongoose.Types.ObjectId(evaluation.studentId),
          });

          if (!studentProgress) {
            throw new Error('Student progress not found');
          }

          // Apply validation decision
          const validationStatus = this.mapDecisionToStatus(request.decision);
          await (studentProgress as any).validateProgression(
            new mongoose.Types.ObjectId(request.validatorId),
            validationStatus,
            request.reason,
            request.notes
          );

          result.successful.push(evaluation);

          // Update summary
          switch (request.decision) {
            case 'approve':
              result.summary.approved++;
              break;
            case 'reject':
              result.summary.rejected++;
              break;
            case 'conditional':
              result.summary.conditional++;
              break;
          }

        } catch (error: any) {
          result.failed.push({
            studentId: evaluation.studentId,
            error: error.message,
          });
          result.summary.errors++;
        }
      }

      logger.info(`✅ Bulk validation completed: ${result.successful.length} successful, ${result.failed.length} failed`);
      return result;

    } catch (error: any) {
      logger.error(`❌ Bulk validation failed: ${error.message}`);
      throw new Error(`Bulk validation failed: ${error.message}`);
    }
  }

  /**
   * Get students eligible for auto-validation
   */
  async getAutoValidationCandidates(): Promise<ValidationResult[]> {
    logger.info('🤖 Finding students eligible for auto-validation...');

    try {
      // Find students pending validation with auto-validation enabled
      const candidates = await PromotionProgressModel.find({
        validationStatus: 'pending_validation',
        'validationCriteria.autoValidation': true,
      });

      const results: ValidationResult[] = [];

      for (const candidate of candidates) {
        const evaluation = await this.evaluateStudent(candidate.studentId.toString());
        
        // Only include if they actually meet criteria for auto-validation
        if (evaluation.canProgress && evaluation.recommendation === 'approve') {
          results.push(evaluation);
        }
      }

      logger.info(`🎯 Found ${results.length} students eligible for auto-validation`);
      return results;

    } catch (error: any) {
      logger.error(`❌ Failed to get auto-validation candidates: ${error.message}`);
      throw error;
    }
  }

  /**
   * Process auto-validations
   */
  async processAutoValidations(): Promise<BulkValidationResult> {
    logger.info('⚡ Processing auto-validations...');

    const candidates = await this.getAutoValidationCandidates();
    
    if (candidates.length === 0) {
      return {
        successful: [],
        failed: [],
        summary: { total: 0, approved: 0, rejected: 0, conditional: 0, errors: 0 },
      };
    }

    const request: BulkValidationRequest = {
      studentIds: candidates.map(c => c.studentId),
      validatorId: '000000000000000000000000', // System user
      decision: 'approve',
      reason: 'Auto-validated based on criteria',
    };

    return this.performBulkValidation(request);
  }

  /**
   * Get validation statistics and insights
   */
  async getValidationInsights(semesterId?: string) {
    logger.info('📈 Generating validation insights...');

    try {
      const matchStage: any = {};
      if (semesterId) {
        matchStage.promotionId = new mongoose.Types.ObjectId(semesterId);
      }

      // Get overall validation statistics
      const stats = await PromotionProgressModel.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: '$validationStatus',
            count: { $sum: 1 },
            avgGrade: { $avg: '$averageGrade' },
            avgAttendance: { $avg: '$attendanceRate' },
            avgProgress: { $avg: '$overallProgress' },
          },
        },
      ]);

      // Get semester breakdown
      const semesterBreakdown = await PromotionProgressModel.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: '$currentSemester',
            totalStudents: { $sum: 1 },
            pendingValidation: {
              $sum: { $cond: [{ $eq: ['$validationStatus', 'pending_validation'] }, 1, 0] },
            },
            validated: {
              $sum: { $cond: [{ $eq: ['$validationStatus', 'validated'] }, 1, 0] },
            },
            failed: {
              $sum: { $cond: [{ $eq: ['$validationStatus', 'failed'] }, 1, 0] },
            },
            avgGrade: { $avg: '$averageGrade' },
            avgAttendance: { $avg: '$attendanceRate' },
          },
        },
        { $sort: { _id: 1 } },
      ]);

      // Calculate trends
      const trends = await this.calculateValidationTrends();

      return {
        overview: {
          totalStudents: stats.reduce((sum, s) => sum + s.count, 0),
          statusBreakdown: stats.reduce((acc, s) => {
            acc[s._id] = {
              count: s.count,
              avgGrade: Math.round(s.avgGrade || 0),
              avgAttendance: Math.round(s.avgAttendance || 0),
              avgProgress: Math.round(s.avgProgress || 0),
            };
            return acc;
          }, {} as any),
        },
        semesterBreakdown: semesterBreakdown.map(s => ({
          semester: s._id,
          totalStudents: s.totalStudents,
          pendingValidation: s.pendingValidation,
          validated: s.validated,
          failed: s.failed,
          avgGrade: Math.round(s.avgGrade || 0),
          avgAttendance: Math.round(s.avgAttendance || 0),
          validationRate: Math.round((s.validated / s.totalStudents) * 100),
        })),
        trends,
        generatedAt: new Date(),
      };

    } catch (error: any) {
      logger.error(`❌ Failed to generate validation insights: ${error.message}`);
      throw error;
    }
  }

  // Private helper methods

  private async performDetailedEvaluation(studentProgress: any, criteria: ValidationCriteria) {
    const currentGrade = studentProgress.averageGrade || 0;
    const currentAttendance = studentProgress.attendanceRate;
    const coursesCompleted = studentProgress.coursesCompleted.length;

    const gradeCheck = {
      passed: currentGrade >= criteria.minGrade,
      required: criteria.minGrade,
      actual: currentGrade,
      difference: currentGrade - criteria.minGrade,
    };

    const attendanceCheck = {
      passed: currentAttendance >= criteria.minAttendance,
      required: criteria.minAttendance,
      actual: currentAttendance,
      difference: currentAttendance - criteria.minAttendance,
    };

    const completionCheck = {
      passed: coursesCompleted >= criteria.coursesRequired,
      required: criteria.coursesRequired,
      actual: coursesCompleted,
      difference: coursesCompleted - criteria.coursesRequired,
    };

    const canProgress = gradeCheck.passed && attendanceCheck.passed && completionCheck.passed;

    // Calculate overall score (weighted)
    const gradeScore = Math.min((currentGrade / criteria.minGrade) * 40, 40);
    const attendanceScore = Math.min((currentAttendance / criteria.minAttendance) * 30, 30);
    const completionScore = coursesCompleted >= criteria.coursesRequired ? 30 : 0;
    const overallScore = Math.round(gradeScore + attendanceScore + completionScore);

    return {
      canProgress,
      criteria: { gradeCheck, attendanceCheck, completionCheck },
      overallScore,
    };
  }

  private generateRecommendation(evaluation: any) {
    const { canProgress, criteria, overallScore } = evaluation;

    if (canProgress && overallScore >= 85) {
      return {
        decision: 'approve' as const,
        reason: 'Student meets all criteria with excellent performance',
        actions: ['Progress to next semester'],
      };
    }

    if (canProgress && overallScore >= 70) {
      return {
        decision: 'approve' as const,
        reason: 'Student meets all criteria with good performance',
        actions: ['Progress to next semester', 'Continue monitoring performance'],
      };
    }

    if (canProgress) {
      return {
        decision: 'conditional' as const,
        reason: 'Student meets minimum criteria but performance could improve',
        actions: [
          'Progress to next semester with monitoring',
          'Additional support recommended',
        ],
      };
    }

    const failedCriteria = [];
    if (!criteria.gradeCheck.passed) failedCriteria.push('grade requirements');
    if (!criteria.attendanceCheck.passed) failedCriteria.push('attendance requirements');
    if (!criteria.completionCheck.passed) failedCriteria.push('course completion requirements');

    if (overallScore >= 60) {
      return {
        decision: 'conditional' as const,
        reason: `Close to meeting criteria. Failed: ${failedCriteria.join(', ')}`,
        actions: [
          'Additional assessment required',
          'Consider remedial support',
          'Review in 30 days',
        ],
      };
    }

    return {
      decision: 'retake' as const,
      reason: `Does not meet criteria. Failed: ${failedCriteria.join(', ')}`,
      actions: [
        'Retake current semester',
        'Provide additional support',
        'Create improvement plan',
      ],
    };
  }

  private mapDecisionToStatus(decision: string): 'validated' | 'failed' | 'conditional' {
    switch (decision) {
      case 'approve':
        return 'validated';
      case 'reject':
        return 'failed';
      case 'conditional':
        return 'conditional';
      default:
        return 'failed';
    }
  }

  private async calculateValidationTrends() {
    // Get validation data from the last 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const trends = await PromotionProgressModel.aggregate([
      {
        $match: {
          validationHistory: { $exists: true, $ne: [] },
        },
      },
      { $unwind: '$validationHistory' },
      {
        $match: {
          'validationHistory.validatedAt': { $gte: sixMonthsAgo },
        },
      },
      {
        $group: {
          _id: {
            month: { $month: '$validationHistory.validatedAt' },
            year: { $year: '$validationHistory.validatedAt' },
            status: '$validationHistory.status',
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    return trends.map(t => ({
      month: t._id.month,
      year: t._id.year,
      status: t._id.status,
      count: t.count,
    }));
  }
}

export default new ValidationCriteriaEngine();