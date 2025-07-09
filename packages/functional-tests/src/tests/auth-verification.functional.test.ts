/**
 * Simple authentication verification test
 * Tests that our AuthHelper fix resolves JWT authentication issues
 */

import { authHelper } from '../utils/AuthHelper';
import { apiHelper } from '../utils/ApiTestHelper';

describe('Authentication Verification', () => {
  beforeAll(async () => {
    await apiHelper.waitForServices();
    console.log('✅ Services ready for auth verification');
  });

  it('should create user and authenticate successfully', async () => {
    console.log('🔍 Testing authentication flow...');
    
    // Create a test user
    const testUser = await authHelper.createTestUser('student', {
      email: `verification-${Date.now()}@test.com`
    });
    
    console.log('✅ User created:', testUser.email);
    
    // Login the user
    const authResult = await authHelper.loginAs(testUser);
    
    console.log('✅ Login result:', {
      success: authResult.success,
      hasTokens: !!authResult.tokens,
      error: authResult.error
    });
    
    expect(authResult.success).toBe(true);
    expect(authResult.tokens).toBeDefined();
    expect(authResult.tokens?.accessToken).toBeDefined();
    expect(authResult.tokens?.refreshToken).toBeDefined();
  });
});