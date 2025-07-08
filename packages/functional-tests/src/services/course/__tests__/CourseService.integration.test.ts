/**
 * Course Service Integration Tests
 * 
 * Tests integration scenarios between course service and other services:
 * - Course-User service integration (instructors, students)
 * - Course-Planning service integration (events, schedules)
 * - Course-News service integration (announcements)
 * - Course-Statistics service integration (analytics)
 * - Course-Notification service integration (enrollment notifications)
 * - Cross-service data consistency and synchronization
 * - Workflow scenarios spanning multiple services
 */

import { ApiClient } from '../../../utils/ApiClient';
import { AuthHelper, TestUser } from '../../../utils/AuthHelper';
import { TestDataFactory } from '../../../utils/TestDataFactory';
import { databaseHelper } from '../../../utils/DatabaseHelper';
import { testEnvironment } from '../../../config/environment';

describe('Course Service - Integration Tests', () => {
  let authHelper: AuthHelper;
  let courseClient: ApiClient;
  let userClient: ApiClient;
  let planningClient: ApiClient;
  let newsClient: ApiClient;
  let statisticsClient: ApiClient;
  let testUsers: {
    student: TestUser;
    teacher: TestUser;
    admin: TestUser;
  };

  beforeAll(async () => {
    authHelper = new AuthHelper();
    
    // Create test users
    testUsers = {
      student: await authHelper.createTestUser('student'),
      teacher: await authHelper.createTestUser('teacher'),
      admin: await authHelper.createTestUser('admin'),
    };

    // Create clients for different services
    courseClient = await authHelper.createAuthenticatedClient('course', testUsers.admin);
    userClient = await authHelper.createAuthenticatedClient('user', testUsers.admin);
    planningClient = await authHelper.createAuthenticatedClient('planning', testUsers.admin);
    newsClient = await authHelper.createAuthenticatedClient('news', testUsers.admin);
    statisticsClient = await authHelper.createAuthenticatedClient('statistics', testUsers.admin);
  });

  afterAll(async () => {
    await authHelper.cleanup();
  });

  beforeEach(async () => {
    await databaseHelper.cleanupTestData();
  });

  describe('Course-User Service Integration', () => {
    it('should maintain instructor data consistency between services', async () => {
      const instructor = testUsers.teacher;
      
      // Create course with instructor
      const courseData = TestDataFactory.createCourse(instructor.id!);
      const courseResponse = await courseClient.post('/api/courses', courseData);
      expect(courseResponse.status).toBe(201);
      
      const courseId = courseResponse.data.data.id;
      
      // Verify instructor details through user service
      const userResponse = await userClient.get(`/api/users/${instructor.id}`);
      expect(userResponse.status).toBe(200);
      expect(userResponse.data.data.role).toBe('teacher');
      
      // Get course details and verify instructor reference
      const courseDetailsResponse = await courseClient.get(`/api/courses/${courseId}`);
      expect(courseDetailsResponse.status).toBe(200);
      expect(courseDetailsResponse.data.data.instructor).toBe(instructor.id);
    });

    it('should handle instructor profile updates across services', async () => {
      const instructor = testUsers.teacher;
      
      // Create course
      const courseData = TestDataFactory.createCourse(instructor.id!);
      const courseResponse = await courseClient.post('/api/courses', courseData);
      const courseId = courseResponse.data.data.id;
      
      // Update instructor profile through user service
      const profileUpdate = {
        profile: {
          firstName: 'Updated',
          lastName: 'Instructor',
          title: 'Senior Professor'
        }
      };
      
      const updateResponse = await userClient.put(`/api/users/${instructor.id}`, profileUpdate);
      expect(updateResponse.status).toBe(200);
      
      // Verify course still references correct instructor
      const updatedCourseResponse = await courseClient.get(`/api/courses/${courseId}`);
      expect(updatedCourseResponse.status).toBe(200);
      expect(updatedCourseResponse.data.data.instructor).toBe(instructor.id);
      
      // Verify updated instructor information
      const updatedUserResponse = await userClient.get(`/api/users/${instructor.id}`);
      expect(updatedUserResponse.status).toBe(200);
      expect(updatedUserResponse.data.data.profile.firstName).toBe('Updated');
    });

    it('should handle student enrollment workflow across services', async () => {
      const student = testUsers.student;
      const instructor = testUsers.teacher;
      
      // Create and publish course
      const courseData = TestDataFactory.createCourse(instructor.id!);
      const courseResponse = await courseClient.post('/api/courses', courseData);
      const courseId = courseResponse.data.data.id;
      
      const publishResponse = await courseClient.patch(`/api/courses/${courseId}/publish`);
      expect(publishResponse.status).toBe(200);
      
      // Enroll student
      const studentClient = await authHelper.createAuthenticatedClient('course', student);
      const enrollResponse = await studentClient.post(`/api/courses/${courseId}/enroll`);
      expect(enrollResponse.status).toBe(200);
      
      // Verify enrollment through course service
      const enrollmentStatusResponse = await studentClient.get(`/api/courses/${courseId}/enrollment-status`);
      expect(enrollmentStatusResponse.status).toBe(200);
      expect(enrollmentStatusResponse.data.data.isEnrolled).toBe(true);
      
      // Verify enrolled courses list
      const enrolledCoursesResponse = await studentClient.get('/api/courses/enrolled');
      expect(enrolledCoursesResponse.status).toBe(200);
      expect(enrolledCoursesResponse.data.data.courses.length).toBe(1);
      expect(enrolledCoursesResponse.data.data.courses[0].id).toBe(courseId);
    });

    it('should handle instructor deactivation impact on courses', async () => {
      const instructor = testUsers.teacher;
      
      // Create multiple courses
      const courses = [];
      for (let i = 0; i < 3; i++) {
        const courseData = TestDataFactory.createCourse(instructor.id!, {
          title: `Course ${i + 1}`
        });
        const response = await courseClient.post('/api/courses', courseData);
        courses.push(response.data.data);
      }
      
      // Deactivate instructor through user service
      const deactivateResponse = await userClient.put(`/api/users/${instructor.id}/deactivate`);
      expect(deactivateResponse.status).toBe(200);
      
      // Verify instructor is deactivated
      const userStatusResponse = await userClient.get(`/api/users/${instructor.id}`);
      expect(userStatusResponse.status).toBe(200);
      expect(userStatusResponse.data.data.isActive).toBe(false);
      
      // Verify courses are still accessible but marked appropriately
      for (const course of courses) {
        const courseResponse = await courseClient.get(`/api/courses/${course.id}`);
        expect(courseResponse.status).toBe(200);
        // Course should still exist but instructor status should be reflected
      }
    });
  });

  describe('Course-Planning Service Integration', () => {
    it('should create course-related events in planning service', async () => {
      const instructor = testUsers.teacher;
      const student = testUsers.student;
      
      // Create and publish course
      const courseData = TestDataFactory.createCourse(instructor.id!, {
        title: 'Integration Test Course',
        startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
        endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 2 weeks from now
      });
      
      const courseResponse = await courseClient.post('/api/courses', courseData);
      const courseId = courseResponse.data.data.id;
      
      await courseClient.patch(`/api/courses/${courseId}/publish`);
      
      // Enroll student
      const studentClient = await authHelper.createAuthenticatedClient('course', student);
      await studentClient.post(`/api/courses/${courseId}/enroll`);
      
      // Create course-related event through planning service
      const eventData = TestDataFactory.createEvent(instructor.id!, {
        title: 'Course Lecture 1',
        type: 'class',
        courseId: courseId,
        attendees: [student.id!]
      });
      
      const eventResponse = await planningClient.post('/api/events', eventData);
      expect(eventResponse.status).toBe(201);
      
      // Verify event is linked to course
      const eventId = eventResponse.data.data.id;
      const eventDetailsResponse = await planningClient.get(`/api/events/${eventId}`);
      expect(eventDetailsResponse.status).toBe(200);
      expect(eventDetailsResponse.data.data.courseId).toBe(courseId);
    });

    it('should handle course schedule integration', async () => {
      const instructor = testUsers.teacher;
      
      // Create course with schedule
      const courseData = TestDataFactory.createCourse(instructor.id!, {
        schedule: [
          {
            day: 'monday',
            startTime: '09:00',
            endTime: '10:30',
            location: 'Room A101'
          },
          {
            day: 'wednesday',
            startTime: '09:00',
            endTime: '10:30',
            location: 'Room A101'
          }
        ]
      });
      
      const courseResponse = await courseClient.post('/api/courses', courseData);
      expect(courseResponse.status).toBe(201);
      
      const courseId = courseResponse.data.data.id;
      
      // Verify schedule is accessible
      const courseDetailsResponse = await courseClient.get(`/api/courses/${courseId}`);
      expect(courseDetailsResponse.status).toBe(200);
      expect(courseDetailsResponse.data.data.schedule).toBeInstanceOf(Array);
      expect(courseDetailsResponse.data.data.schedule.length).toBe(2);
    });

    it('should handle course archival impact on scheduled events', async () => {
      const instructor = testUsers.teacher;
      
      // Create and publish course
      const courseData = TestDataFactory.createCourse(instructor.id!);
      const courseResponse = await courseClient.post('/api/courses', courseData);
      const courseId = courseResponse.data.data.id;
      
      await courseClient.patch(`/api/courses/${courseId}/publish`);
      
      // Create future events for the course
      const futureEvent = TestDataFactory.createEvent(instructor.id!, {
        courseId: courseId,
        startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
        status: 'scheduled'
      });
      
      const eventResponse = await planningClient.post('/api/events', futureEvent);
      expect(eventResponse.status).toBe(201);
      
      // Archive the course
      const archiveResponse = await courseClient.patch(`/api/courses/${courseId}/archive`);
      expect(archiveResponse.status).toBe(200);
      
      // Verify course is archived
      const archivedCourseResponse = await courseClient.get(`/api/courses/${courseId}`);
      expect(archivedCourseResponse.status).toBe(200);
      expect(archivedCourseResponse.data.data.status).toBe('archived');
    });
  });

  describe('Course-News Service Integration', () => {
    it('should create course announcements through news service', async () => {
      const instructor = testUsers.teacher;
      const student = testUsers.student;
      
      // Create and publish course
      const courseData = TestDataFactory.createCourse(instructor.id!);
      const courseResponse = await courseClient.post('/api/courses', courseData);
      const courseId = courseResponse.data.data.id;
      
      await courseClient.patch(`/api/courses/${courseId}/publish`);
      
      // Enroll student
      const studentClient = await authHelper.createAuthenticatedClient('course', student);
      await studentClient.post(`/api/courses/${courseId}/enroll`);
      
      // Create course announcement through news service
      const announcementData = TestDataFactory.createArticle(instructor.id!, {
        title: 'Course Assignment Due',
        category: 'academic',
        targetAudience: ['student'],
        tags: [`course-${courseId}`]
      });
      
      const announcementResponse = await newsClient.post('/api/articles', announcementData);
      expect(announcementResponse.status).toBe(201);
      
      // Verify announcement is created
      const articleId = announcementResponse.data.data.id;
      const articleResponse = await newsClient.get(`/api/articles/${articleId}`);
      expect(articleResponse.status).toBe(200);
      expect(articleResponse.data.data.tags).toContain(`course-${courseId}`);
    });

    it('should handle course-specific news filtering', async () => {
      const instructor = testUsers.teacher;
      
      // Create multiple courses
      const course1Data = TestDataFactory.createCourse(instructor.id!, { title: 'Course 1' });
      const course2Data = TestDataFactory.createCourse(instructor.id!, { title: 'Course 2' });
      
      const course1Response = await courseClient.post('/api/courses', course1Data);
      const course2Response = await courseClient.post('/api/courses', course2Data);
      
      const course1Id = course1Response.data.data.id;
      const course2Id = course2Response.data.data.id;
      
      // Create course-specific announcements
      const announcement1 = TestDataFactory.createArticle(instructor.id!, {
        title: 'Course 1 Announcement',
        tags: [`course-${course1Id}`]
      });
      
      const announcement2 = TestDataFactory.createArticle(instructor.id!, {
        title: 'Course 2 Announcement',
        tags: [`course-${course2Id}`]
      });
      
      await newsClient.post('/api/articles', announcement1);
      await newsClient.post('/api/articles', announcement2);
      
      // Filter news by course
      const course1NewsResponse = await newsClient.get(`/api/articles?tags=course-${course1Id}`);
      expect(course1NewsResponse.status).toBe(200);
      
      const course1Articles = course1NewsResponse.data.data.articles;
      expect(course1Articles.length).toBe(1);
      expect(course1Articles[0].title).toBe('Course 1 Announcement');
    });

    it('should handle instructor role in news creation', async () => {
      const instructor = testUsers.teacher;
      
      // Create course
      const courseData = TestDataFactory.createCourse(instructor.id!);
      const courseResponse = await courseClient.post('/api/courses', courseData);
      const courseId = courseResponse.data.data.id;
      
      // Instructor creates news article
      const instructorNewsClient = await authHelper.createAuthenticatedClient('news', instructor);
      const newsData = TestDataFactory.createArticle(instructor.id!, {
        title: 'Course Update from Instructor',
        category: 'academic'
      });
      
      const newsResponse = await instructorNewsClient.post('/api/articles', newsData);
      expect(newsResponse.status).toBe(201);
      expect(newsResponse.data.data.author).toBe(instructor.id);
    });
  });

  describe('Course-Statistics Service Integration', () => {
    it('should track course enrollment statistics', async () => {
      const instructor = testUsers.teacher;
      const students = [];
      
      // Create multiple students
      for (let i = 0; i < 5; i++) {
        const student = await authHelper.createTestUser('student');
        students.push(student);
      }
      
      // Create and publish course
      const courseData = TestDataFactory.createCourse(instructor.id!, {
        capacity: 10
      });
      const courseResponse = await courseClient.post('/api/courses', courseData);
      const courseId = courseResponse.data.data.id;
      
      await courseClient.patch(`/api/courses/${courseId}/publish`);
      
      // Enroll students
      for (const student of students) {
        const studentClient = await authHelper.createAuthenticatedClient('course', student);
        await studentClient.post(`/api/courses/${courseId}/enroll`);
      }
      
      // Check course statistics
      const statsResponse = await statisticsClient.get('/api/statistics/courses');
      expect(statsResponse.status).toBe(200);
      
      // Verify enrollment statistics
      const courseStats = statsResponse.data.data.find((stat: any) => stat.courseId === courseId);
      expect(courseStats).toBeDefined();
      expect(courseStats.enrollmentCount).toBe(5);
    });

    it('should track course completion rates', async () => {
      const instructor = testUsers.teacher;
      const student = testUsers.student;
      
      // Create and setup course
      const courseData = TestDataFactory.createCourse(instructor.id!);
      const courseResponse = await courseClient.post('/api/courses', courseData);
      const courseId = courseResponse.data.data.id;
      
      await courseClient.patch(`/api/courses/${courseId}/publish`);
      
      // Enroll and track progress
      const studentClient = await authHelper.createAuthenticatedClient('course', student);
      await studentClient.post(`/api/courses/${courseId}/enroll`);
      
      // Update progress
      const progressData = {
        completionPercentage: 100,
        completedModules: ['module1', 'module2', 'module3']
      };
      
      await studentClient.put(`/api/courses/${courseId}/progress`, progressData);
      
      // Check completion statistics
      const completionStatsResponse = await statisticsClient.get(`/api/statistics/courses/${courseId}/completion`);
      expect(completionStatsResponse.status).toBe(200);
      expect(completionStatsResponse.data.data.completionRate).toBeGreaterThan(0);
    });

    it('should aggregate course analytics across services', async () => {
      const instructor = testUsers.teacher;
      
      // Create multiple courses with different characteristics
      const courses = [];
      for (let i = 0; i < 3; i++) {
        const courseData = TestDataFactory.createCourse(instructor.id!, {
          category: i === 0 ? 'programming' : 'design',
          level: ['beginner', 'intermediate', 'advanced'][i]
        });
        
        const response = await courseClient.post('/api/courses', courseData);
        courses.push(response.data.data);
      }
      
      // Get aggregated analytics
      const analyticsResponse = await statisticsClient.get('/api/statistics/courses/analytics');
      expect(analyticsResponse.status).toBe(200);
      
      const analytics = analyticsResponse.data.data;
      expect(analytics.totalCourses).toBeGreaterThanOrEqual(3);
      expect(analytics.categoriesDistribution).toBeDefined();
      expect(analytics.levelDistribution).toBeDefined();
    });
  });

  describe('Cross-Service Data Consistency', () => {
    it('should maintain data consistency during complex workflows', async () => {
      const instructor = testUsers.teacher;
      const student = testUsers.student;
      
      // Complex workflow: Create course, enroll student, create events, publish news
      
      // 1. Create course
      const courseData = TestDataFactory.createCourse(instructor.id!, {
        title: 'Consistency Test Course'
      });
      const courseResponse = await courseClient.post('/api/courses', courseData);
      const courseId = courseResponse.data.data.id;
      
      // 2. Publish course
      await courseClient.patch(`/api/courses/${courseId}/publish`);
      
      // 3. Enroll student
      const studentClient = await authHelper.createAuthenticatedClient('course', student);
      await studentClient.post(`/api/courses/${courseId}/enroll`);
      
      // 4. Create related event
      const eventData = TestDataFactory.createEvent(instructor.id!, {
        courseId: courseId,
        attendees: [student.id!]
      });
      const eventResponse = await planningClient.post('/api/events', eventData);
      
      // 5. Create related news
      const newsData = TestDataFactory.createArticle(instructor.id!, {
        tags: [`course-${courseId}`]
      });
      const newsResponse = await newsClient.post('/api/articles', newsData);
      
      // Verify all services have consistent data
      expect(courseResponse.status).toBe(201);
      expect(eventResponse.status).toBe(201);
      expect(newsResponse.status).toBe(201);
      
      // Verify cross-references
      expect(eventResponse.data.data.courseId).toBe(courseId);
      expect(newsResponse.data.data.tags).toContain(`course-${courseId}`);
    });

    it('should handle concurrent operations across services', async () => {
      const instructor = testUsers.teacher;
      
      // Create course
      const courseData = TestDataFactory.createCourse(instructor.id!);
      const courseResponse = await courseClient.post('/api/courses', courseData);
      const courseId = courseResponse.data.data.id;
      
      await courseClient.patch(`/api/courses/${courseId}/publish`);
      
      // Perform concurrent operations
      const operations = [
        // Multiple students enrolling
        ...Array(3).fill(null).map(async () => {
          const student = await authHelper.createTestUser('student');
          const studentClient = await authHelper.createAuthenticatedClient('course', student);
          return studentClient.post(`/api/courses/${courseId}/enroll`);
        }),
        
        // Creating events
        planningClient.post('/api/events', TestDataFactory.createEvent(instructor.id!, {
          courseId: courseId
        })),
        
        // Creating news
        newsClient.post('/api/articles', TestDataFactory.createArticle(instructor.id!, {
          tags: [`course-${courseId}`]
        }))
      ];
      
      const results = await Promise.allSettled(operations);
      
      // Most operations should succeed
      const successfulOps = results.filter(r => 
        r.status === 'fulfilled' && r.value.status < 400
      );
      expect(successfulOps.length).toBeGreaterThan(3);
    });

    it('should handle service interdependencies', async () => {
      const instructor = testUsers.teacher;
      const student = testUsers.student;
      
      // Create course
      const courseData = TestDataFactory.createCourse(instructor.id!);
      const courseResponse = await courseClient.post('/api/courses', courseData);
      const courseId = courseResponse.data.data.id;
      
      // Update instructor profile while course exists
      const profileUpdate = {
        profile: {
          firstName: 'Updated',
          lastName: 'Professor'
        }
      };
      
      const userUpdateResponse = await userClient.put(`/api/users/${instructor.id}`, profileUpdate);
      expect(userUpdateResponse.status).toBe(200);
      
      // Verify course still works after user update
      const courseAfterUserUpdate = await courseClient.get(`/api/courses/${courseId}`);
      expect(courseAfterUserUpdate.status).toBe(200);
      expect(courseAfterUserUpdate.data.data.instructor).toBe(instructor.id);
      
      // Enroll student
      await courseClient.patch(`/api/courses/${courseId}/publish`);
      const studentClient = await authHelper.createAuthenticatedClient('course', student);
      await studentClient.post(`/api/courses/${courseId}/enroll`);
      
      // Update student profile
      const studentUpdate = await userClient.put(`/api/users/${student.id}`, {
        profile: { firstName: 'Updated', lastName: 'Student' }
      });
      expect(studentUpdate.status).toBe(200);
      
      // Verify enrollment still works
      const enrollmentStatus = await studentClient.get(`/api/courses/${courseId}/enrollment-status`);
      expect(enrollmentStatus.status).toBe(200);
      expect(enrollmentStatus.data.data.isEnrolled).toBe(true);
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle partial service failures gracefully', async () => {
      const instructor = testUsers.teacher;
      
      // Create course (this should always work)
      const courseData = TestDataFactory.createCourse(instructor.id!);
      const courseResponse = await courseClient.post('/api/courses', courseData);
      expect(courseResponse.status).toBe(201);
      
      const courseId = courseResponse.data.data.id;
      
      // Try operations that might fail due to service issues
      try {
        await planningClient.post('/api/events', TestDataFactory.createEvent(instructor.id!, {
          courseId: courseId
        }));
      } catch (error) {
        // Event creation might fail, but course should still be accessible
        const courseStillExists = await courseClient.get(`/api/courses/${courseId}`);
        expect(courseStillExists.status).toBe(200);
      }
    });

    it('should handle data cleanup on course deletion', async () => {
      const instructor = testUsers.teacher;
      
      // Create course with related data
      const courseData = TestDataFactory.createCourse(instructor.id!);
      const courseResponse = await courseClient.post('/api/courses', courseData);
      const courseId = courseResponse.data.data.id;
      
      // Create related event
      const eventData = TestDataFactory.createEvent(instructor.id!, {
        courseId: courseId
      });
      await planningClient.post('/api/events', eventData);
      
      // Create related news
      const newsData = TestDataFactory.createArticle(instructor.id!, {
        tags: [`course-${courseId}`]
      });
      await newsClient.post('/api/articles', newsData);
      
      // Delete course
      const deleteResponse = await courseClient.delete(`/api/courses/${courseId}`);
      expect(deleteResponse.status).toBe(200);
      
      // Verify course is deleted/archived
      const deletedCourseResponse = await courseClient.get(`/api/courses/${courseId}`);
      expect(deletedCourseResponse.status).toBeOneOf([404, 200]);
      
      if (deletedCourseResponse.status === 200) {
        // If soft delete, status should be archived or deleted
        expect(deletedCourseResponse.data.data.status).toBeOneOf(['archived', 'deleted']);
      }
    });
  });

  describe('Performance with Multiple Services', () => {
    it('should handle complex queries across services efficiently', async () => {
      const instructor = testUsers.teacher;
      
      // Create course
      const courseData = TestDataFactory.createCourse(instructor.id!);
      const courseResponse = await courseClient.post('/api/courses', courseData);
      const courseId = courseResponse.data.data.id;
      
      await courseClient.patch(`/api/courses/${courseId}/publish`);
      
      // Complex operation involving multiple services
      const startTime = Date.now();
      
      const operations = await Promise.all([
        courseClient.get(`/api/courses/${courseId}`),
        userClient.get(`/api/users/${instructor.id}`),
        planningClient.get('/api/events?limit=5'),
        newsClient.get('/api/articles?limit=5'),
        statisticsClient.get('/api/statistics/dashboard')
      ]);
      
      const endTime = Date.now();
      
      // All operations should complete within reasonable time
      expect(endTime - startTime).toBeLessThan(5000);
      
      // All operations should succeed
      operations.forEach(response => {
        expect(response.status).toBe(200);
      });
    });
  });
});

// Helper custom matchers
expect.extend({
  toBeOneOf(received: any, expected: any[]) {
    const pass = expected.includes(received);
    if (pass) {
      return {
        message: () => `expected ${received} not to be one of ${expected.join(', ')}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be one of ${expected.join(', ')}`,
        pass: false,
      };
    }
  }
});

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeOneOf(expected: any[]): R;
    }
  }
}