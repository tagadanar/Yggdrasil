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
  ValidationError,
  NotFoundError,
  AuthorizationError,
  ConflictError,
  DatabaseError,
  courseLogger as logger,
} from '@yggdrasil/shared-utilities';

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
      const processedSettings = courseData.settings
        ? {
            ...courseData.settings,
            startDate: courseData.settings.startDate
              ? new Date(courseData.settings.startDate)
              : undefined,
            endDate: courseData.settings.endDate
              ? new Date(courseData.settings.endDate)
              : undefined,
          }
        : undefined;

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
        course.slug =
          courseData.title
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '') +
          '-' +
          Date.now();
      }

      logger.info(`Generated slug: ${course.slug}`);

      logger.info('Checking slug uniqueness...');
      // Optimized unique slug generation - find existing similar slugs in single query
      const baseSlug = course.slug;
      const existingSlugs = await CourseModel.find(
        {
          slug: { $regex: `^${baseSlug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(-\\d+)?$` },
        },
        { slug: 1 },
      ).lean();

      if (existingSlugs.length > 0) {
        const slugNumbers = existingSlugs
          .map(doc => {
            const match = doc.slug.match(
              new RegExp(`^${baseSlug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}-(\\d+)$`),
            );
            return match && match[1] ? parseInt(match[1], 10) : 0;
          })
          .filter(num => !isNaN(num));

        const maxNumber = slugNumbers.length > 0 ? Math.max(...slugNumbers) : 0;
        const exactMatch = existingSlugs.some(doc => doc.slug === baseSlug);

        if (exactMatch || maxNumber > 0) {
          course.slug = `${baseSlug}-${maxNumber + 1}`;
        }
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
        const validationErrors = Object.keys(error.errors).map(key => ({
          field: key,
          message: error.errors[key].message,
          value: error.errors[key].value,
        }));
        throw new ValidationError(validationErrors);
      }

      if (error.code === 11000) {
        throw new ConflictError('Course with this title or slug already exists', {
          operation: 'createCourse',
          duplicateField: Object.keys(error.keyPattern || {})[0],
        });
      }

      throw new DatabaseError('createCourse', error);
    }
  }

  async getCourseById(courseId: string): Promise<CourseDocument | null> {
    try {
      return await CourseModel.findById(courseId);
    } catch (error: any) {
      throw new DatabaseError('getCourseById', error);
    }
  }

  async getCourseBySlug(slug: string): Promise<CourseDocument | null> {
    try {
      return await CourseModel.findBySlug(slug);
    } catch (error: any) {
      throw new DatabaseError('getCourseBySlug', error);
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
        throw new AuthorizationError('Insufficient permissions to modify this course', {
          operation: 'updateCourse',
          courseId,
          userId,
          userRole,
        });
      }

      // Convert string dates to Date objects if they exist
      const processedUpdateData = { ...updateData };
      if (processedUpdateData.settings) {
        processedUpdateData.settings = {
          ...processedUpdateData.settings,
          startDate: processedUpdateData.settings.startDate
            ? new Date(processedUpdateData.settings.startDate)
            : undefined,
          endDate: processedUpdateData.settings.endDate
            ? new Date(processedUpdateData.settings.endDate)
            : undefined,
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
      // Re-throw AppErrors without wrapping
      if (error.isOperational) {
        throw error;
      }
      throw new DatabaseError('updateCourse', error);
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
        throw new AuthorizationError('Insufficient permissions to delete this course', {
          operation: 'deleteCourse',
          courseId,
          userId,
          userRole,
        });
      }

      await CourseModel.findByIdAndDelete(courseId);

      // Clean up related data is handled by promotion system

      return true;
    } catch (error: any) {
      // Re-throw AppErrors without wrapping
      if (error.isOperational) {
        throw error;
      }
      throw new DatabaseError('deleteCourse', error);
    }
  }

  // =============================================================================
  // COURSE SEARCH AND LISTING
  // =============================================================================

  async searchCourses(filters: CourseFilters): Promise<CourseSearchResult> {
    try {
      logger.info(
        'CourseService.searchCourses called with filters:',
        JSON.stringify(filters, null, 2),
      );
      const { search, page = 1, limit = 20, ...otherFilters } = filters;
      const skip = (page - 1) * limit;

      logger.info('Calling CourseModel.searchCourses with:', {
        search: search || '',
        otherFilters,
      });
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
      throw new DatabaseError('searchCourses', error);
    }
  }

  async getCoursesByInstructor(instructorId: string): Promise<CourseDocument[]> {
    try {
      return await CourseModel.findByInstructor(instructorId);
    } catch (error: any) {
      throw new DatabaseError('getCoursesByInstructor', error);
    }
  }

  async getPublishedCourses(): Promise<CourseDocument[]> {
    try {
      return await CourseModel.findPublished();
    } catch (error: any) {
      throw new DatabaseError('getPublishedCourses', error);
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
        throw new AuthorizationError('Insufficient permissions to modify this course', {
          operation: 'addChapter',
          courseId,
          userId,
          userRole,
        });
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
      // Re-throw AppErrors without wrapping
      if (error.isOperational) {
        throw error;
      }
      throw new DatabaseError('addChapter', error);
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
        throw new AuthorizationError('Insufficient permissions to modify this course', {
          operation: 'modifyCourse',
          courseId,
          userId,
          userRole,
        });
      }

      const chapter = course.chapters.find((ch: any) => ch._id.toString() === chapterId);
      if (!chapter) {
        throw new NotFoundError('Chapter', chapterId);
      }

      Object.assign(chapter, updateData);
      await course.incrementVersion();
      await course.save();

      return course;
    } catch (error: any) {
      // Re-throw AppErrors without wrapping
      if (error.isOperational) {
        throw error;
      }
      throw new DatabaseError('updateChapter', error);
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
        throw new AuthorizationError('Insufficient permissions to modify this course', {
          operation: 'modifyCourse',
          courseId,
          userId,
          userRole,
        });
      }

      const chapter = course.chapters.find((ch: any) => ch._id.toString() === chapterId);
      if (!chapter) {
        throw new NotFoundError('Chapter', chapterId);
      }

      const chapterIndex = course.chapters.findIndex((ch: any) => ch._id.toString() === chapterId);
      if (chapterIndex !== -1) {
        course.chapters.splice(chapterIndex, 1);
      }
      await course.incrementVersion();
      await course.save();

      return course;
    } catch (error: any) {
      // Re-throw AppErrors without wrapping
      if (error.isOperational) {
        throw error;
      }
      throw new DatabaseError('deleteChapter', error);
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
        throw new AuthorizationError('Insufficient permissions to modify this course', {
          operation: 'modifyCourse',
          courseId,
          userId,
          userRole,
        });
      }

      const chapter = course.chapters.find((ch: any) => ch._id.toString() === chapterId);
      if (!chapter) {
        throw new NotFoundError('Chapter', chapterId);
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
      // Re-throw AppErrors without wrapping
      if (error.isOperational) {
        throw error;
      }
      throw new DatabaseError('addSection', error);
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
        throw new AuthorizationError('Insufficient permissions to modify this course', {
          operation: 'modifyCourse',
          courseId,
          userId,
          userRole,
        });
      }

      const chapter = course.chapters.find((ch: any) => ch._id.toString() === chapterId);
      if (!chapter) {
        throw new NotFoundError('Chapter', chapterId);
      }

      const section = chapter.sections.find((sec: any) => sec._id.toString() === sectionId);
      if (!section) {
        throw new NotFoundError('Section', sectionId);
      }

      Object.assign(section, updateData);
      await course.incrementVersion();
      await course.save();

      return course;
    } catch (error: any) {
      // Re-throw AppErrors without wrapping
      if (error.isOperational) {
        throw error;
      }
      throw new DatabaseError('updateSection', error);
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
        throw new AuthorizationError('Insufficient permissions to modify this course', {
          operation: 'modifyCourse',
          courseId,
          userId,
          userRole,
        });
      }

      const chapter = course.chapters.find((ch: any) => ch._id.toString() === chapterId);
      if (!chapter) {
        throw new NotFoundError('Chapter', chapterId);
      }

      const section = chapter.sections.find((sec: any) => sec._id.toString() === sectionId);
      if (!section) {
        throw new NotFoundError('Section', sectionId);
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
      // Re-throw AppErrors without wrapping
      if (error.isOperational) {
        throw error;
      }
      throw new DatabaseError('addContent', error);
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
        throw new AuthorizationError('Insufficient permissions to modify this course', {
          operation: 'modifyCourse',
          courseId,
          userId,
          userRole,
        });
      }

      const chapter = course.chapters.find((ch: any) => ch._id.toString() === chapterId);
      if (!chapter) {
        throw new NotFoundError('Chapter', chapterId);
      }

      const section = chapter.sections.find((sec: any) => sec._id.toString() === sectionId);
      if (!section) {
        throw new NotFoundError('Section', sectionId);
      }

      const content = section.content.find((cont: any) => cont._id.toString() === contentId);
      if (!content) {
        throw new NotFoundError('Content', contentId);
      }

      Object.assign(content, updateData);
      await course.incrementVersion();
      await course.save();

      return course;
    } catch (error: any) {
      // Re-throw AppErrors without wrapping
      if (error.isOperational) {
        throw error;
      }
      throw new DatabaseError('updateContent', error);
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
        logger.info(`DEBUG: checkCourseAccess - courseId: ${courseId}, userId: ${userId}`);
        if (course) {
          logger.info(`DEBUG: Found course - title: ${course.title}`);
          logger.info(`DEBUG: Course instructor._id: ${course.instructor._id.toString()}`);
          logger.info(`DEBUG: User userId: ${userId}`);
          logger.info(
            `DEBUG: ID comparison: '${course.instructor._id.toString()}' === '${userId}'`,
          );
          logger.info(`DEBUG: ID match result: ${course.instructor._id.toString() === userId}`);
          logger.info('DEBUG: Course instructor object:', JSON.stringify(course.instructor));

          if (course.instructor._id.toString() === userId) {
            logger.info('DEBUG: ID match confirmed - returning true for instructor access');
            return true;
          }
        } else {
          logger.warn(`DEBUG: Course not found: ${courseId}`);
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
        // Optimized: Single aggregation to check user promotion and course access
        const hasAccess = await UserModel.aggregate([
          { $match: { _id: userId } },
          { $limit: 1 },
          {
            $lookup: {
              from: 'events',
              let: {
                promotionId: '$currentPromotionId',
                targetCourseId: courseId,
              },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [
                        { $eq: ['$linkedCourse', '$$targetCourseId'] },
                        { $in: ['$$promotionId', '$promotionIds'] },
                      ],
                    },
                  },
                },
                { $limit: 1 },
              ],
              as: 'accessEvents',
            },
          },
          {
            $project: {
              hasAccess: { $gt: [{ $size: '$accessEvents' }, 0] },
            },
          },
        ]);

        return hasAccess.length > 0 && hasAccess[0].hasAccess;
      }

      return false;
    } catch (error: any) {
      logger.error(
        `Failed to check course access for user ${userId} on course ${courseId}:`,
        error,
      );
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
        // Optimized: Get assigned course IDs first, then query all courses in single operation
        const [assignedEvents] = await Promise.all([
          EventModel.find({ teacherId: userId }, { linkedCourse: 1 }).lean(),
        ]);

        const assignedCourseIds = assignedEvents
          .map(event => event.linkedCourse)
          .filter(courseId => courseId);

        // Single query to get all teacher courses (owned + assigned)
        const allCourseIds = [...assignedCourseIds];
        const courseQuery = {
          $or: [
            { 'instructor._id': userId }, // Courses created by teacher
            ...(allCourseIds.length > 0 ? [{ _id: { $in: allCourseIds } }] : []), // Assigned courses
          ],
        };

        return await CourseModel.find(courseQuery).sort({ createdAt: -1 });
      }

      // Students get courses through their promotion events
      if (userRole === 'student') {
        // Optimized: Single aggregation pipeline to get user and their courses
        const userWithCourses = await UserModel.aggregate([
          { $match: { _id: userId } },
          { $limit: 1 },
          {
            $lookup: {
              from: 'events',
              let: { promotionId: '$currentPromotionId' },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [
                        { $in: ['$$promotionId', '$promotionIds'] },
                        { $ne: ['$linkedCourse', null] },
                      ],
                    },
                  },
                },
                { $project: { linkedCourse: 1 } },
              ],
              as: 'events',
            },
          },
          {
            $project: {
              courseIds: {
                $map: {
                  input: '$events',
                  as: 'event',
                  in: '$$event.linkedCourse',
                },
              },
            },
          },
        ]);

        if (userWithCourses.length === 0 || !userWithCourses[0].courseIds.length) {
          return [];
        }

        return await CourseModel.find({
          _id: { $in: userWithCourses[0].courseIds },
        }).sort({ createdAt: -1 });
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

  private async canModifyCourse(
    courseId: string,
    userId: string,
    userRole: UserRole,
  ): Promise<boolean> {
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
