import { apiHelper } from '../utils/ApiTestHelper';

describe('Complete User Workflow - End-to-End Tests', () => {
  let studentUser: any;
  let teacherUser: any;
  let adminUser: any;
  let testCourse: any;
  let testEvent: any;
  let testArticle: any;

  beforeAll(async () => {
    // Services are already started by globalSetup
    await apiHelper.waitForServices();
    console.log('✅ All services ready for E2E testing');
  });

  beforeEach(async () => {
    // Clear any existing auth tokens
    apiHelper.clearAuthTokens();
  });

  afterEach(async () => {
    // Clean up user session
    try {
      await apiHelper.logoutUser();
    } catch (error) {
      // Ignore logout errors in cleanup
    }
  });

  describe('Complete Educational Platform Workflow', () => {
    it('should complete a full educational platform workflow', async () => {
      // Step 1: Register different types of users
      console.log('📝 Step 1: Registering users...');
      
      const studentData = apiHelper.createTestData().user.student;
      const teacherData = apiHelper.createTestData().user.teacher;
      const adminData = apiHelper.createTestData().user.admin;

      // Register student
      const studentResponse = await apiHelper.registerUser(studentData);
      studentUser = studentResponse.user;
      expect(studentUser.role).toBe('student');
      
      // Register teacher
      const teacherResponse = await apiHelper.registerUser(teacherData);
      teacherUser = teacherResponse.user;
      expect(teacherUser.role).toBe('teacher');
      
      // Register admin
      const adminResponse = await apiHelper.registerUser(adminData);
      adminUser = adminResponse.user;
      expect(adminUser.role).toBe('admin');

      // Step 2: Teacher creates a course
      console.log('📚 Step 2: Teacher creating a course...');
      
      await apiHelper.loginUser(teacherData.email, teacherData.password);
      
      const courseData = apiHelper.createTestData().course;
      const createCourseResponse = await apiHelper.course('', {
        method: 'POST',
        data: courseData
      });
      
      expect(createCourseResponse.status).toBe(201);
      expect(createCourseResponse.data.success).toBe(true);
      testCourse = createCourseResponse.data.data;
      expect(testCourse.title).toBe(courseData.title);
      expect(testCourse.instructor).toBe(teacherUser._id);

      // Step 3: Student enrolls in the course
      console.log('🎓 Step 3: Student enrolling in course...');
      
      await apiHelper.loginUser(studentData.email, studentData.password);
      
      const enrollResponse = await apiHelper.course(`/${testCourse._id}/enroll`, {
        method: 'POST',
        data: { studentId: studentUser._id }
      });
      
      expect(enrollResponse.status).toBe(200);
      expect(enrollResponse.data.success).toBe(true);
      expect(enrollResponse.data.message).toContain('enrolled successfully');

      // Step 4: Check enrollment status
      console.log('✅ Step 4: Checking enrollment status...');
      
      const enrollmentStatusResponse = await apiHelper.course(`/${testCourse._id}/enrollment-status`, {
        method: 'GET'
      });
      
      expect(enrollmentStatusResponse.status).toBe(200);
      expect(enrollmentStatusResponse.data.success).toBe(true);
      expect(enrollmentStatusResponse.data.data.isEnrolled).toBe(true);

      // Step 5: Teacher creates a class event
      console.log('📅 Step 5: Teacher creating a class event...');
      
      await apiHelper.loginUser(teacherData.email, teacherData.password);
      
      const eventData = {
        ...apiHelper.createTestData().event,
        title: `${testCourse.title} - Class Session`,
        relatedCourse: testCourse._id,
        attendees: [studentUser._id]
      };
      
      const createEventResponse = await apiHelper.planning('/events', {
        method: 'POST',
        data: eventData
      });
      
      expect(createEventResponse.status).toBe(201);
      expect(createEventResponse.data.success).toBe(true);
      testEvent = createEventResponse.data.data;
      expect(testEvent.title).toBe(eventData.title);

      // Step 6: Student views upcoming events
      console.log('📋 Step 6: Student viewing upcoming events...');
      
      await apiHelper.loginUser(studentData.email, studentData.password);
      
      const upcomingEventsResponse = await apiHelper.planning('/events/upcoming', {
        method: 'GET'
      });
      
      expect(upcomingEventsResponse.status).toBe(200);
      expect(upcomingEventsResponse.data.success).toBe(true);
      expect(upcomingEventsResponse.data.data.events).toContain(
        expect.objectContaining({
          title: eventData.title
        })
      );

      // Step 7: Admin publishes a news article
      console.log('📰 Step 7: Admin publishing news article...');
      
      await apiHelper.loginUser(adminData.email, adminData.password);
      
      const articleData = {
        ...apiHelper.createTestData().article,
        title: 'New Course Available: ' + testCourse.title
      };
      
      const createArticleResponse = await apiHelper.news('/articles', {
        method: 'POST',
        data: articleData
      });
      
      expect(createArticleResponse.status).toBe(201);
      expect(createArticleResponse.data.success).toBe(true);
      testArticle = createArticleResponse.data.data;
      expect(testArticle.title).toBe(articleData.title);

      // Step 8: Student reads the news article
      console.log('👀 Step 8: Student reading news article...');
      
      await apiHelper.loginUser(studentData.email, studentData.password);
      
      const articleResponse = await apiHelper.news(`/articles/${testArticle._id}`, {
        method: 'GET'
      });
      
      expect(articleResponse.status).toBe(200);
      expect(articleResponse.data.success).toBe(true);
      expect(articleResponse.data.data.title).toBe(testArticle.title);

      // Step 9: Update student profile
      console.log('👤 Step 9: Student updating profile...');
      
      const profileUpdateData = {
        profile: {
          firstName: 'Updated',
          lastName: 'Student',
          bio: 'I am a student enrolled in various courses.'
        }
      };
      
      const updateProfileResponse = await apiHelper.user('/profile', {
        method: 'PUT',
        data: profileUpdateData
      });
      
      expect(updateProfileResponse.status).toBe(200);
      expect(updateProfileResponse.data.success).toBe(true);
      expect(updateProfileResponse.data.data.profile.firstName).toBe('Updated');

      // Step 10: Teacher views course statistics
      console.log('📊 Step 10: Teacher viewing course statistics...');
      
      await apiHelper.loginUser(teacherData.email, teacherData.password);
      
      const courseStatsResponse = await apiHelper.statistics('/courses', {
        method: 'GET'
      });
      
      expect(courseStatsResponse.status).toBe(200);
      expect(courseStatsResponse.data.success).toBe(true);
      expect(courseStatsResponse.data.data).toBeDefined();

      // Step 11: Admin views platform overview
      console.log('📈 Step 11: Admin viewing platform overview...');
      
      await apiHelper.loginUser(adminData.email, adminData.password);
      
      const overviewResponse = await apiHelper.statistics('/overview', {
        method: 'GET'
      });
      
      expect(overviewResponse.status).toBe(200);
      expect(overviewResponse.data.success).toBe(true);
      expect(overviewResponse.data.data.totalUsers).toBeGreaterThan(0);
      expect(overviewResponse.data.data.totalCourses).toBeGreaterThan(0);

      // Step 12: Student provides course feedback
      console.log('💬 Step 12: Student providing course feedback...');
      
      await apiHelper.loginUser(studentData.email, studentData.password);
      
      const feedbackData = {
        rating: 5,
        comment: 'Excellent course! Very informative and well-structured.'
      };
      
      const feedbackResponse = await apiHelper.course(`/${testCourse._id}/feedback`, {
        method: 'POST',
        data: feedbackData
      });
      
      expect(feedbackResponse.status).toBe(201);
      expect(feedbackResponse.data.success).toBe(true);
      expect(feedbackResponse.data.data.rating).toBe(5);

      // Step 13: Teacher views course feedback
      console.log('📝 Step 13: Teacher viewing course feedback...');
      
      await apiHelper.loginUser(teacherData.email, teacherData.password);
      
      const viewFeedbackResponse = await apiHelper.course(`/${testCourse._id}/feedback`, {
        method: 'GET'
      });
      
      expect(viewFeedbackResponse.status).toBe(200);
      expect(viewFeedbackResponse.data.success).toBe(true);
      expect(viewFeedbackResponse.data.data.averageRating).toBe(5);

      console.log('🎉 Complete workflow test passed successfully!');
    });
  });

  describe('Role-Based Access Control', () => {
    beforeEach(async () => {
      // Register users for RBAC tests
      const studentData = apiHelper.createTestData().user.student;
      const teacherData = apiHelper.createTestData().user.teacher;
      const adminData = apiHelper.createTestData().user.admin;

      await apiHelper.registerUser(studentData);
      await apiHelper.registerUser(teacherData);
      await apiHelper.registerUser(adminData);
    });

    it('should enforce proper role-based access controls', async () => {
      const studentData = apiHelper.createTestData().user.student;
      const teacherData = apiHelper.createTestData().user.teacher;
      const adminData = apiHelper.createTestData().user.admin;

      // Test student restrictions
      console.log('🔒 Testing student access restrictions...');
      
      await apiHelper.loginUser(studentData.email, studentData.password);
      
      // Student should NOT be able to create courses
      try {
        await apiHelper.course('', {
          method: 'POST',
          data: apiHelper.createTestData().course
        });
        fail('Student should not be able to create courses');
      } catch (error: any) {
        expect(error.response.status).toBe(403);
        expect(error.response.data.error).toContain('Insufficient permissions');
      }

      // Student should NOT be able to access admin statistics
      try {
        await apiHelper.statistics('/overview', {
          method: 'GET'
        });
        fail('Student should not be able to access admin statistics');
      } catch (error: any) {
        expect(error.response.status).toBe(403);
        expect(error.response.data.error).toContain('Insufficient permissions');
      }

      // Test teacher permissions
      console.log('👩‍🏫 Testing teacher permissions...');
      
      await apiHelper.loginUser(teacherData.email, teacherData.password);
      
      // Teacher SHOULD be able to create courses
      const courseResponse = await apiHelper.course('', {
        method: 'POST',
        data: apiHelper.createTestData().course
      });
      
      expect(courseResponse.status).toBe(201);
      expect(courseResponse.data.success).toBe(true);

      // Teacher should NOT be able to access admin-only statistics
      try {
        await apiHelper.statistics('/overview', {
          method: 'GET'
        });
        fail('Teacher should not be able to access admin-only statistics');
      } catch (error: any) {
        expect(error.response.status).toBe(403);
        expect(error.response.data.error).toContain('Insufficient permissions');
      }

      // Test admin permissions
      console.log('👑 Testing admin permissions...');
      
      await apiHelper.loginUser(adminData.email, adminData.password);
      
      // Admin SHOULD be able to access all statistics
      const statsResponse = await apiHelper.statistics('/overview', {
        method: 'GET'
      });
      
      expect(statsResponse.status).toBe(200);
      expect(statsResponse.data.success).toBe(true);

      // Admin SHOULD be able to create courses
      const adminCourseResponse = await apiHelper.course('', {
        method: 'POST',
        data: apiHelper.createTestData().course
      });
      
      expect(adminCourseResponse.status).toBe(201);
      expect(adminCourseResponse.data.success).toBe(true);

      console.log('✅ Role-based access control tests passed!');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle service failures gracefully', async () => {
      // Test with invalid course ID
      const studentData = apiHelper.createTestData().user.student;
      await apiHelper.loginUser(studentData.email, studentData.password);
      
      try {
        await apiHelper.course('/invalid-course-id', {
          method: 'GET'
        });
        fail('Should have thrown an error for invalid course ID');
      } catch (error: any) {
        expect(error.response.status).toBe(404);
        expect(error.response.data.success).toBe(false);
      }

      // Test with invalid event ID
      try {
        await apiHelper.planning('/events/invalid-event-id', {
          method: 'GET'
        });
        fail('Should have thrown an error for invalid event ID');
      } catch (error: any) {
        expect(error.response.status).toBe(404);
        expect(error.response.data.success).toBe(false);
      }
    });

    it('should handle concurrent user operations', async () => {
      // Register multiple users concurrently
      const userData1 = { ...apiHelper.createTestData().user.student, email: 'student1@test.com' };
      const userData2 = { ...apiHelper.createTestData().user.student, email: 'student2@test.com' };
      const userData3 = { ...apiHelper.createTestData().user.student, email: 'student3@test.com' };

      const registrationPromises = [
        apiHelper.registerUser(userData1),
        apiHelper.registerUser(userData2),
        apiHelper.registerUser(userData3)
      ];

      const results = await Promise.all(registrationPromises);
      
      results.forEach((result, index) => {
        expect(result.user.email).toBe([userData1, userData2, userData3][index].email);
        expect(result.tokens.accessToken).toBeDefined();
      });
    });
  });
});