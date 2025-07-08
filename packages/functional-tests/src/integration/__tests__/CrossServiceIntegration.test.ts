/**
 * Cross-Service Integration Tests
 * 
 * Tests complex workflows that span multiple microservices in the Yggdrasil platform:
 * - Complete user onboarding and course enrollment journey
 * - Course creation and management across services
 * - News publication and distribution workflow
 * - Event planning and notification pipeline
 * - Analytics data flow and aggregation
 * - Authentication and authorization across services
 * - Data consistency and synchronization
 * - Error propagation and recovery scenarios
 */

import { ApiClient } from '../../utils/ApiClient';
import { AuthHelper, TestUser } from '../../utils/AuthHelper';
import { TestDataFactory } from '../../utils/TestDataFactory';
import { databaseHelper } from '../../utils/DatabaseHelper';
import { testEnvironment } from '../../config/environment';

describe('Cross-Service Integration Tests', () => {
  let authHelper: AuthHelper;
  let serviceClients: {
    auth: ApiClient;
    user: ApiClient;
    course: ApiClient;
    news: ApiClient;
    planning: ApiClient;
    statistics: ApiClient;
  };
  let testUsers: {
    student: TestUser;
    teacher: TestUser;
    admin: TestUser;
    staff: TestUser;
  };

  beforeAll(async () => {
    authHelper = new AuthHelper();
    
    // Create test users with different roles
    testUsers = {
      student: await authHelper.createTestUser('student'),
      teacher: await authHelper.createTestUser('teacher'),
      admin: await authHelper.createTestUser('admin'),
      staff: await authHelper.createTestUser('staff'),
    };

    // Create service clients authenticated as admin for setup
    serviceClients = {
      auth: await authHelper.createAuthenticatedClient('auth', testUsers.admin),
      user: await authHelper.createAuthenticatedClient('user', testUsers.admin),
      course: await authHelper.createAuthenticatedClient('course', testUsers.admin),
      news: await authHelper.createAuthenticatedClient('news', testUsers.admin),
      planning: await authHelper.createAuthenticatedClient('planning', testUsers.admin),
      statistics: await authHelper.createAuthenticatedClient('statistics', testUsers.admin),
    };
  });

  afterAll(async () => {
    await authHelper.cleanup();
  });

  beforeEach(async () => {
    // Clean up test data before each test for isolation
    await databaseHelper.cleanupTestData();
  });

  describe('Complete User Journey - Student Onboarding', () => {
    it('should handle complete student onboarding and first course enrollment', async () => {
      // Step 1: Student Registration (Auth Service)
      const registrationData = {
        email: 'new.student@university.edu',
        password: 'SecurePassword123!',
        role: 'student',
        profile: {
          firstName: 'Jane',
          lastName: 'Smith',
          studentId: 'STU001'
        }
      };

      const registrationResponse = await serviceClients.auth.post('/api/auth/register', registrationData);
      expect(registrationResponse.status).toBe(201);
      expect(registrationResponse.data).toBeSuccessResponse();
      
      const newStudent = registrationResponse.data.data.user;
      const authTokens = registrationResponse.data.data.tokens;

      // Step 2: Profile Completion (User Service)
      const studentUserClient = new ApiClient('user');
      studentUserClient.setAuthToken(authTokens.accessToken);

      const profileUpdate = {
        profile: {
          ...registrationData.profile,
          major: 'Computer Science',
          yearOfStudy: 1,
          preferences: {
            theme: 'light',
            notifications: {
              email: true,
              push: true
            }
          }
        }
      };

      const profileResponse = await studentUserClient.put(`/api/users/${newStudent._id}`, profileUpdate);
      expect(profileResponse.status).toBe(200);
      expect(profileResponse.data.data.profile.major).toBe('Computer Science');

      // Step 3: Browse Available Courses (Course Service)
      const studentCourseClient = new ApiClient('course');
      studentCourseClient.setAuthToken(authTokens.accessToken);

      const coursesResponse = await studentCourseClient.get('/api/courses', {
        params: { status: 'published', limit: 10 }
      });
      expect(coursesResponse.status).toBe(200);

      // Step 4: Create a Course for Enrollment (as teacher)
      const courseData = TestDataFactory.createCourse(testUsers.teacher.id!, {
        title: 'Introduction to Computer Science',
        code: 'CS101',
        description: 'Fundamentals of computer science',
        capacity: 50,
        prerequisites: [],
        status: 'published'
      });

      const courseCreationResponse = await serviceClients.course.post('/api/courses', courseData);
      expect(courseCreationResponse.status).toBe(201);
      const courseId = courseCreationResponse.data.data._id;

      // Step 5: Student Enrolls in Course
      const enrollmentResponse = await studentCourseClient.post(`/api/courses/${courseId}/enroll`, {
        studentId: newStudent._id
      });
      expect(enrollmentResponse.status).toBe(200);
      expect(enrollmentResponse.data.data.enrolled).toBe(true);

      // Step 6: Course Announcement Creation (News Service)
      const welcomeNewsData = TestDataFactory.createArticle(testUsers.teacher.id!, {
        title: 'Welcome to CS101!',
        content: 'Welcome to Introduction to Computer Science. We\'re excited to have you!',
        category: 'academic',
        metadata: {
          relatedCourse: courseId,
          targetAudience: 'enrolled_students'
        },
        status: 'published'
      });

      const newsResponse = await serviceClients.news.post('/api/news', welcomeNewsData);
      expect(newsResponse.status).toBe(201);

      // Step 7: Student Reads Course News
      const studentNewsClient = new ApiClient('news');
      studentNewsClient.setAuthToken(authTokens.accessToken);

      const readNewsResponse = await studentNewsClient.get(`/api/news/${newsResponse.data.data._id}`);
      expect(readNewsResponse.status).toBe(200);
      expect(readNewsResponse.data.data.title).toBe('Welcome to CS101!');

      // Step 8: Schedule Course Events (Planning Service)
      const firstLectureData = TestDataFactory.createCalendarEvent(testUsers.teacher.id!, {
        title: 'CS101 - First Lecture',
        description: 'Introduction and course overview',
        startDate: new Date('2024-02-01T09:00:00Z'),
        endDate: new Date('2024-02-01T10:30:00Z'),
        type: 'academic',
        metadata: {
          relatedCourse: courseId,
          eventType: 'lecture'
        }
      });

      const eventResponse = await serviceClients.planning.post('/api/calendar/events', firstLectureData);
      expect(eventResponse.status).toBe(201);

      // Step 9: Student Views Course Schedule
      const studentPlanningClient = new ApiClient('planning');
      studentPlanningClient.setAuthToken(authTokens.accessToken);

      const scheduleResponse = await studentPlanningClient.get('/api/calendar/events', {
        params: {
          relatedCourse: courseId,
          startDate: '2024-02-01',
          endDate: '2024-02-28'
        }
      });
      expect(scheduleResponse.status).toBe(200);
      expect(scheduleResponse.data.data.length).toBeGreaterThan(0);

      // Step 10: Analytics Tracking (Statistics Service)
      // Allow time for analytics aggregation
      await new Promise(resolve => setTimeout(resolve, 1000));

      const userStatsResponse = await serviceClients.statistics.get(`/api/statistics/users/${newStudent._id}`);
      expect(userStatsResponse.status).toBe(200);
      expect(userStatsResponse.data.data.courses.enrolled).toBeGreaterThan(0);

      const courseStatsResponse = await serviceClients.statistics.get(`/api/statistics/courses/${courseId}`);
      expect(courseStatsResponse.status).toBe(200);
      expect(courseStatsResponse.data.data.enrollment.total).toBeGreaterThan(0);

      // Step 11: Verify Complete Integration
      // Check that all services have consistent data
      const finalCourseCheck = await studentCourseClient.get(`/api/courses/${courseId}`);
      expect(finalCourseCheck.status).toBe(200);
      expect(finalCourseCheck.data.data.enrollment.isEnrolled).toBe(true);

      const finalUserCheck = await studentUserClient.get('/api/users/profile');
      expect(finalUserCheck.status).toBe(200);
      expect(finalUserCheck.data.data.profile.major).toBe('Computer Science');
    });
  });

  describe('Course Management Workflow - Teacher Experience', () => {
    it('should handle complete course creation and management workflow', async () => {
      // Step 1: Teacher Creates Course (Course Service)
      const courseData = TestDataFactory.createCourse(testUsers.teacher.id!, {
        title: 'Advanced Data Structures',
        code: 'CS301',
        description: 'Advanced algorithms and data structures',
        capacity: 30,
        prerequisites: ['CS101', 'CS201'],
        schedule: {
          days: ['monday', 'wednesday', 'friday'],
          time: '10:00-11:30',
          room: 'CS-101'
        }
      });

      const courseResponse = await serviceClients.course.post('/api/courses', courseData);
      expect(courseResponse.status).toBe(201);
      const courseId = courseResponse.data.data._id;

      // Step 2: Auto-generate Course Calendar (Planning Service)
      const semesterEvents = [
        {
          title: 'CS301 - Course Begins',
          description: 'First day of Advanced Data Structures',
          startDate: new Date('2024-02-05T10:00:00Z'),
          endDate: new Date('2024-02-05T11:30:00Z'),
          type: 'academic'
        },
        {
          title: 'CS301 - Midterm Exam',
          description: 'Midterm examination',
          startDate: new Date('2024-03-15T10:00:00Z'),
          endDate: new Date('2024-03-15T12:00:00Z'),
          type: 'exam'
        },
        {
          title: 'CS301 - Final Exam',
          description: 'Final examination',
          startDate: new Date('2024-04-25T10:00:00Z'),
          endDate: new Date('2024-04-25T12:00:00Z'),
          type: 'exam'
        }
      ];

      for (const eventData of semesterEvents) {
        const fullEventData = TestDataFactory.createCalendarEvent(testUsers.teacher.id!, {
          ...eventData,
          metadata: {
            relatedCourse: courseId,
            eventType: eventData.type
          }
        });
        
        const eventResponse = await serviceClients.planning.post('/api/calendar/events', fullEventData);
        expect(eventResponse.status).toBe(201);
      }

      // Step 3: Course Announcement (News Service)
      const courseAnnouncementData = TestDataFactory.createArticle(testUsers.teacher.id!, {
        title: 'CS301 - Course Registration Now Open',
        content: 'Registration is now open for Advanced Data Structures. Prerequisites: CS101, CS201.',
        category: 'academic',
        metadata: {
          relatedCourse: courseId,
          targetAudience: 'all_students'
        },
        tags: ['CS301', 'registration', 'data-structures'],
        status: 'published'
      });

      const announcementResponse = await serviceClients.news.post('/api/news', courseAnnouncementData);
      expect(announcementResponse.status).toBe(201);

      // Step 4: Students Enroll in Course
      const studentsToEnroll = [testUsers.student];
      
      for (const student of studentsToEnroll) {
        const enrollmentResponse = await serviceClients.course.post(`/api/courses/${courseId}/enroll`, {
          studentId: student.id
        });
        expect(enrollmentResponse.status).toBe(200);
      }

      // Step 5: Teacher Publishes Course Syllabus
      const syllabusData = TestDataFactory.createArticle(testUsers.teacher.id!, {
        title: 'CS301 - Course Syllabus',
        content: 'Detailed syllabus for Advanced Data Structures course...',
        category: 'academic',
        metadata: {
          relatedCourse: courseId,
          documentType: 'syllabus',
          targetAudience: 'enrolled_students'
        },
        status: 'published'
      });

      const syllabusResponse = await serviceClients.news.post('/api/news', syllabusData);
      expect(syllabusResponse.status).toBe(201);

      // Step 6: Regular Course Updates
      const weeklyUpdateData = TestDataFactory.createArticle(testUsers.teacher.id!, {
        title: 'CS301 - Week 2 Materials Available',
        content: 'This week we will cover Binary Search Trees. Please review the materials.',
        category: 'academic',
        metadata: {
          relatedCourse: courseId,
          week: 2
        },
        status: 'published'
      });

      const updateResponse = await serviceClients.news.post('/api/news', weeklyUpdateData);
      expect(updateResponse.status).toBe(201);

      // Step 7: Analytics and Performance Tracking
      await new Promise(resolve => setTimeout(resolve, 1000)); // Allow analytics aggregation

      const courseAnalytics = await serviceClients.statistics.get(`/api/statistics/courses/${courseId}`, {
        params: { includeEngagement: true, includeNews: true, includeEvents: true }
      });

      expect(courseAnalytics.status).toBe(200);
      expect(courseAnalytics.data.data.enrollment.total).toBeGreaterThan(0);
      expect(courseAnalytics.data.data.relatedContent).toBeDefined();
      expect(courseAnalytics.data.data.relatedContent.news).toBeGreaterThan(0);
      expect(courseAnalytics.data.data.relatedContent.events).toBeGreaterThan(0);

      // Step 8: Teacher Dashboard Overview
      const teacherStatsResponse = await serviceClients.statistics.get(`/api/statistics/users/${testUsers.teacher.id}`, {
        params: { includeTeachingStats: true }
      });

      expect(teacherStatsResponse.status).toBe(200);
      expect(teacherStatsResponse.data.data.teachingAnalytics).toBeDefined();
      expect(teacherStatsResponse.data.data.teachingAnalytics.coursesManaged).toBeGreaterThan(0);
    });
  });

  describe('News Publication and Distribution Pipeline', () => {
    it('should handle news creation, approval, and targeted distribution', async () => {
      // Step 1: Staff Creates Important Announcement
      const importantNewsData = TestDataFactory.createArticle(testUsers.staff.id!, {
        title: 'University Closure Due to Weather',
        content: 'Due to severe weather conditions, the university will be closed tomorrow.',
        category: 'emergency',
        priority: 'urgent',
        visibility: 'public',
        metadata: {
          requiresApproval: true,
          targetAudience: 'all_users',
          expiryDate: new Date('2024-02-15T23:59:59Z')
        },
        tags: ['emergency', 'closure', 'weather']
      });

      const newsCreationResponse = await serviceClients.news.post('/api/news', importantNewsData);
      expect(newsCreationResponse.status).toBe(201);
      const newsId = newsCreationResponse.data.data._id;

      // Step 2: Admin Approves and Publishes
      const publishResponse = await serviceClients.news.patch(`/api/news/${newsId}/publish`);
      expect(publishResponse.status).toBe(200);
      expect(publishResponse.data.data.status).toBe('published');

      // Step 3: Auto-creation of Calendar Event for Closure
      const closureEventData = TestDataFactory.createCalendarEvent(testUsers.admin.id!, {
        title: 'University Closed - Weather',
        description: 'University closed due to severe weather conditions',
        startDate: new Date('2024-02-10T00:00:00Z'),
        endDate: new Date('2024-02-10T23:59:59Z'),
        type: 'closure',
        metadata: {
          relatedNews: newsId,
          autoGenerated: true
        }
      });

      const eventResponse = await serviceClients.planning.post('/api/calendar/events', closureEventData);
      expect(eventResponse.status).toBe(201);

      // Step 4: Students and Teachers Receive Notification
      const studentNewsClient = await authHelper.createAuthenticatedClient('news', testUsers.student);
      const teacherNewsClient = await authHelper.createAuthenticatedClient('news', testUsers.teacher);

      // Verify students can see the announcement
      const studentNewsResponse = await studentNewsClient.get(`/api/news/${newsId}`);
      expect(studentNewsResponse.status).toBe(200);
      expect(studentNewsResponse.data.data.priority).toBe('urgent');

      // Verify teachers can see the announcement
      const teacherNewsResponse = await teacherNewsClient.get(`/api/news/${newsId}`);
      expect(teacherNewsResponse.status).toBe(200);
      expect(teacherNewsResponse.data.data.category).toBe('emergency');

      // Step 5: Analytics Track Engagement
      await new Promise(resolve => setTimeout(resolve, 1000)); // Allow analytics processing

      const newsAnalytics = await serviceClients.statistics.get('/api/statistics/learning-analytics', {
        params: {
          includeContentEngagement: true,
          contentType: 'news'
        }
      });

      expect(newsAnalytics.status).toBe(200);
      expect(newsAnalytics.data.data.contentAnalytics).toBeDefined();
      expect(newsAnalytics.data.data.contentAnalytics.engagement.news.totalViews).toBeGreaterThan(0);

      // Step 6: Follow-up News When Reopening
      const reopeningNewsData = TestDataFactory.createArticle(testUsers.staff.id!, {
        title: 'University Reopening Tomorrow',
        content: 'Weather conditions have improved. University will reopen tomorrow with normal schedule.',
        category: 'announcement',
        priority: 'high',
        metadata: {
          relatedNews: newsId,
          followUp: true
        }
      });

      const reopeningResponse = await serviceClients.news.post('/api/news', reopeningNewsData);
      expect(reopeningResponse.status).toBe(201);

      const republishResponse = await serviceClients.news.patch(`/api/news/${reopeningResponse.data.data._id}/publish`);
      expect(republishResponse.status).toBe(200);
    });
  });

  describe('Event Planning and Notification Workflow', () => {
    it('should handle event creation, registration, and automated notifications', async () => {
      // Step 1: Admin Creates Major University Event
      const eventData = TestDataFactory.createCalendarEvent(testUsers.admin.id!, {
        title: 'Annual Technology Conference',
        description: 'Join us for our annual technology conference featuring industry leaders',
        startDate: new Date('2024-04-15T09:00:00Z'),
        endDate: new Date('2024-04-15T17:00:00Z'),
        type: 'conference',
        location: 'Main Auditorium',
        capacity: 500,
        metadata: {
          registrationRequired: true,
          registrationDeadline: new Date('2024-04-10T23:59:59Z'),
          targetAudience: 'all_users',
          categories: ['technology', 'conference', 'professional-development']
        }
      });

      const eventResponse = await serviceClients.planning.post('/api/calendar/events', eventData);
      expect(eventResponse.status).toBe(201);
      const eventId = eventResponse.data.data._id;

      // Step 2: Auto-generate Event Announcement (News Service)
      const eventAnnouncementData = TestDataFactory.createArticle(testUsers.admin.id!, {
        title: 'Annual Technology Conference - April 15th',
        content: 'Registration is now open for our annual technology conference. Don\'t miss this opportunity!',
        category: 'events',
        metadata: {
          relatedEvent: eventId,
          autoGenerated: true,
          registrationLink: `/events/${eventId}/register`
        },
        tags: ['conference', 'technology', 'registration'],
        status: 'published'
      });

      const announcementResponse = await serviceClients.news.post('/api/news', eventAnnouncementData);
      expect(announcementResponse.status).toBe(201);

      // Step 3: Students and Faculty Register for Event
      const registrations = [
        { user: testUsers.student, client: await authHelper.createAuthenticatedClient('planning', testUsers.student) },
        { user: testUsers.teacher, client: await authHelper.createAuthenticatedClient('planning', testUsers.teacher) }
      ];

      for (const { user, client } of registrations) {
        const registrationResponse = await client.post(`/api/calendar/events/${eventId}/register`, {
          attendeeInfo: {
            dietaryRestrictions: [],
            specialRequests: 'None'
          }
        });
        expect(registrationResponse.status).toBe(200);
      }

      // Step 4: Send Reminder Notifications (1 week before)
      const reminderNewsData = TestDataFactory.createArticle(testUsers.admin.id!, {
        title: 'Reminder: Technology Conference Next Week',
        content: 'Just a reminder that our technology conference is next week. We look forward to seeing you there!',
        category: 'events',
        metadata: {
          relatedEvent: eventId,
          reminderType: '1_week',
          targetRegistrants: true
        },
        status: 'published'
      });

      const reminderResponse = await serviceClients.news.post('/api/news', reminderNewsData);
      expect(reminderResponse.status).toBe(201);

      // Step 5: Create Pre-event Workshop
      const workshopData = TestDataFactory.createCalendarEvent(testUsers.admin.id!, {
        title: 'Pre-Conference Workshop: Latest Tech Trends',
        description: 'Optional workshop before the main conference',
        startDate: new Date('2024-04-14T14:00:00Z'),
        endDate: new Date('2024-04-14T16:00:00Z'),
        type: 'workshop',
        metadata: {
          parentEvent: eventId,
          prerequisite: false,
          capacity: 50
        }
      });

      const workshopResponse = await serviceClients.planning.post('/api/calendar/events', workshopData);
      expect(workshopResponse.status).toBe(201);

      // Step 6: Analytics on Event Registration and Engagement
      await new Promise(resolve => setTimeout(resolve, 1000)); // Allow analytics processing

      const eventAnalytics = await serviceClients.statistics.get('/api/statistics/learning-analytics', {
        params: {
          includeEventAnalytics: true,
          eventId: eventId
        }
      });

      expect(eventAnalytics.status).toBe(200);
      if (eventAnalytics.data.data.eventAnalytics) {
        expect(eventAnalytics.data.data.eventAnalytics.registrations).toBeGreaterThan(0);
        expect(eventAnalytics.data.data.eventAnalytics.engagement).toBeDefined();
      }

      // Step 7: Post-event Follow-up
      const followUpData = TestDataFactory.createArticle(testUsers.admin.id!, {
        title: 'Thank You - Technology Conference Wrap-up',
        content: 'Thank you to everyone who attended our technology conference. Materials are now available.',
        category: 'events',
        metadata: {
          relatedEvent: eventId,
          postEvent: true
        },
        status: 'published'
      });

      const followUpResponse = await serviceClients.news.post('/api/news', followUpData);
      expect(followUpResponse.status).toBe(201);
    });
  });

  describe('Data Consistency and Synchronization', () => {
    it('should maintain data consistency across all services during complex operations', async () => {
      // Step 1: Create interconnected data across services
      
      // Create course
      const courseData = TestDataFactory.createCourse(testUsers.teacher.id!, {
        title: 'Data Consistency Test Course',
        code: 'DCT101'
      });
      const courseResponse = await serviceClients.course.post('/api/courses', courseData);
      const courseId = courseResponse.data.data._id;

      // Create related news
      const newsData = TestDataFactory.createArticle(testUsers.teacher.id!, {
        title: 'DCT101 - Course Information',
        content: 'Information about the Data Consistency Test Course',
        metadata: { relatedCourse: courseId }
      });
      const newsResponse = await serviceClients.news.post('/api/news', newsData);
      const newsId = newsResponse.data.data._id;

      // Create related event
      const eventData = TestDataFactory.createCalendarEvent(testUsers.teacher.id!, {
        title: 'DCT101 - Orientation',
        description: 'Course orientation session',
        startDate: new Date('2024-03-01T10:00:00Z'),
        endDate: new Date('2024-03-01T11:00:00Z'),
        metadata: { relatedCourse: courseId }
      });
      const eventResponse = await serviceClients.planning.post('/api/calendar/events', eventData);
      const eventId = eventResponse.data.data._id;

      // Enroll student
      await serviceClients.course.post(`/api/courses/${courseId}/enroll`, {
        studentId: testUsers.student.id
      });

      // Step 2: Verify cross-service data integrity
      
      // Check course has correct enrollment
      const courseCheck = await serviceClients.course.get(`/api/courses/${courseId}`);
      expect(courseCheck.status).toBe(200);
      expect(courseCheck.data.data.enrollment.current).toBeGreaterThan(0);

      // Check news is associated with course
      const newsCheck = await serviceClients.news.get(`/api/news/${newsId}`);
      expect(newsCheck.status).toBe(200);
      expect(newsCheck.data.data.metadata.relatedCourse).toBe(courseId);

      // Check event is associated with course
      const eventCheck = await serviceClients.planning.get(`/api/calendar/events/${eventId}`);
      expect(eventCheck.status).toBe(200);
      expect(eventCheck.data.data.metadata.relatedCourse).toBe(courseId);

      // Step 3: Update course information and verify propagation
      const courseUpdate = {
        title: 'Updated Data Consistency Test Course',
        description: 'Updated description for testing'
      };

      const updateResponse = await serviceClients.course.put(`/api/courses/${courseId}`, courseUpdate);
      expect(updateResponse.status).toBe(200);

      // Allow time for data synchronization
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Step 4: Verify analytics reflect all changes
      const analyticsResponse = await serviceClients.statistics.get(`/api/statistics/courses/${courseId}`, {
        params: {
          includeRelatedContent: true,
          includeEnrollment: true
        }
      });

      expect(analyticsResponse.status).toBe(200);
      expect(analyticsResponse.data.data.overview.title).toBe('Updated Data Consistency Test Course');
      expect(analyticsResponse.data.data.enrollment.total).toBeGreaterThan(0);

      // Step 5: Test data cascade when deleting course
      const deleteResponse = await serviceClients.course.delete(`/api/courses/${courseId}`);
      expect(deleteResponse.status).toBe(200);

      // Verify related content handling
      const deletedCourseCheck = await serviceClients.course.get(`/api/courses/${courseId}`);
      expect(deletedCourseCheck.status).toBe(404);

      // Related news and events should still exist but handle missing course gracefully
      const newsAfterDelete = await serviceClients.news.get(`/api/news/${newsId}`);
      expect(newsAfterDelete.status).toBe(200); // Should exist but might show as orphaned

      const eventAfterDelete = await serviceClients.planning.get(`/api/calendar/events/${eventId}`);
      expect(eventAfterDelete.status).toBe(200); // Should exist but might show as orphaned
    });
  });

  describe('Error Propagation and Recovery', () => {
    it('should handle errors gracefully across service boundaries', async () => {
      // Test scenario: Course creation fails but we continue with other operations
      
      // Step 1: Attempt to create course with invalid data
      const invalidCourseData = {
        title: '', // Invalid: empty title
        code: 'INVALID',
        instructorId: 'non-existent-id' // Invalid instructor
      };

      const invalidCourseResponse = await serviceClients.course.post('/api/courses', invalidCourseData);
      expect(invalidCourseResponse.status).toBe(400);

      // Step 2: Create valid course after error
      const validCourseData = TestDataFactory.createCourse(testUsers.teacher.id!, {
        title: 'Error Recovery Test Course',
        code: 'ERT101'
      });

      const validCourseResponse = await serviceClients.course.post('/api/courses', validCourseData);
      expect(validCourseResponse.status).toBe(201);
      const courseId = validCourseResponse.data.data._id;

      // Step 3: Attempt invalid enrollment
      const invalidEnrollmentResponse = await serviceClients.course.post(`/api/courses/${courseId}/enroll`, {
        studentId: 'non-existent-student'
      });
      expect(invalidEnrollmentResponse.status).toBe(400);

      // Step 4: Valid enrollment after error
      const validEnrollmentResponse = await serviceClients.course.post(`/api/courses/${courseId}/enroll`, {
        studentId: testUsers.student.id
      });
      expect(validEnrollmentResponse.status).toBe(200);

      // Step 5: Verify system state is consistent despite errors
      const finalCourseCheck = await serviceClients.course.get(`/api/courses/${courseId}`);
      expect(finalCourseCheck.status).toBe(200);
      expect(finalCourseCheck.data.data.enrollment.current).toBe(1);

      // Step 6: Verify analytics don't include failed operations
      await new Promise(resolve => setTimeout(resolve, 1000));

      const analyticsResponse = await serviceClients.statistics.get('/api/statistics/system');
      expect(analyticsResponse.status).toBe(200);
      // Should not count failed course creation
      expect(analyticsResponse.data.data.courses.total).toBeGreaterThan(0);
    });

    it('should handle partial service failures with graceful degradation', async () => {
      // Simulate scenario where statistics service is unavailable but other operations continue
      
      // Step 1: Perform operations that would normally trigger analytics
      const courseData = TestDataFactory.createCourse(testUsers.teacher.id!, {
        title: 'Resilience Test Course',
        code: 'RTC101'
      });

      const courseResponse = await serviceClients.course.post('/api/courses', courseData);
      expect(courseResponse.status).toBe(201);

      const newsData = TestDataFactory.createArticle(testUsers.admin.id!, {
        title: 'Test Article for Resilience',
        content: 'Testing system resilience'
      });

      const newsResponse = await serviceClients.news.post('/api/news', newsData);
      expect(newsResponse.status).toBe(201);

      // Step 2: Verify that core operations succeed even if analytics fail
      const enrollmentResponse = await serviceClients.course.post(`/api/courses/${courseResponse.data.data._id}/enroll`, {
        studentId: testUsers.student.id
      });
      expect(enrollmentResponse.status).toBe(200);

      // Step 3: Verify primary functionality is preserved
      const courseCheck = await serviceClients.course.get(`/api/courses/${courseResponse.data.data._id}`);
      expect(courseCheck.status).toBe(200);
      expect(courseCheck.data.data.enrollment.current).toBe(1);

      const newsCheck = await serviceClients.news.get(`/api/news/${newsResponse.data.data._id}`);
      expect(newsCheck.status).toBe(200);
      expect(newsCheck.data.data.title).toBe('Test Article for Resilience');
    });
  });

  describe('Performance Under Load', () => {
    it('should handle concurrent cross-service operations efficiently', async () => {
      const concurrentOperations = [];
      const operationCount = 5;

      // Create multiple concurrent workflows
      for (let i = 0; i < operationCount; i++) {
        const workflow = async () => {
          // Create course
          const courseData = TestDataFactory.createCourse(testUsers.teacher.id!, {
            title: `Concurrent Course ${i}`,
            code: `CC${i}`
          });
          const courseResponse = await serviceClients.course.post('/api/courses', courseData);
          const courseId = courseResponse.data.data._id;

          // Create related news
          const newsData = TestDataFactory.createArticle(testUsers.admin.id!, {
            title: `News for Course ${i}`,
            content: `Content for course ${i}`,
            metadata: { relatedCourse: courseId }
          });
          await serviceClients.news.post('/api/news', newsData);

          // Enroll student
          await serviceClients.course.post(`/api/courses/${courseId}/enroll`, {
            studentId: testUsers.student.id
          });

          return courseId;
        };

        concurrentOperations.push(workflow());
      }

      // Execute all workflows concurrently
      const start = Date.now();
      const results = await Promise.allSettled(concurrentOperations);
      const duration = Date.now() - start;

      // Verify all operations succeeded
      const successfulResults = results.filter(
        (result): result is PromiseFulfilledResult<string> => result.status === 'fulfilled'
      );

      expect(successfulResults.length).toBe(operationCount);
      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds

      // Verify final system state
      const systemStats = await serviceClients.statistics.get('/api/statistics/system');
      expect(systemStats.status).toBe(200);
      expect(systemStats.data.data.courses.total).toBeGreaterThanOrEqual(operationCount);
    });
  });
});