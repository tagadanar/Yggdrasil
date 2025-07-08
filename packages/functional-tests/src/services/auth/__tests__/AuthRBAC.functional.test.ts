/**
 * Role-Based Access Control (RBAC) Functional Tests
 * Tests authorization and permission enforcement across user roles
 */

import { createApiClient } from '../../../utils/ApiClient';
import { authHelper } from '../../../utils/AuthHelper';
import { TestDataFactory } from '../../../utils/TestDataFactory';

describe('Authentication RBAC - Functional Tests', () => {
  let adminUser: any;
  let staffUser: any;
  let teacherUser: any;
  let studentUser: any;

  let adminClient: any;
  let staffClient: any;
  let teacherClient: any;
  let studentClient: any;

  beforeAll(async () => {
    // Create test users for each role
    const testUserSet = await authHelper.createTestUserSet();
    adminUser = testUserSet.admin;
    staffUser = testUserSet.staff;
    teacherUser = testUserSet.teacher;
    studentUser = testUserSet.student;

    // Create authenticated clients for each role
    adminClient = await authHelper.createAuthenticatedClient('auth', adminUser);
    staffClient = await authHelper.createAuthenticatedClient('auth', staffUser);
    teacherClient = await authHelper.createAuthenticatedClient('auth', teacherUser);
    studentClient = await authHelper.createAuthenticatedClient('auth', studentUser);
  });

  afterAll(async () => {
    await authHelper.cleanup();
  });

  describe('Admin Role Permissions', () => {
    it('should allow admin to access all auth endpoints', async () => {
      // Test admin can access protected endpoints
      const responses = await Promise.all([
        adminClient.get('/api/auth/users'),
        adminClient.get('/api/auth/admin/stats'),
        adminClient.post('/api/auth/admin/reset-user-password', {
          userId: studentUser.id,
          newPassword: 'NewPassword123!',
        }),
      ]);

      responses.forEach(response => {
        expect(response.status).toBeLessThan(400);
        expect(response.data).toBeValidApiResponse();
      });
    });

    it('should allow admin to manage user accounts', async () => {
      const newUserData = TestDataFactory.createUser('student', {
        email: 'admin-created@yggdrasil.test',
      });

      // Create user
      const createResponse = await adminClient.post('/api/auth/admin/create-user', {
        email: newUserData.email,
        password: newUserData.password,
        role: newUserData.role,
        profile: newUserData.profile,
      });

      expect(createResponse.status).toBe(201);
      expect(createResponse.data).toBeSuccessResponse();

      const createdUserId = createResponse.data.data.user.id;

      // Update user
      const updateResponse = await adminClient.put(`/api/auth/admin/users/${createdUserId}`, {
        profile: {
          firstName: 'Updated',
          lastName: 'User',
        },
      });

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.data).toBeSuccessResponse();

      // Deactivate user
      const deactivateResponse = await adminClient.post(`/api/auth/admin/users/${createdUserId}/deactivate`);

      expect(deactivateResponse.status).toBe(200);
      expect(deactivateResponse.data).toBeSuccessResponse();
    });

    it('should allow admin to view system statistics', async () => {
      const response = await adminClient.get('/api/auth/admin/stats');

      expect(response.status).toBe(200);
      expect(response.data).toBeSuccessResponse();
      expect(response.data.data).toHaveProperty('totalUsers');
      expect(response.data.data).toHaveProperty('activeUsers');
      expect(response.data.data).toHaveProperty('usersByRole');
    });

    it('should allow admin to access audit logs', async () => {
      const response = await adminClient.get('/api/auth/admin/audit-logs');

      expect(response.status).toBe(200);
      expect(response.data).toBeSuccessResponse();
      expect(Array.isArray(response.data.data)).toBe(true);
    });
  });

  describe('Staff Role Permissions', () => {
    it('should allow staff to access limited admin endpoints', async () => {
      // Staff should have some admin privileges but not all
      const allowedResponse = await staffClient.get('/api/auth/users');
      expect(allowedResponse.status).toBe(200);
      expect(allowedResponse.data).toBeSuccessResponse();

      // But not full admin privileges
      const deniedResponse = await staffClient.get('/api/auth/admin/stats');
      expect(deniedResponse.status).toBe(403);
      expect(deniedResponse.data).toBeErrorResponse();
    });

    it('should allow staff to manage student accounts', async () => {
      const newStudentData = TestDataFactory.createUser('student', {
        email: 'staff-created@yggdrasil.test',
      });

      const createResponse = await staffClient.post('/api/auth/staff/create-student', {
        email: newStudentData.email,
        password: newStudentData.password,
        profile: newStudentData.profile,
      });

      expect(createResponse.status).toBe(201);
      expect(createResponse.data).toBeSuccessResponse();
      expect(createResponse.data.data.user.role).toBe('student');
    });

    it('should prevent staff from creating admin users', async () => {
      const newAdminData = TestDataFactory.createUser('admin', {
        email: 'staff-attempt-admin@yggdrasil.test',
      });

      const response = await staffClient.post('/api/auth/staff/create-user', {
        email: newAdminData.email,
        password: newAdminData.password,
        role: 'admin',
        profile: newAdminData.profile,
      });

      expect(response.status).toBe(403);
      expect(response.data).toBeErrorResponse();
      expect(response.data.error).toContain('permission');
    });

    it('should allow staff to reset student passwords', async () => {
      const response = await staffClient.post('/api/auth/staff/reset-password', {
        userId: studentUser.id,
        newPassword: 'StaffResetPassword123!',
      });

      expect(response.status).toBe(200);
      expect(response.data).toBeSuccessResponse();
    });
  });

  describe('Teacher Role Permissions', () => {
    it('should allow teacher to access basic user information', async () => {
      const response = await teacherClient.get('/api/auth/profile');

      expect(response.status).toBe(200);
      expect(response.data).toBeSuccessResponse();
      expect(response.data.data.user).toHaveValidUser();
    });

    it('should allow teacher to update their own profile', async () => {
      const updateData = {
        profile: {
          firstName: 'Updated',
          lastName: 'Teacher',
        },
      };

      const response = await teacherClient.put('/api/auth/profile', updateData);

      expect(response.status).toBe(200);
      expect(response.data).toBeSuccessResponse();
      expect(response.data.data.user.profile.firstName).toBe('Updated');
    });

    it('should prevent teacher from accessing admin endpoints', async () => {
      const adminEndpoints = [
        '/api/auth/admin/stats',
        '/api/auth/admin/users',
        '/api/auth/admin/audit-logs',
      ];

      for (const endpoint of adminEndpoints) {
        const response = await teacherClient.get(endpoint);
        expect(response.status).toBe(403);
        expect(response.data).toBeErrorResponse();
      }
    });

    it('should prevent teacher from managing other users', async () => {
      const response = await teacherClient.post('/api/auth/admin/create-user', {
        email: 'teacher-attempt@yggdrasil.test',
        password: 'TestPassword123!',
        role: 'student',
        profile: {
          firstName: 'Test',
          lastName: 'User',
        },
      });

      expect(response.status).toBe(403);
      expect(response.data).toBeErrorResponse();
    });

    it('should allow teacher to view limited user lists for course management', async () => {
      const response = await teacherClient.get('/api/auth/users/students');

      expect(response.status).toBe(200);
      expect(response.data).toBeSuccessResponse();
      expect(Array.isArray(response.data.data)).toBe(true);
    });
  });

  describe('Student Role Permissions', () => {
    it('should allow student to access their own profile', async () => {
      const response = await studentClient.get('/api/auth/profile');

      expect(response.status).toBe(200);
      expect(response.data).toBeSuccessResponse();
      expect(response.data.data.user).toHaveValidUser();
      expect(response.data.data.user.id).toBe(studentUser.id);
    });

    it('should allow student to update their own profile', async () => {
      const updateData = {
        profile: {
          firstName: 'Updated',
          lastName: 'Student',
        },
      };

      const response = await studentClient.put('/api/auth/profile', updateData);

      expect(response.status).toBe(200);
      expect(response.data).toBeSuccessResponse();
      expect(response.data.data.user.profile.firstName).toBe('Updated');
    });

    it('should prevent student from accessing admin endpoints', async () => {
      const adminEndpoints = [
        '/api/auth/admin/stats',
        '/api/auth/admin/users',
        '/api/auth/admin/audit-logs',
        '/api/auth/users',
      ];

      for (const endpoint of adminEndpoints) {
        const response = await studentClient.get(endpoint);
        expect(response.status).toBe(403);
        expect(response.data).toBeErrorResponse();
      }
    });

    it('should prevent student from managing other users', async () => {
      const response = await studentClient.post('/api/auth/admin/create-user', {
        email: 'student-attempt@yggdrasil.test',
        password: 'TestPassword123!',
        role: 'student',
        profile: {
          firstName: 'Test',
          lastName: 'User',
        },
      });

      expect(response.status).toBe(403);
      expect(response.data).toBeErrorResponse();
    });

    it('should prevent student from viewing other user profiles', async () => {
      const response = await studentClient.get(`/api/auth/users/${teacherUser.id}`);

      expect(response.status).toBe(403);
      expect(response.data).toBeErrorResponse();
    });

    it('should allow student to change their own password', async () => {
      const response = await studentClient.post('/api/auth/change-password', {
        currentPassword: studentUser.password,
        newPassword: 'NewStudentPassword123!',
      });

      expect(response.status).toBe(200);
      expect(response.data).toBeSuccessResponse();
    });
  });

  describe('Cross-Role Access Control', () => {
    it('should prevent users from accessing resources of other users', async () => {
      // Create additional users
      const student1 = await authHelper.createTestUser('student', {
        email: 'student1@yggdrasil.test',
      });
      const student2 = await authHelper.createTestUser('student', {
        email: 'student2@yggdrasil.test',
      });

      const client1 = await authHelper.createAuthenticatedClient('auth', student1);
      const client2 = await authHelper.createAuthenticatedClient('auth', student2);

      // Student 1 tries to access Student 2's profile
      const response = await client1.get(`/api/auth/users/${student2.id}`);

      expect(response.status).toBe(403);
      expect(response.data).toBeErrorResponse();
    });

    it('should enforce role hierarchy in permissions', async () => {
      // Admin should have higher privileges than staff
      const adminStatsResponse = await adminClient.get('/api/auth/admin/stats');
      expect(adminStatsResponse.status).toBe(200);

      const staffStatsResponse = await staffClient.get('/api/auth/admin/stats');
      expect(staffStatsResponse.status).toBe(403);

      // Staff should have higher privileges than teacher
      const staffUsersResponse = await staffClient.get('/api/auth/users');
      expect(staffUsersResponse.status).toBe(200);

      const teacherUsersResponse = await teacherClient.get('/api/auth/users');
      expect(teacherUsersResponse.status).toBe(403);
    });

    it('should validate role transitions', async () => {
      // Create a student user
      const student = await authHelper.createTestUser('student', {
        email: 'role-transition@yggdrasil.test',
      });

      // Only admin should be able to change user roles
      const response = await adminClient.put(`/api/auth/admin/users/${student.id}`, {
        role: 'teacher',
      });

      expect(response.status).toBe(200);
      expect(response.data).toBeSuccessResponse();
      expect(response.data.data.user.role).toBe('teacher');
    });

    it('should handle token validation across services', async () => {
      // Test that tokens are properly validated across different services
      const userClient = await authHelper.createAuthenticatedClient('user', studentUser);
      const courseClient = await authHelper.createAuthenticatedClient('course', studentUser);

      // Both should work with the same user token
      const userResponse = await userClient.get('/api/users/profile');
      expect(userResponse.status).toBe(200);

      const courseResponse = await courseClient.get('/api/courses');
      expect(courseResponse.status).toBe(200);
    });
  });

  describe('Permission Edge Cases', () => {
    it('should handle expired tokens gracefully', async () => {
      // This would require creating expired tokens or waiting for expiration
      // For now, we'll test with malformed tokens
      const expiredClient = createApiClient('auth', 'expired.token.here');

      const response = await expiredClient.get('/api/auth/profile');

      expect(response.status).toBe(401);
      expect(response.data).toBeErrorResponse();
      expect(response.data.error).toContain('Invalid token');
    });

    it('should handle concurrent role changes', async () => {
      const testUser = await authHelper.createTestUser('student', {
        email: 'concurrent-test@yggdrasil.test',
      });

      // Simulate concurrent role changes
      const promises = [
        adminClient.put(`/api/auth/admin/users/${testUser.id}`, { role: 'teacher' }),
        adminClient.put(`/api/auth/admin/users/${testUser.id}`, { role: 'staff' }),
      ];

      const responses = await Promise.all(promises);

      // At least one should succeed
      const successResponses = responses.filter(r => r.status === 200);
      expect(successResponses.length).toBeGreaterThan(0);
    });

    it('should validate permissions with malformed user data', async () => {
      // Test with user that has missing role information
      const malformedToken = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpZCI6IjEyMzQ1Njc4OTAiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20ifQ.invalid';
      const malformedClient = createApiClient('auth', malformedToken);

      const response = await malformedClient.get('/api/auth/profile');

      expect(response.status).toBe(401);
      expect(response.data).toBeErrorResponse();
    });

    it('should handle deactivated user tokens', async () => {
      // Create a user and get their token
      const tempUser = await authHelper.createTestUser('student', {
        email: 'to-deactivate@yggdrasil.test',
      });
      const tempClient = await authHelper.createAuthenticatedClient('auth', tempUser);

      // Deactivate the user
      await adminClient.post(`/api/auth/admin/users/${tempUser.id}/deactivate`);

      // Token should no longer work
      const response = await tempClient.get('/api/auth/profile');

      expect(response.status).toBe(401);
      expect(response.data).toBeErrorResponse();
      expect(response.data.error).toContain('inactive');
    });
  });

  describe('Security Boundary Tests', () => {
    it('should prevent privilege escalation attempts', async () => {
      // Student attempts to modify their own role
      const response = await studentClient.put('/api/auth/profile', {
        role: 'admin',
      });

      expect(response.status).toBe(403);
      expect(response.data).toBeErrorResponse();
      expect(response.data.error).toContain('permission');
    });

    it('should prevent bypassing authentication with manipulated headers', async () => {
      const unauthenticatedClient = createApiClient('auth');

      // Try to bypass auth with fake headers
      const response = await unauthenticatedClient.get('/api/auth/profile', {
        headers: {
          'X-User-Role': 'admin',
          'X-User-Id': adminUser.id,
        },
      });

      expect(response.status).toBe(401);
      expect(response.data).toBeErrorResponse();
    });

    it('should validate token ownership', async () => {
      // Create two users
      const user1 = await authHelper.createTestUser('student', {
        email: 'user1@yggdrasil.test',
      });
      const user2 = await authHelper.createTestUser('student', {
        email: 'user2@yggdrasil.test',
      });

      const client1 = await authHelper.createAuthenticatedClient('auth', user1);

      // Try to access user2's profile with user1's token
      const response = await client1.get(`/api/auth/users/${user2.id}`);

      expect(response.status).toBe(403);
      expect(response.data).toBeErrorResponse();
    });
  });
});