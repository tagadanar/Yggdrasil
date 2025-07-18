// packages/api-services/course-service/src/controllers/CourseController.ts
// HTTP request handlers for course management

import { Request, Response } from 'express';
import { CourseService } from '../services/CourseService';
import { ResponseHelper, HTTP_STATUS } from '@yggdrasil/shared-utilities';
import { 
  CreateCourseSchema,
  UpdateCourseSchema,
  CreateChapterSchema,
  UpdateChapterSchema,
  CreateSectionSchema,
  UpdateSectionSchema,
  CreateContentSchema,
  UpdateContentSchema,
  CreateExerciseSchema,
  SubmitExerciseSchema,
  CourseSearchSchema,
  EnrollCourseSchema,
  type AuthRequest
} from '@yggdrasil/shared-utilities';

export class CourseController {
  private courseService: CourseService;

  constructor() {
    this.courseService = new CourseService();
  }

  // =============================================================================
  // COURSE CRUD OPERATIONS
  // =============================================================================

  createCourse = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { user } = req;
      if (!user) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json(
          ResponseHelper.unauthorized('Authentication required')
        );
        return;
      }

      // Only teachers, staff, and admins can create courses
      if (!['teacher', 'staff', 'admin'].includes(user.role)) {
        res.status(HTTP_STATUS.FORBIDDEN).json(
          ResponseHelper.forbidden('Insufficient permissions to create courses')
        );
        return;
      }

      const validation = CreateCourseSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          ResponseHelper.badRequest('Invalid course data')
        );
        return;
      }

      const course = await this.courseService.createCourse(
        user.userId,
        `${user.profile?.firstName} ${user.profile?.lastName}`,
        user.email,
        validation.data as any
      );

      res.status(HTTP_STATUS.CREATED).json(
        ResponseHelper.success(course, 'Course created successfully')
      );
    } catch (error: any) {
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
        ResponseHelper.error('Failed to create course')
      );
    }
  };

  getCourse = async (req: Request, res: Response): Promise<void> => {
    try {
      const { courseId } = req.params;
      
      const course = await this.courseService.getCourseById(courseId);
      if (!course) {
        res.status(HTTP_STATUS.NOT_FOUND).json(
          ResponseHelper.notFound('Course')
        );
        return;
      }

      res.status(HTTP_STATUS.OK).json(
        ResponseHelper.success(course, 'Course retrieved successfully')
      );
    } catch (error: any) {
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
        ResponseHelper.error('Failed to retrieve course')
      );
    }
  };

  getCourseBySlug = async (req: Request, res: Response): Promise<void> => {
    try {
      const { slug } = req.params;
      
      const course = await this.courseService.getCourseBySlug(slug);
      if (!course) {
        res.status(HTTP_STATUS.NOT_FOUND).json(
          ResponseHelper.notFound('Course')
        );
        return;
      }

      res.status(HTTP_STATUS.OK).json(
        ResponseHelper.success(course, 'Course retrieved successfully')
      );
    } catch (error: any) {
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
        ResponseHelper.error('Failed to retrieve course')
      );
    }
  };

  updateCourse = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { user } = req;
      if (!user) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json(
          ResponseHelper.unauthorized('Authentication required')
        );
        return;
      }

      const { courseId } = req.params;
      
      const validation = UpdateCourseSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          ResponseHelper.badRequest('Invalid course data')
        );
        return;
      }

      const course = await this.courseService.updateCourse(
        courseId,
        validation.data as any,
        user.userId,
        user.role
      );

      if (!course) {
        res.status(HTTP_STATUS.NOT_FOUND).json(
          ResponseHelper.notFound('Course')
        );
        return;
      }

      res.status(HTTP_STATUS.OK).json(
        ResponseHelper.success(course, 'Course updated successfully')
      );
    } catch (error: any) {
      if (error.message.includes('Insufficient permissions')) {
        res.status(HTTP_STATUS.FORBIDDEN).json(
          ResponseHelper.forbidden(error.message)
        );
      } else {
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
          ResponseHelper.error('Failed to update course')
        );
      }
    }
  };

  deleteCourse = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { user } = req;
      if (!user) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json(
          ResponseHelper.unauthorized('Authentication required')
        );
        return;
      }

      const { courseId } = req.params;

      const success = await this.courseService.deleteCourse(courseId, user.userId, user.role);
      if (!success) {
        res.status(HTTP_STATUS.NOT_FOUND).json(
          ResponseHelper.notFound('Course')
        );
        return;
      }

      res.status(HTTP_STATUS.OK).json(
        ResponseHelper.success(null, 'Course deleted successfully')
      );
    } catch (error: any) {
      if (error.message.includes('Insufficient permissions')) {
        res.status(HTTP_STATUS.FORBIDDEN).json(
          ResponseHelper.forbidden(error.message)
        );
      } else {
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
          ResponseHelper.error('Failed to delete course')
        );
      }
    }
  };

  // =============================================================================
  // COURSE SEARCH AND LISTING
  // =============================================================================

  searchCourses = async (req: Request, res: Response): Promise<void> => {
    try {
      const validation = CourseSearchSchema.safeParse(req.query);
      if (!validation.success) {
        console.error('Validation error:', validation.error.issues);
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          ResponseHelper.badRequest('Invalid search parameters')
        );
        return;
      }

      const result = await this.courseService.searchCourses(validation.data);
      res.status(HTTP_STATUS.OK).json(
        ResponseHelper.success(result, 'Courses retrieved successfully')
      );
    } catch (error: any) {
      console.error('Course search error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
        ResponseHelper.error('Failed to search courses')
      );
    }
  };

  getPublishedCourses = async (req: Request, res: Response): Promise<void> => {
    try {
      const courses = await this.courseService.getPublishedCourses();
      res.status(HTTP_STATUS.OK).json(
        ResponseHelper.success(courses, 'Published courses retrieved successfully')
      );
    } catch (error: any) {
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
        ResponseHelper.error('Failed to retrieve courses')
      );
    }
  };

  getMyCourses = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { user } = req;
      if (!user) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json(
          ResponseHelper.unauthorized('Authentication required')
        );
        return;
      }

      if (user.role === 'student') {
        // For students, return enrolled courses
        const enrollments = await this.courseService.getStudentEnrollments(user.userId);
        res.status(HTTP_STATUS.OK).json(
          ResponseHelper.success(enrollments, 'Enrolled courses retrieved successfully')
        );
      } else {
        // For teachers/staff/admins, return courses they created
        const courses = await this.courseService.getCoursesByInstructor(user.userId);
        res.status(HTTP_STATUS.OK).json(
          ResponseHelper.success(courses, 'Your courses retrieved successfully')
        );
      }
    } catch (error: any) {
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
        ResponseHelper.error('Failed to retrieve courses')
      );
    }
  };

  // =============================================================================
  // CHAPTER MANAGEMENT
  // =============================================================================

  addChapter = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { user } = req;
      if (!user) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json(
          ResponseHelper.unauthorized('Authentication required')
        );
        return;
      }

      const { courseId } = req.params;
      const validation = CreateChapterSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          ResponseHelper.badRequest('Invalid chapter data')
        );
        return;
      }

      const course = await this.courseService.addChapter(
        courseId,
        validation.data,
        user.userId,
        user.role
      );

      if (!course) {
        res.status(HTTP_STATUS.NOT_FOUND).json(
          ResponseHelper.notFound('Course')
        );
        return;
      }

      res.status(HTTP_STATUS.CREATED).json(
        ResponseHelper.success(course, 'Chapter added successfully')
      );
    } catch (error: any) {
      if (error.message.includes('Insufficient permissions')) {
        res.status(HTTP_STATUS.FORBIDDEN).json(
          ResponseHelper.forbidden(error.message)
        );
      } else {
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
          ResponseHelper.error('Failed to add chapter')
        );
      }
    }
  };

  updateChapter = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { user } = req;
      if (!user) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json(
          ResponseHelper.unauthorized('Authentication required')
        );
        return;
      }

      const { courseId, chapterId } = req.params;
      const validation = UpdateChapterSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          ResponseHelper.badRequest('Invalid chapter data')
        );
        return;
      }

      const course = await this.courseService.updateChapter(
        courseId,
        chapterId,
        validation.data,
        user.userId,
        user.role
      );

      if (!course) {
        res.status(HTTP_STATUS.NOT_FOUND).json(
          ResponseHelper.notFound('Course or chapter')
        );
        return;
      }

      res.status(HTTP_STATUS.OK).json(
        ResponseHelper.success(course, 'Chapter updated successfully')
      );
    } catch (error: any) {
      if (error.message.includes('Insufficient permissions')) {
        res.status(HTTP_STATUS.FORBIDDEN).json(
          ResponseHelper.forbidden(error.message)
        );
      } else {
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
          ResponseHelper.error('Failed to update chapter')
        );
      }
    }
  };

  deleteChapter = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { user } = req;
      if (!user) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json(
          ResponseHelper.unauthorized('Authentication required')
        );
        return;
      }

      const { courseId, chapterId } = req.params;
      const course = await this.courseService.deleteChapter(
        courseId,
        chapterId,
        user.userId,
        user.role
      );

      if (!course) {
        res.status(HTTP_STATUS.NOT_FOUND).json(
          ResponseHelper.notFound('Course or chapter')
        );
        return;
      }

      res.status(HTTP_STATUS.OK).json(
        ResponseHelper.success(course, 'Chapter deleted successfully')
      );
    } catch (error: any) {
      if (error.message.includes('Insufficient permissions')) {
        res.status(HTTP_STATUS.FORBIDDEN).json(
          ResponseHelper.forbidden(error.message)
        );
      } else {
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
          ResponseHelper.error('Failed to delete chapter')
        );
      }
    }
  };

  // =============================================================================
  // SECTION MANAGEMENT
  // =============================================================================

  addSection = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { user } = req;
      if (!user) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json(
          ResponseHelper.unauthorized('Authentication required')
        );
        return;
      }

      const { courseId, chapterId } = req.params;
      const validation = CreateSectionSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          ResponseHelper.badRequest('Invalid section data')
        );
        return;
      }

      const course = await this.courseService.addSection(
        courseId,
        chapterId,
        validation.data,
        user.userId,
        user.role
      );

      if (!course) {
        res.status(HTTP_STATUS.NOT_FOUND).json(
          ResponseHelper.notFound('Course or chapter')
        );
        return;
      }

      res.status(HTTP_STATUS.CREATED).json(
        ResponseHelper.success(course, 'Section added successfully')
      );
    } catch (error: any) {
      if (error.message.includes('Insufficient permissions')) {
        res.status(HTTP_STATUS.FORBIDDEN).json(
          ResponseHelper.forbidden(error.message)
        );
      } else {
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
          ResponseHelper.error('Failed to add section')
        );
      }
    }
  };

  updateSection = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { user } = req;
      if (!user) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json(
          ResponseHelper.unauthorized('Authentication required')
        );
        return;
      }

      const { courseId, chapterId, sectionId } = req.params;
      const validation = UpdateSectionSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          ResponseHelper.badRequest('Invalid section data')
        );
        return;
      }

      const course = await this.courseService.updateSection(
        courseId,
        chapterId,
        sectionId,
        validation.data,
        user.userId,
        user.role
      );

      if (!course) {
        res.status(HTTP_STATUS.NOT_FOUND).json(
          ResponseHelper.notFound('Course, chapter, or section')
        );
        return;
      }

      res.status(HTTP_STATUS.OK).json(
        ResponseHelper.success(course, 'Section updated successfully')
      );
    } catch (error: any) {
      if (error.message.includes('Insufficient permissions')) {
        res.status(HTTP_STATUS.FORBIDDEN).json(
          ResponseHelper.forbidden(error.message)
        );
      } else {
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
          ResponseHelper.error('Failed to update section')
        );
      }
    }
  };

  // =============================================================================
  // CONTENT MANAGEMENT
  // =============================================================================

  addContent = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { user } = req;
      if (!user) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json(
          ResponseHelper.unauthorized('Authentication required')
        );
        return;
      }

      const { courseId, chapterId, sectionId } = req.params;
      const validation = CreateContentSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          ResponseHelper.badRequest('Invalid content data')
        );
        return;
      }

      const course = await this.courseService.addContent(
        courseId,
        chapterId,
        sectionId,
        validation.data,
        user.userId,
        user.role
      );

      if (!course) {
        res.status(HTTP_STATUS.NOT_FOUND).json(
          ResponseHelper.notFound('Course, chapter, or section')
        );
        return;
      }

      res.status(HTTP_STATUS.CREATED).json(
        ResponseHelper.success(course, 'Content added successfully')
      );
    } catch (error: any) {
      if (error.message.includes('Insufficient permissions')) {
        res.status(HTTP_STATUS.FORBIDDEN).json(
          ResponseHelper.forbidden(error.message)
        );
      } else {
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
          ResponseHelper.error('Failed to add content')
        );
      }
    }
  };

  updateContent = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { user } = req;
      if (!user) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json(
          ResponseHelper.unauthorized('Authentication required')
        );
        return;
      }

      const { courseId, chapterId, sectionId, contentId } = req.params;
      const validation = UpdateContentSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          ResponseHelper.badRequest('Invalid content data')
        );
        return;
      }

      const course = await this.courseService.updateContent(
        courseId,
        chapterId,
        sectionId,
        contentId,
        validation.data,
        user.userId,
        user.role
      );

      if (!course) {
        res.status(HTTP_STATUS.NOT_FOUND).json(
          ResponseHelper.notFound('Course, chapter, section, or content')
        );
        return;
      }

      res.status(HTTP_STATUS.OK).json(
        ResponseHelper.success(course, 'Content updated successfully')
      );
    } catch (error: any) {
      if (error.message.includes('Insufficient permissions')) {
        res.status(HTTP_STATUS.FORBIDDEN).json(
          ResponseHelper.forbidden(error.message)
        );
      } else {
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
          ResponseHelper.error('Failed to update content')
        );
      }
    }
  };

  // =============================================================================
  // ENROLLMENT MANAGEMENT
  // =============================================================================

  enrollCourse = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { user } = req;
      if (!user) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json(
          ResponseHelper.unauthorized('Authentication required')
        );
        return;
      }

      // Only students can enroll in courses
      if (user.role !== 'student') {
        res.status(HTTP_STATUS.FORBIDDEN).json(
          ResponseHelper.forbidden('Only students can enroll in courses')
        );
        return;
      }

      const validation = EnrollCourseSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          ResponseHelper.badRequest('Invalid enrollment data')
        );
        return;
      }

      const enrollment = await this.courseService.enrollStudent(
        validation.data.courseId,
        user.userId
      );

      res.status(HTTP_STATUS.CREATED).json(
        ResponseHelper.success(enrollment, 'Successfully enrolled in course')
      );
    } catch (error: any) {
      if (error.message.includes('already enrolled')) {
        res.status(HTTP_STATUS.CONFLICT).json(
          ResponseHelper.error('Student is already enrolled in this course')
        );
      } else if (error.message.includes('not available for enrollment')) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          ResponseHelper.error('Course is not available for enrollment')
        );
      } else if (error.message.includes('maximum enrollment capacity')) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          ResponseHelper.error('Course has reached maximum enrollment capacity')
        );
      } else {
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
          ResponseHelper.error('Failed to enroll in course')
        );
      }
    }
  };

  getCourseEnrollments = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { user } = req;
      if (!user) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json(
          ResponseHelper.unauthorized('Authentication required')
        );
        return;
      }

      const { courseId } = req.params;
      
      // Check if user can view enrollments (instructors and admins only)
      if (!['teacher', 'staff', 'admin'].includes(user.role)) {
        res.status(HTTP_STATUS.FORBIDDEN).json(
          ResponseHelper.forbidden('Insufficient permissions to view enrollments')
        );
        return;
      }

      const enrollments = await this.courseService.getCourseEnrollments(courseId);
      res.status(HTTP_STATUS.OK).json(
        ResponseHelper.success(enrollments, 'Course enrollments retrieved successfully')
      );
    } catch (error: any) {
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
        ResponseHelper.error('Failed to retrieve course enrollments')
      );
    }
  };

  // =============================================================================
  // EXERCISE MANAGEMENT
  // =============================================================================

  submitExercise = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { user } = req;
      if (!user) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json(
          ResponseHelper.unauthorized('Authentication required')
        );
        return;
      }

      // Only students can submit exercises
      if (user.role !== 'student') {
        res.status(HTTP_STATUS.FORBIDDEN).json(
          ResponseHelper.forbidden('Only students can submit exercises')
        );
        return;
      }

      const { exerciseId } = req.params;
      const validation = SubmitExerciseSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          ResponseHelper.badRequest('Invalid exercise submission data')
        );
        return;
      }

      const submission = await this.courseService.submitExercise(
        exerciseId,
        user.userId,
        validation.data
      );

      res.status(HTTP_STATUS.CREATED).json(
        ResponseHelper.success(submission, 'Exercise submitted successfully')
      );
    } catch (error: any) {
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
        ResponseHelper.error('Failed to submit exercise')
      );
    }
  };

  getExerciseSubmissions = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { user } = req;
      if (!user) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json(
          ResponseHelper.unauthorized('Authentication required')
        );
        return;
      }

      const { exerciseId } = req.params;
      
      let submissions;
      if (user.role === 'student') {
        // Students can only see their own submissions
        submissions = await this.courseService.getExerciseSubmissions(exerciseId, user.userId);
      } else if (['teacher', 'staff', 'admin'].includes(user.role)) {
        // Teachers/staff/admins can see all submissions
        submissions = await this.courseService.getExerciseSubmissions(exerciseId);
      } else {
        res.status(HTTP_STATUS.FORBIDDEN).json(
          ResponseHelper.forbidden('Insufficient permissions to view submissions')
        );
        return;
      }

      res.status(HTTP_STATUS.OK).json(
        ResponseHelper.success(submissions, 'Exercise submissions retrieved successfully')
      );
    } catch (error: any) {
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
        ResponseHelper.error('Failed to retrieve exercise submissions')
      );
    }
  };
}