/**
 * User Service Functional Tests
 * 
 * Tests the complete user management functionality including:
 * - Profile management (get, update)
 * - User preferences
 * - Profile photo upload
 * - User search and filtering
 * - Activity tracking
 * - User activation/deactivation (admin operations)
 * - Role-based access control
 * - Input validation and error handling
 * - Security features
 */

import { ApiClient } from '../../../utils/ApiClient';
import { AuthHelper, TestUser } from '../../../utils/AuthHelper';
import { TestDataFactory } from '../../../utils/TestDataFactory';
import { databaseHelper } from '../../../utils/DatabaseHelper';
import { testEnvironment } from '../../../config/environment';

describe('User Service - Functional Tests', () => {
  let authHelper: AuthHelper;
  let userClient: ApiClient;
  let adminClient: ApiClient;
  let testUsers: {
    student: TestUser;
    teacher: TestUser;
    admin: TestUser;
    staff: TestUser;
  };

  beforeAll(async () => {
    authHelper = new AuthHelper();
    
    // Create test users for different scenarios
    testUsers = {
      student: await authHelper.createTestUser('student'),
      teacher: await authHelper.createTestUser('teacher'),
      admin: await authHelper.createTestUser('admin'),
      staff: await authHelper.createTestUser('staff'),
    };

    // Create authenticated clients
    userClient = await authHelper.createAuthenticatedClient('user', testUsers.student);
    adminClient = await authHelper.createAuthenticatedClient('user', testUsers.admin);
  });

  afterAll(async () => {
    await authHelper.cleanup();
  });

  beforeEach(async () => {
    // Clean up test data before each test for isolation, but preserve test users
    // Only clean up transient data that tests might create
    // The test users created in beforeAll should persist across tests
    // await databaseHelper.cleanupTestData(); // Commented out - too aggressive
  });

  describe('User Profile Management', () => {
    describe('GET /api/users/profile', () => {
      it('should get current user profile', async () => {
        const response = await userClient.get('/api/users/profile');

        expect(response.status).toBe(200);
        expect(response.data).toBeSuccessResponse();
        expect(response.data.data).toHaveValidUser();
        expect(response.data.data.email).toBe(testUsers.student.email);
        expect(response.data.data.role).toBe('student');
      });

      it('should reject unauthenticated requests', async () => {
        const unauthenticatedClient = new ApiClient(testEnvironment.services.user);
        const response = await unauthenticatedClient.get('/api/users/profile');

        expect(response.status).toBe(401);
        expect(response.data).toBeErrorResponse();
        expect(response.data.error).toContain('authentication');
      });
    });

    describe('GET /api/users/:id', () => {
      it('should get user profile by ID', async () => {
        const response = await userClient.get(`/api/users/${testUsers.teacher.id}`);

        expect(response.status).toBe(200);
        expect(response.data).toBeSuccessResponse();
        expect(response.data.data).toHaveValidUser();
        expect(response.data.data.email).toBe(testUsers.teacher.email);
        expect(response.data.data.role).toBe('teacher');
      });

      it('should return 404 for non-existent user', async () => {
        const fakeId = '507f1f77bcf86cd799439011';
        const response = await userClient.get(`/api/users/${fakeId}`);

        expect(response.status).toBe(404);
        expect(response.data).toBeErrorResponse();
        expect(response.data.error).toContain('not found');
      });

      it('should handle invalid user ID format', async () => {
        const response = await userClient.get('/api/users/invalid-id');

        expect(response.status).toBe(400);
        expect(response.data).toBeErrorResponse();
      });
    });

    describe('PUT /api/users/profile', () => {
      it('should update current user profile', async () => {
        const updateData = {
          profile: {
            firstName: 'Updated',
            lastName: 'Name',
            bio: 'Updated bio',
            phone: '+1234567890'
          },
          preferences: {
            language: 'fr',
            timezone: 'Europe/Paris',
            emailNotifications: false
          }
        };

        const response = await userClient.put('/api/users/profile', updateData);

        expect(response.status).toBe(200);
        expect(response.data).toBeSuccessResponse();
        expect(response.data.data.profile.firstName).toBe('Updated');
        expect(response.data.data.profile.lastName).toBe('Name');
        expect(response.data.data.profile.bio).toBe('Updated bio');
      });

      it('should validate profile data', async () => {
        const invalidData = {
          profile: {
            firstName: '', // Empty string should be invalid
            lastName: 'Test'
          }
        };

        const response = await userClient.put('/api/users/profile', invalidData);

        expect(response.status).toBe(400);
        expect(response.data).toBeErrorResponse();
      });

      it('should not allow updating email directly', async () => {
        const updateData = {
          email: 'newemail@test.com'
        };

        const response = await userClient.put('/api/users/profile', updateData);

        // Email should not be updated through profile endpoint
        expect(response.status).toBeOneOf([400, 403]);
        expect(response.data).toBeErrorResponse();
      });
    });

    describe('PUT /api/users/:id', () => {
      it('should allow admin to update any user profile', async () => {
        const updateData = {
          profile: {
            firstName: 'Admin Updated',
            lastName: 'Student'
          },
          isActive: false
        };

        const response = await adminClient.put(`/api/users/${testUsers.student.id}`, updateData);

        expect(response.status).toBe(200);
        expect(response.data).toBeSuccessResponse();
        expect(response.data.data.profile.firstName).toBe('Admin Updated');
      });

      it('should prevent non-admin users from updating other users', async () => {
        const updateData = {
          profile: {
            firstName: 'Unauthorized Update'
          }
        };

        const response = await userClient.put(`/api/users/${testUsers.teacher.id}`, updateData);

        expect(response.status).toBeOneOf([403, 401]);
        expect(response.data).toBeErrorResponse();
      });
    });
  });

  describe('User Preferences', () => {
    describe('PUT /api/users/preferences', () => {
      it('should update user preferences', async () => {
        const preferences = {
          language: 'fr',
          timezone: 'Europe/Paris',
          theme: 'dark',
          emailNotifications: false,
          pushNotifications: true,
          digestFrequency: 'weekly'
        };

        const response = await userClient.put('/api/users/preferences', preferences);

        expect(response.status).toBe(200);
        expect(response.data).toBeSuccessResponse();
        expect(response.data.data.preferences).toMatchObject(preferences);
      });

      it('should validate preference values', async () => {
        const invalidPreferences = {
          language: 'invalid-language',
          timezone: 'invalid-timezone',
          theme: 'invalid-theme'
        };

        const response = await userClient.put('/api/users/preferences', invalidPreferences);

        expect(response.status).toBe(400);
        expect(response.data).toBeErrorResponse();
      });

      it('should allow partial preference updates', async () => {
        const partialPreferences = {
          theme: 'dark'
        };

        const response = await userClient.put('/api/users/preferences', partialPreferences);

        expect(response.status).toBe(200);
        expect(response.data).toBeSuccessResponse();
        expect(response.data.data.preferences.theme).toBe('dark');
      });
    });
  });

  describe('Profile Photo Upload', () => {
    describe('POST /api/users/photo', () => {
      it('should upload profile photo', async () => {
        // Create a mock file buffer (simplified for testing)
        const mockFile = {
          buffer: Buffer.from('fake-image-data'),
          mimetype: 'image/jpeg',
          originalname: 'profile.jpg',
          size: 1024
        };

        const formData = new FormData();
        formData.append('photo', new Blob([mockFile.buffer]), mockFile.originalname);

        const response = await userClient.post('/api/users/photo', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });

        expect(response.status).toBe(200);
        expect(response.data).toBeSuccessResponse();
        expect(response.data.data.photoUrl).toBeDefined();
        expect(typeof response.data.data.photoUrl).toBe('string');
      });

      it('should reject invalid file types', async () => {
        const mockFile = {
          buffer: Buffer.from('fake-text-data'),
          mimetype: 'text/plain',
          originalname: 'document.txt',
          size: 1024
        };

        const formData = new FormData();
        formData.append('photo', new Blob([mockFile.buffer]), mockFile.originalname);

        const response = await userClient.post('/api/users/photo', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });

        expect(response.status).toBe(400);
        expect(response.data).toBeErrorResponse();
        expect(response.data.error).toContain('file type');
      });

      it('should reject files that are too large', async () => {
        const largeFile = {
          buffer: Buffer.alloc(10 * 1024 * 1024), // 10MB
          mimetype: 'image/jpeg',
          originalname: 'large.jpg',
          size: 10 * 1024 * 1024
        };

        const formData = new FormData();
        formData.append('photo', new Blob([largeFile.buffer]), largeFile.originalname);

        const response = await userClient.post('/api/users/photo', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });

        expect(response.status).toBe(400);
        expect(response.data).toBeErrorResponse();
        expect(response.data.error).toContain('file size');
      });

      it('should require authentication', async () => {
        const unauthenticatedClient = new ApiClient(testEnvironment.services.user);
        const formData = new FormData();

        const response = await unauthenticatedClient.post('/api/users/photo', formData);

        expect(response.status).toBe(401);
        expect(response.data).toBeErrorResponse();
      });
    });
  });

  describe('User Search and Filtering', () => {
    beforeEach(async () => {
      // Create additional test users for search testing
      await authHelper.createTestUser('student', {
        profile: { firstName: 'Alice', lastName: 'Johnson' }
      });
      await authHelper.createTestUser('teacher', {
        profile: { firstName: 'Bob', lastName: 'Smith' }
      });
      await authHelper.createTestUser('staff', {
        profile: { firstName: 'Charlie', lastName: 'Brown' }
      });
    });

    describe('GET /api/users/search', () => {
      it('should search users by name', async () => {
        const response = await userClient.get('/api/users/search?q=Alice');

        expect(response.status).toBe(200);
        expect(response.data).toBeSuccessResponse();
        expect(response.data.data.users).toBeInstanceOf(Array);
        expect(response.data.data.total).toBeGreaterThan(0);
        expect(response.data.data.pagination).toBeDefined();
      });

      it('should filter users by role', async () => {
        const response = await userClient.get('/api/users/search?role=teacher');

        expect(response.status).toBe(200);
        expect(response.data).toBeSuccessResponse();
        expect(response.data.data.users).toBeInstanceOf(Array);
        expect(response.data.data.users.length).toBeGreaterThan(0);
        
        // All returned users should be teachers
        response.data.data.users.forEach((user: any) => {
          expect(user.role).toBe('teacher');
        });
      });

      it('should filter by active status', async () => {
        const response = await userClient.get('/api/users/search?isActive=true');

        expect(response.status).toBe(200);
        expect(response.data).toBeSuccessResponse();
        expect(response.data.data.users).toBeInstanceOf(Array);
        
        // All returned users should be active
        response.data.data.users.forEach((user: any) => {
          expect(user.isActive).toBe(true);
        });
      });

      it('should support pagination', async () => {
        const response = await userClient.get('/api/users/search?limit=2&offset=0');

        expect(response.status).toBe(200);
        expect(response.data).toBeSuccessResponse();
        expect(response.data.data.users.length).toBeLessThanOrEqual(2);
        expect(response.data.data.pagination.limit).toBe(2);
        expect(response.data.data.pagination.offset).toBe(0);
        expect(typeof response.data.data.pagination.hasMore).toBe('boolean');
      });

      it('should handle empty search results', async () => {
        const response = await userClient.get('/api/users/search?q=nonexistentuser12345');

        expect(response.status).toBe(200);
        expect(response.data).toBeSuccessResponse();
        expect(response.data.data.users).toBeInstanceOf(Array);
        expect(response.data.data.users.length).toBe(0);
        expect(response.data.data.total).toBe(0);
      });

      it('should limit maximum results per page', async () => {
        const response = await userClient.get('/api/users/search?limit=1000');

        expect(response.status).toBe(200);
        expect(response.data).toBeSuccessResponse();
        expect(response.data.data.pagination.limit).toBeLessThanOrEqual(100); // Should be capped
      });
    });
  });

  describe('User Activity Tracking', () => {
    describe('GET /api/users/:id/activity', () => {
      it('should get user activity log', async () => {
        const response = await userClient.get(`/api/users/${testUsers.student.id}/activity`);

        expect(response.status).toBe(200);
        expect(response.data).toBeSuccessResponse();
        expect(response.data.data.activities).toBeInstanceOf(Array);
        expect(response.data.data.total).toBeDefined();
        expect(response.data.data.pagination).toBeDefined();
      });

      it('should filter activities by action type', async () => {
        const response = await userClient.get(`/api/users/${testUsers.student.id}/activity?action=login`);

        expect(response.status).toBe(200);
        expect(response.data).toBeSuccessResponse();
        expect(response.data.data.activities).toBeInstanceOf(Array);
      });

      it('should filter activities by date range', async () => {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 7); // 7 days ago
        const endDate = new Date();

        const response = await userClient.get(
          `/api/users/${testUsers.student.id}/activity?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
        );

        expect(response.status).toBe(200);
        expect(response.data).toBeSuccessResponse();
        expect(response.data.data.activities).toBeInstanceOf(Array);
      });

      it('should support pagination for activities', async () => {
        const response = await userClient.get(`/api/users/${testUsers.student.id}/activity?limit=5&offset=0`);

        expect(response.status).toBe(200);
        expect(response.data).toBeSuccessResponse();
        expect(response.data.data.activities.length).toBeLessThanOrEqual(5);
        expect(response.data.data.pagination.limit).toBe(5);
      });

      it('should handle invalid date formats', async () => {
        const response = await userClient.get(`/api/users/${testUsers.student.id}/activity?startDate=invalid-date`);

        expect(response.status).toBe(400);
        expect(response.data).toBeErrorResponse();
      });

      it('should require valid user ID', async () => {
        const response = await userClient.get('/api/users/invalid-id/activity');

        expect(response.status).toBe(400);
        expect(response.data).toBeErrorResponse();
      });
    });

    describe('GET /api/users/activity (current user)', () => {
      it('should get current user activity', async () => {
        const response = await userClient.get('/api/users/activity');

        expect(response.status).toBe(200);
        expect(response.data).toBeSuccessResponse();
        expect(response.data.data.activities).toBeInstanceOf(Array);
      });
    });
  });

  describe('User Administration (Admin Operations)', () => {
    describe('PUT /api/users/:id/deactivate', () => {
      it('should allow admin to deactivate users', async () => {
        const response = await adminClient.put(`/api/users/${testUsers.student.id}/deactivate`);

        expect(response.status).toBe(200);
        expect(response.data).toBeSuccessResponse();
        expect(response.data.data.message).toContain('deactivated');
      });

      it('should prevent non-admin users from deactivating users', async () => {
        const response = await userClient.put(`/api/users/${testUsers.teacher.id}/deactivate`);

        expect(response.status).toBeOneOf([403, 401]);
        expect(response.data).toBeErrorResponse();
      });

      it('should prevent admin from deactivating themselves', async () => {
        const response = await adminClient.put(`/api/users/${testUsers.admin.id}/deactivate`);

        expect(response.status).toBe(400);
        expect(response.data).toBeErrorResponse();
        expect(response.data.error).toContain('yourself');
      });

      it('should handle non-existent user', async () => {
        const fakeId = '507f1f77bcf86cd799439011';
        const response = await adminClient.put(`/api/users/${fakeId}/deactivate`);

        expect(response.status).toBe(404);
        expect(response.data).toBeErrorResponse();
      });
    });

    describe('PUT /api/users/:id/reactivate', () => {
      beforeEach(async () => {
        // Deactivate a user first
        await adminClient.put(`/api/users/${testUsers.student.id}/deactivate`);
      });

      it('should allow admin to reactivate users', async () => {
        const response = await adminClient.put(`/api/users/${testUsers.student.id}/reactivate`);

        expect(response.status).toBe(200);
        expect(response.data).toBeSuccessResponse();
        expect(response.data.data.message).toContain('reactivated');
      });

      it('should prevent non-admin users from reactivating users', async () => {
        const response = await userClient.put(`/api/users/${testUsers.student.id}/reactivate`);

        expect(response.status).toBeOneOf([403, 401]);
        expect(response.data).toBeErrorResponse();
      });

      it('should handle already active user', async () => {
        // First reactivate the user
        await adminClient.put(`/api/users/${testUsers.student.id}/reactivate`);
        
        // Try to reactivate again
        const response = await adminClient.put(`/api/users/${testUsers.student.id}/reactivate`);

        expect(response.status).toBe(400);
        expect(response.data).toBeErrorResponse();
        expect(response.data.error).toContain('already active');
      });
    });
  });

  describe('Role-Based Access Control', () => {
    let studentClient: ApiClient;
    let teacherClient: ApiClient;
    let staffClient: ApiClient;

    beforeAll(async () => {
      studentClient = await authHelper.createAuthenticatedClient('user', testUsers.student);
      teacherClient = await authHelper.createAuthenticatedClient('user', testUsers.teacher);
      staffClient = await authHelper.createAuthenticatedClient('user', testUsers.staff);
    });

    it('should allow all authenticated users to view public profiles', async () => {
      const clients = [studentClient, teacherClient, staffClient, adminClient];
      
      for (const client of clients) {
        const response = await client.get(`/api/users/${testUsers.teacher.id}`);
        expect(response.status).toBe(200);
        expect(response.data).toBeSuccessResponse();
      }
    });

    it('should restrict sensitive operations to appropriate roles', async () => {
      // Only admin should be able to deactivate users
      const nonAdminClients = [studentClient, teacherClient, staffClient];
      
      for (const client of nonAdminClients) {
        const response = await client.put(`/api/users/${testUsers.student.id}/deactivate`);
        expect(response.status).toBeOneOf([403, 401]);
        expect(response.data).toBeErrorResponse();
      }
    });

    it('should allow users to update their own profiles only', async () => {
      const updateData = { profile: { firstName: 'Updated' } };
      
      // User should be able to update their own profile
      const ownProfileResponse = await studentClient.put('/api/users/profile', updateData);
      expect(ownProfileResponse.status).toBe(200);
      
      // User should not be able to update another user's profile
      const otherProfileResponse = await studentClient.put(`/api/users/${testUsers.teacher.id}`, updateData);
      expect(otherProfileResponse.status).toBeOneOf([403, 401]);
    });
  });

  describe('Input Validation and Security', () => {
    describe('SQL Injection Prevention', () => {
      it('should prevent SQL injection in search queries', async () => {
        const maliciousQuery = "'; DROP TABLE users; --";
        const response = await userClient.get(`/api/users/search?q=${encodeURIComponent(maliciousQuery)}`);

        expect(response.status).toBe(200);
        expect(response.data).toBeSuccessResponse();
        // Should return empty results, not cause database error
        expect(response.data.data.users).toBeInstanceOf(Array);
      });

      it('should prevent SQL injection in user ID parameters', async () => {
        const maliciousId = "1' OR '1'='1";
        const response = await userClient.get(`/api/users/${encodeURIComponent(maliciousId)}`);

        expect(response.status).toBe(400);
        expect(response.data).toBeErrorResponse();
      });
    });

    describe('XSS Prevention', () => {
      it('should sanitize HTML in profile updates', async () => {
        const maliciousData = {
          profile: {
            firstName: '<script>alert("xss")</script>',
            lastName: '<img src="x" onerror="alert(1)">',
            bio: 'Normal text with <script>evil()</script> content'
          }
        };

        const response = await userClient.put('/api/users/profile', maliciousData);

        if (response.status === 200) {
          // If update succeeds, ensure scripts are sanitized
          expect(response.data.data.profile.firstName).not.toContain('<script>');
          expect(response.data.data.profile.lastName).not.toContain('onerror');
          expect(response.data.data.profile.bio).not.toContain('<script>');
        } else {
          // Or update should be rejected
          expect(response.status).toBe(400);
          expect(response.data).toBeErrorResponse();
        }
      });
    });

    describe('Data Validation', () => {
      it('should validate email format in profile updates', async () => {
        const invalidData = {
          email: 'invalid-email-format'
        };

        const response = await userClient.put('/api/users/profile', invalidData);

        // Email updates might not be allowed through profile endpoint
        expect(response.status).toBeOneOf([400, 403]);
        expect(response.data).toBeErrorResponse();
      });

      it('should validate required fields', async () => {
        const incompleteData = {
          profile: {
            firstName: '', // Empty required field
            lastName: '' // Empty required field
          }
        };

        const response = await userClient.put('/api/users/profile', incompleteData);

        expect(response.status).toBe(400);
        expect(response.data).toBeErrorResponse();
      });

      it('should validate field length limits', async () => {
        const longData = {
          profile: {
            firstName: 'a'.repeat(1000), // Extremely long name
            bio: 'b'.repeat(10000) // Extremely long bio
          }
        };

        const response = await userClient.put('/api/users/profile', longData);

        expect(response.status).toBe(400);
        expect(response.data).toBeErrorResponse();
        expect(response.data.error).toContain('length');
      });
    });
  });

  describe('Rate Limiting and Performance', () => {
    it('should handle multiple concurrent requests', async () => {
      const requests = Array(10).fill(null).map(() => 
        userClient.get('/api/users/profile')
      );

      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.data).toBeSuccessResponse();
      });
    });

    it('should respond within acceptable time limits', async () => {
      const startTime = Date.now();
      const response = await userClient.get('/api/users/search?limit=20');
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(2000); // Should respond within 2 seconds
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors gracefully', async () => {
      // This test would require temporarily disconnecting the database
      // For now, we'll test with invalid operations that might cause DB errors
      const response = await userClient.get('/api/users/000000000000000000000000');

      expect(response.status).toBeOneOf([404, 400]);
      expect(response.data).toBeErrorResponse();
    });

    it('should provide meaningful error messages', async () => {
      const response = await userClient.get('/api/users/invalid-id');

      expect(response.status).toBe(400);
      expect(response.data).toBeErrorResponse();
      expect(response.data.error).toBeDefined();
      expect(response.data.error).not.toBe('');
      expect(typeof response.data.error).toBe('string');
    });

    it('should handle missing request data', async () => {
      const response = await userClient.put('/api/users/profile', {});

      // Should either accept empty update or provide validation error
      expect(response.status).toBeOneOf([200, 400]);
      expect(response.data).toBeValidApiResponse();
    });
  });
});

// Helper custom matcher
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