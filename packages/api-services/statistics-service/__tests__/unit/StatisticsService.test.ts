// packages/api-services/statistics-service/__tests__/unit/StatisticsService.test.ts
// Comprehensive unit tests for StatisticsService

import mongoose from 'mongoose';
import { StatisticsService } from '../../src/services/StatisticsService';
import { 
  UserModel, 
  CourseModel, 
  CourseEnrollmentModel, 
  ExerciseSubmissionModel 
} from '@yggdrasil/database-schemas';

describe('StatisticsService Unit Tests', () => {
  let testUserId: string;
  let testTeacherId: string;
  let testCourseId: string;

  beforeEach(async () => {
    // Create test data
    const testUser = new UserModel({
      email: 'student@test.com',
      password: 'hashedpassword',
      role: 'student',
      profile: { firstName: 'Test', lastName: 'Student' },
      isActive: true
    });
    await testUser.save();
    testUserId = testUser._id.toString();

    const testTeacher = new UserModel({
      email: 'teacher@test.com',
      password: 'hashedpassword',
      role: 'teacher',
      profile: { firstName: 'Test', lastName: 'Teacher' },
      isActive: true
    });
    await testTeacher.save();
    testTeacherId = testTeacher._id.toString();

    const testCourse = new CourseModel({
      title: 'Test Course',
      description: 'Test Description',
      slug: 'test-course',
      category: 'Programming',
      level: 'beginner',
      status: 'published',
      instructor: {
        _id: testTeacherId,
        name: 'Test Teacher',
        email: 'teacher@test.com'
      },
      collaborators: [],
      thumbnail: '',
      tags: ['test'],
      prerequisites: [],
      estimatedDuration: 120,
      chapters: [{
        _id: new mongoose.Types.ObjectId(),
        title: 'Chapter 1',
        order: 1,
        sections: [{
          _id: new mongoose.Types.ObjectId(),
          title: 'Section 1',
          order: 1,
          content: [],
          isPublished: true,
          estimatedDuration: 30
        }],
        isPublished: true,
        estimatedDuration: 60
      }],
      resources: [],
      settings: {
        isPublic: true,
        allowEnrollment: true,
        requiresApproval: false,
        allowLateSubmissions: true,
        enableDiscussions: true,
        enableCollaboration: false
      },
      stats: {
        enrolledStudents: 0,
        completedStudents: 0,
        averageProgress: 0,
        totalViews: 0
      },
      version: 1,
      lastModified: new Date().toISOString(),
      createdAt: new Date(),
      updatedAt: new Date()
    });
    await testCourse.save();
    testCourseId = testCourse._id.toString();
  });

  describe('getStudentDashboard', () => {
    it('should return default dashboard data for new student', async () => {
      const result = await StatisticsService.getStudentDashboard(testUserId);

      expect(result).toBeDefined();
      expect(result.learningStats).toBeDefined();
      expect(result.learningStats.totalCourses).toBe(0);
      expect(result.learningStats.activeCourses).toBe(0);
      expect(result.learningStats.completedCourses).toBe(0);
      expect(result.learningStats.totalTimeSpent).toBe(0);
      expect(result.learningStats.averageProgress).toBe(0);
      expect(result.learningStats.weeklyProgress).toBe(0);
      expect(result.learningStats.totalExercises).toBe(0);
      expect(result.learningStats.completedExercises).toBe(0);
      expect(result.learningStats.averageScore).toBe(0);
      
      expect(result.courseProgress).toEqual([]);
      expect(result.recentActivity).toEqual([]);
      expect(result.achievements).toEqual([]);
    });

    it('should return correct data for student with enrollments', async () => {
      // Create enrollment
      const enrollment = new CourseEnrollmentModel({
        studentId: testUserId,
        courseId: testCourseId,
        enrollmentDate: new Date(),
        status: 'active',
        progress: {
          overallProgress: 25,
          completedSections: [],
          completedExercises: [],
          timeSpent: 60,
          lastAccessedAt: new Date()
        }
      });
      await enrollment.save();

      const result = await StatisticsService.getStudentDashboard(testUserId);

      expect(result.learningStats.totalCourses).toBe(1);
      expect(result.learningStats.activeCourses).toBe(1);
      expect(result.learningStats.completedCourses).toBe(0);
      expect(result.learningStats.totalTimeSpent).toBe(60);
      expect(result.learningStats.averageProgress).toBe(25);
      
      expect(result.courseProgress).toHaveLength(1);
      expect(result.courseProgress[0]?.courseTitle).toBe('Test Course');
      expect(result.courseProgress[0]?.progress).toBe(25);
      expect(result.courseProgress[0]?.timeSpent).toBe(60);
      expect(result.courseProgress[0]?.enrollmentStatus).toBe('active');
    });

    it('should calculate achievements for student with good progress', async () => {
      // Create multiple enrollments to trigger achievements
      for (let i = 0; i < 5; i++) {
        const course = new CourseModel({
          title: `Course ${i}`,
          description: 'Test',
          slug: `course-${i}`,
          category: 'Test',
          level: 'beginner',
          status: 'published',
          instructor: {
            _id: testTeacherId,
            name: 'Test Teacher',
            email: 'teacher@test.com'
          },
          collaborators: [],
          thumbnail: '',
          tags: [],
          prerequisites: [],
          estimatedDuration: 60,
          chapters: [],
          resources: [],
          settings: {
            isPublic: true,
            allowEnrollment: true,
            requiresApproval: false,
            allowLateSubmissions: true,
            enableDiscussions: true,
            enableCollaboration: false
          },
          stats: {
            enrolledStudents: 0,
            completedStudents: 0,
            averageProgress: 0,
            totalViews: 0
          },
          version: 1,
          lastModified: new Date().toISOString(),
          createdAt: new Date(),
          updatedAt: new Date()
        });
        await course.save();

        const enrollment = new CourseEnrollmentModel({
          studentId: testUserId,
          courseId: course._id,
          enrollmentDate: new Date(),
          status: 'completed',
          progress: {
            overallProgress: 100,
            completedSections: [],
            completedExercises: [],
            timeSpent: 120,
            lastAccessedAt: new Date()
          }
        });
        await enrollment.save();
      }

      const result = await StatisticsService.getStudentDashboard(testUserId);

      expect(result.learningStats.completedCourses).toBe(5);
      expect(result.achievements.length).toBeGreaterThan(0);
      
      const courseCompleterAchievement = result.achievements.find(a => a.title === 'Course Completer');
      expect(courseCompleterAchievement).toBeDefined();
    });

    it('should handle invalid user ID gracefully', async () => {
      const invalidUserId = new mongoose.Types.ObjectId().toString();
      
      const result = await StatisticsService.getStudentDashboard(invalidUserId);
      
      expect(result).toBeDefined();
      expect(result.learningStats.totalCourses).toBe(0);
      expect(result.courseProgress).toEqual([]);
    });
  });

  describe('getTeacherDashboard', () => {
    it('should return default dashboard data for teacher with no courses', async () => {
      const result = await StatisticsService.getTeacherDashboard(testTeacherId);

      expect(result).toBeDefined();
      expect(result.courseStats).toBeDefined();
      expect(result.courseStats.totalCourses).toBe(0);
      expect(result.courseStats.publishedCourses).toBe(0);
      expect(result.courseStats.draftCourses).toBe(0);
      expect(result.courseStats.totalStudents).toBe(0);
      expect(result.courseStats.activeStudents).toBe(0);
      expect(result.courseStats.averageProgress).toBe(0);
      expect(result.courseStats.totalSubmissions).toBe(0);
      expect(result.courseStats.pendingGrading).toBe(0);
      
      expect(result.courseAnalytics).toEqual([]);
      expect(result.recentSubmissions).toEqual([]);
    });

    it('should return correct data for teacher with courses and students', async () => {
      // Create enrollment for the test course
      const enrollment = new CourseEnrollmentModel({
        studentId: testUserId,
        courseId: testCourseId,
        enrollmentDate: new Date(),
        status: 'active',
        progress: {
          overallProgress: 50,
          completedSections: [],
          completedExercises: [],
          timeSpent: 90,
          lastAccessedAt: new Date()
        }
      });
      await enrollment.save();

      // Create exercise submission
      const submission = new ExerciseSubmissionModel({
        studentId: testUserId,
        courseId: testCourseId,
        exerciseId: new mongoose.Types.ObjectId().toString(),
        submissionData: {
          code: 'console.log("test");',
          language: 'javascript'
        },
        submittedAt: new Date(),
        status: 'pending',
        score: null,
        feedback: ''
      });
      await submission.save();

      const result = await StatisticsService.getTeacherDashboard(testTeacherId);

      expect(result.courseStats.totalCourses).toBe(1);
      expect(result.courseStats.publishedCourses).toBe(1);
      expect(result.courseStats.draftCourses).toBe(0);
      expect(result.courseStats.totalStudents).toBe(1);
      expect(result.courseStats.activeStudents).toBe(1);
      expect(result.courseStats.averageProgress).toBe(50);
      expect(result.courseStats.totalSubmissions).toBe(1);
      expect(result.courseStats.pendingGrading).toBe(1);
      
      expect(result.courseAnalytics).toHaveLength(1);
      expect(result.courseAnalytics[0]?.courseTitle).toBe('Test Course');
      expect(result.courseAnalytics[0]?.enrolledStudents).toBe(1);
      expect(result.courseAnalytics[0]?.averageProgress).toBe(50);
      
      expect(result.recentSubmissions).toHaveLength(1);
      expect(result.recentSubmissions[0]?.needsGrading).toBe(true);
    });

    it('should handle invalid teacher ID gracefully', async () => {
      const invalidTeacherId = new mongoose.Types.ObjectId().toString();
      
      const result = await StatisticsService.getTeacherDashboard(invalidTeacherId);
      
      expect(result).toBeDefined();
      expect(result.courseStats.totalCourses).toBe(0);
      expect(result.courseAnalytics).toEqual([]);
    });
  });

  describe('getAdminDashboard', () => {
    it('should return platform statistics', async () => {
      const result = await StatisticsService.getAdminDashboard();

      expect(result).toBeDefined();
      expect(result.platformStats).toBeDefined();
      expect(result.platformStats.totalUsers).toBe(2); // student and teacher
      expect(result.platformStats.totalCourses).toBe(1);
      expect(result.platformStats.totalEnrollments).toBe(0);
      expect(result.platformStats.totalSubmissions).toBe(0);
      
      expect(result.userBreakdown).toBeDefined();
      expect(result.userBreakdown.students).toBe(1);
      expect(result.userBreakdown.teachers).toBe(1);
      expect(result.userBreakdown.staff).toBe(0);
      expect(result.userBreakdown.admins).toBe(0);
      
      expect(result.courseMetrics).toBeDefined();
      expect(result.courseMetrics.mostPopularCourses).toBeDefined();
      expect(result.courseMetrics.topPerformingCourses).toBeDefined();
      
      expect(result.systemHealth).toBeDefined();
      expect(result.systemHealth.database).toBe('healthy');
    });

    it('should calculate correct platform engagement', async () => {
      // Create enrollment to test engagement calculation
      const enrollment = new CourseEnrollmentModel({
        studentId: testUserId,
        courseId: testCourseId,
        enrollmentDate: new Date(),
        status: 'active',
        progress: {
          overallProgress: 75,
          completedSections: [],
          completedExercises: [],
          timeSpent: 120,
          lastAccessedAt: new Date()
        }
      });
      await enrollment.save();

      const result = await StatisticsService.getAdminDashboard();

      expect(result.platformStats.totalEnrollments).toBe(1);
      expect(result.platformStats.platformEngagement).toBeGreaterThan(0);
      expect(result.courseMetrics.mostPopularCourses).toHaveLength(1);
      expect(result.courseMetrics.mostPopularCourses[0]?.title).toBe('Test Course');
      expect(result.courseMetrics.mostPopularCourses[0]?.enrollments).toBe(1);
    });
  });

  describe('updateStudentProgress', () => {
    beforeEach(async () => {
      // Create enrollment for progress updates
      const enrollment = new CourseEnrollmentModel({
        studentId: testUserId,
        courseId: testCourseId,
        enrollmentDate: new Date(),
        status: 'active',
        progress: {
          overallProgress: 0,
          completedSections: [],
          completedExercises: [],
          timeSpent: 0,
          lastAccessedAt: new Date()
        }
      });
      await enrollment.save();
    });

    it('should update section completion progress', async () => {
      const sectionId = 'section-123';
      const progressUpdate = {
        type: 'section_complete',
        sectionId: sectionId,
        timeSpent: 30
      };

      const result = await StatisticsService.updateStudentProgress(
        testUserId,
        testCourseId,
        progressUpdate
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('updated successfully');

      // Verify the enrollment was updated
      const updatedEnrollment = await CourseEnrollmentModel.findOne({
        studentId: testUserId,
        courseId: testCourseId
      });

      expect(updatedEnrollment?.progress.completedSections).toContain(sectionId);
      expect(updatedEnrollment?.progress.timeSpent).toBe(30);
      expect(updatedEnrollment?.progress.overallProgress).toBeGreaterThan(0);
    });

    it('should update exercise completion progress', async () => {
      const exerciseId = 'exercise-456';
      const progressUpdate = {
        type: 'exercise_complete',
        exerciseId: exerciseId,
        score: 85,
        timeSpent: 15
      };

      const result = await StatisticsService.updateStudentProgress(
        testUserId,
        testCourseId,
        progressUpdate
      );

      expect(result.success).toBe(true);

      // Verify the enrollment was updated
      const updatedEnrollment = await CourseEnrollmentModel.findOne({
        studentId: testUserId,
        courseId: testCourseId
      });

      expect(updatedEnrollment?.progress.completedExercises).toContain(exerciseId);
      expect(updatedEnrollment?.progress.timeSpent).toBe(15);
    });

    it('should handle non-existent enrollment gracefully', async () => {
      const nonExistentUserId = new mongoose.Types.ObjectId().toString();
      const progressUpdate = {
        type: 'section_complete',
        sectionId: 'section-123',
        timeSpent: 30
      };

      const result = await StatisticsService.updateStudentProgress(
        nonExistentUserId,
        testCourseId,
        progressUpdate
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Enrollment not found');
    });

    it('should handle invalid progress update type', async () => {
      const progressUpdate = {
        type: 'invalid_type',
        timeSpent: 30
      };

      const result = await StatisticsService.updateStudentProgress(
        testUserId,
        testCourseId,
        progressUpdate
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid progress update type');
    });
  });

  describe('getCourseAnalytics', () => {
    beforeEach(async () => {
      // Create multiple enrollments for analytics
      for (let i = 0; i < 3; i++) {
        const enrollment = new CourseEnrollmentModel({
          studentId: new mongoose.Types.ObjectId(),
          courseId: testCourseId,
          enrollmentDate: new Date(),
          status: i === 2 ? 'completed' : 'active',
          progress: {
            overallProgress: (i + 1) * 30,
            completedSections: [],
            completedExercises: [],
            timeSpent: (i + 1) * 60,
            lastAccessedAt: new Date()
          }
        });
        await enrollment.save();
      }
    });

    it('should return comprehensive course analytics', async () => {
      const result = await StatisticsService.getCourseAnalytics(testCourseId);

      expect(result).toBeDefined();
      expect(result.courseInfo).toBeDefined();
      expect(result.courseInfo.title).toBe('Test Course');
      
      expect(result.enrollmentStats).toBeDefined();
      expect(result.enrollmentStats.totalEnrollments).toBe(3);
      expect(result.enrollmentStats.activeEnrollments).toBe(2);
      expect(result.enrollmentStats.completedEnrollments).toBe(1);
      expect(result.enrollmentStats.dropoutRate).toBe(0);
      
      expect(result.progressStats).toBeDefined();
      expect(result.progressStats.averageProgress).toBe(60); // (30+60+90)/3
      expect(result.progressStats.progressDistribution).toHaveLength(4);
      
      expect(result.timeStats).toBeDefined();
      expect(result.timeStats.averageTimeSpent).toBe(120); // (60+120+180)/3
      expect(result.timeStats.totalTimeSpent).toBe(360);
      
      expect(result.recentActivity).toBeDefined();
      expect(result.recentActivity.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle non-existent course gracefully', async () => {
      const nonExistentCourseId = new mongoose.Types.ObjectId().toString();
      
      const result = await StatisticsService.getCourseAnalytics(nonExistentCourseId);
      
      expect(result.courseInfo).toBeNull();
      expect(result.enrollmentStats.totalEnrollments).toBe(0);
    });

    it('should calculate correct progress distribution', async () => {
      const result = await StatisticsService.getCourseAnalytics(testCourseId);
      
      const distribution = result.progressStats.progressDistribution;
      expect(distribution).toHaveLength(4);
      
      // Check that ranges sum to total enrollments
      const totalInRanges = distribution.reduce((sum: number, range: any) => sum + range.count, 0);
      expect(totalInRanges).toBe(3);
      
      // Verify range structure
      expect(distribution[0].range).toBe('0-25%');
      expect(distribution[1].range).toBe('26-50%');
      expect(distribution[2].range).toBe('51-75%');
      expect(distribution[3].range).toBe('76-100%');
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors gracefully', async () => {
      // Temporarily close the connection
      await mongoose.disconnect();
      
      try {
        await StatisticsService.getStudentDashboard(testUserId);
        // Should not reach here
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should validate user IDs properly', async () => {
      const invalidUserId = 'invalid-user-id';
      
      try {
        await StatisticsService.getStudentDashboard(invalidUserId);
        // Should not reach here if validation works
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('Performance', () => {
    it('should handle large datasets efficiently', async () => {
      // Create many enrollments to test performance
      const enrollments = [];
      for (let i = 0; i < 100; i++) {
        enrollments.push({
          studentId: new mongoose.Types.ObjectId(),
          courseId: testCourseId,
          enrollmentDate: new Date(),
          status: 'active',
          progress: {
            overallProgress: Math.floor(Math.random() * 100),
            completedSections: [],
            completedExercises: [],
            timeSpent: Math.floor(Math.random() * 300),
            lastAccessedAt: new Date()
          }
        });
      }
      await CourseEnrollmentModel.insertMany(enrollments);

      const startTime = Date.now();
      const result = await StatisticsService.getCourseAnalytics(testCourseId);
      const endTime = Date.now();

      expect(result).toBeDefined();
      expect(result.enrollmentStats.totalEnrollments).toBe(100);
      
      // Should complete within reasonable time (less than 5 seconds)
      expect(endTime - startTime).toBeLessThan(5000);
    });
  });
});