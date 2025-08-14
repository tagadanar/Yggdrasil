// packages/api-services/planning-service/src/services/SemesterManagementService.ts
// Service for managing the permanent S1-S10 semester system

import mongoose from 'mongoose';
import {
  PromotionModel,
  PromotionProgressModel,
  UserModel,
} from '@yggdrasil/database-schemas';
import { planningLogger as logger } from '@yggdrasil/shared-utilities';

export interface SemesterConfig {
  semester: number; // 1-10
  intake: 'september' | 'march';
  academicYear: string;
  minPassingGrade: number;
  minAttendance: number;
  coursesRequired: number;
  validationPeriodMonths: number;
}

export interface SemesterInitializationResult {
  created: number;
  updated: number;
  existing: number;
  errors: string[];
  semesters: any[];
}

export interface StudentProgressionResult {
  studentsProgressed: number;
  errors: string[];
  progressions: Array<{
    studentId: string;
    fromSemester: number;
    toSemester: number;
    promotionId: string;
  }>;
}

export class SemesterManagementService {
  
  /**
   * Initialize all 10 permanent semesters (S1-S10)
   * Creates semester promotions that always exist regardless of enrollment
   */
  async initializeSemesters(academicYear?: string): Promise<SemesterInitializationResult> {
    logger.info('🎓 Initializing permanent semester system (S1-S10)...');
    
    const currentYear = academicYear || this.getCurrentAcademicYear();
    logger.info(`📊 Using academic year for initialization: ${currentYear}`);
    const result: SemesterInitializationResult = {
      created: 0,
      updated: 0,
      existing: 0,
      errors: [],
      semesters: [],
    };

    try {
      // Create all 10 semesters
      for (let semester = 1; semester <= 10; semester++) {
        try {
          const semesterData = await this.createOrUpdateSemester(semester, currentYear);
          result.semesters.push(semesterData);
          
          if (semesterData.created) {
            result.created++;
          } else if (semesterData.updated) {
            result.updated++;
          } else {
            result.existing++;
          }
        } catch (error: any) {
          const errorMsg = `Failed to initialize semester ${semester}: ${error.message}`;
          result.errors.push(errorMsg);
          logger.error(errorMsg);
        }
      }

      logger.info(`✅ Semester initialization completed: ${result.created} created, ${result.updated} updated, ${result.existing} existing`);
      return result;
      
    } catch (error: any) {
      logger.error(`❌ Semester initialization failed: ${error.message}`);
      throw new Error(`Semester initialization failed: ${error.message}`);
    }
  }

  /**
   * Create or update a specific semester promotion
   */
  private async createOrUpdateSemester(semester: number, academicYear: string) {
    const intake = semester % 2 === 1 ? 'september' : 'march';
    const semesterName = `Semester ${semester} - ${intake.charAt(0).toUpperCase() + intake.slice(1)} ${academicYear}`;
    
    // Check if semester already exists
    const existingPromotion = await PromotionModel.findOne({
      semester,
      academicYear,
    });

    if (existingPromotion) {
      // Update existing promotion if needed
      const needsUpdate = 
        existingPromotion.name !== semesterName ||
        !(existingPromotion.metadata as any)?.semesterSystem;

      if (needsUpdate) {
        logger.info(`🔄 Updating semester ${semester} - existing metadata: ${JSON.stringify(existingPromotion.metadata)}`);
        
        // Use findByIdAndUpdate to ensure metadata is properly updated
        const updatedPromotion = await PromotionModel.findByIdAndUpdate(
          existingPromotion._id,
          {
            $set: {
              name: semesterName,
              'metadata.semesterSystem': true,
              'metadata.permanent': true,
              'metadata.level': 'Bachelor',
              'metadata.department': 'Computer Science',
              'metadata.maxStudents': 50,
              'metadata.minPassingGrade': 60,
              'metadata.minAttendance': 70,
              'metadata.coursesRequired': semester <= 3 ? 3 : semester <= 6 ? 4 : 5, // Progressive difficulty
              'metadata.autoValidation': false,
              'metadata.description': `${intake.charAt(0).toUpperCase() + intake.slice(1)} intake students in their ${semester}${this.getOrdinalSuffix(semester)} semester.`,
            }
          },
          { new: true }
        );
        
        logger.info(`📝 Updated semester ${semester} promotion - saved metadata: ${JSON.stringify(updatedPromotion?.metadata)}`);
        return { ...updatedPromotion!.toObject(), created: false, updated: true };
      }

      return { ...existingPromotion.toObject(), created: false, updated: false };
    }

    // Create new semester promotion
    const startDate = intake === 'september' 
      ? new Date(`${academicYear.split('-')[0]}-09-01`) 
      : new Date(`${academicYear.split('-')[1]}-03-01`);
    
    const endDate = intake === 'september'
      ? new Date(`${academicYear.split('-')[1]}-01-31`)
      : new Date(`${academicYear.split('-')[1]}-06-30`);

    const newPromotion = await PromotionModel.create({
      name: semesterName,
      semester,
      intake,
      academicYear,
      startDate,
      endDate,
      studentIds: [], // Start empty - students get added as they progress
      eventIds: [],
      status: 'active',
      metadata: {
        semesterSystem: true,
        permanent: true,
        level: 'Bachelor',
        department: 'Computer Science',
        maxStudents: 50,
        minPassingGrade: 60,
        minAttendance: 70,
        coursesRequired: semester <= 3 ? 3 : semester <= 6 ? 4 : 5, // Progressive difficulty
        autoValidation: false,
        description: `${intake.charAt(0).toUpperCase() + intake.slice(1)} intake students in their ${semester}${this.getOrdinalSuffix(semester)} semester.`,
      },
      createdBy: new mongoose.Types.ObjectId('000000000000000000000000'), // System user
    });

    logger.info(`🆕 Created semester ${semester} promotion: ${newPromotion._id}`);
    return { ...newPromotion.toObject(), created: true, updated: false };
  }

  /**
   * Get all semester promotions (S1-S10)
   */
  async getAllSemesters(academicYear?: string) {
    const query: any = {
      'metadata.semesterSystem': true,
    };
    
    if (academicYear) {
      query.academicYear = academicYear;
    }

    logger.info(`📊 Querying semesters with query: ${JSON.stringify(query)}, academicYear: ${academicYear}`);

    const semesters = await PromotionModel.find(query)
      .sort({ semester: 1 })
      .lean();

    logger.info(`📊 Found ${semesters.length} semesters`);
    
    // Debug: Check all promotions in database
    const allPromotions = await PromotionModel.find({}).lean();
    logger.info(`📊 Total promotions in database: ${allPromotions.length}`);
    
    const semesterPromotions = allPromotions.filter(p => (p.metadata as any)?.semesterSystem);
    logger.info(`📊 Semester promotions found: ${semesterPromotions.length}`);
    
    if (semesterPromotions.length > 0) {
      logger.info(`📊 First semester promotion academicYear: ${semesterPromotions[0]?.academicYear}`);
      logger.info(`📊 First semester promotion metadata: ${JSON.stringify(semesterPromotions[0]?.metadata)}`);
    }
    
    // Debug: Log first semester's academicYear
    if (semesters.length > 0) {
      logger.info(`📊 First semester academicYear: ${semesters[0]?.academicYear}`);
    }

    // Ensure we have all 10 semesters
    const semesterMap = new Map(semesters.map(s => [s.semester, s]));
    const missingSemesters = [];
    
    for (let i = 1; i <= 10; i++) {
      if (!semesterMap.has(i)) {
        missingSemesters.push(i);
      }
    }

    if (missingSemesters.length > 0) {
      logger.warn(`⚠️ Missing semesters detected: ${missingSemesters.join(', ')}`);
    }

    return {
      semesters,
      missingSemesters,
      total: semesters.length,
    };
  }

  /**
   * Get semester statistics including student counts and validation status
   */
  async getSemesterStatistics(academicYear?: string) {
    const { semesters } = await this.getAllSemesters(academicYear);
    
    const statistics = await Promise.all(
      semesters.map(async (semester) => {
        // Get student count for this semester
        const studentCount = await PromotionProgressModel.countDocuments({
          currentSemester: semester.semester,
        });

        // Get validation statistics
        const validationStats = await (PromotionProgressModel as any).getValidationStatistics(semester._id);
        
        // Get recent progression activity
        const recentProgressions = await PromotionProgressModel.countDocuments({
          currentSemester: semester.semester,
          'milestones.semesterValidated': {
            $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
          },
        });

        return {
          ...semester,
          studentCount,
          validationStats,
          recentProgressions,
          utilizationRate: Math.min((studentCount / (semester.metadata?.maxStudents || 50)) * 100, 100),
        };
      })
    );

    return {
      semesters: statistics,
      totalStudents: statistics.reduce((sum, s) => sum + s.studentCount, 0),
      averageUtilization: statistics.reduce((sum, s) => sum + s.utilizationRate, 0) / statistics.length,
    };
  }

  /**
   * Progress validated students to their next semester
   */
  async progressValidatedStudents(): Promise<StudentProgressionResult> {
    logger.info('🚀 Processing validated students for semester progression...');
    
    const result: StudentProgressionResult = {
      studentsProgressed: 0,
      errors: [],
      progressions: [],
    };

    try {
      // Find all students who are validated and have a target semester
      const validatedStudents = await PromotionProgressModel.find({
        validationStatus: 'validated',
        targetSemester: { $exists: true, $ne: null },
        currentSemester: { $lt: 10 }, // Don't progress students already in final semester
      }).populate('studentId', 'profile email');

      for (const studentProgress of validatedStudents) {
        try {
          const targetSemester = (studentProgress as any).targetSemester!;
          const currentSemester = (studentProgress as any).currentSemester;
          
          // Find the target semester promotion
          const targetPromotion = await PromotionModel.findOne({
            semester: targetSemester,
            'metadata.semesterSystem': true,
          });

          if (!targetPromotion) {
            throw new Error(`Target semester ${targetSemester} promotion not found`);
          }

          // Progress the student
          await (studentProgress as any).progressToNextSemester(targetPromotion._id);
          
          // Update the user's current promotion
          await UserModel.updateOne(
            { _id: studentProgress.studentId },
            { 
              $set: { currentPromotionId: targetPromotion._id },
              $push: {
                promotionHistory: {
                  promotionId: targetPromotion._id,
                  joinedAt: new Date(),
                  progressedFrom: currentSemester,
                }
              }
            }
          );

          // Add student to new promotion's student list
          await PromotionModel.updateOne(
            { _id: targetPromotion._id },
            { $addToSet: { studentIds: studentProgress.studentId } }
          );

          // Remove student from old promotion's student list
          const oldPromotion = await PromotionModel.findOne({
            semester: currentSemester,
            'metadata.semesterSystem': true,
          });
          
          if (oldPromotion) {
            await PromotionModel.updateOne(
              { _id: oldPromotion._id },
              { $pull: { studentIds: studentProgress.studentId } }
            );
          }

          result.progressions.push({
            studentId: studentProgress.studentId.toString(),
            fromSemester: currentSemester,
            toSemester: targetSemester,
            promotionId: targetPromotion._id.toString(),
          });

          result.studentsProgressed++;
          logger.info(`✅ Progressed student ${studentProgress.studentId} from S${currentSemester} to S${targetSemester}`);
          
        } catch (error: any) {
          const errorMsg = `Failed to progress student ${studentProgress.studentId}: ${error.message}`;
          result.errors.push(errorMsg);
          logger.error(errorMsg);
        }
      }

      logger.info(`🎯 Progression completed: ${result.studentsProgressed} students progressed`);
      return result;
      
    } catch (error: any) {
      logger.error(`❌ Student progression failed: ${error.message}`);
      throw new Error(`Student progression failed: ${error.message}`);
    }
  }

  /**
   * Flag students for validation based on time criteria
   */
  async flagStudentsForValidation(semesterIds?: string[]): Promise<number> {
    logger.info('⏰ Flagging students for validation review...');

    try {
      let promotionIds: mongoose.Types.ObjectId[];

      if (semesterIds && semesterIds.length > 0) {
        // Use provided semester IDs
        promotionIds = semesterIds.map(id => new mongoose.Types.ObjectId(id));
      } else {
        // Flag all semester promotions
        const semesters = await PromotionModel.find({
          'metadata.semesterSystem': true,
        }).select('_id');
        promotionIds = semesters.map(s => s._id);
      }

      let totalFlagged = 0;
      const nextValidationDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now

      for (const promotionId of promotionIds) {
        const flagged = await (PromotionProgressModel as any).flagStudentsForValidation(
          promotionId,
          nextValidationDate
        );
        totalFlagged += flagged;
      }

      logger.info(`🏁 Flagged ${totalFlagged} students for validation`);
      return totalFlagged;
      
    } catch (error: any) {
      logger.error(`❌ Failed to flag students for validation: ${error.message}`);
      throw error;
    }
  }

  /**
   * Assign new students to S1 (first semester)
   */
  async assignNewStudentsToS1(
    studentIds: string[],
    intake: 'september' | 'march' = 'september'
  ): Promise<number> {
    logger.info(`👥 Assigning ${studentIds.length} new students to S1 (${intake} intake)...`);

    try {
      // Find S1 promotion for the specified intake
      const s1Promotion = await PromotionModel.findOne({
        semester: 1,
        intake,
        'metadata.semesterSystem': true,
      });

      if (!s1Promotion) {
        throw new Error(`S1 promotion for ${intake} intake not found`);
      }

      let assigned = 0;

      for (const studentId of studentIds) {
        try {
          const objectId = new mongoose.Types.ObjectId(studentId);
          
          // Create initial progress record for student
          await PromotionProgressModel.findOrCreateForStudent(s1Promotion._id, objectId);
          
          // Update student's current promotion
          await UserModel.updateOne(
            { _id: objectId },
            { 
              $set: { currentPromotionId: s1Promotion._id },
              $push: {
                promotionHistory: {
                  promotionId: s1Promotion._id,
                  joinedAt: new Date(),
                }
              }
            }
          );

          // Add to promotion's student list
          await PromotionModel.updateOne(
            { _id: s1Promotion._id },
            { $addToSet: { studentIds: objectId } }
          );

          assigned++;
          
        } catch (error: any) {
          logger.error(`Failed to assign student ${studentId} to S1: ${error.message}`);
        }
      }

      logger.info(`✅ Assigned ${assigned} students to S1`);
      return assigned;
      
    } catch (error: any) {
      logger.error(`❌ Failed to assign students to S1: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get current academic year in YYYY-YYYY format
   */
  private getCurrentAcademicYear(): string {
    const now = new Date();
    const currentYear = now.getFullYear();
    
    // Academic year starts in September
    if (now.getMonth() >= 8) { // September is month 8 (0-indexed)
      return `${currentYear}-${currentYear + 1}`;
    } else {
      return `${currentYear - 1}-${currentYear}`;
    }
  }

  /**
   * Get ordinal suffix for numbers (1st, 2nd, 3rd, etc.)
   */
  private getOrdinalSuffix(num: number): string {
    const j = num % 10;
    const k = num % 100;
    
    if (j === 1 && k !== 11) return 'st';
    if (j === 2 && k !== 12) return 'nd';
    if (j === 3 && k !== 13) return 'rd';
    return 'th';
  }

  /**
   * Health check for semester system
   */
  async performHealthCheck() {
    const currentYear = this.getCurrentAcademicYear();
    const { semesters, missingSemesters } = await this.getAllSemesters(currentYear);
    const stats = await this.getSemesterStatistics(currentYear);
    
    // Count students pending validation
    const pendingValidation = await PromotionProgressModel.countDocuments({
      validationStatus: 'pending_validation',
    });

    // Count students ready for progression
    const readyForProgression = await PromotionProgressModel.countDocuments({
      validationStatus: 'validated',
      targetSemester: { $exists: true, $ne: null },
    });

    return {
      semesterSystemHealthy: missingSemesters.length === 0,
      totalSemesters: semesters.length,
      missingSemesters,
      totalStudents: stats.totalStudents,
      averageUtilization: Math.round(stats.averageUtilization),
      pendingValidation,
      readyForProgression,
      academicYear: currentYear,
      lastChecked: new Date(),
    };
  }
}

export default new SemesterManagementService();