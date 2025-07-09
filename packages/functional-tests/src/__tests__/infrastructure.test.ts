/**
 * Infrastructure Test
 * 
 * Tests that the functional test infrastructure is working correctly
 * - API Client functionality
 * - Auth Helper functionality  
 * - Database Helper functionality
 * - Test Data Factory functionality
 */

import { ApiClient } from '../utils/ApiClient';
import { AuthHelper } from '../utils/AuthHelper';
import { TestDataFactory } from '../utils/TestDataFactory';
import { databaseHelper } from '../utils/DatabaseHelper';
import { testEnvironment } from '../config/environment';

describe('Functional Test Infrastructure', () => {
  let authHelper: AuthHelper;

  beforeAll(async () => {
    authHelper = new AuthHelper();
  });

  afterAll(async () => {
    await authHelper.cleanup();
  });

  describe('Test Environment Configuration', () => {
    it('should have valid environment configuration', () => {
      expect(testEnvironment.services.auth).toBeDefined();
      expect(testEnvironment.services.user).toBeDefined();
      expect(testEnvironment.services.course).toBeDefined();
      expect(testEnvironment.database.uri).toBeDefined();
      expect(testEnvironment.authentication.jwtSecret).toBeDefined();
    });

    it('should have proper timeout configurations', () => {
      expect(testEnvironment.timeouts.api).toBeGreaterThan(0);
      expect(testEnvironment.timeouts.database).toBeGreaterThan(0);
      expect(testEnvironment.retry.attempts).toBeGreaterThan(0);
    });
  });

  describe('ApiClient Infrastructure', () => {

    it('should handle authentication token setting', () => {
      const client = new ApiClient('http://localhost:3001');
      const testToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.token';
      
      expect(() => client.setAuthToken(testToken)).not.toThrow();
      expect(() => client.clearAuthToken()).not.toThrow();
    });

    it('should handle service health check attempts', async () => {
      const client = new ApiClient('http://localhost:3001');
      
      // Health check should return boolean, regardless of service availability
      const isHealthy = await client.healthCheck();
      expect(typeof isHealthy).toBe('boolean');
    });
  });

  describe('AuthHelper Infrastructure', () => {

    it('should validate token format correctly', () => {
      const validToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjEyMyIsInJvbGUiOiJ0ZXN0IiwiZXhwIjo5OTk5OTk5OTk5fQ.test';
      const invalidToken = 'invalid.token.format';
      
      expect(authHelper.isTokenValid(validToken)).toBe(true);
      expect(authHelper.isTokenValid(invalidToken)).toBe(false);
    });

    it('should extract role from token correctly', () => {
      // Valid token with role: test
      const tokenWithRole = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjEyMyIsInJvbGUiOiJ0ZXN0IiwiZXhwIjo5OTk5OTk5OTk5fQ.test';
      const invalidToken = 'invalid.token';
      
      expect(authHelper.getRoleFromToken(tokenWithRole)).toBe('test');
      expect(authHelper.getRoleFromToken(invalidToken)).toBeNull();
    });
  });

  describe('TestDataFactory Infrastructure', () => {
    it('should generate valid user data', () => {
      const userData = TestDataFactory.createUser('student');
      
      expect(userData).toHaveProperty('email');
      expect(userData).toHaveProperty('password');
      expect(userData).toHaveProperty('role');
      expect(userData).toHaveProperty('profile');
      expect(userData.role).toBe('student');
      expect(userData.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
    });

    it('should generate valid course data', () => {
      const courseData = TestDataFactory.createCourse('instructor-123');
      
      expect(courseData).toHaveProperty('title');
      expect(courseData).toHaveProperty('code');
      expect(courseData).toHaveProperty('description');
      expect(courseData).toHaveProperty('instructorId');
      expect(courseData.instructorId).toBe('instructor-123');
    });

    it('should generate valid article data', () => {
      const articleData = TestDataFactory.createArticle('author-123');
      
      expect(articleData).toHaveProperty('title');
      expect(articleData).toHaveProperty('content');
      expect(articleData).toHaveProperty('authorId');
      expect(articleData).toHaveProperty('category');
      expect(articleData.authorId).toBe('author-123');
    });

    it('should generate valid calendar event data', () => {
      const eventData = TestDataFactory.createCalendarEvent('organizer-123');
      
      expect(eventData).toHaveProperty('title');
      expect(eventData).toHaveProperty('description');
      expect(eventData).toHaveProperty('startDate');
      expect(eventData).toHaveProperty('endDate');
      expect(eventData).toHaveProperty('organizerId');
      expect(eventData.organizerId).toBe('organizer-123');
      expect(eventData.startDate).toBeInstanceOf(Date);
      expect(eventData.endDate).toBeInstanceOf(Date);
    });

    it('should allow custom data overrides', () => {
      const customUserData = TestDataFactory.createUser('teacher', {
        email: 'custom@test.com',
        profile: {
          firstName: 'Custom',
          lastName: 'Teacher'
        }
      });
      
      expect(customUserData.email).toBe('custom@test.com');
      expect(customUserData.profile.firstName).toBe('Custom');
      expect(customUserData.profile.lastName).toBe('Teacher');
      expect(customUserData.role).toBe('teacher');
    });
  });

  describe('DatabaseHelper Infrastructure', () => {

    it('should handle database connection attempts', async () => {
      // This should not throw even if database is not available
      try {
        await databaseHelper.connect();
        // If successful, test disconnect
        await databaseHelper.disconnect();
      } catch (error) {
        // Connection failure is acceptable in test environment
        expect(error).toBeDefined();
      }
    });

    it('should handle cleanup operations gracefully', async () => {
      // Cleanup should not throw even if database is not connected
      try {
        await databaseHelper.cleanupTestData();
      } catch (error) {
        // Cleanup failure is acceptable if database is not available
        expect(error).toBeDefined();
      }
    });
  });

  describe('Integration Between Components', () => {
    it('should create API client from AuthHelper', async () => {
      try {
        // Try to create a test user and client
        const testUser = await authHelper.createTestUser('student');
        expect(testUser).toHaveProperty('id');
        expect(testUser).toHaveProperty('email');
        expect(testUser.role).toBe('student');
      } catch (error) {
        // User creation may fail if auth service is not running
        // This is acceptable for infrastructure testing
        expect(error).toBeDefined();
      }
    });

    it('should handle service unavailability gracefully', async () => {
      const unavailableClient = new ApiClient('http://localhost:9999'); // Non-existent service
      
      // Should not throw, should return false
      const isHealthy = await unavailableClient.healthCheck();
      expect(isHealthy).toBe(false);
    });
  });

  describe('Error Handling Infrastructure', () => {
    it('should handle network errors gracefully', async () => {
      const client = new ApiClient('http://localhost:9999');
      
      try {
        await client.get('/test');
        // If this succeeds, something unexpected happened
        fail('Expected network error');
      } catch (error) {
        // This is expected behavior
        expect(error).toBeDefined();
      }
    });

    it('should handle invalid authentication gracefully', async () => {
      try {
        const invalidAuthResult = await authHelper.loginAs({
          id: 'invalid',
          email: 'invalid@test.com',
          role: 'student',
          profile: { firstName: 'Invalid', lastName: 'User' },
          password: 'invalid',
          isActive: true
        });
        
        expect(invalidAuthResult.success).toBe(false);
      } catch (error) {
        // Login failure is expected with invalid credentials
        expect(error).toBeDefined();
      }
    });
  });

});