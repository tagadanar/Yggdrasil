// Path: packages/api-services/course-service/src/routes/courseRoutes.ts
import express from 'express';
import { CourseController } from '../controllers/CourseController';

const router = express.Router();

// Create a new course
router.post('/', CourseController.createCourse);

// Get all courses with search and filters
router.get('/', CourseController.searchCourses);

// Get course statistics
router.get('/stats', CourseController.getCourseStats);

// Get enrolled courses for current user (must be before /:courseId)
router.get('/enrolled', CourseController.getEnrolledCourses);

// Get course categories (must be before /:courseId)
router.get('/categories', CourseController.getCategories);

// Get course levels (must be before /:courseId)
router.get('/levels', CourseController.getLevels);

// Get courses by instructor
router.get('/instructor/:instructorId', CourseController.getCoursesByInstructor);

// Get course by ID
router.get('/:courseId', CourseController.getCourse);

// Update course
router.put('/:courseId', CourseController.updateCourse);

// Delete course (soft delete)
router.delete('/:courseId', CourseController.deleteCourse);

// Publish course
router.patch('/:courseId/publish', CourseController.publishCourse);

// Archive course
router.patch('/:courseId/archive', CourseController.archiveCourse);

// Enroll student in course
router.post('/:courseId/enroll', CourseController.enrollStudent);

// Unenroll student from course
router.post('/:courseId/unenroll', CourseController.unenrollStudent);

// Get enrollment status for current user
router.get('/:courseId/enrollment-status', CourseController.getEnrollmentStatus);

// Check enrollment eligibility
router.get('/:courseId/eligibility', CourseController.checkEnrollmentEligibility);

// Get course progress for current user
router.get('/:courseId/progress', CourseController.getCourseProgress);

// Update course progress
router.put('/:courseId/progress', CourseController.updateCourseProgress);

// Get course feedback
router.get('/:courseId/feedback', CourseController.getCourseFeedback);

// Submit course feedback
router.post('/:courseId/feedback', CourseController.submitCourseFeedback);

// Get course prerequisites
router.get('/:courseId/prerequisites', CourseController.getCoursePrerequisites);

// Export course data
router.get('/:courseId/export', CourseController.exportCourseData);

// Import course data
router.post('/import', CourseController.importCourseData);

export default router;