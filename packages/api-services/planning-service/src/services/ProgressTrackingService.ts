// packages/api-services/planning-service/src/services/ProgressTrackingService.ts
// Service for tracking student progress within promotions

import mongoose from 'mongoose';
import {
  PromotionProgressModel,
  PromotionProgressDocument,
  EventAttendanceModel,
  EventAttendanceDocument,
  CourseModel,
  EventModel,
} from '@yggdrasil/database-schemas';
import { planningLogger as logger } from '@yggdrasil/shared-utilities';

export interface AttendanceRecord {
  studentId: string;
  attended: boolean;
  notes?: string;
}

export interface CourseProgressUpdate {
  courseId: string;
  progressPercentage?: number;
  chaptersCompleted?: number;
  totalChapters?: number;
  exercisesCompleted?: number;
  totalExercises?: number;
  averageScore?: number;
}

export interface ProgressReport {
  studentId: string;
  studentName: string;
  overallProgress: number;
  attendanceRate: number;
  coursesCompleted: number;
  coursesInProgress: number;
  averageGrade?: number;
  status: 'on-track' | 'at-risk' | 'excelling';
}

export class ProgressTrackingService {
  // =============================================================================
  // ATTENDANCE MANAGEMENT
  // =============================================================================

  /**
   * Mark attendance for a single student at an event
   */
  async markStudentAttendance(
    eventId: string,
    studentId: string,
    attended: boolean,
    markedBy?: string,
    notes?: string
  ): Promise<EventAttendanceDocument> {
    try {
      logger.info(`Marking attendance for student ${studentId} at event ${eventId}: ${attended}`);
      
      // Get event to find promotion
      const event = await EventModel.findById(eventId);
      if (!event) {
        throw new Error('Event not found');
      }
      
      if (!event.promotionIds || event.promotionIds.length === 0) {
        throw new Error('Event not linked to any promotion');
      }
      
      // Find student's promotion from the event's promotions
      const student = await mongoose.model('User').findById(studentId);
      if (!student) {
        throw new Error('Student not found');
      }
      
      const promotionId = event.promotionIds.find(pId => 
        student.currentPromotionId?.equals(pId)
      ) || event.promotionIds[0];
      
      if (!promotionId) {
        throw new Error('No valid promotion found for this event');
      }
      
      const attendance = await EventAttendanceModel.markAttendance(
        new mongoose.Types.ObjectId(eventId),
        new mongoose.Types.ObjectId(studentId),
        promotionId,
        attended,
        markedBy ? new mongoose.Types.ObjectId(markedBy) : undefined,
        notes
      );
      
      // Update student's progress after marking attendance
      await this.updateStudentProgress(studentId, promotionId.toString());
      
      return attendance;
    } catch (error: any) {
      logger.error(`Failed to mark attendance: ${error.message}`);
      throw new Error(`Failed to mark attendance: ${error.message}`);
    }
  }

  /**
   * Bulk mark attendance for multiple students at an event
   */
  async bulkMarkAttendance(
    eventId: string,
    promotionId: string,
    attendanceRecords: AttendanceRecord[],
    markedBy: string
  ): Promise<EventAttendanceDocument[]> {
    try {
      logger.info(`Bulk marking attendance for ${attendanceRecords.length} students at event ${eventId}`);
      
      const records = attendanceRecords.map(record => ({
        studentId: new mongoose.Types.ObjectId(record.studentId),
        attended: record.attended,
        notes: record.notes,
      }));
      
      const result = await EventAttendanceModel.bulkMarkAttendance(
        new mongoose.Types.ObjectId(eventId),
        new mongoose.Types.ObjectId(promotionId),
        records,
        new mongoose.Types.ObjectId(markedBy)
      );
      
      // Update progress for all students
      await Promise.all(
        attendanceRecords.map(record => 
          this.updateStudentProgress(record.studentId, promotionId)
        )
      );
      
      logger.info(`Successfully marked attendance for ${result.length} students`);
      return result;
    } catch (error: any) {
      logger.error(`Failed to bulk mark attendance: ${error.message}`);
      throw new Error(`Failed to bulk mark attendance: ${error.message}`);
    }
  }

  /**
   * Get attendance for a specific event
   */
  async getEventAttendance(eventId: string): Promise<EventAttendanceDocument[]> {
    try {
      return await EventAttendanceModel.getEventAttendance(
        new mongoose.Types.ObjectId(eventId)
      );
    } catch (error: any) {
      logger.error(`Failed to get event attendance: ${error.message}`);
      throw new Error(`Failed to get event attendance: ${error.message}`);
    }
  }

  /**
   * Get a student's attendance history
   */
  async getStudentAttendance(
    studentId: string,
    promotionId?: string
  ): Promise<EventAttendanceDocument[]> {
    try {
      return await EventAttendanceModel.getStudentAttendance(
        new mongoose.Types.ObjectId(studentId),
        promotionId ? new mongoose.Types.ObjectId(promotionId) : undefined
      );
    } catch (error: any) {
      logger.error(`Failed to get student attendance: ${error.message}`);
      throw new Error(`Failed to get student attendance: ${error.message}`);
    }
  }

  /**
   * Calculate attendance rate for a student in a promotion
   */
  async calculateAttendanceRate(
    studentId: string,
    promotionId: string
  ): Promise<number> {
    try {
      return await EventAttendanceModel.calculateAttendanceRate(
        new mongoose.Types.ObjectId(studentId),
        new mongoose.Types.ObjectId(promotionId)
      );
    } catch (error: any) {
      logger.error(`Failed to calculate attendance rate: ${error.message}`);
      throw new Error(`Failed to calculate attendance rate: ${error.message}`);
    }
  }

  // =============================================================================
  // COURSE PROGRESS MANAGEMENT
  // =============================================================================

  /**
   * Update course progress for a student
   */
  async updateCourseProgress(
    studentId: string,
    promotionId: string,
    courseProgress: CourseProgressUpdate
  ): Promise<PromotionProgressDocument> {
    try {
      logger.info(`Updating course progress for student ${studentId} in course ${courseProgress.courseId}`);
      
      const progress = await PromotionProgressModel.findOrCreateForStudent(
        new mongoose.Types.ObjectId(promotionId),
        new mongoose.Types.ObjectId(studentId)
      );
      
      await progress.updateCourseProgress(
        new mongoose.Types.ObjectId(courseProgress.courseId),
        {
          progressPercentage: courseProgress.progressPercentage,
          chaptersCompleted: courseProgress.chaptersCompleted,
          totalChapters: courseProgress.totalChapters,
          exercisesCompleted: courseProgress.exercisesCompleted,
          totalExercises: courseProgress.totalExercises,
          averageScore: courseProgress.averageScore,
          lastActivityAt: new Date(),
        }
      );
      
      return progress;
    } catch (error: any) {
      logger.error(`Failed to update course progress: ${error.message}`);
      throw new Error(`Failed to update course progress: ${error.message}`);
    }
  }

  /**
   * Mark a course as completed for a student
   */
  async markCourseCompleted(
    studentId: string,
    promotionId: string,
    courseId: string
  ): Promise<PromotionProgressDocument> {
    try {
      logger.info(`Marking course ${courseId} as completed for student ${studentId}`);
      
      const progress = await PromotionProgressModel.findOrCreateForStudent(
        new mongoose.Types.ObjectId(promotionId),
        new mongoose.Types.ObjectId(studentId)
      );
      
      await progress.markCourseCompleted(new mongoose.Types.ObjectId(courseId));
      
      logger.info(`Course marked as completed successfully`);
      return progress;
    } catch (error: any) {
      logger.error(`Failed to mark course as completed: ${error.message}`);
      throw new Error(`Failed to mark course as completed: ${error.message}`);
    }
  }

  /**
   * Calculate course completion percentage based on exercises and chapters
   */
  async calculateCourseCompletion(
    studentId: string,
    courseId: string
  ): Promise<number> {
    try {
      // Get course structure
      const course = await CourseModel.findById(courseId);
      if (!course) {
        throw new Error('Course not found');
      }
      
      // Count total chapters and exercises
      let totalChapters = 0;
      let totalExercises = 0;
      
      if (course.chapters) {
        totalChapters = course.chapters.length;
        course.chapters.forEach(chapter => {
          if (chapter.sections) {
            chapter.sections.forEach(section => {
              if (section.exercises) {
                totalExercises += section.exercises.length;
              }
            });
          }
        });
      }
      
      // Get student's submissions for this course
      const ExerciseSubmission = mongoose.model('ExerciseSubmission');
      const submissions = await ExerciseSubmission.find({
        studentId: new mongoose.Types.ObjectId(studentId),
        courseId: new mongoose.Types.ObjectId(courseId),
        status: 'completed',
      });
      
      const exercisesCompleted = submissions.length;
      
      // Calculate completion percentage (weighted: 40% chapters, 60% exercises)
      const chapterProgress = totalChapters > 0 ? (exercisesCompleted / totalExercises) * 100 : 100;
      const exerciseProgress = totalExercises > 0 ? (exercisesCompleted / totalExercises) * 100 : 100;
      
      return Math.round((chapterProgress * 0.4) + (exerciseProgress * 0.6));
    } catch (error: any) {
      logger.error(`Failed to calculate course completion: ${error.message}`);
      throw new Error(`Failed to calculate course completion: ${error.message}`);
    }
  }

  // =============================================================================
  // OVERALL PROGRESS MANAGEMENT
  // =============================================================================

  /**
   * Update overall progress for a student in a promotion
   */
  async updateStudentProgress(
    studentId: string,
    promotionId: string
  ): Promise<PromotionProgressDocument> {
    try {
      logger.info(`Updating overall progress for student ${studentId} in promotion ${promotionId}`);
      
      const progress = await PromotionProgressModel.findOrCreateForStudent(
        new mongoose.Types.ObjectId(promotionId),
        new mongoose.Types.ObjectId(studentId)
      );
      
      // Recalculate all metrics
      await progress.recalculate();
      
      logger.info(`Progress updated: ${progress.overallProgress}% overall, ${progress.attendanceRate}% attendance`);
      return progress;
    } catch (error: any) {
      logger.error(`Failed to update student progress: ${error.message}`);
      throw new Error(`Failed to update student progress: ${error.message}`);
    }
  }

  /**
   * Get progress for all students in a promotion
   */
  async getPromotionProgress(promotionId: string): Promise<PromotionProgressDocument[]> {
    try {
      return await PromotionProgressModel.find({
        promotionId: new mongoose.Types.ObjectId(promotionId),
      })
        .populate('studentId', 'email profile.firstName profile.lastName')
        .sort({ overallProgress: -1 });
    } catch (error: any) {
      logger.error(`Failed to get promotion progress: ${error.message}`);
      throw new Error(`Failed to get promotion progress: ${error.message}`);
    }
  }

  /**
   * Get detailed progress for a specific student
   */
  async getStudentProgress(
    studentId: string,
    promotionId: string
  ): Promise<PromotionProgressDocument> {
    try {
      const progress = await PromotionProgressModel.findOrCreateForStudent(
        new mongoose.Types.ObjectId(promotionId),
        new mongoose.Types.ObjectId(studentId)
      );
      
      // Ensure progress is up to date
      await progress.recalculate();
      
      return progress;
    } catch (error: any) {
      logger.error(`Failed to get student progress: ${error.message}`);
      throw new Error(`Failed to get student progress: ${error.message}`);
    }
  }

  /**
   * Get promotion statistics
   */
  async getPromotionStatistics(promotionId: string): Promise<any> {
    try {
      return await PromotionProgressModel.getPromotionStatistics(
        new mongoose.Types.ObjectId(promotionId)
      );
    } catch (error: any) {
      logger.error(`Failed to get promotion statistics: ${error.message}`);
      throw new Error(`Failed to get promotion statistics: ${error.message}`);
    }
  }

  /**
   * Get top performers in a promotion
   */
  async getTopPerformers(promotionId: string, limit: number = 10): Promise<PromotionProgressDocument[]> {
    try {
      return await PromotionProgressModel.find({
        promotionId: new mongoose.Types.ObjectId(promotionId),
      })
        .populate('studentId', 'email profile.firstName profile.lastName')
        .sort({ overallProgress: -1, averageGrade: -1 })
        .limit(limit);
    } catch (error: any) {
      logger.error(`Failed to get top performers: ${error.message}`);
      throw new Error(`Failed to get top performers: ${error.message}`);
    }
  }

  /**
   * Get students at risk of falling behind
   */
  async getAtRiskStudents(
    promotionId: string,
    progressThreshold: number = 30,
    attendanceThreshold: number = 70
  ): Promise<PromotionProgressDocument[]> {
    try {
      return await PromotionProgressModel.find({
        promotionId: new mongoose.Types.ObjectId(promotionId),
        $or: [
          { overallProgress: { $lt: progressThreshold } },
          { attendanceRate: { $lt: attendanceThreshold } },
        ],
      })
        .populate('studentId', 'email profile.firstName profile.lastName')
        .sort({ overallProgress: 1 });
    } catch (error: any) {
      logger.error(`Failed to get at-risk students: ${error.message}`);
      throw new Error(`Failed to get at-risk students: ${error.message}`);
    }
  }

  /**
   * Generate a progress report for a promotion
   */
  async generateProgressReport(promotionId: string): Promise<ProgressReport[]> {
    try {
      const progressRecords = await this.getPromotionProgress(promotionId);
      
      return progressRecords.map(record => {
        const student = record.studentId as any;
        
        // Determine student status
        let status: 'on-track' | 'at-risk' | 'excelling';
        if (record.overallProgress >= 80 && record.attendanceRate >= 90) {
          status = 'excelling';
        } else if (record.overallProgress < 30 || record.attendanceRate < 70) {
          status = 'at-risk';
        } else {
          status = 'on-track';
        }
        
        return {
          studentId: student._id.toString(),
          studentName: `${student.profile.firstName} ${student.profile.lastName}`,
          overallProgress: record.overallProgress,
          attendanceRate: record.attendanceRate,
          coursesCompleted: record.coursesCompleted.length,
          coursesInProgress: record.coursesInProgress.length,
          averageGrade: record.averageGrade,
          status,
        };
      });
    } catch (error: any) {
      logger.error(`Failed to generate progress report: ${error.message}`);
      throw new Error(`Failed to generate progress report: ${error.message}`);
    }
  }

  /**
   * Recalculate progress for all students in a promotion
   */
  async recalculatePromotionProgress(promotionId: string): Promise<void> {
    try {
      logger.info(`Recalculating progress for all students in promotion ${promotionId}`);
      
      await PromotionProgressModel.recalculateForPromotion(
        new mongoose.Types.ObjectId(promotionId)
      );
      
      logger.info(`Progress recalculation completed`);
    } catch (error: any) {
      logger.error(`Failed to recalculate promotion progress: ${error.message}`);
      throw new Error(`Failed to recalculate promotion progress: ${error.message}`);
    }
  }
}