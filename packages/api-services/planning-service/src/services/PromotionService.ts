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
          existingPromotions.some(p => p.studentIds.some(sid => sid.toString() === id))
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
            }
          }
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
          }
        },
        {
          arrayFilters: [{ 'elem.promotionId': promotion._id, 'elem.leftAt': { $exists: false } }],
        }
      );

      logger.info(`Removed student ${studentId} from promotion ${promotionId}`);
      return promotion;
    } catch (error: any) {
      logger.error(`Failed to remove student from promotion:`, error);
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
      logger.error(`Failed to link events to promotion:`, error);
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
      logger.error(`Failed to unlink event from promotion:`, error);
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
      return await PromotionModel.findByStudent(objectId);
    } catch (error: any) {
      logger.error(`Failed to get student promotion:`, error);
      throw new Error(`Failed to get student promotion: ${error.message}`);
    }
  }

  async getStudentPromotionView(studentId: string): Promise<StudentPromotionView | null> {
    try {
      const promotion = await this.getStudentPromotion(studentId);
      if (!promotion) return null;

      // Get upcoming events for the promotion
      const upcomingEvents = await EventModel.find({
        _id: { $in: promotion.eventIds },
        startDate: { $gte: new Date() },
      })
        .populate('linkedCourse', '_id title slug')
        .populate('teacherId', '_id profile.firstName profile.lastName')
        .sort({ startDate: 1 })
        .limit(10)
        .lean();

      // Get real progress data
      const studentProgress = await this.progressService.getStudentProgress(
        studentId, 
        promotion._id.toString()
      );
      
      const progress: MembershipProgress = {
        eventsAttended: [], // Placeholder - would need event IDs from attendance
        coursesCompleted: studentProgress.coursesCompleted,
        overallProgress: studentProgress.overallProgress,
      };

      return {
        promotion: {
          ...promotion.toJSON(),
          _id: promotion._id.toString(),
        },
        upcomingEvents: upcomingEvents.map(e => ({
          _id: e._id.toString(),
          title: e.title,
          type: e.type,
          startDate: e.startDate,
          endDate: e.endDate,
          linkedCourse: e.linkedCourse ? {
            _id: (e.linkedCourse as any)._id.toString(),
            title: (e.linkedCourse as any).title,
            slug: (e.linkedCourse as any).slug,
          } : undefined,
          teacher: e.teacherId ? {
            _id: (e.teacherId as any)._id.toString(),
            name: `${(e.teacherId as any).profile.firstName} ${(e.teacherId as any).profile.lastName}`,
          } : undefined,
        })),
        progress,
      };
    } catch (error: any) {
      logger.error(`Failed to get student promotion view:`, error);
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
        const [startYear, endYear] = currentPromotion.academicYear.split('-').map(Number);
        nextAcademicYear = `${endYear}-${endYear + 1}`;
      }

      // Find or create next semester promotion
      let nextPromotion = await PromotionModel.findOne({
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
      logger.error(`Failed to progress student:`, error);
      throw new Error(`Failed to progress student: ${error.message}`);
    }
  }

  // =============================================================================
  // PERMISSIONS
  // =============================================================================

  canManagePromotion(userRole: UserRole): boolean {
    return userRole === 'admin' || userRole === 'staff';
  }
}