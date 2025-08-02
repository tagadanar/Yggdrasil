// Focused authentication test - real auth service testing
// Purpose: Identify exact failure point in authentication flow

import { test, expect } from '@playwright/test';
import { setupTestLifecycle } from './helpers/test-lifecycle';

test.describe('Focused Authentication Test', () => {
  // Initialize test lifecycle for cascade prevention
  setupTestLifecycle('Focused Authentication Test');
  test('Auth API login', async ({ request }) => {
    console.log('🔍 FOCUSED AUTH TEST: Starting real authentication test');
      
      // Test data - using known demo user from debug script
      const loginData = {
        email: 'admin@yggdrasil.edu',
        password: 'Admin123!'
      };
      
      console.log(`📡 Testing login for: ${loginData.email}`);
      
      // Make real API call to auth service
      const response = await request.post('http://localhost:3001/api/auth/login', {
        data: loginData,
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      // Log detailed response information
      console.log(`📊 Response Status: ${response.status()}`);
      console.log(`📊 Response Headers:`, response.headers());
      
      const responseText = await response.text();
      console.log(`📊 Response Body: ${responseText}`);
      
      // Try to parse as JSON if possible
      let responseData;
      try {
        responseData = JSON.parse(responseText);
        console.log(`📊 Parsed Response:`, JSON.stringify(responseData, null, 2));
      } catch (e) {
        console.log(`📊 Response is not valid JSON: ${responseText}`);
      }
      
      // Verify response
      if (response.status() === 200) {
        console.log('✅ FOCUSED AUTH TEST: Authentication successful');
        
        // Verify response structure
        expect(responseData).toHaveProperty('success', true);
        expect(responseData).toHaveProperty('data');
        expect(responseData.data).toHaveProperty('user');
        expect(responseData.data).toHaveProperty('tokens');
        expect(responseData.data.tokens).toHaveProperty('accessToken');
        expect(responseData.data.tokens).toHaveProperty('refreshToken');
        
        console.log(`✅ User authenticated: ${responseData.data.user.email}`);
        console.log(`✅ User role: ${responseData.data.user.role}`);
        console.log(`✅ Access token length: ${responseData.data.tokens.accessToken.length}`);
      } else {
        console.log(`❌ FOCUSED AUTH TEST: Authentication failed with status ${response.status()}`);
        console.log(`❌ Error details:`, responseData);
        
        // This will help identify the exact failure point
        throw new Error(`Authentication failed: ${response.status()} - ${responseText}`);
      }
  });
  
  test('Auth service health', async ({ request }) => {
    console.log('🏥 FOCUSED AUTH TEST: Testing auth service health');
    
    const response = await request.get('http://localhost:3001/health');
    const responseText = await response.text();
    
    console.log(`🏥 Health Status: ${response.status()}`);
    console.log(`🏥 Health Response: ${responseText}`);
    
    expect(response.status()).toBe(200);
  });
});