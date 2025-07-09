/**
 * Quick diagnostic test to understand current state
 */

import { authHelper } from '../utils/AuthHelper';
import { createApiClient } from '../utils/ApiClient';
import { apiHelper } from '../utils/ApiTestHelper';

describe('Quick Diagnostic', () => {
  beforeAll(async () => {
    await apiHelper.waitForServices();
    console.log('✅ All services ready');
  });

  it('should verify service connectivity', async () => {
    const services = [
      { name: 'auth-service', port: 3101 },
      { name: 'user-service', port: 3102 },
      { name: 'course-service', port: 3103 },
      { name: 'planning-service', port: 3104 },
      { name: 'news-service', port: 3105 },
      { name: 'statistics-service', port: 3106 },
      { name: 'notification-service', port: 3107 },
    ];

    for (const service of services) {
      try {
        const client = createApiClient(service.name.replace('-service', '') as any);
        const response = await client.get('/health');
        console.log(`✅ ${service.name}: ${response.status}`);
        expect(response.status).toBe(200);
      } catch (error: any) {
        console.log(`❌ ${service.name}: ${error.message}`);
        throw error;
      }
    }
  });

  it('should verify authentication flow works', async () => {
    console.log('🔍 Testing complete auth flow...');
    
    const testUser = await authHelper.createTestUser('student');
    console.log('✅ User created');
    
    const authResult = await authHelper.loginAs(testUser);
    console.log('✅ Login successful:', authResult.success);
    
    expect(authResult.success).toBe(true);
    expect(authResult.tokens).toBeDefined();
  });

  it('should verify user service basic functionality', async () => {
    console.log('🔍 Testing user service...');
    
    const testUser = await authHelper.createTestUser('student');
    const userClient = await authHelper.createAuthenticatedClient('user', testUser);
    
    try {
      const response = await userClient.get('/api/users/profile');
      console.log('✅ User profile access:', response.status);
      expect(response.status).toBe(200);
    } catch (error: any) {
      console.log('❌ User profile error:', error.response?.status, error.response?.data);
      throw error;
    }
  });
});