/**
 * Debug test to understand user creation vs user lookup issue
 */

import { authHelper } from '../utils/AuthHelper';
import { createApiClient } from '../utils/ApiClient';
import { apiHelper } from '../utils/ApiTestHelper';

describe('User Creation Debug', () => {
  beforeAll(async () => {
    await apiHelper.waitForServices();
    console.log('✅ All services ready');
  });

  it('should debug user creation and lookup flow', async () => {
    console.log('🔍 Creating user via auth-service...');
    
    const testUser = await authHelper.createTestUser('student', {
      email: `debug-${Date.now()}@test.com`
    });
    
    console.log('✅ User created via auth-service:', {
      id: testUser.id,
      email: testUser.email,
      role: testUser.role
    });
    
    // Wait a moment for data consistency
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('🔍 Attempting to lookup user via user-service...');
    
    const userClient = await authHelper.createAuthenticatedClient('user', testUser);
    
    try {
      const response = await userClient.get('/api/users/profile');
      console.log('✅ User profile lookup successful:', {
        status: response.status,
        email: response.data.data?.email,
        id: response.data.data?.id || response.data.data?._id
      });
      
      expect(response.status).toBe(200);
      expect(response.data.data.email).toBe(testUser.email);
    } catch (error: any) {
      console.log('❌ User profile lookup failed:', {
        status: error.response?.status,
        error: error.response?.data?.error,
        message: error.message
      });
      
      // Try to get user by ID directly
      try {
        const directResponse = await userClient.get(`/api/users/${testUser.id}`);
        console.log('✅ Direct user lookup successful:', {
          status: directResponse.status,
          email: directResponse.data.data?.email
        });
      } catch (directError: any) {
        console.log('❌ Direct user lookup also failed:', {
          status: directError.response?.status,
          error: directError.response?.data?.error
        });
      }
      
      throw error;
    }
  });
});