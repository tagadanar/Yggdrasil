// packages/api-services/course-service/src/services/CourseService.ts
// Business logic for course management

import { 
  CourseModel, 
  CourseEnrollmentModel, 
  ExerciseSubmissionModel,
  type CourseDocument,
  type CourseEnrollmentDocument,
  type ExerciseSubmissionDocument
} from '@yggdrasil/database-schemas';
import { 
  Course, 
  CreateCourseRequest, 
  UpdateCourseRequest,
  CreateChapterRequest,
  UpdateChapterRequest,
  CreateSectionRequest,
  UpdateSectionRequest,
  CreateContentRequest,
  UpdateContentRequest,
  CreateExerciseRequest,
  SubmitExerciseRequest,
  CourseFilters,
  CourseSearchResult,
  UserRole
} from '@yggdrasil/shared-utilities';
import { ResponseHelper } from '@yggdrasil/shared-utilities';

export class CourseService {
  // =============================================================================
  // COURSE CRUD OPERATIONS
  // =============================================================================

  async createCourse(
    instructorId: string, 
    instructorName: string, 
    instructorEmail: string, 
    courseData: CreateCourseRequest
  ): Promise<CourseDocument> {
    try {
      // Convert string dates to Date objects if they exist
      const processedSettings = courseData.settings ? {
        ...courseData.settings,
        startDate: courseData.settings.startDate ? new Date(courseData.settings.startDate) : undefined,
        endDate: courseData.settings.endDate ? new Date(courseData.settings.endDate) : undefined
      } : undefined;

      const course = new CourseModel({
        ...courseData,
        settings: processedSettings,
        instructor: {
          _id: instructorId,
          name: instructorName,
          email: instructorEmail
        },
        chapters: [],
        resources: [],
        collaborators: []
      });

      // Generate slug from title
      course.slug = course.generateSlug();
      
      // Ensure slug is unique
      let slugCounter = 1;
      let originalSlug = course.slug;
      while (await CourseModel.findBySlug(course.slug)) {
        course.slug = `${originalSlug}-${slugCounter}`;
        slugCounter++;
      }

      await course.save();
      return course;
    } catch (error: any) {
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
    userRole: UserRole
  ): Promise<CourseDocument | null> {
    try {
      const course = await CourseModel.findById(courseId);
      if (!course) {
        return null;
      }

      // Check permissions
      if (!this.canModifyCourse(course, userId, userRole)) {
        throw new Error('Insufficient permissions to modify this course');
      }

      // Convert string dates to Date objects if they exist
      const processedUpdateData = { ...updateData };
      if (processedUpdateData.settings) {
        processedUpdateData.settings = {
          ...processedUpdateData.settings,
          startDate: processedUpdateData.settings.startDate ? new Date(processedUpdateData.settings.startDate) : undefined,
          endDate: processedUpdateData.settings.endDate ? new Date(processedUpdateData.settings.endDate) : undefined
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
      if (!this.canModifyCourse(course, userId, userRole)) {
        throw new Error('Insufficient permissions to delete this course');
      }

      await CourseModel.findByIdAndDelete(courseId);
      
      // Clean up related data
      await CourseEnrollmentModel.deleteMany({ courseId });
      
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
      console.log('CourseService.searchCourses called with filters:', JSON.stringify(filters, null, 2));
      const { search, page = 1, limit = 20, ...otherFilters } = filters;
      const skip = (page - 1) * limit;

      console.log('Calling CourseModel.searchCourses with:', { search: search || '', otherFilters });
      const courses = await CourseModel.searchCourses(search || '', otherFilters)
        .skip(skip)
        .limit(limit);

      const total = await CourseModel.countDocuments({
        status: 'published',
        'settings.isPublic': true,
        ...(otherFilters.category && { category: otherFilters.category }),
        ...(otherFilters.level && { level: otherFilters.level }),
        ...(otherFilters.instructor && { 'instructor._id': otherFilters.instructor }),
        ...(otherFilters.tags && { tags: { $in: otherFilters.tags } })
      });

      console.log('CourseService.searchCourses completed successfully');
      return {
        courses,
        total,
        page,
        limit,
        filters
      };
    } catch (error: any) {
      console.error('CourseService.searchCourses error:', error);
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
    userRole: UserRole
  ): Promise<CourseDocument | null> {
    try {
      const course = await CourseModel.findById(courseId);
      if (!course) {
        return null;
      }

      if (!this.canModifyCourse(course, userId, userRole)) {
        throw new Error('Insufficient permissions to modify this course');
      }

      const newChapter = {
        title: chapterData.title,
        description: chapterData.description,
        order: chapterData.order,
        sections: [],
        isPublished: false,
        estimatedDuration: 0
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
    userRole: UserRole
  ): Promise<CourseDocument | null> {
    try {
      const course = await CourseModel.findById(courseId);
      if (!course) {
        return null;
      }

      if (!this.canModifyCourse(course, userId, userRole)) {
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
    userRole: UserRole
  ): Promise<CourseDocument | null> {
    try {
      const course = await CourseModel.findById(courseId);
      if (!course) {
        return null;
      }

      if (!this.canModifyCourse(course, userId, userRole)) {
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
    userRole: UserRole
  ): Promise<CourseDocument | null> {
    try {
      const course = await CourseModel.findById(courseId);
      if (!course) {
        return null;
      }

      if (!this.canModifyCourse(course, userId, userRole)) {
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
        estimatedDuration: 0
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
    userRole: UserRole
  ): Promise<CourseDocument | null> {
    try {
      const course = await CourseModel.findById(courseId);
      if (!course) {
        return null;
      }

      if (!this.canModifyCourse(course, userId, userRole)) {
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
    userRole: UserRole
  ): Promise<CourseDocument | null> {
    try {
      const course = await CourseModel.findById(courseId);
      if (!course) {
        return null;
      }

      if (!this.canModifyCourse(course, userId, userRole)) {
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
        isPublished: false
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
    userRole: UserRole
  ): Promise<CourseDocument | null> {
    try {
      const course = await CourseModel.findById(courseId);
      if (!course) {
        return null;
      }

      if (!this.canModifyCourse(course, userId, userRole)) {
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
  // COURSE ENROLLMENT
  // =============================================================================

  async enrollStudent(courseId: string, studentId: string): Promise<CourseEnrollmentDocument> {
    try {
      // Check if already enrolled
      const existingEnrollment = await CourseEnrollmentModel.findEnrollment(courseId, studentId);
      if (existingEnrollment) {
        throw new Error('Student is already enrolled in this course');
      }

      // Check if course allows enrollment
      const course = await CourseModel.findById(courseId);
      if (!course || course.status !== 'published' || !course.settings.allowEnrollment) {
        throw new Error('Course is not available for enrollment');
      }

      // Check enrollment limits
      if (course.settings.maxStudents) {
        const enrollmentCount = await CourseEnrollmentModel.countDocuments({ 
          courseId, 
          status: 'active' 
        });
        if (enrollmentCount >= course.settings.maxStudents) {
          throw new Error('Course has reached maximum enrollment capacity');
        }
      }

      const enrollment = new CourseEnrollmentModel({
        courseId,
        studentId,
        status: 'active'
      });

      await enrollment.save();

      // Update course stats
      course.stats.enrolledStudents += 1;
      await course.save();

      return enrollment;
    } catch (error: any) {
      throw new Error(`Failed to enroll student: ${error.message}`);
    }
  }

  async getStudentEnrollments(studentId: string): Promise<CourseEnrollmentDocument[]> {
    try {
      return await CourseEnrollmentModel.findByStudent(studentId);
    } catch (error: any) {
      throw new Error(`Failed to get student enrollments: ${error.message}`);
    }
  }

  async getCourseEnrollments(courseId: string): Promise<CourseEnrollmentDocument[]> {
    try {
      return await CourseEnrollmentModel.findByCourse(courseId);
    } catch (error: any) {
      throw new Error(`Failed to get course enrollments: ${error.message}`);
    }
  }

  // =============================================================================
  // EXERCISE SUBMISSIONS
  // =============================================================================

  async submitExercise(
    exerciseId: string, 
    studentId: string, 
    submissionData: SubmitExerciseRequest
  ): Promise<ExerciseSubmissionDocument> {
    try {
      const submission = new ExerciseSubmissionModel({
        exerciseId,
        studentId,
        code: submissionData.code,
        answer: submissionData.answer,
        files: submissionData.files || []
      });

      await submission.save();

      // TODO: Add exercise evaluation logic here
      // For now, we'll just save the submission without evaluation

      return submission;
    } catch (error: any) {
      throw new Error(`Failed to submit exercise: ${error.message}`);
    }
  }

  async getExerciseSubmissions(
    exerciseId: string, 
    studentId?: string
  ): Promise<ExerciseSubmissionDocument[]> {
    try {
      if (studentId) {
        return await ExerciseSubmissionModel.find({ exerciseId, studentId });
      }
      return await ExerciseSubmissionModel.findByExercise(exerciseId);
    } catch (error: any) {
      throw new Error(`Failed to get exercise submissions: ${error.message}`);
    }
  }

  // =============================================================================
  // PERMISSION HELPERS
  // =============================================================================

  private canModifyCourse(course: CourseDocument, userId: string, userRole: UserRole): boolean {
    // Admins can modify any course
    if (userRole === 'admin') {
      return true;
    }

    // Teachers and staff can modify courses they created or are collaborators on
    if (userRole === 'teacher' || userRole === 'staff') {
      // Check if user is the instructor
      if (course.instructor._id.toString() === userId) {
        return true;
      }

      // Check if user is a collaborator
      return course.collaborators.some(
        collaborator => collaborator._id.toString() === userId
      );
    }

    return false;
  }

  private canViewCourse(course: CourseDocument, userId: string, userRole: UserRole): boolean {
    // Public published courses can be viewed by anyone
    if (course.status === 'published' && course.settings.isPublic) {
      return true;
    }

    // Non-public courses require permission to modify or enrollment
    return this.canModifyCourse(course, userId, userRole);
  }
}