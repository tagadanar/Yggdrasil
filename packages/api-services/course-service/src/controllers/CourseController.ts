// packages/api-services/course-service/src/controllers/CourseController.ts
// HTTP request handling for course management

import { Request, Response } from 'express';
import { 
  ResponseHelper, 
  courseLogger as logger
} from '@yggdrasil/shared-utilities';
import { CourseService } from '../services/CourseService';
import { AuthRequest } from '../middleware/authMiddleware';

export class CourseController {
  private courseService: CourseService;

  constructor() {
    this.courseService = new CourseService();
  }

  // =============================================================================
  // COURSE CRUD OPERATIONS  
  // =============================================================================

  createCourse = async (req: AuthRequest, res: Response): Promise<Response> => {
    try {
      const { user } = req;
      if (!user) {
        return res.status(401).json(ResponseHelper.unauthorized('Authentication required'));
      }

      const courseData = req.body;
      // Handle different user object structures from auth middleware
      const userId = user.id || user.userId || user._id;
      const userEmail = user.email;
      const firstName = user.firstName || user.profile?.firstName || 'Unknown';
      const lastName = user.lastName || user.profile?.lastName || 'User';
      const instructorName = `${firstName} ${lastName}`;

      const course = await this.courseService.createCourse(
        userId,
        instructorName,
        userEmail,
        courseData
      );

      return res.status(201).json(ResponseHelper.success(course, 'Course created successfully'));
    } catch (error: any) {
      logger.error('CourseController.createCourse error:', error);
      return res.status(400).json(ResponseHelper.badRequest(error.message));
    }
  }

  getCourse = async (req: AuthRequest, res: Response): Promise<Response> => {
    try {
      const { user } = req;
      const { courseId } = req.params;

      if (!user) {
        return res.status(401).json(ResponseHelper.unauthorized('Authentication required'));
      }

      if (!courseId) {
        return res.status(400).json(ResponseHelper.badRequest('Course ID is required'));
      }

      // Check course access
      const userId = user.id || user.userId || user._id;
      const hasAccess = await this.courseService.checkCourseAccess(courseId, userId, user.role);
      if (!hasAccess) {
        return res.status(403).json(ResponseHelper.forbidden('Access denied to this course'));
      }

      const course = await this.courseService.getCourseById(courseId);
      if (!course) {
        return res.status(404).json(ResponseHelper.notFound('Course not found'));
      }

      return res.status(200).json(ResponseHelper.success(course, 'Course retrieved successfully'));
    } catch (error: any) {
      logger.error('CourseController.getCourse error:', error);
      return res.status(500).json(ResponseHelper.error(error.message));
    }
  }

  getCourseBySlug = async (req: AuthRequest, res: Response): Promise<Response> => {
    try {
      const { user } = req;
      const { slug } = req.params;

      if (!user) {
        return res.status(401).json(ResponseHelper.unauthorized('Authentication required'));
      }

      if (!slug) {
        return res.status(400).json(ResponseHelper.badRequest('Course slug is required'));
      }

      const course = await this.courseService.getCourseBySlug(slug);
      if (!course) {
        return res.status(404).json(ResponseHelper.notFound('Course not found'));
      }

      // Check course access
      const userId = user.id || user.userId || user._id;
      const hasAccess = await this.courseService.checkCourseAccess(course._id.toString(), userId, user.role);
      if (!hasAccess) {
        return res.status(403).json(ResponseHelper.forbidden('Access denied to this course'));
      }

      return res.status(200).json(ResponseHelper.success(course, 'Course retrieved successfully'));
    } catch (error: any) {
      logger.error('CourseController.getCourseBySlug error:', error);
      return res.status(500).json(ResponseHelper.error(error.message));
    }
  }

  updateCourse = async (req: AuthRequest, res: Response): Promise<Response> => {
    try {
      const { user } = req;
      const { courseId } = req.params;
      const updateData = req.body;

      if (!user) {
        return res.status(401).json(ResponseHelper.unauthorized('Authentication required'));
      }

      if (!courseId) {
        return res.status(400).json(ResponseHelper.badRequest('Course ID is required'));
      }

      const userId = user.id || user.userId || user._id;
      const updatedCourse = await this.courseService.updateCourse(courseId, updateData, userId, user.role);
      if (!updatedCourse) {
        return res.status(404).json(ResponseHelper.notFound('Course not found'));
      }

      return res.status(200).json(ResponseHelper.success(updatedCourse, 'Course updated successfully'));
    } catch (error: any) {
      logger.error('CourseController.updateCourse error:', error);
      if (error.message.includes('permission')) {
        return res.status(403).json(ResponseHelper.forbidden(error.message));
      }
      return res.status(400).json(ResponseHelper.badRequest(error.message));
    }
  }

  deleteCourse = async (req: AuthRequest, res: Response): Promise<Response> => {
    try {
      const { user } = req;
      const { courseId } = req.params;

      if (!user) {
        return res.status(401).json(ResponseHelper.unauthorized('Authentication required'));
      }

      if (!courseId) {
        return res.status(400).json(ResponseHelper.badRequest('Course ID is required'));
      }

      const userId = user.id || user.userId || user._id;
      const deleted = await this.courseService.deleteCourse(courseId, userId, user.role);
      if (!deleted) {
        return res.status(404).json(ResponseHelper.notFound('Course not found'));
      }

      return res.status(200).json(ResponseHelper.success(null, 'Course deleted successfully'));
    } catch (error: any) {
      logger.error('CourseController.deleteCourse error:', error);
      if (error.message.includes('permission')) {
        return res.status(403).json(ResponseHelper.forbidden(error.message));
      }
      return res.status(400).json(ResponseHelper.badRequest(error.message));
    }
  }

  // =============================================================================
  // COURSE SEARCH AND LISTING
  // =============================================================================

  searchCourses = async (req: Request, res: Response): Promise<Response> => {
    try {
      const filters = req.query;
      const result = await this.courseService.searchCourses(filters as any);

      return res.status(200).json(ResponseHelper.success(result, 'Courses retrieved successfully'));
    } catch (error: any) {
      logger.error('CourseController.searchCourses error:', error);
      return res.status(500).json(ResponseHelper.error(error.message));
    }
  }

  getPublishedCourses = async (_req: Request, res: Response): Promise<Response> => {
    try {
      const courses = await this.courseService.getPublishedCourses();
      return res.status(200).json(ResponseHelper.success(courses, 'Published courses retrieved successfully'));
    } catch (error: any) {
      logger.error('CourseController.getPublishedCourses error:', error);
      return res.status(500).json(ResponseHelper.error(error.message));
    }
  }

  getMyCourses = async (req: AuthRequest, res: Response): Promise<Response> => {
    try {
      const { user } = req;

      if (!user) {
        return res.status(401).json(ResponseHelper.unauthorized('Authentication required'));
      }

      const userId = user.id || user.userId || user._id;
      const courses = await this.courseService.getAccessibleCourses(userId, user.role);
      return res.status(200).json(ResponseHelper.success(courses, 'User courses retrieved successfully'));
    } catch (error: any) {
      logger.error('CourseController.getMyCourses error:', error);
      return res.status(500).json(ResponseHelper.error(error.message));
    }
  }

  // =============================================================================
  // CHAPTER MANAGEMENT
  // =============================================================================

  addChapter = async (req: AuthRequest, res: Response): Promise<Response> => {
    try {
      const { user } = req;
      const { courseId } = req.params;
      const chapterData = req.body;

      if (!user) {
        return res.status(401).json(ResponseHelper.unauthorized('Authentication required'));
      }

      const userId = user.id || user.userId || user._id;
      const course = await this.courseService.addChapter(courseId!, chapterData, userId, user.role);
      if (!course) {
        return res.status(404).json(ResponseHelper.notFound('Course not found'));
      }

      return res.status(200).json(ResponseHelper.success(course, 'Chapter added successfully'));
    } catch (error: any) {
      logger.error('CourseController.addChapter error:', error);
      if (error.message.includes('permission')) {
        return res.status(403).json(ResponseHelper.forbidden(error.message));
      }
      return res.status(400).json(ResponseHelper.badRequest(error.message));
    }
  }

  updateChapter = async (req: AuthRequest, res: Response): Promise<Response> => {
    try {
      const { user } = req;
      const { courseId, chapterId } = req.params;
      const updateData = req.body;

      if (!user) {
        return res.status(401).json(ResponseHelper.unauthorized('Authentication required'));
      }

      const userId = user.id || user.userId || user._id;
      const course = await this.courseService.updateChapter(courseId!, chapterId!, updateData, userId, user.role);
      if (!course) {
        return res.status(404).json(ResponseHelper.notFound('Course or chapter not found'));
      }

      return res.status(200).json(ResponseHelper.success(course, 'Chapter updated successfully'));
    } catch (error: any) {
      logger.error('CourseController.updateChapter error:', error);
      if (error.message.includes('permission')) {
        return res.status(403).json(ResponseHelper.forbidden(error.message));
      }
      return res.status(400).json(ResponseHelper.badRequest(error.message));
    }
  }

  deleteChapter = async (req: AuthRequest, res: Response): Promise<Response> => {
    try {
      const { user } = req;
      const { courseId, chapterId } = req.params;

      if (!user) {
        return res.status(401).json(ResponseHelper.unauthorized('Authentication required'));
      }

      const userId = user.id || user.userId || user._id;
      const course = await this.courseService.deleteChapter(courseId!, chapterId!, userId, user.role);
      if (!course) {
        return res.status(404).json(ResponseHelper.notFound('Course or chapter not found'));
      }

      return res.status(200).json(ResponseHelper.success(course, 'Chapter deleted successfully'));
    } catch (error: any) {
      logger.error('CourseController.deleteChapter error:', error);
      if (error.message.includes('permission')) {
        return res.status(403).json(ResponseHelper.forbidden(error.message));
      }
      return res.status(400).json(ResponseHelper.badRequest(error.message));
    }
  }

  // =============================================================================
  // SECTION MANAGEMENT
  // =============================================================================

  addSection = async (req: AuthRequest, res: Response): Promise<Response> => {
    try {
      const { user } = req;
      const { courseId, chapterId } = req.params;
      const sectionData = req.body;

      if (!user) {
        return res.status(401).json(ResponseHelper.unauthorized('Authentication required'));
      }

      const userId = user.id || user.userId || user._id;
      const course = await this.courseService.addSection(courseId!, chapterId!, sectionData, userId, user.role);
      if (!course) {
        return res.status(404).json(ResponseHelper.notFound('Course or chapter not found'));
      }

      return res.status(200).json(ResponseHelper.success(course, 'Section added successfully'));
    } catch (error: any) {
      logger.error('CourseController.addSection error:', error);
      if (error.message.includes('permission')) {
        return res.status(403).json(ResponseHelper.forbidden(error.message));
      }
      return res.status(400).json(ResponseHelper.badRequest(error.message));
    }
  }

  updateSection = async (req: AuthRequest, res: Response): Promise<Response> => {
    try {
      const { user } = req;
      const { courseId, chapterId, sectionId } = req.params;
      const updateData = req.body;

      if (!user) {
        return res.status(401).json(ResponseHelper.unauthorized('Authentication required'));
      }

      const userId = user.id || user.userId || user._id;
      const course = await this.courseService.updateSection(courseId!, chapterId!, sectionId!, updateData, userId, user.role);
      if (!course) {
        return res.status(404).json(ResponseHelper.notFound('Course, chapter, or section not found'));
      }

      return res.status(200).json(ResponseHelper.success(course, 'Section updated successfully'));
    } catch (error: any) {
      logger.error('CourseController.updateSection error:', error);
      if (error.message.includes('permission')) {
        return res.status(403).json(ResponseHelper.forbidden(error.message));
      }
      return res.status(400).json(ResponseHelper.badRequest(error.message));
    }
  }

  // =============================================================================
  // CONTENT MANAGEMENT
  // =============================================================================

  addContent = async (req: AuthRequest, res: Response): Promise<Response> => {
    try {
      const { user } = req;
      const { courseId, chapterId, sectionId } = req.params;
      const contentData = req.body;

      if (!user) {
        return res.status(401).json(ResponseHelper.unauthorized('Authentication required'));
      }

      const userId = user.id || user.userId || user._id;
      const course = await this.courseService.addContent(courseId!, chapterId!, sectionId!, contentData, userId, user.role);
      if (!course) {
        return res.status(404).json(ResponseHelper.notFound('Course, chapter, or section not found'));
      }

      return res.status(200).json(ResponseHelper.success(course, 'Content added successfully'));
    } catch (error: any) {
      logger.error('CourseController.addContent error:', error);
      if (error.message.includes('permission')) {
        return res.status(403).json(ResponseHelper.forbidden(error.message));
      }
      return res.status(400).json(ResponseHelper.badRequest(error.message));
    }
  }

  updateContent = async (req: AuthRequest, res: Response): Promise<Response> => {
    try {
      const { user } = req;
      const { courseId, chapterId, sectionId, contentId } = req.params;
      const updateData = req.body;

      if (!user) {
        return res.status(401).json(ResponseHelper.unauthorized('Authentication required'));
      }

      const userId = user.id || user.userId || user._id;
      const course = await this.courseService.updateContent(courseId!, chapterId!, sectionId!, contentId!, updateData, userId, user.role);
      if (!course) {
        return res.status(404).json(ResponseHelper.notFound('Course, chapter, section, or content not found'));
      }

      return res.status(200).json(ResponseHelper.success(course, 'Content updated successfully'));
    } catch (error: any) {
      logger.error('CourseController.updateContent error:', error);
      if (error.message.includes('permission')) {
        return res.status(403).json(ResponseHelper.forbidden(error.message));
      }
      return res.status(400).json(ResponseHelper.badRequest(error.message));
    }
  }

  // =============================================================================
  // LEGACY/PLACEHOLDER METHODS
  // =============================================================================

  // These methods are kept for backward compatibility with existing routes
  // Most functionality has been moved to the promotion-based system

  getCourses = async (req: Request, res: Response): Promise<Response> => {
    // Redirect to search with no filters for all courses
    return this.searchCourses(req, res);
  }

  getAllCourses = async (req: Request, res: Response): Promise<Response> => {
    // Redirect to search with no filters for all courses
    return this.searchCourses(req, res);
  }

  async getCourseStudents(_req: Request, res: Response): Promise<Response> {
    const response = ResponseHelper.error('Student management moved to promotion-based system', 501);
    return res.status(response.statusCode).json(response);
  }

  async addStudentToCourse(_req: Request, res: Response): Promise<Response> {
    const response = ResponseHelper.error('Student enrollment moved to promotion-based system', 501);
    return res.status(response.statusCode).json(response);
  }

  async removeStudentFromCourse(_req: Request, res: Response): Promise<Response> {
    const response = ResponseHelper.error('Student enrollment moved to promotion-based system', 501);
    return res.status(response.statusCode).json(response);
  }

  async getCourseAnalytics(_req: Request, res: Response): Promise<Response> {
    const response = ResponseHelper.error('Course analytics moved to statistics service', 501);
    return res.status(response.statusCode).json(response);
  }

  async enroll(_req: Request, res: Response): Promise<Response> {
    const response = ResponseHelper.error('Enrollment moved to promotion-based system', 501);
    return res.status(response.statusCode).json(response);
  }

  async unenroll(_req: Request, res: Response): Promise<Response> {
    const response = ResponseHelper.error('Enrollment moved to promotion-based system', 501);
    return res.status(response.statusCode).json(response);
  }

  async getProgress(_req: Request, res: Response): Promise<Response> {
    const response = ResponseHelper.error('Progress tracking moved to promotion-based system', 501);
    return res.status(response.statusCode).json(response);
  }

  async updateProgress(_req: Request, res: Response): Promise<Response> {
    const response = ResponseHelper.error('Progress tracking moved to promotion-based system', 501);
    return res.status(response.statusCode).json(response);
  }

  async getChapter(_req: Request, res: Response): Promise<Response> {
    const response = ResponseHelper.error('Chapter access moved to course access system', 501);
    return res.status(response.statusCode).json(response);
  }

  async getSection(_req: Request, res: Response): Promise<Response> {
    const response = ResponseHelper.error('Section access moved to course access system', 501);
    return res.status(response.statusCode).json(response);
  }

  async getExercise(_req: Request, res: Response): Promise<Response> {
    const response = ResponseHelper.error('Exercise management moved to promotion-based system', 501);
    return res.status(response.statusCode).json(response);
  }

  async submitExercise(_req: Request, res: Response): Promise<Response> {
    const response = ResponseHelper.error('Exercise submissions moved to promotion-based system', 501);
    return res.status(response.statusCode).json(response);
  }

  async getSubmissions(_req: Request, res: Response): Promise<Response> {
    const response = ResponseHelper.error('Submissions moved to promotion-based system', 501);
    return res.status(response.statusCode).json(response);
  }

  async getRatings(_req: Request, res: Response): Promise<Response> {
    const response = ResponseHelper.error('Course ratings not yet implemented', 501);
    return res.status(response.statusCode).json(response);
  }

  async rateCourse(_req: Request, res: Response): Promise<Response> {
    const response = ResponseHelper.error('Course ratings not yet implemented', 501);
    return res.status(response.statusCode).json(response);
  }

  async deleteSection(_req: Request, res: Response): Promise<Response> {
    const response = ResponseHelper.error('Section deletion not yet implemented', 501);
    return res.status(response.statusCode).json(response);
  }

  async addExercise(_req: Request, res: Response): Promise<Response> {
    const response = ResponseHelper.error('Exercise management moved to promotion-based system', 501);
    return res.status(response.statusCode).json(response);
  }

  async updateExercise(_req: Request, res: Response): Promise<Response> {
    const response = ResponseHelper.error('Exercise management moved to promotion-based system', 501);
    return res.status(response.statusCode).json(response);
  }

  async deleteExercise(_req: Request, res: Response): Promise<Response> {
    const response = ResponseHelper.error('Exercise management moved to promotion-based system', 501);
    return res.status(response.statusCode).json(response);
  }
}