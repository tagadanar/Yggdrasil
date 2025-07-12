import { AuthHelper } from '../../../utils/AuthHelper';
import { DatabaseHelper } from '../../../utils/DatabaseHelper';
import { TestDataFactory } from '../../../utils/TestDataFactory';
import axios from 'axios';

describe('Authentication Consistency - Cross-Service Validation', () => {
  let authHelper: AuthHelper;
  let dbHelper: DatabaseHelper;
  
  beforeAll(async () => {
    authHelper = new AuthHelper();
    dbHelper = DatabaseHelper.getInstance();
    await dbHelper.connect();
    await dbHelper.createTestIndexes();
  });

  afterEach(async () => {
    await authHelper.cleanup();
  });

  afterAll(async () => {
    await authHelper.cleanup();
  });

  describe('🚨 CRITICAL BUG TEST: Deactivated User Access', () => {
    it('should consistently reject deactivated users across ALL services', async () => {
      // Step 1: Create and authenticate a user
      const testUser = await authHelper.createTestUser('student');

      // Step 2: Create authenticated clients for the test user
      const userAuthClients = {
        auth: await authHelper.createAuthenticatedClient('auth', testUser),
        user: await authHelper.createAuthenticatedClient('user', testUser),
        course: await authHelper.createAuthenticatedClient('course', testUser),
        news: await authHelper.createAuthenticatedClient('news', testUser),
        planning: await authHelper.createAuthenticatedClient('planning', testUser),
        statistics: await authHelper.createAuthenticatedClient('statistics', testUser),
      };

      // Verify all services accept the active user
      console.log('Testing auth service...');
      const authProfileResponse = await userAuthClients.auth.get('/api/auth/profile');
      expect(authProfileResponse.status).toBe(200);

      console.log('Testing user service...');
      const userProfileResponse = await userAuthClients.user.get(`/api/users/${testUser.id}`);
      expect(userProfileResponse.status).toBe(200);

      console.log('Testing course service...');
      const coursesResponse = await userAuthClients.course.get('/api/courses');
      expect(coursesResponse.status).toBe(200);

      console.log('Testing news service...');
      const newsResponse = await userAuthClients.news.get('/api/news');
      expect(newsResponse.status).toBe(200);

      console.log('Testing planning service...');
      const planningResponse = await userAuthClients.planning.get('/api/planning/events');
      expect(planningResponse.status).toBe(200);

      console.log('Testing statistics service...');
      // Test user statistics endpoint - students can view their own stats
      const statsResponse = await userAuthClients.statistics.get(`/api/statistics/users/${testUser.id}`);
      expect(statsResponse.status).toBe(200);

      // Step 3: Deactivate the user
      await dbHelper.updateUser(testUser.id, { isActive: false });

      // Step 4: TEST THE BUG - Verify ALL services reject the deactivated user
      const serviceErrors: string[] = [];

      // Test auth service
      try {
        await userAuthClients.auth.get('/api/auth/profile');
        serviceErrors.push('❌ AUTH SERVICE: Still accepts deactivated user!');
      } catch (error: any) {
        if (error.response?.status !== 401) {
          serviceErrors.push(`❌ AUTH SERVICE: Wrong error code ${error.response?.status} (expected 401)`);
        }
      }

      // Test user service
      try {
        await userAuthClients.user.get(`/api/users/${testUser.id}`);
        serviceErrors.push('❌ USER SERVICE: Still accepts deactivated user!');
      } catch (error: any) {
        if (error.response?.status !== 401) {
          serviceErrors.push(`❌ USER SERVICE: Wrong error code ${error.response?.status} (expected 401)`);
        }
      }

      // Test course service
      try {
        await userAuthClients.course.get('/api/courses');
        serviceErrors.push('❌ COURSE SERVICE: Still accepts deactivated user!');
      } catch (error: any) {
        if (error.response?.status !== 401) {
          serviceErrors.push(`❌ COURSE SERVICE: Wrong error code ${error.response?.status} (expected 401)`);
        }
      }

      // Test news service
      try {
        await userAuthClients.news.get('/api/news');
        serviceErrors.push('❌ NEWS SERVICE: Still accepts deactivated user!');
      } catch (error: any) {
        if (error.response?.status !== 401) {
          serviceErrors.push(`❌ NEWS SERVICE: Wrong error code ${error.response?.status} (expected 401)`);
        }
      }

      // Test planning service
      try {
        await userAuthClients.planning.get('/api/planning/events');
        serviceErrors.push('❌ PLANNING SERVICE: Still accepts deactivated user!');
      } catch (error: any) {
        if (error.response?.status !== 401) {
          serviceErrors.push(`❌ PLANNING SERVICE: Wrong error code ${error.response?.status} (expected 401)`);
        }
      }

      // Test statistics service
      try {
        await userAuthClients.statistics.get(`/api/statistics/users/${testUser.id}`);
        serviceErrors.push('❌ STATISTICS SERVICE: Still accepts deactivated user!');
      } catch (error: any) {
        if (error.response?.status !== 401) {
          serviceErrors.push(`❌ STATISTICS SERVICE: Wrong error code ${error.response?.status} (expected 401)`);
        }
      }

      // If any services still accept deactivated users, fail the test with details
      if (serviceErrors.length > 0) {
        const bugReport = `
🚨 CRITICAL SECURITY BUG DETECTED 🚨

The following services are still accepting deactivated users:
${serviceErrors.join('\n')}

This is a major security vulnerability where deactivated users can still access the system!
The authentication middleware in these services is likely only validating JWT tokens
without checking if the user is still active in the database.
        `;
        throw new Error(bugReport);
      }
    });

    it('should consistently accept valid active users across ALL services', async () => {
      // This test ensures our fix doesn't break valid authentication
      const testUser = await authHelper.createTestUser('teacher');

      // Create authenticated clients
      const userAuthClients = {
        auth: await authHelper.createAuthenticatedClient('auth', testUser),
        user: await authHelper.createAuthenticatedClient('user', testUser),
        course: await authHelper.createAuthenticatedClient('course', testUser),
        news: await authHelper.createAuthenticatedClient('news', testUser),
        planning: await authHelper.createAuthenticatedClient('planning', testUser),
        statistics: await authHelper.createAuthenticatedClient('statistics', testUser),
      };

      // All services should accept valid active user
      const authProfileResponse = await userAuthClients.auth.get('/api/auth/profile');
      expect(authProfileResponse.status).toBe(200);

      const coursesResponse = await userAuthClients.course.get('/api/courses');
      expect(coursesResponse.status).toBe(200);

      const newsResponse = await userAuthClients.news.get('/api/news');
      expect(newsResponse.status).toBe(200);

      const eventsResponse = await userAuthClients.planning.get('/api/planning/events');
      expect(eventsResponse.status).toBe(200);

      const statsResponse = await userAuthClients.statistics.get(`/api/statistics/users/${testUser.id}`);
      expect(statsResponse.status).toBe(200);

      console.log('✅ All services correctly accept valid active user');
    });
  });

  describe('🔒 Deleted User Security Test', () => {
    it('should consistently reject deleted users across ALL services', async () => {
      // Create a user
      const testUser = await authHelper.createTestUser('student');

      // Create authenticated clients
      const userAuthClients = {
        auth: await authHelper.createAuthenticatedClient('auth', testUser),
        user: await authHelper.createAuthenticatedClient('user', testUser),
        course: await authHelper.createAuthenticatedClient('course', testUser),
        news: await authHelper.createAuthenticatedClient('news', testUser),
        planning: await authHelper.createAuthenticatedClient('planning', testUser),
        statistics: await authHelper.createAuthenticatedClient('statistics', testUser),
      };

      // Verify user can access services
      const authProfileResponse = await userAuthClients.auth.get('/api/auth/profile');
      expect(authProfileResponse.status).toBe(200);

      // Delete the user from database
      await dbHelper.deleteUser(testUser.id);

      // Verify all services reject the deleted user
      const serviceErrors: string[] = [];

      // Test each service
      try {
        await userAuthClients.auth.get('/api/auth/profile');
        serviceErrors.push('❌ AUTH SERVICE: Still accepts deleted user!');
      } catch (error: any) {
        if (error.response?.status !== 401) {
          serviceErrors.push(`❌ AUTH SERVICE: Wrong error code ${error.response?.status} (expected 401)`);
        }
      }

      try {
        await userAuthClients.user.get(`/api/users/${testUser.id}`);
        serviceErrors.push('❌ USER SERVICE: Still accepts deleted user!');
      } catch (error: any) {
        if (error.response?.status !== 401 && error.response?.status !== 404) {
          serviceErrors.push(`❌ USER SERVICE: Wrong error code ${error.response?.status} (expected 401 or 404)`);
        }
      }

      try {
        await userAuthClients.course.get('/api/courses');
        serviceErrors.push('❌ COURSE SERVICE: Still accepts deleted user!');
      } catch (error: any) {
        if (error.response?.status !== 401) {
          serviceErrors.push(`❌ COURSE SERVICE: Wrong error code ${error.response?.status} (expected 401)`);
        }
      }

      try {
        await userAuthClients.news.get('/api/news');
        serviceErrors.push('❌ NEWS SERVICE: Still accepts deleted user!');
      } catch (error: any) {
        if (error.response?.status !== 401) {
          serviceErrors.push(`❌ NEWS SERVICE: Wrong error code ${error.response?.status} (expected 401)`);
        }
      }

      try {
        await userAuthClients.planning.get('/api/planning/events');
        serviceErrors.push('❌ PLANNING SERVICE: Still accepts deleted user!');
      } catch (error: any) {
        if (error.response?.status !== 401) {
          serviceErrors.push(`❌ PLANNING SERVICE: Wrong error code ${error.response?.status} (expected 401)`);
        }
      }

      try {
        await userAuthClients.statistics.get(`/api/statistics/users/${testUser.id}`);
        serviceErrors.push('❌ STATISTICS SERVICE: Still accepts deleted user!');
      } catch (error: any) {
        if (error.response?.status !== 401) {
          serviceErrors.push(`❌ STATISTICS SERVICE: Wrong error code ${error.response?.status} (expected 401)`);
        }
      }

      if (serviceErrors.length > 0) {
        const bugReport = `
🚨 CRITICAL SECURITY BUG DETECTED 🚨

The following services are still accepting deleted users:
${serviceErrors.join('\n')}

This is a major security vulnerability where deleted users can still access the system!
        `;
        throw new Error(bugReport);
      }
    });
  });
});