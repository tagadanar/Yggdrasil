// packages/api-services/course-service/src/routes/courseRoutes.ts
// API routes for course management

import { Router } from 'express';
import { CourseController } from '../controllers/CourseController';
import { authenticateToken, requireTeacherOrAdmin } from '../middleware/authMiddleware';
import {
  auditCourseCreate,
  auditCourseUpdate,
  auditCourseDelete,
  auditCoursePublish,
  auditChapterCreate,
  auditChapterUpdate,
  auditChapterDelete,
  auditSectionCreate,
  auditSectionUpdate,
  auditContentCreate,
  auditContentUpdate,
} from '../middleware/auditLogger';
import rateLimit from 'express-rate-limit';

const router = Router();
const courseController = new CourseController();

// Rate limiting for course operations
const courseRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many course requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

const createCourseRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // limit course creation to 10 per hour per IP
  message: 'Too many course creation attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting to all course routes
router.use(courseRateLimit);

// =============================================================================
// COURSE CRUD OPERATIONS
// =============================================================================

// Create new course (teachers, staff, admins only)
router.post(
  '/',
  createCourseRateLimit,
  authenticateToken,
  requireTeacherOrAdmin,
  auditCourseCreate,
  courseController.createCourse,
);

// Get course by ID (requires authentication and promotion access)
router.get('/:courseId', authenticateToken, courseController.getCourse);

// Get course by slug (requires authentication and promotion access)
router.get('/slug/:slug', authenticateToken, courseController.getCourseBySlug);

// Update course (instructors, collaborators, admins only)
router.put('/:courseId', authenticateToken, auditCourseUpdate, courseController.updateCourse);

// Delete course (instructors, admins only)
router.delete('/:courseId', authenticateToken, auditCourseDelete, courseController.deleteCourse);

// =============================================================================
// COURSE SEARCH AND LISTING
// =============================================================================

// Search courses (public)
router.get('/', courseController.searchCourses);

// Get all published courses (public)
router.get('/public/published', courseController.getPublishedCourses);

// Get user's courses (enrolled courses for students, created courses for teachers)
router.get('/user/my-courses', authenticateToken, courseController.getMyCourses);

// =============================================================================
// CHAPTER MANAGEMENT
// =============================================================================

// Add chapter to course
router.post(
  '/:courseId/chapters',
  authenticateToken,
  requireTeacherOrAdmin,
  auditChapterCreate,
  courseController.addChapter,
);

// Update chapter
router.put(
  '/:courseId/chapters/:chapterId',
  authenticateToken,
  requireTeacherOrAdmin,
  auditChapterUpdate,
  courseController.updateChapter,
);

// Delete chapter
router.delete(
  '/:courseId/chapters/:chapterId',
  authenticateToken,
  requireTeacherOrAdmin,
  auditChapterDelete,
  courseController.deleteChapter,
);

// =============================================================================
// SECTION MANAGEMENT
// =============================================================================

// Add section to chapter
router.post(
  '/:courseId/chapters/:chapterId/sections',
  authenticateToken,
  requireTeacherOrAdmin,
  auditSectionCreate,
  courseController.addSection,
);

// Update section
router.put(
  '/:courseId/chapters/:chapterId/sections/:sectionId',
  authenticateToken,
  requireTeacherOrAdmin,
  auditSectionUpdate,
  courseController.updateSection,
);

// =============================================================================
// CONTENT MANAGEMENT
// =============================================================================

// Add content to section
router.post(
  '/:courseId/chapters/:chapterId/sections/:sectionId/content',
  authenticateToken,
  requireTeacherOrAdmin,
  auditContentCreate,
  courseController.addContent,
);

// Update content
router.put(
  '/:courseId/chapters/:chapterId/sections/:sectionId/content/:contentId',
  authenticateToken,
  requireTeacherOrAdmin,
  auditContentUpdate,
  courseController.updateContent,
);

// =============================================================================
// COURSE ACCESS VIA PROMOTIONS
// =============================================================================

// Course enrollment is now managed through promotions
// Students access courses via their promotion calendar

// =============================================================================
// EXERCISE SUBMISSIONS
// =============================================================================

// NOTE: Exercise submission routes removed - functionality moved to promotion-based system

// =============================================================================
// COURSE MANAGEMENT SHORTCUTS
// =============================================================================

// Publish/unpublish course
router.patch(
  '/:courseId/publish',
  authenticateToken,
  requireTeacherOrAdmin,
  auditCoursePublish,
  async (req, res) => {
    try {
      const { publish } = req.body;
      const modifiedReq = {
        ...req,
        body: { status: publish ? 'published' : 'draft' },
      } as any;
      await courseController.updateCourse(modifiedReq, res);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update course status' });
    }
  },
);

// Archive/restore course (admins only)
router.patch('/:courseId/archive', authenticateToken, auditCoursePublish, async (req, res) => {
  try {
    const { archive } = req.body;
    const modifiedReq = {
      ...req,
      body: { status: archive ? 'archived' : 'published' },
    } as any;
    await courseController.updateCourse(modifiedReq, res);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update course status' });
  }
});

export default router;
