/**
 * User Service Integration Tests
 * 
 * Tests integration scenarios between user service and other services:
 * - Cross-service user data consistency
 * - User lifecycle in multi-service environment
 * - Service-to-service communication
 * - Data synchronization
 * - Event-driven updates
 */

import { ApiClient } from '../../../utils/ApiClient';
import { AuthHelper, TestUser } from '../../../utils/AuthHelper';
import { TestDataFactory } from '../../../utils/TestDataFactory';
import { databaseHelper } from '../../../utils/DatabaseHelper';
import { testEnvironment } from '../../../config/environment';

describe('User Service - Integration Tests', () => {
  let authHelper: AuthHelper;
  let userClient: ApiClient;
  let authClient: ApiClient;
  let courseClient: ApiClient;
  let planningClient: ApiClient;
  let newsClient: ApiClient;
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
    userClient = await authHelper.createAuthenticatedClient('user', testUsers.admin);
    authClient = await authHelper.createAuthenticatedClient('auth', testUsers.admin);
    courseClient = await authHelper.createAuthenticatedClient('course', testUsers.admin);
    planningClient = await authHelper.createAuthenticatedClient('planning', testUsers.admin);
    newsClient = await authHelper.createAuthenticatedClient('news', testUsers.admin);
  });

  afterAll(async () => {
    await authHelper.cleanup();
  });

  beforeEach(async () => {
    await databaseHelper.cleanupTestData();
  });

  describe('User-Auth Service Integration', () => {
    it('should maintain user data consistency between auth and user services', async () => {
      // Get user from auth service
      const authResponse = await authClient.get('/api/auth/me');
      expect(authResponse.status).toBe(200);
      
      // Get same user from user service
      const userResponse = await userClient.get(`/api/users/${authResponse.data.data.user.id}`);
      expect(userResponse.status).toBe(200);
      
      // Data should be consistent
      expect(authResponse.data.data.user.email).toBe(userResponse.data.data.email);
      expect(authResponse.data.data.user.role).toBe(userResponse.data.data.role);
      expect(authResponse.data.data.user.profile.firstName).toBe(userResponse.data.data.profile.firstName);
    });

    it('should handle user role changes across services', async () => {
      const targetUser = testUsers.student;
      
      // Update user role through user service
      const updateResponse = await userClient.put(`/api/users/${targetUser.id}`, {
        role: 'teacher'
      });
      expect(updateResponse.status).toBe(200);
      
      // Verify role change is reflected in auth service
      const targetUserClient = await authHelper.createAuthenticatedClient('auth', targetUser);
      const authResponse = await targetUserClient.get('/api/auth/me');
      expect(authResponse.status).toBe(200);
      expect(authResponse.data.data.user.role).toBe('teacher');
    });

    it('should handle user deactivation across services', async () => {
      const targetUser = testUsers.student;
      
      // Deactivate user through user service
      const deactivateResponse = await userClient.put(`/api/users/${targetUser.id}/deactivate`);
      expect(deactivateResponse.status).toBe(200);
      
      // User should not be able to authenticate
      const loginData = {
        email: targetUser.email,
        password: targetUser.password
      };
      
      const loginResponse = await authClient.post('/api/auth/login', loginData);
      expect(loginResponse.status).toBe(401);
      expect(loginResponse.data.error).toContain('inactive');
    });
  });

  describe('User-Course Service Integration', () => {
    it('should handle instructor assignment in courses', async () => {
      const instructor = testUsers.teacher;
      
      // Create a course with instructor
      const courseData = TestDataFactory.createCourse(instructor.id!);
      const courseResponse = await courseClient.post('/api/courses', courseData);
      expect(courseResponse.status).toBe(201);
      
      const courseId = courseResponse.data.data.id;
      
      // Verify instructor details are properly linked
      const courseDetailsResponse = await courseClient.get(`/api/courses/${courseId}`);
      expect(courseDetailsResponse.status).toBe(200);
      expect(courseDetailsResponse.data.data.instructor).toBe(instructor.id);
      
      // Get instructor details through user service
      const instructorResponse = await userClient.get(`/api/users/${instructor.id}`);
      expect(instructorResponse.status).toBe(200);
      expect(instructorResponse.data.data.role).toBe('teacher');
    });

    it('should handle student enrollment and user profile updates', async () => {
      const student = testUsers.student;
      const instructor = testUsers.teacher;
      
      // Create a course
      const courseData = TestDataFactory.createCourse(instructor.id!);
      const courseResponse = await courseClient.post('/api/courses', courseData);
      const courseId = courseResponse.data.data.id;
      
      // Enroll student in course
      const enrollmentResponse = await courseClient.post(`/api/courses/${courseId}/enroll`, {
        studentId: student.id
      });
      expect(enrollmentResponse.status).toBe(200);
      
      // Update student profile
      const profileUpdate = {
        profile: {
          firstName: 'Updated',
          lastName: 'Student',
          academicLevel: 'sophomore'
        }
      };
      
      const updateResponse = await userClient.put(`/api/users/${student.id}`, profileUpdate);
      expect(updateResponse.status).toBe(200);
      
      // Verify updated information is consistent across services
      const updatedUserResponse = await userClient.get(`/api/users/${student.id}`);
      expect(updatedUserResponse.status).toBe(200);
      expect(updatedUserResponse.data.data.profile.firstName).toBe('Updated');
    });

    it('should handle course instructor changes', async () => {
      const originalInstructor = testUsers.teacher;
      const newInstructor = await authHelper.createTestUser('teacher');
      
      // Create course with original instructor
      const courseData = TestDataFactory.createCourse(originalInstructor.id!);
      const courseResponse = await courseClient.post('/api/courses', courseData);
      const courseId = courseResponse.data.data.id;
      
      // Change instructor
      const updateResponse = await courseClient.put(`/api/courses/${courseId}`, {
        instructor: newInstructor.id
      });
      expect(updateResponse.status).toBe(200);
      
      // Verify both instructors exist and have correct roles
      const originalResponse = await userClient.get(`/api/users/${originalInstructor.id}`);
      const newResponse = await userClient.get(`/api/users/${newInstructor.id}`);
      
      expect(originalResponse.status).toBe(200);
      expect(newResponse.status).toBe(200);
      expect(originalResponse.data.data.role).toBe('teacher');
      expect(newResponse.data.data.role).toBe('teacher');
    });
  });

  describe('User-Planning Service Integration', () => {
    it('should handle event organizer information consistency', async () => {
      const organizer = testUsers.teacher;
      
      // Create an event through planning service
      const eventData = TestDataFactory.createEvent(organizer.id!);
      const eventResponse = await planningClient.post('/api/events', eventData);
      expect(eventResponse.status).toBe(201);
      
      const eventId = eventResponse.data.data.id;
      
      // Get event details
      const eventDetailsResponse = await planningClient.get(`/api/events/${eventId}`);
      expect(eventDetailsResponse.status).toBe(200);
      expect(eventDetailsResponse.data.data.organizer).toBe(organizer.id);
      
      // Update organizer profile
      const profileUpdate = {
        profile: {
          firstName: 'Updated',
          lastName: 'Organizer'
        }
      };
      
      const updateResponse = await userClient.put(`/api/users/${organizer.id}`, profileUpdate);
      expect(updateResponse.status).toBe(200);
      
      // Verify organizer information is updated
      const updatedOrganizerResponse = await userClient.get(`/api/users/${organizer.id}`);
      expect(updatedOrganizerResponse.status).toBe(200);
      expect(updatedOrganizerResponse.data.data.profile.firstName).toBe('Updated');
    });

    it('should handle event attendee management', async () => {
      const organizer = testUsers.teacher;
      const attendee = testUsers.student;
      
      // Create event with attendees
      const eventData = TestDataFactory.createEvent(organizer.id!, {
        attendees: [attendee.id!]
      });
      
      const eventResponse = await planningClient.post('/api/events', eventData);
      expect(eventResponse.status).toBe(201);
      
      // Verify attendee exists and is active
      const attendeeResponse = await userClient.get(`/api/users/${attendee.id}`);
      expect(attendeeResponse.status).toBe(200);
      expect(attendeeResponse.data.data.isActive).toBe(true);
    });

    it('should handle user deactivation impact on scheduled events', async () => {
      const organizer = testUsers.teacher;
      
      // Create future events
      const futureEvent = TestDataFactory.createEvent(organizer.id!, {
        startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        status: 'scheduled'
      });
      
      const eventResponse = await planningClient.post('/api/events', futureEvent);
      expect(eventResponse.status).toBe(201);
      
      // Deactivate organizer
      const deactivateResponse = await userClient.put(`/api/users/${organizer.id}/deactivate`);
      expect(deactivateResponse.status).toBe(200);
      
      // Verify organizer is deactivated
      const organizerResponse = await userClient.get(`/api/users/${organizer.id}`);
      expect(organizerResponse.status).toBe(200);
      expect(organizerResponse.data.data.isActive).toBe(false);
    });
  });

  describe('User-News Service Integration', () => {
    it('should handle article author information consistency', async () => {
      const author = testUsers.admin;
      
      // Create article through news service
      const articleData = TestDataFactory.createArticle(author.id!);
      const articleResponse = await newsClient.post('/api/articles', articleData);
      expect(articleResponse.status).toBe(201);
      
      const articleId = articleResponse.data.data.id;
      
      // Update author profile
      const profileUpdate = {
        profile: {
          firstName: 'Updated',
          lastName: 'Author',
          title: 'Chief Administrator'
        }
      };
      
      const updateResponse = await userClient.put(`/api/users/${author.id}`, profileUpdate);
      expect(updateResponse.status).toBe(200);
      
      // Verify article author information
      const articleDetailsResponse = await newsClient.get(`/api/articles/${articleId}`);
      expect(articleDetailsResponse.status).toBe(200);
      expect(articleDetailsResponse.data.data.author).toBe(author.id);
      
      // Verify updated author information
      const authorResponse = await userClient.get(`/api/users/${author.id}`);
      expect(authorResponse.status).toBe(200);
      expect(authorResponse.data.data.profile.firstName).toBe('Updated');
    });

    it('should handle target audience updates', async () => {
      const author = testUsers.admin;
      const student = testUsers.student;
      
      // Create article targeting students
      const articleData = TestDataFactory.createArticle(author.id!, {
        targetAudience: ['student']
      });
      
      const articleResponse = await newsClient.post('/api/articles', articleData);
      expect(articleResponse.status).toBe(201);
      
      // Update student role to teacher
      const roleUpdateResponse = await userClient.put(`/api/users/${student.id}`, {
        role: 'teacher'
      });
      expect(roleUpdateResponse.status).toBe(200);
      
      // Verify role change
      const updatedUserResponse = await userClient.get(`/api/users/${student.id}`);
      expect(updatedUserResponse.status).toBe(200);
      expect(updatedUserResponse.data.data.role).toBe('teacher');
    });
  });

  describe('User Data Synchronization', () => {
    it('should maintain data consistency during concurrent updates', async () => {
      const targetUser = testUsers.student;
      
      // Perform concurrent updates from different services
      const updates = [
        userClient.put(`/api/users/${targetUser.id}`, {
          profile: { firstName: 'Update1' }
        }),
        userClient.put(`/api/users/${targetUser.id}`, {
          profile: { lastName: 'Update2' }
        }),
        userClient.put(`/api/users/${targetUser.id}`, {
          preferences: { language: 'fr' }
        })
      ];
      
      const responses = await Promise.allSettled(updates);
      
      // At least one update should succeed
      const successfulUpdates = responses.filter(r => 
        r.status === 'fulfilled' && r.value.status === 200
      );
      expect(successfulUpdates.length).toBeGreaterThan(0);
      
      // Final state should be consistent
      const finalStateResponse = await userClient.get(`/api/users/${targetUser.id}`);
      expect(finalStateResponse.status).toBe(200);
      expect(finalStateResponse.data).toBeSuccessResponse();
    });

    it('should handle service-wide user search across all services', async () => {
      // Create users with distinctive characteristics
      const uniqueUser = await authHelper.createTestUser('teacher', {
        profile: {
          firstName: 'UniqueTeacher',
          lastName: 'SearchTest'
        }
      });
      
      // Search for the user
      const searchResponse = await userClient.get('/api/users/search?q=UniqueTeacher');
      expect(searchResponse.status).toBe(200);
      expect(searchResponse.data.data.users.length).toBeGreaterThan(0);
      
      // Find the specific user
      const foundUser = searchResponse.data.data.users.find((user: any) => 
        user.id === uniqueUser.id
      );
      expect(foundUser).toBeDefined();
      expect(foundUser.profile.firstName).toBe('UniqueTeacher');
    });

    it('should handle bulk user operations consistently', async () => {
      // Create multiple test users
      const bulkUsers = await Promise.all([
        authHelper.createTestUser('student'),
        authHelper.createTestUser('student'),
        authHelper.createTestUser('student')
      ]);
      
      // Perform bulk deactivation
      const deactivationPromises = bulkUsers.map(user =>
        userClient.put(`/api/users/${user.id}/deactivate`)
      );
      
      const responses = await Promise.all(deactivationPromises);
      
      // All should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.data).toBeSuccessResponse();
      });
      
      // Verify all users are deactivated
      const verificationPromises = bulkUsers.map(user =>
        userClient.get(`/api/users/${user.id}`)
      );
      
      const verificationResponses = await Promise.all(verificationPromises);
      
      verificationResponses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.data.data.isActive).toBe(false);
      });
    });
  });

  describe('Cross-Service Error Handling', () => {
    it('should handle user service unavailability gracefully', async () => {
      // This test simulates what happens when user service is down
      // but other services need user information
      
      // Try to access user data when service might be unavailable
      try {
        const response = await userClient.get('/api/users/health');
        expect(response.status).toBe(200);
      } catch (error: any) {
        // If service is down, error should be handled gracefully
        expect(error.response?.status).toBeOneOf([503, 500, 404]);
      }
    });

    it('should handle inconsistent user data gracefully', async () => {
      const user = testUsers.student;
      
      // Try to access potentially inconsistent user data
      const response = await userClient.get(`/api/users/${user.id}`);
      
      if (response.status === 200) {
        // Data should be valid if request succeeds
        expect(response.data).toBeSuccessResponse();
        expect(response.data.data).toHaveValidUser();
      } else {
        // Error should be informative
        expect(response.data).toBeErrorResponse();
        expect(response.data.error).toBeDefined();
      }
    });

    it('should handle orphaned references correctly', async () => {
      // This test checks how the system handles references to deleted/non-existent users
      const nonExistentUserId = '507f1f77bcf86cd799439011';
      
      const response = await userClient.get(`/api/users/${nonExistentUserId}`);
      expect(response.status).toBe(404);
      expect(response.data).toBeErrorResponse();
      expect(response.data.error).toContain('not found');
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle multiple service interactions efficiently', async () => {
      const startTime = Date.now();
      
      // Simulate complex cross-service workflow
      const user = testUsers.teacher;
      
      // 1. Get user profile
      const profileResponse = await userClient.get(`/api/users/${user.id}`);
      expect(profileResponse.status).toBe(200);
      
      // 2. Update preferences
      const prefResponse = await userClient.put('/api/users/preferences', {
        language: 'en',
        timezone: 'UTC'
      });
      expect(prefResponse.status).toBe(200);
      
      // 3. Search for users
      const searchResponse = await userClient.get('/api/users/search?limit=10');
      expect(searchResponse.status).toBe(200);
      
      // 4. Get activity log
      const activityResponse = await userClient.get(`/api/users/${user.id}/activity?limit=5`);
      expect(activityResponse.status).toBe(200);
      
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      
      // All operations should complete within reasonable time
      expect(totalTime).toBeLessThan(5000); // 5 seconds total
    });

    it('should handle concurrent cross-service operations', async () => {
      const user = testUsers.admin;
      
      // Perform multiple operations concurrently
      const operations = [
        userClient.get(`/api/users/${user.id}`),
        userClient.get('/api/users/search?limit=5'),
        userClient.get(`/api/users/${user.id}/activity?limit=3`),
        userClient.put('/api/users/preferences', { theme: 'dark' })
      ];
      
      const startTime = Date.now();
      const responses = await Promise.all(operations);
      const endTime = Date.now();
      
      // All operations should succeed
      responses.forEach((response, index) => {
        if (index < 3) { // GET operations
          expect(response.status).toBe(200);
        } else { // PUT operation
          expect(response.status).toBeOneOf([200, 201]);
        }
      });
      
      // Concurrent operations should be faster than sequential
      expect(endTime - startTime).toBeLessThan(3000);
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