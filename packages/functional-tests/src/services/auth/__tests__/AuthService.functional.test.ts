/**
 * Functional tests for Authentication Service
 * Tests complete authentication workflows and business logic
 */

import { createApiClient } from '../../../utils/ApiClient';
import { authHelper } from '../../../utils/AuthHelper';
import { TestDataFactory } from '../../../utils/TestDataFactory';
import { testEnvironment } from '../../../config/environment';

describe('Authentication Service - Functional Tests', () => {
  let authClient: any;

  beforeAll(async () => {
    authClient = createApiClient('auth');
  });

  afterEach(async () => {
    await authHelper.cleanup();
  });

  describe('User Registration Flow', () => {
    it('should register a new student user successfully', async () => {
      const userData = TestDataFactory.createRegistrationScenarios().validUser;
      
      const response = await authClient.post('/api/auth/register', userData);
      
      expect(response.status).toBe(201);
      expect(response.data).toBeSuccessResponse();
      expect(response.data.data.user).toHaveValidUser();
      expect(response.data.data.user.email).toBe(userData.email);
      expect(response.data.data.user.role).toBe(userData.role);
      expect(response.data.data.user.profile.firstName).toBe(userData.profile?.firstName);
      expect(response.data.data.user.profile.lastName).toBe(userData.profile?.lastName);
      expect(response.data.data.tokens).toHaveValidToken();
    });

    it('should register a new teacher user successfully', async () => {
      const userData = TestDataFactory.createUser('teacher', {
        email: 'teacher.test@yggdrasil.test',
        profile: {
          firstName: 'Teacher',
          lastName: 'Test',
        },
      });
      
      const response = await authClient.post('/api/auth/register', {
        email: userData.email,
        password: userData.password,
        role: userData.role,
        profile: userData.profile,
      });
      
      expect(response.status).toBe(201);
      expect(response.data).toBeSuccessResponse();
      expect(response.data.data.user.role).toBe('teacher');
      expect(response.data.data.tokens).toHaveValidToken();
    });

    it('should register a new admin user successfully', async () => {
      const userData = TestDataFactory.createUser('admin', {
        email: 'admin.test@yggdrasil.test',
        profile: {
          firstName: 'Admin',
          lastName: 'Test',
        },
      });
      
      const response = await authClient.post('/api/auth/register', {
        email: userData.email,
        password: userData.password,
        role: userData.role,
        profile: userData.profile,
      });
      
      expect(response.status).toBe(201);
      expect(response.data).toBeSuccessResponse();
      expect(response.data.data.user.role).toBe('admin');
      expect(response.data.data.tokens).toHaveValidToken();
    });

    it('should reject registration with invalid email format', async () => {
      const userData = TestDataFactory.createRegistrationScenarios().invalidEmail;
      
      const response = await authClient.post('/api/auth/register', userData);
      
      expect(response.status).toBe(400);
      expect(response.data).toBeErrorResponse();
      expect(response.data.error).toContain('email');
    });

    it('should reject registration with weak password', async () => {
      const userData = TestDataFactory.createRegistrationScenarios().weakPassword;
      
      const response = await authClient.post('/api/auth/register', userData);
      
      expect(response.status).toBe(400);
      expect(response.data).toBeErrorResponse();
      expect(response.data.error).toContain('password');
    });

    it('should reject registration with duplicate email', async () => {
      const userData = TestDataFactory.createRegistrationScenarios().duplicateEmail;
      
      // First registration should succeed
      const firstResponse = await authClient.post('/api/auth/register', userData);
      expect(firstResponse.status).toBe(201);
      
      // Second registration with same email should fail
      const secondResponse = await authClient.post('/api/auth/register', userData);
      expect(secondResponse.status).toBe(400);
      expect(secondResponse.data).toBeErrorResponse();
      expect(secondResponse.data.error).toContain('already exists');
    });

    it('should reject registration with missing required fields', async () => {
      const incompleteData = {
        email: 'test@yggdrasil.test',
        // Missing password, role, and profile
      };
      
      const response = await authClient.post('/api/auth/register', incompleteData);
      
      expect(response.status).toBe(400);
      expect(response.data).toBeErrorResponse();
      expect(response.data.error).toContain('required');
    });

    it('should reject registration with invalid role', async () => {
      const userData = {
        email: 'test@yggdrasil.test',
        password: 'ValidPassword123!',
        role: 'invalid-role',
        profile: {
          firstName: 'Test',
          lastName: 'User',
        },
      };
      
      const response = await authClient.post('/api/auth/register', userData);
      
      expect(response.status).toBe(400);
      expect(response.data).toBeErrorResponse();
      expect(response.data.error).toContain('role');
    });
  });

  describe('User Login Flow', () => {
    let testUser: any;

    beforeEach(async () => {
      testUser = await authHelper.createTestUser('student');
    });

    it('should login with valid credentials', async () => {
      const response = await authClient.post('/api/auth/login', {
        email: testUser.email,
        password: testUser.password,
      });
      
      expect(response.status).toBe(200);
      expect(response.data).toBeSuccessResponse();
      expect(response.data.data.user).toHaveValidUser();
      expect(response.data.data.user.id).toBe(testUser.id);
      expect(response.data.data.user.email).toBe(testUser.email);
      expect(response.data.data.tokens).toHaveValidToken();
    });

    it('should reject login with invalid email', async () => {
      const response = await authClient.post('/api/auth/login', {
        email: 'nonexistent@yggdrasil.test',
        password: testUser.password,
      });
      
      expect(response.status).toBe(401);
      expect(response.data).toBeErrorResponse();
      expect(response.data.error).toContain('Invalid credentials');
    });

    it('should reject login with incorrect password', async () => {
      const response = await authClient.post('/api/auth/login', {
        email: testUser.email,
        password: 'WrongPassword123!',
      });
      
      expect(response.status).toBe(401);
      expect(response.data).toBeErrorResponse();
      expect(response.data.error).toContain('Invalid credentials');
    });

    it('should reject login with missing credentials', async () => {
      const response = await authClient.post('/api/auth/login', {
        email: testUser.email,
        // Missing password
      });
      
      expect(response.status).toBe(400);
      expect(response.data).toBeErrorResponse();
      expect(response.data.error).toContain('required');
    });

    it('should reject login for inactive user', async () => {
      // Create inactive user
      const inactiveUser = await authHelper.createTestUser('student', {
        email: 'inactive@yggdrasil.test',
        isActive: false,
      });
      
      const response = await authClient.post('/api/auth/login', {
        email: inactiveUser.email,
        password: inactiveUser.password,
      });
      
      expect(response.status).toBe(401);
      expect(response.data).toBeErrorResponse();
      expect(response.data.error).toContain('inactive');
    });

    it('should handle concurrent logins for same user', async () => {
      const loginData = {
        email: testUser.email,
        password: testUser.password,
      };
      
      // Make multiple concurrent login requests
      const promises = Array.from({ length: 3 }, () => 
        authClient.post('/api/auth/login', loginData)
      );
      
      const responses = await Promise.all(promises);
      
      // All should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.data).toBeSuccessResponse();
        expect(response.data.data.tokens).toHaveValidToken();
      });
    });
  });

  describe('Token Refresh Flow', () => {
    let testUser: any;
    let tokens: any;

    beforeEach(async () => {
      const authResult = await authHelper.loginAs('student');
      testUser = authResult.user;
      tokens = authResult.tokens;
    });

    it('should refresh tokens with valid refresh token', async () => {
      const response = await authClient.post('/api/auth/refresh-token', {
        refreshToken: tokens.refreshToken,
      });
      
      expect(response.status).toBe(200);
      expect(response.data).toBeSuccessResponse();
      expect(response.data.data.tokens).toHaveValidToken();
      expect(response.data.data.tokens.accessToken).not.toBe(tokens.accessToken);
      expect(response.data.data.tokens.refreshToken).not.toBe(tokens.refreshToken);
    });

    it('should reject refresh with invalid refresh token', async () => {
      const response = await authClient.post('/api/auth/refresh-token', {
        refreshToken: 'invalid-refresh-token',
      });
      
      expect(response.status).toBe(401);
      expect(response.data).toBeErrorResponse();
      expect(response.data.error).toContain('Invalid refresh token');
    });

    it('should reject refresh with missing refresh token', async () => {
      const response = await authClient.post('/api/auth/refresh-token', {});
      
      expect(response.status).toBe(400);
      expect(response.data).toBeErrorResponse();
      expect(response.data.error).toContain('required');
    });

  });

  describe('Password Reset Flow', () => {
    let testUser: any;

    beforeEach(async () => {
      testUser = await authHelper.createTestUser('student');
    });

    it('should initiate password reset with valid email', async () => {
      const response = await authClient.post('/api/auth/forgot-password', {
        email: testUser.email,
      });
      
      expect(response.status).toBe(200);
      expect(response.data).toBeSuccessResponse();
      expect(response.data.message).toContain('reset');
    });

    it('should handle password reset for non-existent email', async () => {
      const response = await authClient.post('/api/auth/forgot-password', {
        email: 'nonexistent@yggdrasil.test',
      });
      
      // Should return success to prevent email enumeration
      expect(response.status).toBe(200);
      expect(response.data).toBeSuccessResponse();
    });

    it('should reject password reset with invalid email format', async () => {
      const response = await authClient.post('/api/auth/forgot-password', {
        email: 'invalid-email',
      });
      
      expect(response.status).toBe(400);
      expect(response.data).toBeErrorResponse();
      expect(response.data.error).toContain('email');
    });

    it('should reject password reset with missing email', async () => {
      const response = await authClient.post('/api/auth/forgot-password', {});
      
      expect(response.status).toBe(400);
      expect(response.data).toBeErrorResponse();
      expect(response.data.error).toContain('required');
    });
  });

  describe('Logout Flow', () => {
    let testUser: any;
    let tokens: any;

    beforeEach(async () => {
      const authResult = await authHelper.loginAs('student');
      testUser = authResult.user;
      tokens = authResult.tokens;
    });

    it('should logout successfully with valid token', async () => {
      const authenticatedClient = createApiClient('auth', tokens.accessToken);
      
      const response = await authenticatedClient.post('/api/auth/logout');
      
      expect(response.status).toBe(200);
      expect(response.data).toBeSuccessResponse();
      expect(response.data.message).toContain('logged out');
    });

    it('should reject logout with invalid token', async () => {
      const authenticatedClient = createApiClient('auth', 'invalid-token');
      
      const response = await authenticatedClient.post('/api/auth/logout');
      
      expect(response.status).toBe(401);
      expect(response.data).toBeErrorResponse();
      expect(response.data.error).toContain('Invalid token');
    });

    it('should reject logout with missing token', async () => {
      const response = await authClient.post('/api/auth/logout');
      
      expect(response.status).toBe(401);
      expect(response.data).toBeErrorResponse();
      expect(response.data.error).toContain('No token provided');
    });
  });

  describe('Password Change Flow', () => {
    let testUser: any;
    let tokens: any;

    beforeEach(async () => {
      const authResult = await authHelper.loginAs('student');
      testUser = authResult.user;
      tokens = authResult.tokens;
    });

    it('should change password successfully', async () => {
      const authenticatedClient = createApiClient('auth', tokens.accessToken);
      
      const response = await authenticatedClient.post('/api/auth/change-password', {
        currentPassword: testUser.password,
        newPassword: 'NewPassword123!',
      });
      
      expect(response.status).toBe(200);
      expect(response.data).toBeSuccessResponse();
      expect(response.data.message).toContain('changed');
    });

    it('should reject password change with wrong current password', async () => {
      const authenticatedClient = createApiClient('auth', tokens.accessToken);
      
      const response = await authenticatedClient.post('/api/auth/change-password', {
        currentPassword: 'WrongPassword123!',
        newPassword: 'NewPassword123!',
      });
      
      expect(response.status).toBe(400);
      expect(response.data).toBeErrorResponse();
      expect(response.data.error).toContain('current password');
    });

    it('should reject password change with weak new password', async () => {
      const authenticatedClient = createApiClient('auth', tokens.accessToken);
      
      const response = await authenticatedClient.post('/api/auth/change-password', {
        currentPassword: testUser.password,
        newPassword: '123',
      });
      
      expect(response.status).toBe(400);
      expect(response.data).toBeErrorResponse();
      expect(response.data.error).toContain('password');
    });

    it('should reject password change with missing fields', async () => {
      const authenticatedClient = createApiClient('auth', tokens.accessToken);
      
      const response = await authenticatedClient.post('/api/auth/change-password', {
        currentPassword: testUser.password,
        // Missing newPassword
      });
      
      expect(response.status).toBe(400);
      expect(response.data).toBeErrorResponse();
      expect(response.data.error).toContain('required');
    });

    it('should reject password change without authentication', async () => {
      const response = await authClient.post('/api/auth/change-password', {
        currentPassword: testUser.password,
        newPassword: 'NewPassword123!',
      });
      
      expect(response.status).toBe(401);
      expect(response.data).toBeErrorResponse();
      expect(response.data.error).toContain('No token provided');
    });
  });

  describe('Authentication Security', () => {
    it('should rate limit failed login attempts', async () => {
      const testUser = await authHelper.createTestUser('student');
      
      // Make multiple failed login attempts
      const promises = Array.from({ length: 10 }, () => 
        authClient.post('/api/auth/login', {
          email: testUser.email,
          password: 'WrongPassword123!',
        })
      );
      
      const responses = await Promise.all(promises.map(p => p.catch(e => e.response)));
      
      // Some requests should be rate limited
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    it('should validate JWT token format', async () => {
      const malformedTokens = [
        'invalid.token',
        'invalid.token.format.extra',
        'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.invalid.signature',
      ];
      
      for (const token of malformedTokens) {
        const authenticatedClient = createApiClient('auth', token);
        
        const response = await authenticatedClient.post('/api/auth/logout');
        
        expect(response.status).toBe(401);
        expect(response.data).toBeErrorResponse();
        expect(response.data.error).toContain('Invalid token');
      }
    });

    it('should prevent SQL injection in login', async () => {
      const maliciousInputs = [
        "'; DROP TABLE users; --",
        "admin@yggdrasil.test' OR '1'='1",
        "admin@yggdrasil.test'; DELETE FROM users; --",
      ];
      
      for (const maliciousInput of maliciousInputs) {
        const response = await authClient.post('/api/auth/login', {
          email: maliciousInput,
          password: 'TestPassword123!',
        });
        
        expect(response.status).toBe(401);
        expect(response.data).toBeErrorResponse();
      }
    });

    it('should sanitize user input in registration', async () => {
      const maliciousUserData = {
        email: 'test@yggdrasil.test',
        password: 'TestPassword123!',
        role: 'student',
        profile: {
          firstName: '<script>alert("XSS")</script>',
          lastName: '<?php echo "PHP injection"; ?>',
        },
      };
      
      const response = await authClient.post('/api/auth/register', maliciousUserData);
      
      expect(response.status).toBe(201);
      expect(response.data).toBeSuccessResponse();
      expect(response.data.data.user.profile.firstName).not.toContain('<script>');
      expect(response.data.data.user.profile.lastName).not.toContain('<?php');
    });
  });

  describe('Error Handling', () => {

    it('should handle malformed JSON requests', async () => {
      try {
        const response = await authClient.raw({
          method: 'post',
          url: '/api/auth/login',
          data: 'invalid json',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        expect(response.status).toBe(400);
        expect(response.data).toBeErrorResponse();
      } catch (error: any) {
        expect(error.response.status).toBe(400);
        expect(error.response.data).toBeErrorResponse();
      }
    });

    it('should handle missing Content-Type header', async () => {
      const response = await authClient.raw({
        method: 'post',
        url: '/api/auth/login',
        data: {
          email: 'test@yggdrasil.test',
          password: 'TestPassword123!',
        },
        headers: {
          'Content-Type': 'text/plain',
        },
      });
      
      expect(response.status).toBe(400);
      expect(response.data).toBeErrorResponse();
    });

    it('should handle extremely long input values', async () => {
      const longString = 'a'.repeat(10000);
      
      const response = await authClient.post('/api/auth/login', {
        email: longString + '@yggdrasil.test',
        password: longString,
      });
      
      expect(response.status).toBe(400);
      expect(response.data).toBeErrorResponse();
    });
  });
});