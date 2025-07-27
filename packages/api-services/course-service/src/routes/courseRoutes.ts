// packages/api-services/course-service/src/routes/courseRoutes.ts
// API routes for course management

import { Router } from 'express';
import { CourseController } from '../controllers/CourseController';
import {
  authenticateToken,
  optionalAuth,
  requireTeacherOrAdmin,
  requireStudentOnly,
} from '../middleware/authMiddleware';
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

const submissionRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 50, // limit submissions to 50 per 5 minutes per IP
  message: 'Too many submission attempts, please try again later.',
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
  courseController.createCourse,
);

// Get course by ID (public for published courses, authenticated for others)
router.get('/:courseId', optionalAuth, courseController.getCourse);

// Get course by slug (public for published courses)
router.get('/slug/:slug', optionalAuth, courseController.getCourseBySlug);

// Update course (instructors, collaborators, admins only)
router.put('/:courseId', authenticateToken, courseController.updateCourse);

// Delete course (instructors, admins only)
router.delete('/:courseId', authenticateToken, courseController.deleteCourse);

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
  courseController.addChapter,
);

// Update chapter
router.put(
  '/:courseId/chapters/:chapterId',
  authenticateToken,
  requireTeacherOrAdmin,
  courseController.updateChapter,
);

// Delete chapter
router.delete(
  '/:courseId/chapters/:chapterId',
  authenticateToken,
  requireTeacherOrAdmin,
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
  courseController.addSection,
);

// Update section
router.put(
  '/:courseId/chapters/:chapterId/sections/:sectionId',
  authenticateToken,
  requireTeacherOrAdmin,
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
  courseController.addContent,
);

// Update content
router.put(
  '/:courseId/chapters/:chapterId/sections/:sectionId/content/:contentId',
  authenticateToken,
  requireTeacherOrAdmin,
  courseController.updateContent,
);

// =============================================================================
// COURSE ENROLLMENT
// =============================================================================

// Enroll in course (students only)
router.post(
  '/enroll',
  authenticateToken,
  requireStudentOnly,
  courseController.enrollCourse,
);

// Get course enrollments (instructors, admins only)
router.get(
  '/:courseId/enrollments',
  authenticateToken,
  courseController.getCourseEnrollments,
);

// =============================================================================
// EXERCISE SUBMISSIONS
// =============================================================================

// Submit exercise solution (students only)
router.post(
  '/exercises/:exerciseId/submit',
  submissionRateLimit,
  authenticateToken,
  requireStudentOnly,
  courseController.submitExercise,
);

// Get exercise submissions
router.get(
  '/exercises/:exerciseId/submissions',
  authenticateToken,
  courseController.getExerciseSubmissions,
);

// =============================================================================
// COURSE MANAGEMENT SHORTCUTS
// =============================================================================

// Publish/unpublish course
router.patch(
  '/:courseId/publish',
  authenticateToken,
  requireTeacherOrAdmin,
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
router.patch(
  '/:courseId/archive',
  authenticateToken,
  async (req, res) => {
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
  },
);

export default router;
