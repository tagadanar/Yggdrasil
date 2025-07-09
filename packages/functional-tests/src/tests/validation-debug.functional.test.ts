/**
 * Debug validation test to understand the test failure
 */

import { AuthHelper } from '../utils/AuthHelper';
import { ApiClient } from '../utils/ApiClient';
import { apiHelper } from '../utils/ApiTestHelper';

describe('Validation Debug', () => {
  let authHelper: AuthHelper;
  let userClient: ApiClient;

  beforeAll(async () => {
    await apiHelper.waitForServices();
    authHelper = new AuthHelper();
    
    const testUser = await authHelper.createTestUser('student');
    userClient = await authHelper.createAuthenticatedClient('user', testUser);
  });

  afterAll(async () => {
    await authHelper.cleanup();
  });

  it('should debug validation response', async () => {
    const invalidData = {
      profile: {
        firstName: '', // Empty string should be invalid
        lastName: 'Test'
      }
    };

    console.log('🔍 Sending invalid data:', JSON.stringify(invalidData, null, 2));

    try {
      const response = await userClient.put('/api/users/profile', invalidData);
      console.log('✅ Response received:', {
        status: response.status,
        success: response.data.success,
        error: response.data.error,
        data: response.data.data
      });
      
      // This should fail with validation error
      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBeDefined();
      
    } catch (error: any) {
      console.log('❌ Request failed:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message
      });
      
      // If request fails, it should be with 400 status
      expect(error.response?.status).toBe(400);
      expect(error.response?.data?.success).toBe(false);
      expect(error.response?.data?.error).toBeDefined();
    }
  });
});