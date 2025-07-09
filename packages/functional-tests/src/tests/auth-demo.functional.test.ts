import { apiHelper } from '../utils/ApiTestHelper';

describe('Auth Demo - Automated Service Management', () => {
  beforeAll(async () => {
    // Services are already started by globalSetup
    // Wait for services to be healthy
    await apiHelper.waitForServices();
    console.log('✅ All services are healthy and ready for demo testing');
  });

  beforeEach(async () => {
    // Clear any existing auth tokens
    apiHelper.clearAuthTokens();
  });

  afterEach(async () => {
    // Clean up user session
    try {
      await apiHelper.logoutUser();
    } catch (error) {
      // Ignore logout errors in cleanup
    }
  });

  describe('Automated Service Demo', () => {
    it('should demonstrate auth service working with automated management', async () => {
      console.log('🎉 Starting automated functional test demo...');
      
      // Test 1: Register a new user
      console.log('📝 Step 1: Registering a new user...');
      const userData = apiHelper.createTestData().user.student;
      
      const registerResponse = await apiHelper.auth('/register', {
        method: 'POST',
        data: userData
      });

      expect(registerResponse.status).toBe(201);
      expect(registerResponse.data.success).toBe(true);
      expect(registerResponse.data.data.user.email).toBe(userData.email);
      expect(registerResponse.data.data.tokens.accessToken).toBeDefined();
      
      console.log('✅ User registration successful!');

      // Test 2: Login with the new user
      console.log('🔐 Step 2: Testing login with registered user...');
      apiHelper.clearAuthTokens(); // Clear registration tokens
      
      const loginResponse = await apiHelper.auth('/login', {
        method: 'POST',
        data: {
          email: userData.email,
          password: userData.password
        }
      });

      expect(loginResponse.status).toBe(200);
      expect(loginResponse.data.success).toBe(true);
      expect(loginResponse.data.data.user.email).toBe(userData.email);
      
      console.log('✅ User login successful!');

      // Test 3: Access user profile with auth token
      console.log('👤 Step 3: Accessing user profile with auth token...');
      
      // apiHelper automatically sets auth tokens from login response
      const profileResponse = await apiHelper.user('/profile', {
        method: 'GET'
      });

      expect(profileResponse.status).toBe(200);
      expect(profileResponse.data.success).toBe(true);
      expect(profileResponse.data.data.email).toBe(userData.email);
      
      console.log('✅ User profile access successful!');

      // Test 4: Test token refresh
      console.log('🔄 Step 4: Testing token refresh...');
      
      const refreshResponse = await apiHelper.auth('/refresh', {
        method: 'POST',
        data: { refreshToken: loginResponse.data.data.tokens.refreshToken }
      });

      expect(refreshResponse.status).toBe(200);
      expect(refreshResponse.data.success).toBe(true);
      expect(refreshResponse.data.data.accessToken).toBeDefined();
      
      console.log('✅ Token refresh successful!');

      // Test 5: Logout
      console.log('👋 Step 5: Testing logout...');
      
      const logoutResponse = await apiHelper.auth('/logout', {
        method: 'POST'
      });

      expect(logoutResponse.status).toBe(200);
      expect(logoutResponse.data.success).toBe(true);
      
      console.log('✅ User logout successful!');
      
      console.log('🎉 Automated functional test demo completed successfully!');
      console.log('✨ This demonstrates:');
      console.log('   - Services started automatically in background');
      console.log('   - Real API testing against live services');
      console.log('   - Cross-service authentication flow');
      console.log('   - Automatic cleanup and teardown');
    });

    it('should handle authentication errors properly', async () => {
      console.log('🔒 Testing authentication error handling...');

      // Test invalid login
      try {
        await apiHelper.auth('/login', {
          method: 'POST',
          data: {
            email: 'nonexistent@test.com',
            password: 'WrongPassword123!'
          }
        });
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.response.status).toBe(401);
        expect(error.response.data.success).toBe(false);
        expect(error.response.data.error).toContain('Invalid credentials');
        console.log('✅ Invalid credentials properly rejected');
      }

      // Test protected route without token
      apiHelper.clearAuthTokens();
      try {
        await apiHelper.user('/profile', {
          method: 'GET'
        });
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.response.status).toBe(401);
        expect(error.response.data.success).toBe(false);
        expect(error.response.data.error).toContain('No token provided');
        console.log('✅ Protected route properly secured');
      }

      console.log('✅ Authentication error handling working correctly!');
    });
  });
});