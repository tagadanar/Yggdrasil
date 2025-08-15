/**
 * Unit tests for StatisticsService
 * Tests the core business logic and data processing methods
 */

import { StatisticsService } from '../../src/services/StatisticsService';
import {
  UserModel,
  CourseModel,
  PromotionModel,
  PromotionProgressModel,
} from '@yggdrasil/database-schemas';

// Mock the database models
jest.mock('@yggdrasil/database-schemas', () => ({
  UserModel: {
    findById: jest.fn(),
    find: jest.fn(),
    countDocuments: jest.fn(),
  },
  CourseModel: {
    findById: jest.fn(),
    find: jest.fn(),
    countDocuments: jest.fn(),
  },
  PromotionModel: {
    find: jest.fn(),
    countDocuments: jest.fn(),
  },
  PromotionProgressModel: {
    findOrCreateForStudent: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    countDocuments: jest.fn(),
  },
  NewsModel: {
    find: jest.fn(),
    countDocuments: jest.fn(),
  },
}));

// Mock the logger
jest.mock('@yggdrasil/shared-utilities', () => ({
  statsLogger: {
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

describe('StatisticsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getStudentDashboard', () => {
    const mockStudent = {
      _id: 'student123',
      profile: { firstName: 'John', lastName: 'Doe' },
      currentPromotionId: 'promotion123',
    };

    const mockPromotionProgress = {
      coursesProgress: [
        {
          courseId: 'course1',
          progressPercentage: 80,
          chaptersCompleted: 4,
          totalChapters: 5,
          lastActivityAt: new Date(),
          timeSpent: 120,
          completedSections: ['section1', 'section2'],
          completedExercises: ['exercise1'],
        },
        {
          courseId: 'course2',
          progressPercentage: 100,
          chaptersCompleted: 3,
          totalChapters: 3,
          lastActivityAt: new Date(),
          timeSpent: 180,
          completedSections: ['section3', 'section4', 'section5'],
          completedExercises: ['exercise2', 'exercise3'],
        },
      ],
    };

    const mockCourse1 = { _id: 'course1', title: 'Introduction to Programming' };
    const mockCourse2 = { _id: 'course2', title: 'Advanced JavaScript' };

    it('should return student dashboard data successfully', async () => {
      // Mock database calls
      (UserModel.findById as jest.Mock).mockResolvedValue(mockStudent);
      (PromotionProgressModel.findOrCreateForStudent as jest.Mock).mockResolvedValue(
        mockPromotionProgress,
      );
      (CourseModel.findById as jest.Mock)
        .mockResolvedValueOnce(mockCourse1)
        .mockResolvedValueOnce(mockCourse2);

      const result = await StatisticsService.getStudentDashboard('student123');

      expect(result).toHaveProperty('learningStats');
      expect(result).toHaveProperty('courseProgress');
      expect(result).toHaveProperty('recentActivity');
      expect(result).toHaveProperty('achievements');

      expect(result.learningStats.totalCourses).toBe(2);
      expect(result.learningStats.activeCourses).toBe(1); // Only course1 is active (80% progress)
      expect(result.learningStats.completedCourses).toBe(1); // course2 is completed (100% progress)
      expect(result.learningStats.averageProgress).toBe(90); // (80 + 100) / 2 = 90

      expect(result.courseProgress).toHaveLength(2);
      expect(result.courseProgress[0].courseTitle).toBe('Introduction to Programming');
      expect(result.courseProgress[1].courseTitle).toBe('Advanced JavaScript');
    });

    it('should handle student not found', async () => {
      (UserModel.findById as jest.Mock).mockResolvedValue(null);

      await expect(StatisticsService.getStudentDashboard('nonexistent')).rejects.toThrow(
        'Student not found',
      );
    });

    it('should handle student with no promotion', async () => {
      const studentWithoutPromotion = { ...mockStudent, currentPromotionId: null };
      (UserModel.findById as jest.Mock).mockResolvedValue(studentWithoutPromotion);

      const result = await StatisticsService.getStudentDashboard('student123');

      expect(result.learningStats.totalCourses).toBe(0);
      expect(result.learningStats.activeCourses).toBe(0);
      expect(result.learningStats.completedCourses).toBe(0);
      expect(result.courseProgress).toEqual([]);
    });

    it('should calculate achievements correctly', async () => {
      (UserModel.findById as jest.Mock).mockResolvedValue(mockStudent);
      (PromotionProgressModel.findOrCreateForStudent as jest.Mock).mockResolvedValue(
        mockPromotionProgress,
      );
      (CourseModel.findById as jest.Mock)
        .mockResolvedValueOnce(mockCourse1)
        .mockResolvedValueOnce(mockCourse2);

      const result = await StatisticsService.getStudentDashboard('student123');

      // Should have achievements for completing first course
      expect(result.achievements).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'first-course',
            title: 'Course Completer',
          }),
        ]),
      );

      // With only 2 courses, high achiever won't trigger (needs 3+ courses)
    });
  });

  describe('getTeacherDashboard', () => {
    const mockTeacherCourses = [
      { _id: 'course1', title: 'Course 1', teacherId: 'teacher123', isActive: true },
      { _id: 'course2', title: 'Course 2', teacherId: 'teacher123', isActive: true },
    ];

    const mockPromotions = [
      { _id: 'promotion1', courses: [{ courseId: 'course1' }, { courseId: 'course2' }] },
    ];

    const mockStudents = [
      { _id: 'student1', profile: { firstName: 'John', lastName: 'Doe' } },
      { _id: 'student2', profile: { firstName: 'Jane', lastName: 'Smith' } },
    ];

    it('should return teacher dashboard data successfully', async () => {
      (CourseModel.find as jest.Mock).mockResolvedValue(mockTeacherCourses);
      (PromotionModel.find as jest.Mock).mockResolvedValue(mockPromotions);
      (UserModel.find as jest.Mock).mockResolvedValue(mockStudents);
      (PromotionProgressModel.findOne as jest.Mock).mockResolvedValue({
        coursesProgress: [
          { courseId: 'course1', progressPercentage: 75, lastActivityAt: new Date() },
          { courseId: 'course2', progressPercentage: 85, lastActivityAt: new Date() },
        ],
      });

      const result = await StatisticsService.getTeacherDashboard('teacher123');

      expect(result).toHaveProperty('teachingStats');
      expect(result).toHaveProperty('courseMetrics');
      expect(result).toHaveProperty('recentActivity');
      expect(result).toHaveProperty('studentProgress');

      expect(result.teachingStats.totalCourses).toBe(2);
      expect(result.teachingStats.activeCourses).toBe(2);
      expect(result.teachingStats.totalStudents).toBe(2);
    });
  });

  describe('getCourseAnalytics', () => {
    const mockCourse = { _id: 'course123', title: 'Test Course' };

    it('should return course analytics successfully', async () => {
      (CourseModel.findById as jest.Mock).mockResolvedValue(mockCourse);
      (PromotionModel.find as jest.Mock).mockResolvedValue([
        { _id: 'promotion1', courses: [{ courseId: 'course123' }] },
      ]);
      (PromotionProgressModel.find as jest.Mock).mockResolvedValue([
        {
          coursesProgress: [{ courseId: 'course123', progressPercentage: 80 }],
        },
        {
          coursesProgress: [{ courseId: 'course123', progressPercentage: 90 }],
        },
      ]);

      const result = await StatisticsService.getCourseAnalytics('course123');

      expect(result).toHaveProperty('overview');
      expect(result).toHaveProperty('progressDistribution');
      expect(result).toHaveProperty('performanceMetrics');
      expect(result).toHaveProperty('engagementMetrics');

      expect(result.overview.totalStudents).toBe(2);
      expect(result.overview.completionRate).toBe(0); // No students completed (>= 100%)
    });

    it('should handle course not found', async () => {
      (CourseModel.findById as jest.Mock).mockResolvedValue(null);

      await expect(StatisticsService.getCourseAnalytics('nonexistent')).rejects.toThrow(
        'Course not found',
      );
    });
  });

  describe('getAdminDashboard', () => {
    it('should return admin dashboard data successfully', async () => {
      // Mock all the database calls
      (UserModel.countDocuments as jest.Mock)
        .mockResolvedValueOnce(100) // total users
        .mockResolvedValueOnce(80) // students
        .mockResolvedValueOnce(15) // teachers
        .mockResolvedValueOnce(4) // staff
        .mockResolvedValueOnce(1) // admins
        .mockResolvedValueOnce(75); // active users

      (CourseModel.countDocuments as jest.Mock).mockResolvedValue(25);
      (PromotionModel.countDocuments as jest.Mock).mockResolvedValue(5);
      (PromotionProgressModel.countDocuments as jest.Mock).mockResolvedValue(200);
      (PromotionModel.find as jest.Mock).mockResolvedValue([]);
      (PromotionProgressModel.find as jest.Mock).mockResolvedValue([]);
      (CourseModel.find as jest.Mock).mockResolvedValue([]);

      const result = await StatisticsService.getAdminDashboard();

      expect(result).toHaveProperty('platformStats');
      expect(result).toHaveProperty('userBreakdown');
      expect(result).toHaveProperty('courseMetrics');
      expect(result).toHaveProperty('systemHealth');

      expect(result.platformStats.totalUsers).toBe(100);
      expect(result.platformStats.activeUsers).toBe(75);
      expect(result.platformStats.totalCourses).toBe(25);
      expect(result.platformStats.totalPromotions).toBe(5);

      expect(result.userBreakdown.students).toBe(80);
      expect(result.userBreakdown.teachers).toBe(15);
      expect(result.userBreakdown.staff).toBe(4);
      expect(result.userBreakdown.admins).toBe(1);

      expect(result.systemHealth.database).toBe('healthy');
    });
  });

  describe('updateStudentProgress', () => {
    const mockStudent = {
      _id: 'student123',
      currentPromotionId: 'promotion123',
    };

    const mockPromotionProgress = {
      coursesProgress: [
        {
          courseId: 'course123',
          progressPercentage: 50,
          timeSpent: 60,
          completedSections: ['section1'],
          completedExercises: ['exercise1'],
          lastActivityAt: new Date('2023-01-01'),
        },
      ],
      save: jest.fn(),
    };

    it('should update student progress successfully', async () => {
      (UserModel.findById as jest.Mock).mockResolvedValue(mockStudent);
      (PromotionProgressModel.findOrCreateForStudent as jest.Mock).mockResolvedValue(
        mockPromotionProgress,
      );

      const progressData = {
        timeSpent: 30,
        completedSections: ['section2'],
        completedExercises: ['exercise2'],
      };

      const result = await StatisticsService.updateStudentProgress(
        'student123',
        'course123',
        progressData,
      );

      expect(result.success).toBe(true);
      expect(result.message).toBe('Progress updated successfully');
      expect(mockPromotionProgress.save).toHaveBeenCalled();

      // Check that progress was updated
      const updatedCourseProgress = mockPromotionProgress.coursesProgress[0];
      expect(updatedCourseProgress.timeSpent).toBe(90); // 60 + 30
      expect(updatedCourseProgress.completedSections).toContain('section2');
      expect(updatedCourseProgress.completedExercises).toContain('exercise2');
    });

    it('should handle student not enrolled in promotion', async () => {
      const studentWithoutPromotion = { ...mockStudent, currentPromotionId: null };
      (UserModel.findById as jest.Mock).mockResolvedValue(studentWithoutPromotion);

      const result = await StatisticsService.updateStudentProgress('student123', 'course123', {});

      expect(result.success).toBe(false);
      expect(result.error).toBe('Student not enrolled in any promotion');
    });

    it('should handle course not found in promotion', async () => {
      (UserModel.findById as jest.Mock).mockResolvedValue(mockStudent);

      const progressWithoutCourse = {
        coursesProgress: [],
        save: jest.fn(),
      };
      (PromotionProgressModel.findOrCreateForStudent as jest.Mock).mockResolvedValue(
        progressWithoutCourse,
      );

      const result = await StatisticsService.updateStudentProgress('student123', 'nonexistent', {});

      expect(result.success).toBe(false);
      expect(result.error).toBe('Course not found in student promotion');
    });
  });
});
