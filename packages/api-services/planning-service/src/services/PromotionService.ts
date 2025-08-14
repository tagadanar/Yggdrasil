// packages/api-services/planning-service/src/services/PromotionService.ts
// Business logic for promotion management

import {
  PromotionModel,
  PromotionDocument,
  UserModel,
  EventModel,
} from '@yggdrasil/database-schemas';
import {
  CreatePromotionRequest,
  UpdatePromotionRequest,
  PromotionFilters,
  PromotionWithDetails,
  StudentPromotionView,
  MembershipProgress,
  UserRole,
  planningLogger as logger,
} from '@yggdrasil/shared-utilities';
import mongoose from 'mongoose';
import { ProgressTrackingService } from './ProgressTrackingService';

export class PromotionService {
  private progressService: ProgressTrackingService;

  constructor() {
    this.progressService = new ProgressTrackingService();
  }

  // =============================================================================
  // PROMOTION CRUD OPERATIONS
  // =============================================================================

  async createPromotion(
    data: CreatePromotionRequest,
    createdBy: string,
  ): Promise<PromotionDocument> {
    try {
      logger.info('Creating promotion:', {
        name: data.name,
        semester: data.semester,
        intake: data.intake,
        academicYear: data.academicYear,
      });

      const promotion = new PromotionModel({
        ...data,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        studentIds: [],
        eventIds: [],
        status: 'draft',
        metadata: data.metadata || {},
        createdBy: new mongoose.Types.ObjectId(createdBy),
      });

      await promotion.save();
      logger.info(`Promotion created successfully: ${promotion._id}`);
      return promotion;
    } catch (error: any) {
      logger.error('Failed to create promotion:', error);
      throw new Error(`Failed to create promotion: ${error.message}`);
    }
  }

  async getPromotionById(promotionId: string): Promise<PromotionDocument | null> {
    try {
      return await PromotionModel.findById(promotionId);
    } catch (error: any) {
      logger.error(`Failed to get promotion ${promotionId}:`, error);
      throw new Error(`Failed to get promotion: ${error.message}`);
    }
  }

  async getPromotionWithDetails(promotionId: string): Promise<PromotionWithDetails | null> {
    try {
      const promotion = await PromotionModel.findById(promotionId).lean();
      if (!promotion) return null;

      // Fetch students and events
      const students = await UserModel.find({
        _id: { $in: promotion.studentIds },
      }).select('_id email profile.firstName profile.lastName profile.studentId').lean();

      const events = await EventModel.find({
        _id: { $in: promotion.eventIds },
      }).select('_id title type startDate endDate linkedCourse teacherId').lean();

      return {
        ...promotion,
        _id: promotion._id.toString(),
        studentIds: promotion.studentIds.map(id => id.toString()),
        eventIds: promotion.eventIds.map(id => id.toString()),
        createdBy: promotion.createdBy.toString(),
        students: students.map(s => ({
          _id: s._id.toString(),
          email: s.email,
          profile: s.profile,
        })),
        events: events.map(e => ({
          _id: e._id.toString(),
          title: e.title,
          type: e.type,
          startDate: e.startDate,
          endDate: e.endDate,
          linkedCourse: e.linkedCourse?.toString(),
          teacherId: e.teacherId?.toString(),
        })),
      } as PromotionWithDetails;
    } catch (error: any) {
      logger.error(`Failed to get promotion details ${promotionId}:`, error);
      throw new Error(`Failed to get promotion details: ${error.message}`);
    }
  }

  async updatePromotion(
    promotionId: string,
    data: UpdatePromotionRequest,
  ): Promise<PromotionDocument | null> {
    try {
      const promotion = await PromotionModel.findById(promotionId);
      if (!promotion) return null;

      // Update fields
      if (data.name) promotion.name = data.name;
      if (data.startDate) promotion.startDate = new Date(data.startDate);
      if (data.endDate) promotion.endDate = new Date(data.endDate);
      if (data.status) promotion.status = data.status;
      if (data.metadata) {
        promotion.metadata = { ...promotion.metadata, ...data.metadata };
      }

      await promotion.save();
      logger.info(`Promotion ${promotionId} updated successfully`);
      return promotion;
    } catch (error: any) {
      logger.error(`Failed to update promotion ${promotionId}:`, error);
      throw new Error(`Failed to update promotion: ${error.message}`);
    }
  }

  async deletePromotion(promotionId: string): Promise<boolean> {
    try {
      const promotion = await PromotionModel.findById(promotionId);
      if (!promotion) return false;

      // Check if promotion has students
      if (promotion.studentIds.length > 0) {
        throw new Error('Cannot delete promotion with enrolled students');
      }

      // Remove promotion reference from events
      await EventModel.updateMany(
        { promotionIds: promotion._id },
        { $pull: { promotionIds: promotion._id } },
      );

      await PromotionModel.deleteOne({ _id: promotionId });
      logger.info(`Promotion ${promotionId} deleted successfully`);
      return true;
    } catch (error: any) {
      logger.error(`Failed to delete promotion ${promotionId}:`, error);
      throw new Error(`Failed to delete promotion: ${error.message}`);
    }
  }

  // =============================================================================
  // STUDENT MANAGEMENT
  // =============================================================================

  async addStudentsToPromotion(
    promotionId: string,
    studentIds: string[],
  ): Promise<PromotionDocument | null> {
    try {
      const promotion = await PromotionModel.findById(promotionId);
      if (!promotion) {
        throw new Error('Promotion not found');
      }

      // Verify all IDs are valid students
      const students = await UserModel.find({
        _id: { $in: studentIds },
        role: 'student',
      });

      if (students.length !== studentIds.length) {
        throw new Error('Some user IDs are not valid students');
      }

      // Check if any student is already in another active promotion
      const existingPromotions = await PromotionModel.find({
        studentIds: { $in: studentIds },
        status: { $in: ['draft', 'active'] },
        _id: { $ne: promotionId },
      });

      if (existingPromotions.length > 0) {
        const conflictingStudents = studentIds.filter(id =>
          existingPromotions.some(p => p.studentIds.some(sid => sid.toString() === id)),
        );
        throw new Error(`Students already in other promotions: ${conflictingStudents.join(', ')}`);
      }

      // Add students to promotion
      for (const studentId of studentIds) {
        const objectId = new mongoose.Types.ObjectId(studentId);
        if (!promotion.isStudentEnrolled(objectId)) {
          await promotion.addStudent(objectId);
        }
      }

      // Update students' currentPromotionId
      await UserModel.updateMany(
        { _id: { $in: studentIds } },
        {
          $set: { currentPromotionId: promotion._id },
          $push: {
            promotionHistory: {
              promotionId: promotion._id,
              joinedAt: new Date(),
            },
          },
        },
      );

      // Link students to all promotion events (mid-semester join support)
      if (promotion.eventIds.length > 0) {
        await EventModel.updateMany(
          { _id: { $in: promotion.eventIds } },
          { $addToSet: { promotionIds: promotion._id } },
        );
      }

      logger.info(`Added ${studentIds.length} students to promotion ${promotionId}`);
      return promotion;
    } catch (error: any) {
      logger.error(`Failed to add students to promotion ${promotionId}:`, error);
      throw new Error(`Failed to add students: ${error.message}`);
    }
  }

  async removeStudentFromPromotion(
    promotionId: string,
    studentId: string,
  ): Promise<PromotionDocument | null> {
    try {
      const promotion = await PromotionModel.findById(promotionId);
      if (!promotion) {
        throw new Error('Promotion not found');
      }

      const objectId = new mongoose.Types.ObjectId(studentId);
      await promotion.removeStudent(objectId);

      // Update student's promotion references
      await UserModel.updateOne(
        { _id: studentId },
        {
          $unset: { currentPromotionId: 1 },
          $set: {
            'promotionHistory.$[elem].leftAt': new Date(),
          },
        },
        {
          arrayFilters: [{ 'elem.promotionId': promotion._id, 'elem.leftAt': { $exists: false } }],
        },
      );

      logger.info(`Removed student ${studentId} from promotion ${promotionId}`);
      return promotion;
    } catch (error: any) {
      logger.error('Failed to remove student from promotion:', error);
      throw new Error(`Failed to remove student: ${error.message}`);
    }
  }

  // =============================================================================
  // EVENT MANAGEMENT
  // =============================================================================

  async linkEventsToPromotion(
    promotionId: string,
    eventIds: string[],
  ): Promise<PromotionDocument | null> {
    try {
      const promotion = await PromotionModel.findById(promotionId);
      if (!promotion) {
        throw new Error('Promotion not found');
      }

      // Verify all event IDs are valid
      const events = await EventModel.find({ _id: { $in: eventIds } });
      if (events.length !== eventIds.length) {
        throw new Error('Some event IDs are not valid');
      }

      // Add events to promotion
      for (const eventId of eventIds) {
        const objectId = new mongoose.Types.ObjectId(eventId);
        await promotion.addEvent(objectId);
      }

      // Update events to reference this promotion
      await EventModel.updateMany(
        { _id: { $in: eventIds } },
        { $addToSet: { promotionIds: promotion._id } },
      );

      logger.info(`Linked ${eventIds.length} events to promotion ${promotionId}`);
      return promotion;
    } catch (error: any) {
      logger.error('Failed to link events to promotion:', error);
      throw new Error(`Failed to link events: ${error.message}`);
    }
  }

  async unlinkEventFromPromotion(
    promotionId: string,
    eventId: string,
  ): Promise<PromotionDocument | null> {
    try {
      const promotion = await PromotionModel.findById(promotionId);
      if (!promotion) {
        throw new Error('Promotion not found');
      }

      const objectId = new mongoose.Types.ObjectId(eventId);
      await promotion.removeEvent(objectId);

      // Remove promotion reference from event
      await EventModel.updateOne(
        { _id: eventId },
        { $pull: { promotionIds: promotion._id } },
      );

      logger.info(`Unlinked event ${eventId} from promotion ${promotionId}`);
      return promotion;
    } catch (error: any) {
      logger.error('Failed to unlink event from promotion:', error);
      throw new Error(`Failed to unlink event: ${error.message}`);
    }
  }

  // =============================================================================
  // QUERIES
  // =============================================================================

  async getPromotions(filters: PromotionFilters): Promise<PromotionDocument[]> {
    try {
      const query: any = {};

      if (filters.semester) query.semester = filters.semester;
      if (filters.intake) query.intake = filters.intake;
      if (filters.academicYear) query.academicYear = filters.academicYear;
      if (filters.status) query.status = filters.status;
      if (filters.department) query['metadata.department'] = filters.department;

      return await PromotionModel.find(query).sort({ semester: 1, name: 1 });
    } catch (error: any) {
      logger.error('Failed to get promotions:', error);
      throw new Error(`Failed to get promotions: ${error.message}`);
    }
  }

  async getStudentPromotion(studentId: string): Promise<PromotionDocument | null> {
    try {
      const objectId = new mongoose.Types.ObjectId(studentId);

      // Find promotion that contains this student
      const promotion = await PromotionModel.findOne({
        studentIds: objectId,
      });

      return promotion;
    } catch (error: any) {
      console.error('❌ PROMOTION SERVICE ERROR:', error);
      logger.error('Failed to get student promotion:', error);
      throw new Error(`Failed to get student promotion: ${error.message}`);
    }
  }

  async getStudentPromotionView(studentId: string): Promise<StudentPromotionView | null> {
    try {
      const promotion = await this.getStudentPromotion(studentId);
      if (!promotion) {
        return null;
      }

      // Get ALL events for the promotion (not just upcoming)
      // This is needed for /my-courses page to show all accessible courses
      const allEvents = await EventModel.find({
        _id: { $in: promotion.eventIds },
      })
        .populate({
          path: 'linkedCourse',
          select: '_id title slug description category level estimatedDuration thumbnail',
          populate: {
            path: 'instructor',
            select: '_id email profile.firstName profile.lastName',
          },
        })
        .sort({ startDate: 1 })
        .lean();

      // Also get upcoming events separately for the progress view
      const upcomingEvents = allEvents.filter(e => e.startDate >= new Date()).slice(0, 10);

      // Get real progress data
      const studentProgress = await this.progressService.getStudentProgress(
        studentId,
        promotion._id.toString(),
      );

      const progress: MembershipProgress = {
        eventsAttended: [], // Placeholder - would need event IDs from attendance
        coursesCompleted: studentProgress.coursesCompleted.map(id => id.toString()),
        overallProgress: studentProgress.overallProgress,
      };

      // Format events with full course details for /my-courses page
      const formatEvent = (e: any) => ({
        _id: e._id.toString(),
        title: e.title,
        type: e.type,
        startDate: e.startDate,
        endDate: e.endDate,
        linkedCourse: e.linkedCourse ? {
          _id: (e.linkedCourse as any)._id.toString(),
          title: (e.linkedCourse as any).title,
          slug: (e.linkedCourse as any).slug,
          description: (e.linkedCourse as any).description,
          category: (e.linkedCourse as any).category,
          level: (e.linkedCourse as any).level,
          instructor: {
            _id: (e.linkedCourse as any).instructor?._id?.toString() || 'unknown',
            name: (e.linkedCourse as any).instructor?.email || 'Unknown Instructor',
            email: (e.linkedCourse as any).instructor?.email || 'unknown@example.com',
          },
          estimatedDuration: (e.linkedCourse as any).estimatedDuration,
          thumbnail: (e.linkedCourse as any).thumbnail,
        } : undefined,
        teacher: undefined, // Simplified for now
      });

      return {
        promotion: {
          ...promotion.toJSON(),
          _id: promotion._id.toString(),
        } as any,
        // Include ALL events for /my-courses page to extract courses
        events: allEvents.map(formatEvent),
        // Keep upcomingEvents for backward compatibility
        upcomingEvents: upcomingEvents.map(formatEvent),
        progress,
      } as StudentPromotionView;
    } catch (error: any) {
      logger.error('Failed to get student promotion view:', error);
      throw new Error(`Failed to get student promotion view: ${error.message}`);
    }
  }

  async getActivePromotions(): Promise<PromotionDocument[]> {
    try {
      return await PromotionModel.findActive();
    } catch (error: any) {
      logger.error('Failed to get active promotions:', error);
      throw new Error(`Failed to get active promotions: ${error.message}`);
    }
  }

  async progressStudentToNextSemester(
    studentId: string,
    currentPromotionId: string,
  ): Promise<PromotionDocument | null> {
    try {
      const currentPromotion = await PromotionModel.findById(currentPromotionId);
      if (!currentPromotion) {
        throw new Error('Current promotion not found');
      }

      // Calculate next semester
      const nextSemester = PromotionModel.getNextSemester(currentPromotion.semester);
      const nextIntake = nextSemester % 2 === 1 ? 'september' : 'march';

      // Calculate next academic year
      let nextAcademicYear = currentPromotion.academicYear;
      if (currentPromotion.intake === 'march' && nextIntake === 'september') {
        // Moving from spring to fall of next academic year
        const [_startYear, endYear] = currentPromotion.academicYear.split('-').map(Number);
        nextAcademicYear = `${endYear!}-${endYear! + 1}`;
      }

      // Find or create next semester promotion
      const nextPromotion = await PromotionModel.findOne({
        semester: nextSemester,
        intake: nextIntake,
        academicYear: nextAcademicYear,
        status: { $in: ['draft', 'active'] },
      });

      if (!nextPromotion) {
        throw new Error(`No promotion found for semester ${nextSemester} (${nextIntake} ${nextAcademicYear})`);
      }

      // Remove from current promotion
      await this.removeStudentFromPromotion(currentPromotionId, studentId);

      // Add to next promotion
      await this.addStudentsToPromotion(nextPromotion._id.toString(), [studentId]);

      logger.info(`Progressed student ${studentId} from semester ${currentPromotion.semester} to ${nextSemester}`);
      return nextPromotion;
    } catch (error: any) {
      logger.error('Failed to progress student:', error);
      throw new Error(`Failed to progress student: ${error.message}`);
    }
  }

  /**
   * Get students enrolled in a course through promotions
   */
  async getCourseStudents(courseId: string): Promise<any[]> {
    try {
      // 1. Find all events linked to this course
      const courseEvents = await EventModel.find({
        linkedCourse: new mongoose.Types.ObjectId(courseId),
      }).lean();

      if (courseEvents.length === 0) {
        return []; // No events linked to this course
      }

      const eventIds = courseEvents.map(event => event._id);

      // 2. Find promotions that contain these events
      const promotions = await PromotionModel.find({
        eventIds: { $in: eventIds },
      }).populate('studentIds', 'email profile role').lean();

      // 3. Flatten and enrich student data
      const courseStudents: any[] = [];
      
      for (const promotion of promotions) {
        if (promotion.studentIds && Array.isArray(promotion.studentIds)) {
          for (const student of promotion.studentIds) {
            // Type guard to ensure student is populated
            if (typeof student === 'object' && student !== null && 'email' in student) {
              courseStudents.push({
                _id: student._id,
                name: `${(student as any).profile?.firstName || ''} ${(student as any).profile?.lastName || ''}`.trim() || student.email,
                email: student.email,
                promotionId: promotion._id.toString(),
                promotionName: promotion.name,
                startedAt: promotion.createdAt,
                progress: 0, // TODO: Get real progress data
                completion: 0, // TODO: Get real completion data
                lastActivity: new Date(),
                status: 'active', // TODO: Get real status
                grade: null, // TODO: Get real grade
              });
            }
          }
        }
      }

      // Remove duplicates (student might be in multiple promotions)
      const uniqueStudents = courseStudents.reduce((acc, student) => {
        const exists = acc.find((s: any) => s._id.toString() === student._id.toString());
        if (!exists) {
          acc.push(student);
        }
        return acc;
      }, []);

      logger.info(`Found ${uniqueStudents.length} students for course ${courseId}`);
      return uniqueStudents;
    } catch (error: any) {
      logger.error('Failed to get course students:', error);
      throw new Error(`Failed to get course students: ${error.message}`);
    }
  }

  // =============================================================================
  // PERMISSIONS
  // =============================================================================

  canManagePromotion(userRole: UserRole): boolean {
    return userRole === 'admin' || userRole === 'staff';
  }
}
