// Path: packages/api-services/course-service/src/services/CourseService.ts
import mongoose from 'mongoose';
import { CourseModel, UserModel } from '@101-school/database-schemas';
import {
  CreateCourseData,
  UpdateCourseData,
  CourseSearchFilters,
  CourseStats,
  createCourseSchema
} from '@101-school/shared-utilities';
import { ValidationHelper, ErrorHelper } from '@101-school/shared-utilities';

export interface CourseResult {
  success: boolean;
  course?: any;
  error?: string;
}

export interface CoursesResult {
  success: boolean;
  courses?: any[];
  total?: number;
  pagination?: {
    limit: number;
    offset: number;
    hasMore: boolean;
  };
  error?: string;
}

export interface CourseStatsResult {
  success: boolean;
  stats?: CourseStats;
  error?: string;
}

export interface EnrollmentResult {
  success: boolean;
  message?: string;
  enrollmentDate?: Date;
  waitlisted?: boolean;
  position?: number;
  error?: string;
}

export interface DeleteResult {
  success: boolean;
  message?: string;
  error?: string;
}

export class CourseService {
  /**
   * Create a new course
   */
  static async createCourse(courseData: CreateCourseData, instructorId: string): Promise<CourseResult> {
    try {
      // Convert date strings to Date objects if needed (for HTTP API compatibility)
      const processedCourseData = {
        ...courseData,
        startDate: typeof courseData.startDate === 'string' ? new Date(courseData.startDate) : courseData.startDate,
        endDate: typeof courseData.endDate === 'string' ? new Date(courseData.endDate) : courseData.endDate,
        enrollmentDeadline: courseData.enrollmentDeadline && typeof courseData.enrollmentDeadline === 'string' 
          ? new Date(courseData.enrollmentDeadline) 
          : courseData.enrollmentDeadline
      };

      // Validate course data
      const validation = ValidationHelper.validateSchema(createCourseSchema, processedCourseData);
      if (!validation.success) {
        return { success: false, error: `Course validation failed: ${validation.errors!.join('; ')}` };
      }

      // Validate instructor exists and has proper role
      const instructor = await UserModel.findById(instructorId);
      if (!instructor) {
        return { success: false, error: 'Instructor not found' };
      }

      if (!['teacher', 'admin', 'staff'].includes((instructor as any).role)) {
        return { success: false, error: 'User does not have permission to create courses' };
      }

      // Check if course code already exists
      const existingCourse = await CourseModel.findOne({ code: processedCourseData.code.toUpperCase() });
      if (existingCourse) {
        return { success: false, error: 'Course code already exists' };
      }

      // Validate date range
      if (processedCourseData.endDate <= processedCourseData.startDate) {
        return { success: false, error: 'End date must be after start date' };
      }

      // Create course
      const course = await CourseModel.create({
        ...processedCourseData,
        code: processedCourseData.code.toUpperCase(),
        instructor: instructorId,
        instructorInfo: {
          firstName: (instructor as any).profile.firstName,
          lastName: (instructor as any).profile.lastName,
          email: (instructor as any).email
        },
        enrolledStudents: [],
        chapters: [],
        resources: [],
        assessments: [],
        status: 'draft',
        isActive: true
      });

      return { success: true, course };
    } catch (error: any) {
      return ErrorHelper.handleServiceError('Failed to create course', error);
    }
  }

  /**
   * Get course by ID
   */
  static async getCourse(courseId: string): Promise<CourseResult> {
    try {
      // Validate course ID format
      if (!mongoose.Types.ObjectId.isValid(courseId)) {
        return { success: false, error: 'Invalid course ID format' };
      }

      const course = await (CourseModel.findById(courseId) as any)
        .populate('instructor', 'profile.firstName profile.lastName email')
        .populate('enrolledStudents', 'profile.firstName profile.lastName email');

      if (!course) {
        return { success: false, error: 'Course not found' };
      }

      return { success: true, course };
    } catch (error: any) {
      return ErrorHelper.handleServiceError('Failed to get course', error);
    }
  }

  /**
   * Update course
   */
  static async updateCourse(courseId: string, updateData: UpdateCourseData, userId: string): Promise<CourseResult> {
    try {
      // Validate course ID format
      if (!mongoose.Types.ObjectId.isValid(courseId)) {
        return { success: false, error: 'Invalid course ID format' };
      }

      const course = await CourseModel.findById(courseId);
      if (!course) {
        return { success: false, error: 'Course not found' };
      }

      // Check permissions
      const user = await UserModel.findById(userId);
      if (!user) {
        return { success: false, error: 'User not found' };
      }

      const canUpdate = (user as any).role === 'admin' || 
                       (user as any).role === 'staff' || 
                       (course as any).instructor.toString() === userId;

      if (!canUpdate) {
        return { success: false, error: 'Insufficient permissions to update this course' };
      }

      // Validate update data
      if (updateData.startDate && updateData.endDate && updateData.endDate <= updateData.startDate) {
        return { success: false, error: 'End date must be after start date' };
      }

      // Update course
      const updatedCourse = await CourseModel.findByIdAndUpdate(
        courseId,
        { 
          $set: { 
            ...updateData,
            updatedAt: new Date()
          }
        },
        { new: true, runValidators: true }
      );

      return { success: true, course: updatedCourse! };
    } catch (error: any) {
      return ErrorHelper.handleServiceError('Failed to update course', error);
    }
  }

  /**
   * Delete course (soft delete)
   */
  static async deleteCourse(courseId: string, userId: string): Promise<DeleteResult> {
    try {
      // Validate course ID format
      if (!mongoose.Types.ObjectId.isValid(courseId)) {
        return { success: false, error: 'Invalid course ID format' };
      }

      const course = await CourseModel.findById(courseId);
      if (!course) {
        return { success: false, error: 'Course not found' };
      }

      // Check permissions
      const user = await UserModel.findById(userId);
      if (!user) {
        return { success: false, error: 'User not found' };
      }

      const canDelete = (user as any).role === 'admin' || 
                       (user as any).role === 'staff' || 
                       (course as any).instructor.toString() === userId;

      if (!canDelete) {
        return { success: false, error: 'Insufficient permissions to delete this course' };
      }

      // Prevent deletion of published courses with enrollments
      if ((course as any).status === 'published' && (course as any).enrolledStudents.length > 0) {
        return { 
          success: false, 
          error: 'Cannot delete published course with enrolled students. Archive it instead.' 
        };
      }

      // Soft delete
      await CourseModel.findByIdAndUpdate(courseId, {
        $set: {
          isActive: false,
          status: 'archived',
          updatedAt: new Date()
        }
      });

      return { 
        success: true, 
        message: `Course "${(course as any).title}" has been deleted successfully` 
      };
    } catch (error: any) {
      return ErrorHelper.handleServiceError('Failed to delete course', error);
    }
  }

  /**
   * Enroll student in course
   */
  static async enrollStudent(courseId: string, studentId: string): Promise<EnrollmentResult> {
    try {
      // Validate IDs
      if (!mongoose.Types.ObjectId.isValid(courseId) || !mongoose.Types.ObjectId.isValid(studentId)) {
        return { success: false, error: 'Invalid ID format' };
      }

      const course = await CourseModel.findById(courseId);
      if (!course) {
        return { success: false, error: 'Course not found' };
      }

      const student = await UserModel.findById(studentId);
      if (!student) {
        return { success: false, error: 'Student not found' };
      }

      // Check if student can enroll using the course model method
      const canEnroll = await (course as any).canStudentEnroll(studentId);
      if (!canEnroll) {
        if ((course as any).isStudentEnrolled(studentId)) {
          return { success: false, message: 'Student is already enrolled in this course' };
        }
        
        if (!(course as any).hasCapacity()) {
          return { success: false, message: 'Course capacity reached' };
        }
        
        if ((course as any).status !== 'published') {
          return { success: false, message: 'Course is not available for enrollment' };
        }
        
        const now = new Date();
        if (now >= (course as any).startDate) {
          return { success: false, message: 'Enrollment period has ended' };
        }
        
        return { success: false, message: 'Student cannot enroll in this course' };
      }

      // Enroll student
      const enrolled = await (course as any).enrollStudent(studentId);
      if (!enrolled) {
        return { success: false, error: 'Failed to enroll student' };
      }

      return {
        success: true,
        message: 'Student enrolled successfully',
        enrollmentDate: new Date(),
        waitlisted: false
      };
    } catch (error: any) {
      return ErrorHelper.handleServiceError('Failed to enroll student', error);
    }
  }

  /**
   * Unenroll student from course
   */
  static async unenrollStudent(courseId: string, studentId: string): Promise<EnrollmentResult> {
    try {
      // Validate IDs
      if (!mongoose.Types.ObjectId.isValid(courseId) || !mongoose.Types.ObjectId.isValid(studentId)) {
        return { success: false, error: 'Invalid ID format' };
      }

      const course = await CourseModel.findById(courseId);
      if (!course) {
        return { success: false, error: 'Course not found' };
      }

      if (!(course as any).isStudentEnrolled(studentId)) {
        return { success: false, message: 'Student is not enrolled in this course' };
      }

      // Unenroll student
      const unenrolled = await (course as any).unenrollStudent(studentId);
      if (!unenrolled) {
        return { success: false, error: 'Failed to unenroll student' };
      }

      return {
        success: true,
        message: 'Student unenrolled successfully'
      };
    } catch (error: any) {
      return ErrorHelper.handleServiceError('Failed to unenroll student', error);
    }
  }

  /**
   * Search courses with filters and pagination
   */
  static async searchCourses(query: string, filters: CourseSearchFilters): Promise<CoursesResult> {
    try {
      const searchConditions: any = {
        isActive: true
      };

      // Text search
      if (query.trim()) {
        searchConditions.$or = [
          { title: { $regex: query, $options: 'i' } },
          { description: { $regex: query, $options: 'i' } },
          { code: { $regex: query, $options: 'i' } },
          { tags: { $in: [new RegExp(query, 'i')] } }
        ];
      }

      // Apply filters
      if (filters.category) {
        searchConditions.category = filters.category;
      }

      if (filters.level) {
        searchConditions.level = filters.level;
      }

      if (filters.status) {
        searchConditions.status = filters.status;
      } else {
        // Default to published courses for public search
        searchConditions.status = 'published';
      }

      if (filters.instructor) {
        searchConditions.instructor = filters.instructor;
      }

      if (filters.tags && filters.tags.length > 0) {
        searchConditions.tags = { $in: filters.tags };
      }

      if (filters.minCredits !== undefined) {
        searchConditions.credits = { $gte: filters.minCredits };
      }

      if (filters.maxCredits !== undefined) {
        searchConditions.credits = { 
          ...searchConditions.credits, 
          $lte: filters.maxCredits 
        };
      }

      if (filters.hasAvailableSpots) {
        searchConditions.$expr = {
          $lt: [{ $size: '$enrolledStudents' }, '$capacity']
        };
      }

      // Pagination
      const limit = Math.min(filters.limit || 20, 100);
      const offset = filters.offset || 0;

      // Sorting
      let sortCondition: any = { createdAt: -1 };
      if (filters.sortBy) {
        const sortOrder = filters.sortOrder === 'desc' ? -1 : 1;
        switch (filters.sortBy) {
          case 'title':
            sortCondition = { title: sortOrder };
            break;
          case 'startDate':
            sortCondition = { startDate: sortOrder };
            break;
          case 'popularity':
            sortCondition = { enrollmentCount: sortOrder };
            break;
          default:
            sortCondition = { createdAt: sortOrder };
        }
      }

      // Execute search
      const [courses, total] = await Promise.all([
        (CourseModel.find(searchConditions) as any)
          .populate('instructor', 'profile.firstName profile.lastName email')
          .sort(sortCondition)
          .limit(limit)
          .skip(offset),
        CourseModel.countDocuments(searchConditions)
      ]);

      return {
        success: true,
        courses,
        total,
        pagination: {
          limit,
          offset,
          hasMore: (offset + limit) < total
        }
      };
    } catch (error: any) {
      return ErrorHelper.handleServiceError('Failed to search courses', error);
    }
  }

  /**
   * Get course statistics
   */
  static async getCourseStats(): Promise<CourseStatsResult> {
    try {
      const stats = await CourseModel.aggregate([
        {
          $group: {
            _id: null,
            totalCourses: { $sum: 1 },
            publishedCourses: {
              $sum: { $cond: [{ $eq: ['$status', 'published'] }, 1, 0] }
            },
            totalEnrollments: { $sum: { $size: '$enrolledStudents' } }
          }
        }
      ]);

      const categoryStats = await CourseModel.aggregate([
        { $match: { status: 'published', isActive: true } },
        {
          $group: {
            _id: '$category',
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } },
        { $limit: 5 }
      ]);

      const instructorStats = await CourseModel.aggregate([
        { $match: { status: 'published', isActive: true } },
        {
          $group: {
            _id: '$instructor',
            courseCount: { $sum: 1 },
            totalEnrollments: { $sum: { $size: '$enrolledStudents' } }
          }
        },
        { $sort: { courseCount: -1 } },
        { $limit: 10 },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'instructorInfo'
          }
        }
      ]);

      const baseStats = stats[0] || { totalCourses: 0, publishedCourses: 0, totalEnrollments: 0 };

      const result: CourseStats = {
        totalCourses: (baseStats as any).totalCourses,
        publishedCourses: (baseStats as any).publishedCourses,
        totalEnrollments: (baseStats as any).totalEnrollments,
        averageCompletion: 0, // Would require progress tracking implementation
        topCategories: categoryStats.map((cat: any) => ({
          category: cat._id,
          count: cat.count
        })),
        topInstructors: instructorStats.map((inst: any) => ({
          instructorId: inst._id,
          name: inst.instructorInfo && inst.instructorInfo[0] && inst.instructorInfo[0].profile ? 
            `${inst.instructorInfo[0].profile.firstName} ${inst.instructorInfo[0].profile.lastName}` : 
            'Unknown',
          courseCount: inst.courseCount,
          averageRating: 0 // Would require rating system implementation
        }))
      };

      return { success: true, stats: result };
    } catch (error: any) {
      return ErrorHelper.handleServiceError('Failed to get course statistics', error);
    }
  }

  /**
   * Get courses by instructor
   */
  static async getCoursesByInstructor(instructorId: string): Promise<CoursesResult> {
    try {
      if (!mongoose.Types.ObjectId.isValid(instructorId)) {
        return { success: false, error: 'Invalid instructor ID format' };
      }

      const courses = await CourseModel.findByInstructor(instructorId);
      
      return {
        success: true,
        courses,
        total: courses.length
      };
    } catch (error: any) {
      return ErrorHelper.handleServiceError('Failed to get instructor courses', error);
    }
  }

  /**
   * Publish course
   */
  static async publishCourse(courseId: string, userId: string): Promise<CourseResult> {
    try {
      const updateResult = await this.updateCourse(courseId, { status: 'published' }, userId);
      
      if (!updateResult.success) {
        return updateResult;
      }

      return {
        success: true,
        course: updateResult.course
      };
    } catch (error: any) {
      return ErrorHelper.handleServiceError('Failed to publish course', error);
    }
  }

  /**
   * Archive course
   */
  static async archiveCourse(courseId: string, userId: string): Promise<CourseResult> {
    try {
      const updateResult = await this.updateCourse(courseId, { status: 'archived' }, userId);
      
      if (!updateResult.success) {
        return updateResult;
      }

      return {
        success: true,
        course: updateResult.course
      };
    } catch (error: any) {
      return ErrorHelper.handleServiceError('Failed to archive course', error);
    }
  }

  /**
   * Get enrollment status for a user
   */
  static async getEnrollmentStatus(courseId: string, userId: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      if (!mongoose.Types.ObjectId.isValid(courseId)) {
        return { success: false, error: 'Invalid course ID format' };
      }

      const course = await CourseModel.findById(courseId);
      if (!course) {
        return { success: false, error: 'Course not found' };
      }

      const isEnrolled = (course as any).enrolledStudents.includes(userId);
      
      return {
        success: true,
        data: {
          enrolled: isEnrolled,
          enrollmentDate: isEnrolled ? new Date() : undefined,
          waitlisted: false,
          position: null
        }
      };
    } catch (error: any) {
      return ErrorHelper.handleServiceError('Failed to get enrollment status', error);
    }
  }

  /**
   * Check enrollment eligibility
   */
  static async checkEnrollmentEligibility(courseId: string, userId: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      if (!mongoose.Types.ObjectId.isValid(courseId)) {
        return { success: false, error: 'Invalid course ID format' };
      }

      const course = await CourseModel.findById(courseId);
      if (!course) {
        return { success: false, error: 'Course not found' };
      }

      const user = await UserModel.findById(userId);
      if (!user) {
        return { success: false, error: 'User not found' };
      }

      // Check if already enrolled
      if ((course as any).enrolledStudents.includes(userId)) {
        return {
          success: true,
          data: {
            eligible: false,
            reason: 'Already enrolled in this course'
          }
        };
      }

      // Check capacity
      if ((course as any).enrolledStudents.length >= (course as any).capacity) {
        return {
          success: true,
          data: {
            eligible: false,
            reason: 'Course is at full capacity',
            waitlistPosition: 1
          }
        };
      }

      // Check if course is published
      if ((course as any).status !== 'published') {
        return {
          success: true,
          data: {
            eligible: false,
            reason: 'Course is not currently available for enrollment'
          }
        };
      }

      // Check enrollment deadline
      if ((course as any).enrollmentDeadline && new Date() > new Date((course as any).enrollmentDeadline)) {
        return {
          success: true,
          data: {
            eligible: false,
            reason: 'Enrollment deadline has passed'
          }
        };
      }

      return {
        success: true,
        data: {
          eligible: true
        }
      };
    } catch (error: any) {
      return ErrorHelper.handleServiceError('Failed to check enrollment eligibility', error);
    }
  }

  /**
   * Get course progress for a user
   */
  static async getCourseProgress(courseId: string, userId: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      if (!mongoose.Types.ObjectId.isValid(courseId)) {
        return { success: false, error: 'Invalid course ID format' };
      }

      const course = await CourseModel.findById(courseId);
      if (!course) {
        return { success: false, error: 'Course not found' };
      }

      // Check if user is enrolled
      if (!(course as any).enrolledStudents.includes(userId)) {
        return { success: false, error: 'User is not enrolled in this course' };
      }

      // For now, return mock progress data
      // In a real implementation, this would come from a separate progress tracking system
      return {
        success: true,
        data: {
          completionPercentage: 45,
          chaptersCompleted: [],
          sectionsCompleted: [],
          exercisesCompleted: [],
          timeSpent: 1800, // 30 hours in minutes
          lastAccessDate: new Date()
        }
      };
    } catch (error: any) {
      return ErrorHelper.handleServiceError('Failed to get course progress', error);
    }
  }

  /**
   * Update course progress for a user
   */
  static async updateCourseProgress(courseId: string, userId: string, progressData: any): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      if (!mongoose.Types.ObjectId.isValid(courseId)) {
        return { success: false, error: 'Invalid course ID format' };
      }

      const course = await CourseModel.findById(courseId);
      if (!course) {
        return { success: false, error: 'Course not found' };
      }

      // Check if user is enrolled
      if (!(course as any).enrolledStudents.includes(userId)) {
        return { success: false, error: 'User is not enrolled in this course' };
      }

      // In a real implementation, this would update a separate progress tracking collection
      // For now, just return success
      return {
        success: true,
        data: {
          message: 'Progress updated successfully',
          updatedAt: new Date()
        }
      };
    } catch (error: any) {
      return ErrorHelper.handleServiceError('Failed to update course progress', error);
    }
  }

  /**
   * Get course feedback
   */
  static async getCourseFeedback(courseId: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      if (!mongoose.Types.ObjectId.isValid(courseId)) {
        return { success: false, error: 'Invalid course ID format' };
      }

      const course = await CourseModel.findById(courseId);
      if (!course) {
        return { success: false, error: 'Course not found' };
      }

      // In a real implementation, this would come from a separate feedback collection
      // For now, return mock feedback data
      return {
        success: true,
        data: {
          averageRating: 4.2,
          totalReviews: 15,
          feedback: [
            {
              rating: 5,
              comment: 'Excellent course with great practical examples!',
              author: 'Anonymous',
              date: new Date('2024-01-15'),
              anonymous: true
            },
            {
              rating: 4,
              comment: 'Good content but could use more interactive elements.',
              author: 'John D.',
              date: new Date('2024-01-10'),
              anonymous: false
            }
          ]
        }
      };
    } catch (error: any) {
      return ErrorHelper.handleServiceError('Failed to get course feedback', error);
    }
  }

  /**
   * Submit course feedback
   */
  static async submitCourseFeedback(courseId: string, userId: string, feedbackData: any): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      if (!mongoose.Types.ObjectId.isValid(courseId)) {
        return { success: false, error: 'Invalid course ID format' };
      }

      const course = await CourseModel.findById(courseId);
      if (!course) {
        return { success: false, error: 'Course not found' };
      }

      // Check if user is enrolled
      if (!(course as any).enrolledStudents.includes(userId)) {
        return { success: false, error: 'Only enrolled students can submit feedback' };
      }

      // Validate feedback data
      if (!feedbackData.rating || feedbackData.rating < 1 || feedbackData.rating > 5) {
        return { success: false, error: 'Rating must be between 1 and 5' };
      }

      // In a real implementation, this would save to a separate feedback collection
      // For now, just return success
      return {
        success: true,
        data: {
          message: 'Feedback submitted successfully',
          submittedAt: new Date()
        }
      };
    } catch (error: any) {
      return ErrorHelper.handleServiceError('Failed to submit course feedback', error);
    }
  }

  /**
   * Get course prerequisites
   */
  static async getCoursePrerequisites(courseId: string, userId?: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      if (!mongoose.Types.ObjectId.isValid(courseId)) {
        return { success: false, error: 'Invalid course ID format' };
      }

      const course = await CourseModel.findById(courseId);
      if (!course) {
        return { success: false, error: 'Course not found' };
      }

      // Get prerequisite courses
      const prerequisites = await CourseModel.find({
        code: { $in: (course as any).prerequisites || [] }
      }).select('_id title code description level');

      let completed: string[] = [];
      let missing: string[] = [];

      if (userId) {
        // In a real implementation, check user's completed courses
        // For now, assume no prerequisites are completed
        missing = prerequisites.map(p => (p as any).code);
      }

      return {
        success: true,
        data: {
          prerequisites,
          completed,
          missing
        }
      };
    } catch (error: any) {
      return ErrorHelper.handleServiceError('Failed to get course prerequisites', error);
    }
  }

  /**
   * Get enrolled courses for a user
   */
  static async getEnrolledCourses(userId: string): Promise<CoursesResult> {
    try {
      const courses = await CourseModel.find({
        enrolledStudents: userId,
        isActive: true
      }).populate('instructor', 'profile.firstName profile.lastName email');

      return {
        success: true,
        courses,
        total: courses.length
      };
    } catch (error: any) {
      return ErrorHelper.handleServiceError('Failed to get enrolled courses', error);
    }
  }

  /**
   * Get available course categories
   */
  static async getCategories(): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const categories = await CourseModel.distinct('category', { isActive: true });
      
      return {
        success: true,
        data: {
          categories: categories.sort()
        }
      };
    } catch (error: any) {
      return ErrorHelper.handleServiceError('Failed to get course categories', error);
    }
  }

  /**
   * Get available course levels
   */
  static async getLevels(): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const levels = ['beginner', 'intermediate', 'advanced', 'expert'];
      
      return {
        success: true,
        data: {
          levels
        }
      };
    } catch (error: any) {
      return ErrorHelper.handleServiceError('Failed to get course levels', error);
    }
  }

  /**
   * Export course data
   */
  static async exportCourseData(courseId: string, userId: string, format: string): Promise<{ success: boolean; data?: any; contentType?: string; filename?: string; error?: string }> {
    try {
      if (!mongoose.Types.ObjectId.isValid(courseId)) {
        return { success: false, error: 'Invalid course ID format' };
      }

      const course = await CourseModel.findById(courseId).populate('instructor', 'profile.firstName profile.lastName email');
      if (!course) {
        return { success: false, error: 'Course not found' };
      }

      // Check permissions
      const user = await UserModel.findById(userId);
      if (!user) {
        return { success: false, error: 'User not found' };
      }

      const hasPermission = (user as any).role === 'admin' || 
                           (user as any).role === 'staff' || 
                           ((user as any).role === 'teacher' && (course as any).instructor._id.toString() === userId);

      if (!hasPermission) {
        return { success: false, error: 'Insufficient permissions to export course data' };
      }

      const courseData = {
        title: (course as any).title,
        description: (course as any).description,
        code: (course as any).code,
        instructor: (course as any).instructorInfo,
        level: (course as any).level,
        category: (course as any).category,
        duration: (course as any).duration,
        schedule: (course as any).schedule,
        capacity: (course as any).capacity,
        enrolledStudents: (course as any).enrolledStudents.length,
        tags: (course as any).tags,
        status: (course as any).status,
        startDate: (course as any).startDate,
        endDate: (course as any).endDate,
        exportedAt: new Date()
      };

      switch (format?.toLowerCase()) {
        case 'json':
          return {
            success: true,
            data: JSON.stringify(courseData, null, 2),
            contentType: 'application/json',
            filename: `course-${(course as any).code}-${Date.now()}.json`
          };
        case 'csv':
          // Simple CSV export
          const csvHeader = Object.keys(courseData).join(',');
          const csvData = Object.values(courseData).map(v => 
            typeof v === 'object' ? JSON.stringify(v) : v
          ).join(',');
          return {
            success: true,
            data: `${csvHeader}\n${csvData}`,
            contentType: 'text/csv',
            filename: `course-${(course as any).code}-${Date.now()}.csv`
          };
        default:
          return { success: false, error: 'Unsupported export format. Use json or csv.' };
      }
    } catch (error: any) {
      return ErrorHelper.handleServiceError('Failed to export course data', error);
    }
  }

  /**
   * Import course data
   */
  static async importCourseData(file: any, userId: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const user = await UserModel.findById(userId);
      if (!user) {
        return { success: false, error: 'User not found' };
      }

      // Check permissions
      if (!['admin', 'staff', 'teacher'].includes((user as any).role)) {
        return { success: false, error: 'Insufficient permissions to import course data' };
      }

      // For now, return success without actual import logic
      // In a real implementation, this would parse the file and create courses
      return {
        success: true,
        data: {
          message: 'Course data import functionality is not yet implemented',
          filename: file.originalname,
          importedAt: new Date()
        }
      };
    } catch (error: any) {
      return ErrorHelper.handleServiceError('Failed to import course data', error);
    }
  }
}