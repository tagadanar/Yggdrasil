// packages/api-services/course-service/src/services/CourseService.ts
// Business logic for course management

import {
  CourseModel,
  EventModel,
  UserModel,
  type CourseDocument,
} from '@yggdrasil/database-schemas';
import {
  CreateCourseRequest,
  UpdateCourseRequest,
  CreateChapterRequest,
  UpdateChapterRequest,
  CreateSectionRequest,
  UpdateSectionRequest,
  CreateContentRequest,
  UpdateContentRequest,
  CourseFilters,
  CourseSearchResult,
  UserRole,
} from '@yggdrasil/shared-utilities';
import { courseLogger as logger } from '@yggdrasil/shared-utilities';

export class CourseService {
  // =============================================================================
  // COURSE CRUD OPERATIONS
  // =============================================================================

  async createCourse(
    instructorId: string,
    instructorName: string,
    instructorEmail: string,
    courseData: CreateCourseRequest,
  ): Promise<CourseDocument> {
    try {
      logger.info('Creating course:', {
        instructorId,
        instructorName,
        courseData: {
          title: courseData.title,
          category: courseData.category,
          level: courseData.level,
        },
      });
      // Convert string dates to Date objects if they exist
      const processedSettings = courseData.settings ? {
        ...courseData.settings,
        startDate: courseData.settings.startDate ? new Date(courseData.settings.startDate) : undefined,
        endDate: courseData.settings.endDate ? new Date(courseData.settings.endDate) : undefined,
      } : undefined;

      logger.info('Creating course model instance...');
      const course = new CourseModel({
        title: courseData.title,
        description: courseData.description,
        category: courseData.category,
        level: courseData.level,
        status: 'draft', // Default status
        tags: courseData.tags || [],
        prerequisites: courseData.prerequisites || [],
        estimatedDuration: courseData.estimatedDuration || 0,
        settings: processedSettings || {
          isPublic: false,
          allowLateSubmissions: true,
          enableDiscussions: true,
          enableCollaboration: false,
        },
        instructor: {
          _id: instructorId,
          name: instructorName,
          email: instructorEmail,
        },
        chapters: [],
        resources: [],
        collaborators: [],
        stats: {
          averageRating: 0,
          totalRatings: 0,
          totalViews: 0,
          lastAccessed: new Date(),
        },
        version: 1,
        createdAt: new Date(),
        lastModified: new Date(),
      });

      logger.info('Generating slug...');
      // Generate slug from title
      try {
        course.slug = course.generateSlug();
      } catch (slugError) {
        logger.warn('Slug generation failed, using fallback:', slugError);
        // Fallback slug generation
        course.slug = courseData.title
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '') + '-' + Date.now();
      }

      logger.info(`Generated slug: ${course.slug}`);

      logger.info('Checking slug uniqueness...');
      // Ensure slug is unique
      let slugCounter = 1;
      const originalSlug = course.slug;
      let maxAttempts = 10; // Prevent infinite loop

      while (maxAttempts > 0 && await CourseModel.findBySlug(course.slug)) {
        course.slug = `${originalSlug}-${slugCounter}`;
        slugCounter++;
        maxAttempts--;
      }

      if (maxAttempts === 0) {
        // Ultimate fallback with timestamp
        course.slug = `${originalSlug}-${Date.now()}`;
      }

      logger.info('Saving course to database...');
      await course.save();
      logger.info('Course saved successfully');
      return course;
    } catch (error: any) {
      logger.error('Course creation failed with error:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
        code: error.code,
      });

      // Check for specific MongoDB errors
      if (error.name === 'ValidationError') {
        const validationErrors = Object.keys(error.errors).map(key =>
          `${key}: ${error.errors[key].message}`,
        );
        throw new Error(`Validation error: ${validationErrors.join(', ')}`);
      }

      if (error.code === 11000) {
        throw new Error('Course with this title or slug already exists');
      }

      throw new Error(`Failed to create course: ${error.message}`);
    }
  }

  async getCourseById(courseId: string): Promise<CourseDocument | null> {
    try {
      return await CourseModel.findById(courseId);
    } catch (error: any) {
      throw new Error(`Failed to get course: ${error.message}`);
    }
  }

  async getCourseBySlug(slug: string): Promise<CourseDocument | null> {
    try {
      return await CourseModel.findBySlug(slug);
    } catch (error: any) {
      throw new Error(`Failed to get course by slug: ${error.message}`);
    }
  }

  async updateCourse(
    courseId: string,
    updateData: UpdateCourseRequest,
    userId: string,
    userRole: UserRole,
  ): Promise<CourseDocument | null> {
    try {
      const course = await CourseModel.findById(courseId);
      if (!course) {
        return null;
      }

      // Check permissions
      if (!(await this.canModifyCourse(courseId, userId, userRole))) {
        throw new Error('Insufficient permissions to modify this course');
      }

      // Convert string dates to Date objects if they exist
      const processedUpdateData = { ...updateData };
      if (processedUpdateData.settings) {
        processedUpdateData.settings = {
          ...processedUpdateData.settings,
          startDate: processedUpdateData.settings.startDate ? new Date(processedUpdateData.settings.startDate) : undefined,
          endDate: processedUpdateData.settings.endDate ? new Date(processedUpdateData.settings.endDate) : undefined,
        };
      }

      // Update fields
      Object.assign(course, processedUpdateData);

      // Increment version on significant changes
      if (updateData.title || updateData.description || updateData.status) {
        await course.incrementVersion();
      }

      await course.save();
      return course;
    } catch (error: any) {
      throw new Error(`Failed to update course: ${error.message}`);
    }
  }

  async deleteCourse(courseId: string, userId: string, userRole: UserRole): Promise<boolean> {
    try {
      const course = await CourseModel.findById(courseId);
      if (!course) {
        return false;
      }

      // Check permissions (only admins or course instructors can delete)
      if (!(await this.canModifyCourse(course._id.toString(), userId, userRole))) {
        throw new Error('Insufficient permissions to delete this course');
      }

      await CourseModel.findByIdAndDelete(courseId);

      // Clean up related data is handled by promotion system

      return true;
    } catch (error: any) {
      throw new Error(`Failed to delete course: ${error.message}`);
    }
  }

  // =============================================================================
  // COURSE SEARCH AND LISTING
  // =============================================================================

  async searchCourses(filters: CourseFilters): Promise<CourseSearchResult> {
    try {
      logger.info('CourseService.searchCourses called with filters:', JSON.stringify(filters, null, 2));
      const { search, page = 1, limit = 20, ...otherFilters } = filters;
      const skip = (page - 1) * limit;

      logger.info('Calling CourseModel.searchCourses with:', { search: search || '', otherFilters });
      const courses = await CourseModel.searchCourses(search || '', otherFilters)
        .skip(skip)
        .limit(limit);

      const total = await CourseModel.countDocuments({
        status: 'published',
        'settings.isPublic': true,
        ...(otherFilters.category && { category: otherFilters.category }),
        ...(otherFilters.level && { level: otherFilters.level }),
        ...(otherFilters.instructor && { 'instructor._id': otherFilters.instructor }),
        ...(otherFilters.tags && { tags: { $in: otherFilters.tags } }),
      });

      logger.info('CourseService.searchCourses completed successfully');
      return {
        courses,
        total,
        page,
        limit,
        filters,
      };
    } catch (error: any) {
      logger.error('CourseService.searchCourses error:', error);
      throw new Error(`Failed to search courses: ${error?.message || error}`);
    }
  }

  async getCoursesByInstructor(instructorId: string): Promise<CourseDocument[]> {
    try {
      return await CourseModel.findByInstructor(instructorId);
    } catch (error: any) {
      throw new Error(`Failed to get courses by instructor: ${error.message}`);
    }
  }

  async getPublishedCourses(): Promise<CourseDocument[]> {
    try {
      return await CourseModel.findPublished();
    } catch (error: any) {
      throw new Error(`Failed to get published courses: ${error.message}`);
    }
  }

  // =============================================================================
  // CHAPTER MANAGEMENT
  // =============================================================================

  async addChapter(
    courseId: string,
    chapterData: CreateChapterRequest,
    userId: string,
    userRole: UserRole,
  ): Promise<CourseDocument | null> {
    try {
      const course = await CourseModel.findById(courseId);
      if (!course) {
        return null;
      }

      if (!(await this.canModifyCourse(course._id.toString(), userId, userRole))) {
        throw new Error('Insufficient permissions to modify this course');
      }

      const newChapter = {
        title: chapterData.title,
        description: chapterData.description,
        order: chapterData.order,
        sections: [],
        isPublished: false,
        estimatedDuration: 0,
      };

      course.chapters.push(newChapter as any);
      await course.incrementVersion();
      await course.save();

      return course;
    } catch (error: any) {
      throw new Error(`Failed to add chapter: ${error.message}`);
    }
  }

  async updateChapter(
    courseId: string,
    chapterId: string,
    updateData: UpdateChapterRequest,
    userId: string,
    userRole: UserRole,
  ): Promise<CourseDocument | null> {
    try {
      const course = await CourseModel.findById(courseId);
      if (!course) {
        return null;
      }

      if (!(await this.canModifyCourse(course._id.toString(), userId, userRole))) {
        throw new Error('Insufficient permissions to modify this course');
      }

      const chapter = course.chapters.find((ch: any) => ch._id.toString() === chapterId);
      if (!chapter) {
        throw new Error('Chapter not found');
      }

      Object.assign(chapter, updateData);
      await course.incrementVersion();
      await course.save();

      return course;
    } catch (error: any) {
      throw new Error(`Failed to update chapter: ${error.message}`);
    }
  }

  async deleteChapter(
    courseId: string,
    chapterId: string,
    userId: string,
    userRole: UserRole,
  ): Promise<CourseDocument | null> {
    try {
      const course = await CourseModel.findById(courseId);
      if (!course) {
        return null;
      }

      if (!(await this.canModifyCourse(course._id.toString(), userId, userRole))) {
        throw new Error('Insufficient permissions to modify this course');
      }

      const chapter = course.chapters.find((ch: any) => ch._id.toString() === chapterId);
      if (!chapter) {
        throw new Error('Chapter not found');
      }

      const chapterIndex = course.chapters.findIndex((ch: any) => ch._id.toString() === chapterId);
      if (chapterIndex !== -1) {
        course.chapters.splice(chapterIndex, 1);
      }
      await course.incrementVersion();
      await course.save();

      return course;
    } catch (error: any) {
      throw new Error(`Failed to delete chapter: ${error.message}`);
    }
  }

  // =============================================================================
  // SECTION MANAGEMENT
  // =============================================================================

  async addSection(
    courseId: string,
    chapterId: string,
    sectionData: CreateSectionRequest,
    userId: string,
    userRole: UserRole,
  ): Promise<CourseDocument | null> {
    try {
      const course = await CourseModel.findById(courseId);
      if (!course) {
        return null;
      }

      if (!(await this.canModifyCourse(course._id.toString(), userId, userRole))) {
        throw new Error('Insufficient permissions to modify this course');
      }

      const chapter = course.chapters.find((ch: any) => ch._id.toString() === chapterId);
      if (!chapter) {
        throw new Error('Chapter not found');
      }

      const newSection = {
        title: sectionData.title,
        description: sectionData.description,
        order: sectionData.order,
        content: [],
        isPublished: false,
        estimatedDuration: 0,
      };

      chapter.sections.push(newSection as any);
      await course.incrementVersion();
      await course.save();

      return course;
    } catch (error: any) {
      throw new Error(`Failed to add section: ${error.message}`);
    }
  }

  async updateSection(
    courseId: string,
    chapterId: string,
    sectionId: string,
    updateData: UpdateSectionRequest,
    userId: string,
    userRole: UserRole,
  ): Promise<CourseDocument | null> {
    try {
      const course = await CourseModel.findById(courseId);
      if (!course) {
        return null;
      }

      if (!(await this.canModifyCourse(course._id.toString(), userId, userRole))) {
        throw new Error('Insufficient permissions to modify this course');
      }

      const chapter = course.chapters.find((ch: any) => ch._id.toString() === chapterId);
      if (!chapter) {
        throw new Error('Chapter not found');
      }

      const section = chapter.sections.find((sec: any) => sec._id.toString() === sectionId);
      if (!section) {
        throw new Error('Section not found');
      }

      Object.assign(section, updateData);
      await course.incrementVersion();
      await course.save();

      return course;
    } catch (error: any) {
      throw new Error(`Failed to update section: ${error.message}`);
    }
  }

  // =============================================================================
  // CONTENT MANAGEMENT
  // =============================================================================

  async addContent(
    courseId: string,
    chapterId: string,
    sectionId: string,
    contentData: CreateContentRequest,
    userId: string,
    userRole: UserRole,
  ): Promise<CourseDocument | null> {
    try {
      const course = await CourseModel.findById(courseId);
      if (!course) {
        return null;
      }

      if (!(await this.canModifyCourse(course._id.toString(), userId, userRole))) {
        throw new Error('Insufficient permissions to modify this course');
      }

      const chapter = course.chapters.find((ch: any) => ch._id.toString() === chapterId);
      if (!chapter) {
        throw new Error('Chapter not found');
      }

      const section = chapter.sections.find((sec: any) => sec._id.toString() === sectionId);
      if (!section) {
        throw new Error('Section not found');
      }

      const newContent = {
        type: contentData.type,
        title: contentData.title,
        order: contentData.order,
        data: contentData.data,
        isPublished: false,
      };

      section.content.push(newContent as any);
      await course.incrementVersion();
      await course.save();

      return course;
    } catch (error: any) {
      throw new Error(`Failed to add content: ${error.message}`);
    }
  }

  async updateContent(
    courseId: string,
    chapterId: string,
    sectionId: string,
    contentId: string,
    updateData: UpdateContentRequest,
    userId: string,
    userRole: UserRole,
  ): Promise<CourseDocument | null> {
    try {
      const course = await CourseModel.findById(courseId);
      if (!course) {
        return null;
      }

      if (!(await this.canModifyCourse(course._id.toString(), userId, userRole))) {
        throw new Error('Insufficient permissions to modify this course');
      }

      const chapter = course.chapters.find((ch: any) => ch._id.toString() === chapterId);
      if (!chapter) {
        throw new Error('Chapter not found');
      }

      const section = chapter.sections.find((sec: any) => sec._id.toString() === sectionId);
      if (!section) {
        throw new Error('Section not found');
      }

      const content = section.content.find((cont: any) => cont._id.toString() === contentId);
      if (!content) {
        throw new Error('Content not found');
      }

      Object.assign(content, updateData);
      await course.incrementVersion();
      await course.save();

      return course;
    } catch (error: any) {
      throw new Error(`Failed to update content: ${error.message}`);
    }
  }

  // =============================================================================
  // COURSE ACCESS VIA PROMOTIONS
  // =============================================================================

  async checkCourseAccess(courseId: string, userId: string, userRole: UserRole): Promise<boolean> {
    try {
      // Admin and staff always have access
      if (userRole === 'admin' || userRole === 'staff') {
        return true;
      }

      // Teachers have access to courses they created or are assigned to
      if (userRole === 'teacher') {
        const course = await CourseModel.findById(courseId);
        if (course && course.instructor._id.toString() === userId) {
          return true;
        }
        
        // Check if teacher is assigned to any events linked to this course
        const events = await EventModel.find({
          linkedCourse: courseId,
          teacherId: userId,
        });
        return events.length > 0;
      }

      // Students access courses through their promotion
      if (userRole === 'student') {
        const user = await UserModel.findById(userId);
        if (!user || !user.currentPromotionId) {
          return false;
        }

        // Check if the course is linked to any events in the student's promotion
        const events = await EventModel.find({
          linkedCourse: courseId,
          promotionIds: user.currentPromotionId,
        });
        return events.length > 0;
      }

      return false;
    } catch (error: any) {
      logger.error(`Failed to check course access for user ${userId} on course ${courseId}:`, error);
      return false;
    }
  }

  async getAccessibleCourses(userId: string, userRole: UserRole): Promise<CourseDocument[]> {
    try {
      // Admin and staff can access all courses
      if (userRole === 'admin' || userRole === 'staff') {
        return await CourseModel.find({}).sort({ createdAt: -1 });
      }

      // Teachers get courses they created or are assigned to teach
      if (userRole === 'teacher') {
        // Get courses created by teacher
        const ownCourses = await CourseModel.findByInstructor(userId);
        
        // Get courses they're assigned to teach via events
        const assignedEvents = await EventModel.find({ teacherId: userId });
        const assignedCourseIds = assignedEvents
          .map(event => event.linkedCourse)
          .filter(courseId => courseId);
        
        const assignedCourses = assignedCourseIds.length > 0 
          ? await CourseModel.find({ _id: { $in: assignedCourseIds } })
          : [];
        
        // Combine and deduplicate
        const allCourses = [...ownCourses, ...assignedCourses];
        const uniqueCourses = allCourses.filter((course, index, self) =>
          index === self.findIndex(c => c._id.toString() === course._id.toString())
        );
        
        return uniqueCourses;
      }

      // Students get courses through their promotion events
      if (userRole === 'student') {
        const user = await UserModel.findById(userId);
        if (!user || !user.currentPromotionId) {
          return [];
        }

        // Get events in the student's promotion that have linked courses
        const promotionEvents = await EventModel.find({
          promotionIds: user.currentPromotionId,
          linkedCourse: { $exists: true, $ne: null },
        });

        const courseIds = promotionEvents.map(event => event.linkedCourse);
        if (courseIds.length === 0) {
          return [];
        }

        return await CourseModel.find({ _id: { $in: courseIds } }).sort({ createdAt: -1 });
      }

      return [];
    } catch (error: any) {
      logger.error(`Failed to get accessible courses for user ${userId}:`, error);
      return [];
    }
  }

  // =============================================================================
  // EXERCISE SUBMISSIONS
  // =============================================================================

  // NOTE: Exercise submission functionality moved to promotion-based system
  // Submissions are now handled through promotion events and separate submission service

  // =============================================================================
  // EXERCISE EVALUATION
  // =============================================================================

  // NOTE: Exercise evaluation moved to promotion-based system

  // =============================================================================
  // HELPER METHODS
  // =============================================================================

  private async canModifyCourse(courseId: string, userId: string, userRole: UserRole): Promise<boolean> {
    try {
      // Admin and staff can modify any course
      if (userRole === 'admin' || userRole === 'staff') {
        return true;
      }

      // Teachers can only modify their own courses
      if (userRole === 'teacher') {
        const course = await CourseModel.findById(courseId);
        return course?.instructor?._id?.toString() === userId;
      }

      return false;
    } catch (error: any) {
      logger.error(`Error checking course modification permission: ${error.message}`);
      return false;
    }
  }
}
