// Path: packages/api-services/course-service/src/routes/courseRoutes.ts
import express from 'express';
import { CourseController } from '../controllers/CourseController';
import { authMiddleware, requireRole, optionalAuth } from '../middleware/authMiddleware';

const router = express.Router();

// Create a new course (teachers, admins)
router.post('/', authMiddleware, requireRole(['teacher', 'admin']), CourseController.createCourse);

// Get all courses with search and filters (public with optional auth for personalization)
router.get('/', optionalAuth, CourseController.searchCourses);

// Get course statistics (admin, staff only)
router.get('/stats', authMiddleware, requireRole(['admin', 'staff']), CourseController.getCourseStats);

// Get enrolled courses for current user (must be before /:courseId)
router.get('/enrolled', authMiddleware, CourseController.getEnrolledCourses);

// Get course categories (public)
router.get('/categories', CourseController.getCategories);

// Get course levels (public)
router.get('/levels', CourseController.getLevels);

// Get courses by instructor (public)
router.get('/instructor/:instructorId', CourseController.getCoursesByInstructor);

// Get course by ID (public with optional auth for enrolled details)
router.get('/:courseId', optionalAuth, CourseController.getCourse);

// Update course (instructors, admins)
router.put('/:courseId', authMiddleware, requireRole(['teacher', 'admin']), CourseController.updateCourse);

// Delete course (soft delete - admins only)
router.delete('/:courseId', authMiddleware, requireRole(['admin']), CourseController.deleteCourse);

// Publish course (instructors, admins)
router.patch('/:courseId/publish', authMiddleware, requireRole(['teacher', 'admin']), CourseController.publishCourse);

// Archive course (instructors, admins)
router.patch('/:courseId/archive', authMiddleware, requireRole(['teacher', 'admin']), CourseController.archiveCourse);

// Enroll student in course (students, admins)
router.post('/:courseId/enroll', authMiddleware, CourseController.enrollStudent);

// Unenroll student from course (students, admins)
router.post('/:courseId/unenroll', authMiddleware, CourseController.unenrollStudent);

// Get enrollment status for current user
router.get('/:courseId/enrollment-status', authMiddleware, CourseController.getEnrollmentStatus);

// Check enrollment eligibility
router.get('/:courseId/eligibility', authMiddleware, CourseController.checkEnrollmentEligibility);

// Get course progress for current user
router.get('/:courseId/progress', authMiddleware, CourseController.getCourseProgress);

// Update course progress
router.put('/:courseId/progress', authMiddleware, CourseController.updateCourseProgress);

// Get course feedback (authenticated users)
router.get('/:courseId/feedback', authMiddleware, CourseController.getCourseFeedback);

// Submit course feedback (enrolled students)
router.post('/:courseId/feedback', authMiddleware, CourseController.submitCourseFeedback);

// Get course prerequisites (public)
router.get('/:courseId/prerequisites', CourseController.getCoursePrerequisites);

// Export course data (instructors, admins)
router.get('/:courseId/export', authMiddleware, requireRole(['teacher', 'admin']), CourseController.exportCourseData);

// Import course data (admins only)
router.post('/import', authMiddleware, requireRole(['admin']), CourseController.importCourseData);

export default router;