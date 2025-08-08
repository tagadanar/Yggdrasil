// packages/api-services/course-service/src/controllers/CourseController.ts
// HTTP request handlers for course management

import { Request, Response } from 'express';
import { CourseService } from '../services/CourseService';
import { ResponseHelper, HTTP_STATUS, courseLogger as logger } from '@yggdrasil/shared-utilities';
import {
  CreateCourseSchema,
  UpdateCourseSchema,
  CreateChapterSchema,
  UpdateChapterSchema,
  CreateSectionSchema,
  UpdateSectionSchema,
  CreateContentSchema,
  UpdateContentSchema,
  CourseSearchSchema,
  type AuthRequest,
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
    const { user } = req;
    let validation: any = null;

    try {
      if (!user) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json(
          ResponseHelper.unauthorized('Authentication required'),
        );
        return;
      }

      // Only teachers, staff, and admins can create courses
      if (!['teacher', 'staff', 'admin'].includes(user.role)) {
        res.status(HTTP_STATUS.FORBIDDEN).json(
          ResponseHelper.forbidden('Insufficient permissions to create courses'),
        );
        return;
      }

      validation = CreateCourseSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          ResponseHelper.badRequest('Invalid course data'),
        );
        return;
      }

      const course = await this.courseService.createCourse(
        user.userId,
        `${user.profile?.firstName} ${user.profile?.lastName}`,
        user.email,
        validation.data as any,
      );

      res.status(HTTP_STATUS.CREATED).json(
        ResponseHelper.success(course, 'Course created successfully'),
      );
    } catch (error: any) {
      logger.error('Course creation error:', {
        message: error.message,
        stack: error.stack,
        userId: user?.userId,
        courseData: validation?.data,
      });

      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
        ResponseHelper.error(`Failed to create course: ${error.message}`),
      );
    }
  };

  getCourse = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { user } = req;
      if (!user) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json(
          ResponseHelper.unauthorized('Authentication required'),
        );
        return;
      }

      const { courseId } = req.params;

      // Check if user has access to this course
      const hasAccess = await this.courseService.checkCourseAccess(courseId!, user.userId, user.role);
      if (!hasAccess) {
        res.status(HTTP_STATUS.FORBIDDEN).json(
          ResponseHelper.forbidden('You do not have access to this course'),
        );
        return;
      }

      const course = await this.courseService.getCourseById(courseId!);
      if (!course) {
        res.status(HTTP_STATUS.NOT_FOUND).json(
          ResponseHelper.notFound('Course'),
        );
        return;
      }

      res.status(HTTP_STATUS.OK).json(
        ResponseHelper.success(course, 'Course retrieved successfully'),
      );
    } catch (error: any) {
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
        ResponseHelper.error('Failed to retrieve course'),
      );
    }
  };

  getCourseBySlug = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { user } = req;
      if (!user) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json(
          ResponseHelper.unauthorized('Authentication required'),
        );
        return;
      }

      const { slug } = req.params;

      const course = await this.courseService.getCourseBySlug(slug!);
      if (!course) {
        res.status(HTTP_STATUS.NOT_FOUND).json(
          ResponseHelper.notFound('Course'),
        );
        return;
      }

      // Check if user has access to this course
      const hasAccess = await this.courseService.checkCourseAccess(course._id.toString(), user.userId, user.role);
      if (!hasAccess) {
        res.status(HTTP_STATUS.FORBIDDEN).json(
          ResponseHelper.forbidden('You do not have access to this course'),
        );
        return;
      }

      res.status(HTTP_STATUS.OK).json(
        ResponseHelper.success(course, 'Course retrieved successfully'),
      );
    } catch (error: any) {
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
        ResponseHelper.error('Failed to retrieve course'),
      );
    }
  };

  updateCourse = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { user } = req;
      if (!user) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json(
          ResponseHelper.unauthorized('Authentication required'),
        );
        return;
      }

      const { courseId } = req.params;

      const validation = UpdateCourseSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          ResponseHelper.badRequest('Invalid course data'),
        );
        return;
      }

      const course = await this.courseService.updateCourse(
        courseId!,
        validation.data as any,
        user.userId,
        user.role,
      );

      if (!course) {
        res.status(HTTP_STATUS.NOT_FOUND).json(
          ResponseHelper.notFound('Course'),
        );
        return;
      }

      res.status(HTTP_STATUS.OK).json(
        ResponseHelper.success(course, 'Course updated successfully'),
      );
    } catch (error: any) {
      if (error.message.includes('Insufficient permissions')) {
        res.status(HTTP_STATUS.FORBIDDEN).json(
          ResponseHelper.forbidden(error.message),
        );
      } else {
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
          ResponseHelper.error('Failed to update course'),
        );
      }
    }
  };

  deleteCourse = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { user } = req;
      if (!user) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json(
          ResponseHelper.unauthorized('Authentication required'),
        );
        return;
      }

      const { courseId } = req.params;

      const success = await this.courseService.deleteCourse(courseId!, user.userId, user.role);
      if (!success) {
        res.status(HTTP_STATUS.NOT_FOUND).json(
          ResponseHelper.notFound('Course'),
        );
        return;
      }

      res.status(HTTP_STATUS.OK).json(
        ResponseHelper.success(null, 'Course deleted successfully'),
      );
    } catch (error: any) {
      if (error.message.includes('Insufficient permissions')) {
        res.status(HTTP_STATUS.FORBIDDEN).json(
          ResponseHelper.forbidden(error.message),
        );
      } else {
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
          ResponseHelper.error('Failed to delete course'),
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
        logger.error('Validation error:', validation.error.issues);
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          ResponseHelper.badRequest('Invalid search parameters'),
        );
        return;
      }

      const result = await this.courseService.searchCourses(validation.data);
      res.status(HTTP_STATUS.OK).json(
        ResponseHelper.success(result, 'Courses retrieved successfully'),
      );
    } catch (error: any) {
      logger.error('Course search error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
        ResponseHelper.error('Failed to search courses'),
      );
    }
  };

  getPublishedCourses = async (_req: Request, res: Response): Promise<void> => {
    try {
      const courses = await this.courseService.getPublishedCourses();
      res.status(HTTP_STATUS.OK).json(
        ResponseHelper.success(courses, 'Published courses retrieved successfully'),
      );
    } catch (error: any) {
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
        ResponseHelper.error('Failed to retrieve courses'),
      );
    }
  };

  getMyCourses = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { user } = req;
      if (!user) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json(
          ResponseHelper.unauthorized('Authentication required'),
        );
        return;
      }

      // Get courses accessible to this user based on their role and promotion
      const courses = await this.courseService.getAccessibleCourses(user.userId, user.role);
      res.status(HTTP_STATUS.OK).json(
        ResponseHelper.success(courses, 'Accessible courses retrieved successfully'),
      );
    } catch (error: any) {
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
        ResponseHelper.error('Failed to retrieve courses'),
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
          ResponseHelper.unauthorized('Authentication required'),
        );
        return;
      }

      const { courseId } = req.params;
      const validation = CreateChapterSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          ResponseHelper.badRequest('Invalid chapter data'),
        );
        return;
      }

      const course = await this.courseService.addChapter(
        courseId!,
        validation.data,
        user.userId,
        user.role,
      );

      if (!course) {
        res.status(HTTP_STATUS.NOT_FOUND).json(
          ResponseHelper.notFound('Course'),
        );
        return;
      }

      res.status(HTTP_STATUS.CREATED).json(
        ResponseHelper.success(course, 'Chapter added successfully'),
      );
    } catch (error: any) {
      if (error.message.includes('Insufficient permissions')) {
        res.status(HTTP_STATUS.FORBIDDEN).json(
          ResponseHelper.forbidden(error.message),
        );
      } else {
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
          ResponseHelper.error('Failed to add chapter'),
        );
      }
    }
  };

  updateChapter = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { user } = req;
      if (!user) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json(
          ResponseHelper.unauthorized('Authentication required'),
        );
        return;
      }

      const { courseId, chapterId } = req.params;
      const validation = UpdateChapterSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          ResponseHelper.badRequest('Invalid chapter data'),
        );
        return;
      }

      const course = await this.courseService.updateChapter(
        courseId!,
        chapterId!,
        validation.data,
        user.userId,
        user.role,
      );

      if (!course) {
        res.status(HTTP_STATUS.NOT_FOUND).json(
          ResponseHelper.notFound('Course or chapter'),
        );
        return;
      }

      res.status(HTTP_STATUS.OK).json(
        ResponseHelper.success(course, 'Chapter updated successfully'),
      );
    } catch (error: any) {
      if (error.message.includes('Insufficient permissions')) {
        res.status(HTTP_STATUS.FORBIDDEN).json(
          ResponseHelper.forbidden(error.message),
        );
      } else {
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
          ResponseHelper.error('Failed to update chapter'),
        );
      }
    }
  };

  deleteChapter = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { user } = req;
      if (!user) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json(
          ResponseHelper.unauthorized('Authentication required'),
        );
        return;
      }

      const { courseId, chapterId } = req.params;
      const course = await this.courseService.deleteChapter(
        courseId!,
        chapterId!,
        user.userId,
        user.role,
      );

      if (!course) {
        res.status(HTTP_STATUS.NOT_FOUND).json(
          ResponseHelper.notFound('Course or chapter'),
        );
        return;
      }

      res.status(HTTP_STATUS.OK).json(
        ResponseHelper.success(course, 'Chapter deleted successfully'),
      );
    } catch (error: any) {
      if (error.message.includes('Insufficient permissions')) {
        res.status(HTTP_STATUS.FORBIDDEN).json(
          ResponseHelper.forbidden(error.message),
        );
      } else {
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
          ResponseHelper.error('Failed to delete chapter'),
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
          ResponseHelper.unauthorized('Authentication required'),
        );
        return;
      }

      const { courseId, chapterId } = req.params;
      const validation = CreateSectionSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          ResponseHelper.badRequest('Invalid section data'),
        );
        return;
      }

      const course = await this.courseService.addSection(
        courseId!,
        chapterId!,
        validation.data,
        user.userId,
        user.role,
      );

      if (!course) {
        res.status(HTTP_STATUS.NOT_FOUND).json(
          ResponseHelper.notFound('Course or chapter'),
        );
        return;
      }

      res.status(HTTP_STATUS.CREATED).json(
        ResponseHelper.success(course, 'Section added successfully'),
      );
    } catch (error: any) {
      if (error.message.includes('Insufficient permissions')) {
        res.status(HTTP_STATUS.FORBIDDEN).json(
          ResponseHelper.forbidden(error.message),
        );
      } else {
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
          ResponseHelper.error('Failed to add section'),
        );
      }
    }
  };

  updateSection = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { user } = req;
      if (!user) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json(
          ResponseHelper.unauthorized('Authentication required'),
        );
        return;
      }

      const { courseId, chapterId, sectionId } = req.params;
      const validation = UpdateSectionSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          ResponseHelper.badRequest('Invalid section data'),
        );
        return;
      }

      const course = await this.courseService.updateSection(
        courseId!,
        chapterId!,
        sectionId!,
        validation.data,
        user.userId,
        user.role,
      );

      if (!course) {
        res.status(HTTP_STATUS.NOT_FOUND).json(
          ResponseHelper.notFound('Course, chapter, or section'),
        );
        return;
      }

      res.status(HTTP_STATUS.OK).json(
        ResponseHelper.success(course, 'Section updated successfully'),
      );
    } catch (error: any) {
      if (error.message.includes('Insufficient permissions')) {
        res.status(HTTP_STATUS.FORBIDDEN).json(
          ResponseHelper.forbidden(error.message),
        );
      } else {
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
          ResponseHelper.error('Failed to update section'),
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
          ResponseHelper.unauthorized('Authentication required'),
        );
        return;
      }

      const { courseId, chapterId, sectionId } = req.params;
      const validation = CreateContentSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          ResponseHelper.badRequest('Invalid content data'),
        );
        return;
      }

      const course = await this.courseService.addContent(
        courseId!,
        chapterId!,
        sectionId!,
        validation.data,
        user.userId,
        user.role,
      );

      if (!course) {
        res.status(HTTP_STATUS.NOT_FOUND).json(
          ResponseHelper.notFound('Course, chapter, or section'),
        );
        return;
      }

      res.status(HTTP_STATUS.CREATED).json(
        ResponseHelper.success(course, 'Content added successfully'),
      );
    } catch (error: any) {
      if (error.message.includes('Insufficient permissions')) {
        res.status(HTTP_STATUS.FORBIDDEN).json(
          ResponseHelper.forbidden(error.message),
        );
      } else {
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
          ResponseHelper.error('Failed to add content'),
        );
      }
    }
  };

  updateContent = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { user } = req;
      if (!user) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json(
          ResponseHelper.unauthorized('Authentication required'),
        );
        return;
      }

      const { courseId, chapterId, sectionId, contentId } = req.params;
      const validation = UpdateContentSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          ResponseHelper.badRequest('Invalid content data'),
        );
        return;
      }

      const course = await this.courseService.updateContent(
        courseId!,
        chapterId!,
        sectionId!,
        contentId!,
        validation.data,
        user.userId,
        user.role,
      );

      if (!course) {
        res.status(HTTP_STATUS.NOT_FOUND).json(
          ResponseHelper.notFound('Course, chapter, section, or content'),
        );
        return;
      }

      res.status(HTTP_STATUS.OK).json(
        ResponseHelper.success(course, 'Content updated successfully'),
      );
    } catch (error: any) {
      if (error.message.includes('Insufficient permissions')) {
        res.status(HTTP_STATUS.FORBIDDEN).json(
          ResponseHelper.forbidden(error.message),
        );
      } else {
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
          ResponseHelper.error('Failed to update content'),
        );
      }
    }
  };

  // =============================================================================
  // COURSE ACCESS VIA PROMOTIONS
  // =============================================================================
  
  // Course enrollment is now managed through promotions
  // Students access courses via their promotion calendar

  // =============================================================================
  // EXERCISE MANAGEMENT
  // =============================================================================

  // NOTE: Exercise submission endpoints removed - functionality moved to promotion-based system
}
