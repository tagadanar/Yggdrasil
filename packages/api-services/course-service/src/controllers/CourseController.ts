// Path: packages/api-services/course-service/src/controllers/CourseController.ts
import { Request, Response } from 'express';
import { CourseService } from '../services/CourseService';
import { CreateCourseData, UpdateCourseData, CourseSearchFilters } from '../types/course';

export class CourseController {
  /**
   * Create a new course
   */
  static async createCourse(req: Request, res: Response): Promise<void> {
    try {
      const courseData: CreateCourseData = req.body;
      const instructorId = req.user?.id;

      if (!instructorId) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized - instructor ID required'
        });
        return;
      }

      const result = await CourseService.createCourse(courseData, instructorId);

      if (result.success) {
        res.status(201).json({
          success: true,
          message: 'Course created successfully',
          data: result.course
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error
        });
      }
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  /**
   * Get course by ID
   */
  static async getCourse(req: Request, res: Response): Promise<void> {
    try {
      const { courseId } = req.params;

      const result = await CourseService.getCourse(courseId);

      if (result.success) {
        res.status(200).json({
          success: true,
          data: result.course
        });
      } else {
        res.status(404).json({
          success: false,
          error: result.error
        });
      }
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  /**
   * Update course
   */
  static async updateCourse(req: Request, res: Response): Promise<void> {
    try {
      const { courseId } = req.params;
      const updateData: UpdateCourseData = req.body;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized - user ID required'
        });
        return;
      }

      const result = await CourseService.updateCourse(courseId, updateData, userId);

      if (result.success) {
        res.status(200).json({
          success: true,
          message: 'Course updated successfully',
          data: result.course
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error
        });
      }
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  /**
   * Delete course (soft delete)
   */
  static async deleteCourse(req: Request, res: Response): Promise<void> {
    try {
      const { courseId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized - user ID required'
        });
        return;
      }

      const result = await CourseService.deleteCourse(courseId, userId);

      if (result.success) {
        res.status(200).json({
          success: true,
          message: result.message
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error
        });
      }
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  /**
   * Enroll student in course
   */
  static async enrollStudent(req: Request, res: Response): Promise<void> {
    try {
      const { courseId } = req.params;
      const { studentId } = req.body;

      if (!studentId) {
        res.status(400).json({
          success: false,
          error: 'Student ID is required'
        });
        return;
      }

      const result = await CourseService.enrollStudent(courseId, studentId);

      if (result.success) {
        res.status(200).json({
          success: true,
          message: result.message,
          data: {
            enrollmentDate: result.enrollmentDate,
            waitlisted: result.waitlisted,
            position: result.position
          }
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error,
          message: result.message
        });
      }
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  /**
   * Unenroll student from course
   */
  static async unenrollStudent(req: Request, res: Response): Promise<void> {
    try {
      const { courseId } = req.params;
      const { studentId } = req.body;

      if (!studentId) {
        res.status(400).json({
          success: false,
          error: 'Student ID is required'
        });
        return;
      }

      const result = await CourseService.unenrollStudent(courseId, studentId);

      if (result.success) {
        res.status(200).json({
          success: true,
          message: result.message
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error,
          message: result.message
        });
      }
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  /**
   * Search courses with filters and pagination
   */
  static async searchCourses(req: Request, res: Response): Promise<void> {
    try {
      const query = req.query.q as string || '';
      const filters: CourseSearchFilters = {
        category: req.query.category as any,
        level: req.query.level as any,
        status: req.query.status as any,
        instructor: req.query.instructor as string,
        tags: req.query.tags ? (req.query.tags as string).split(',') : undefined,
        minCredits: req.query.minCredits ? parseInt(req.query.minCredits as string) : undefined,
        maxCredits: req.query.maxCredits ? parseInt(req.query.maxCredits as string) : undefined,
        hasAvailableSpots: req.query.hasAvailableSpots === 'true',
        limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
        offset: req.query.offset ? parseInt(req.query.offset as string) : 0,
        sortBy: req.query.sortBy as any,
        sortOrder: req.query.sortOrder as any
      };

      const result = await CourseService.searchCourses(query, filters);

      if (result.success) {
        res.status(200).json({
          success: true,
          data: result.courses,
          pagination: result.pagination,
          total: result.total
        });
      } else {
        // Check if it's a database connection error (should be 500)
        const isInternalError = result.error.includes('Database connection error') || 
                               result.error.includes('Database operation failed');
        const statusCode = isInternalError ? 500 : 400;
        const errorMessage = isInternalError ? 'Internal server error' : result.error;
        
        res.status(statusCode).json({
          success: false,
          error: errorMessage
        });
      }
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  /**
   * Get course statistics
   */
  static async getCourseStats(req: Request, res: Response): Promise<void> {
    try {
      const result = await CourseService.getCourseStats();

      if (result.success) {
        res.status(200).json({
          success: true,
          data: result.stats
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error
        });
      }
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  /**
   * Get courses by instructor
   */
  static async getCoursesByInstructor(req: Request, res: Response): Promise<void> {
    try {
      const { instructorId } = req.params;

      const result = await CourseService.getCoursesByInstructor(instructorId);

      if (result.success) {
        res.status(200).json({
          success: true,
          data: result.courses,
          total: result.total
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error
        });
      }
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  /**
   * Publish course
   */
  static async publishCourse(req: Request, res: Response): Promise<void> {
    try {
      const { courseId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized - user ID required'
        });
        return;
      }

      const result = await CourseService.publishCourse(courseId, userId);

      if (result.success) {
        res.status(200).json({
          success: true,
          message: 'Course published successfully',
          data: result.course
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error
        });
      }
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  /**
   * Archive course
   */
  static async archiveCourse(req: Request, res: Response): Promise<void> {
    try {
      const { courseId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized - user ID required'
        });
        return;
      }

      const result = await CourseService.archiveCourse(courseId, userId);

      if (result.success) {
        res.status(200).json({
          success: true,
          message: 'Course archived successfully',
          data: result.course
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error
        });
      }
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  /**
   * Get enrollment status for current user
   */
  static async getEnrollmentStatus(req: Request, res: Response): Promise<void> {
    try {
      const { courseId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized - user ID required'
        });
        return;
      }

      const result = await CourseService.getEnrollmentStatus(courseId, userId);

      if (result.success) {
        res.status(200).json({
          success: true,
          data: result.data
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error
        });
      }
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  /**
   * Check enrollment eligibility
   */
  static async checkEnrollmentEligibility(req: Request, res: Response): Promise<void> {
    try {
      const { courseId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized - user ID required'
        });
        return;
      }

      const result = await CourseService.checkEnrollmentEligibility(courseId, userId);

      if (result.success) {
        res.status(200).json({
          success: true,
          data: result.data
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error
        });
      }
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  /**
   * Get course progress for current user
   */
  static async getCourseProgress(req: Request, res: Response): Promise<void> {
    try {
      const { courseId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized - user ID required'
        });
        return;
      }

      const result = await CourseService.getCourseProgress(courseId, userId);

      if (result.success) {
        res.status(200).json({
          success: true,
          data: result.data
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error
        });
      }
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  /**
   * Update course progress
   */
  static async updateCourseProgress(req: Request, res: Response): Promise<void> {
    try {
      const { courseId } = req.params;
      const userId = req.user?.id;
      const progressData = req.body;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized - user ID required'
        });
        return;
      }

      const result = await CourseService.updateCourseProgress(courseId, userId, progressData);

      if (result.success) {
        res.status(200).json({
          success: true,
          message: 'Progress updated successfully',
          data: result.data
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error
        });
      }
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  /**
   * Get course feedback
   */
  static async getCourseFeedback(req: Request, res: Response): Promise<void> {
    try {
      const { courseId } = req.params;

      const result = await CourseService.getCourseFeedback(courseId);

      if (result.success) {
        res.status(200).json({
          success: true,
          data: result.data
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error
        });
      }
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  /**
   * Submit course feedback
   */
  static async submitCourseFeedback(req: Request, res: Response): Promise<void> {
    try {
      const { courseId } = req.params;
      const userId = req.user?.id;
      const feedbackData = req.body;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized - user ID required'
        });
        return;
      }

      const result = await CourseService.submitCourseFeedback(courseId, userId, feedbackData);

      if (result.success) {
        res.status(201).json({
          success: true,
          message: 'Feedback submitted successfully',
          data: result.data
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error
        });
      }
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  /**
   * Get course prerequisites
   */
  static async getCoursePrerequisites(req: Request, res: Response): Promise<void> {
    try {
      const { courseId } = req.params;
      const userId = req.user?.id;

      const result = await CourseService.getCoursePrerequisites(courseId, userId);

      if (result.success) {
        res.status(200).json({
          success: true,
          data: result.data
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error
        });
      }
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  /**
   * Get enrolled courses for current user
   */
  static async getEnrolledCourses(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized - user ID required'
        });
        return;
      }

      const result = await CourseService.getEnrolledCourses(userId);

      if (result.success) {
        res.status(200).json({
          success: true,
          data: result.courses,
          total: result.total
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error
        });
      }
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  /**
   * Get course categories
   */
  static async getCategories(req: Request, res: Response): Promise<void> {
    try {
      const result = await CourseService.getCategories();

      if (result.success) {
        res.status(200).json({
          success: true,
          data: result.data
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error
        });
      }
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  /**
   * Get course levels
   */
  static async getLevels(req: Request, res: Response): Promise<void> {
    try {
      const result = await CourseService.getLevels();

      if (result.success) {
        res.status(200).json({
          success: true,
          data: result.data
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error
        });
      }
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  /**
   * Export course data
   */
  static async exportCourseData(req: Request, res: Response): Promise<void> {
    try {
      const { courseId } = req.params;
      const { format } = req.query;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized - user ID required'
        });
        return;
      }

      const result = await CourseService.exportCourseData(courseId, userId, format as string);

      if (result.success) {
        res.setHeader('Content-Type', result.contentType!);
        res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
        res.send(result.data);
      } else {
        res.status(400).json({
          success: false,
          error: result.error
        });
      }
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  /**
   * Import course data
   */
  static async importCourseData(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const file = req.file;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized - user ID required'
        });
        return;
      }

      if (!file) {
        res.status(400).json({
          success: false,
          error: 'File is required for import'
        });
        return;
      }

      const result = await CourseService.importCourseData(file, userId);

      if (result.success) {
        res.status(201).json({
          success: true,
          message: 'Course data imported successfully',
          data: result.data
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error
        });
      }
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }
}