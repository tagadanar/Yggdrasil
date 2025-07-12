import { apiHelper } from '../utils/ApiTestHelper';

describe('Authentication Workflow - Functional Tests', () => {
  let testUser: any;
  let testUserData: any;
  let authTokens: any;

  beforeAll(async () => {
    // Services are already started by globalSetup
    // Wait for services to be healthy
    await apiHelper.waitForServices();
    console.log('✅ All services are healthy and ready for testing');
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

  describe('User Registration Flow', () => {
    it('should register a new user successfully', async () => {
      const userData = apiHelper.createTestData().user.student;
      
      const response = await apiHelper.auth('/register', {
        method: 'POST',
        data: userData
      });

      expect(response.status).toBe(201);
      expect(response.data.success).toBe(true);
      expect(response.data.data.user.email).toBe(userData.email);
      expect(response.data.data.user.role).toBe(userData.role);
      expect(response.data.data.tokens.accessToken).toBeDefined();
      expect(response.data.data.tokens.refreshToken).toBeDefined();
    });

    it('should reject registration with invalid email', async () => {
      const userData = {
        ...apiHelper.createTestData().user.student,
        email: 'invalid-email'
      };

      try {
        await apiHelper.auth('/register', {
          method: 'POST',
          data: userData
        });
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.response.status).toBe(400);
        expect(error.response.data.success).toBe(false);
        expect(error.response.data.error).toContain('email');
      }
    });

    it('should reject registration with weak password', async () => {
      const userData = {
        ...apiHelper.createTestData().user.student,
        password: '123'
      };

      try {
        await apiHelper.auth('/register', {
          method: 'POST',
          data: userData
        });
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.response.status).toBe(400);
        expect(error.response.data.success).toBe(false);
        expect(error.response.data.error).toContain('password');
      }
    });
  });

  describe('User Login Flow', () => {
    beforeEach(async () => {
      // Register a user for login tests
      testUserData = apiHelper.createTestData().user.teacher;
      const registerResponse = await apiHelper.registerUser(testUserData);
      testUser = registerResponse.user;
      
      // Clear tokens after registration
      apiHelper.clearAuthTokens();
    });

    it('should login user with valid credentials', async () => {
      // Use the same user data that was registered
      const response = await apiHelper.auth('/login', {
        method: 'POST',
        data: {
          email: testUserData.email,
          password: testUserData.password
        }
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data.user.email).toBe(testUserData.email);
      expect(response.data.data.tokens.accessToken).toBeDefined();
      expect(response.data.data.tokens.refreshToken).toBeDefined();
    });

    it('should reject login with invalid email', async () => {
      try {
        await apiHelper.auth('/login', {
          method: 'POST',
          data: {
            email: 'nonexistent@test.com',
            password: 'TestPassword123!'
          }
        });
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.response.status).toBe(401);
        expect(error.response.data.success).toBe(false);
        expect(error.response.data.error).toContain('Invalid credentials');
      }
    });

    it('should reject login with wrong password', async () => {
      // Use the registered user's email but wrong password
      try {
        await apiHelper.auth('/login', {
          method: 'POST',
          data: {
            email: testUserData.email,
            password: 'WrongPassword123!'
          }
        });
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.response.status).toBe(401);
        expect(error.response.data.success).toBe(false);
        expect(error.response.data.error).toContain('Invalid credentials');
      }
    });
  });

  describe('Cross-Service Authentication', () => {
    beforeEach(async () => {
      // Register user first, then login
      testUserData = apiHelper.createTestData().user.admin;
      await apiHelper.registerUser(testUserData);
      apiHelper.clearAuthTokens();
      const loginResponse = await apiHelper.loginUser(testUserData.email, testUserData.password);
      testUser = loginResponse.user;
      authTokens = loginResponse.tokens;
    });

    it('should access user service with valid token', async () => {
      const response = await apiHelper.user('/profile', {
        method: 'GET'
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data.email).toBe(testUser.email);
    });

    it('should access course service with valid token', async () => {
      const response = await apiHelper.course('', {
        method: 'GET'
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toBeDefined();
      expect(Array.isArray(response.data.data)).toBe(true);
    });

    it('should access planning service with valid token', async () => {
      const response = await apiHelper.planning('/events', {
        method: 'GET'
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toBeDefined();
      expect(Array.isArray(response.data.data)).toBe(true);
    });

    it('should access news service with valid token', async () => {
      const response = await apiHelper.news('', {
        method: 'GET'
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toBeDefined();
      expect(Array.isArray(response.data.data)).toBe(true);
    });

    it('should access statistics service with valid token', async () => {
      const response = await apiHelper.statistics('/dashboard', {
        method: 'GET'
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toBeDefined();
    });
  });

  describe('Token Management', () => {
    let refreshToken: string;

    beforeEach(async () => {
      // Register user first, then login
      testUserData = apiHelper.createTestData().user.student;
      await apiHelper.registerUser(testUserData);
      apiHelper.clearAuthTokens();
      const loginResponse = await apiHelper.loginUser(testUserData.email, testUserData.password);
      testUser = loginResponse.user;
      authTokens = loginResponse.tokens;
      refreshToken = authTokens.refreshToken;
    });

    it('should refresh access token with valid refresh token', async () => {
      const response = await apiHelper.auth('/refresh-token', {
        method: 'POST',
        data: { refreshToken }
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data.tokens.accessToken).toBeDefined();
    });

    it('should reject refresh with invalid refresh token', async () => {
      try {
        await apiHelper.auth('/refresh-token', {
          method: 'POST',
          data: { refreshToken: 'invalid-token' }
        });
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.response.status).toBe(401);
        expect(error.response.data.success).toBe(false);
        expect(error.response.data.message || error.response.data.error).toContain('refresh token');
      }
    });

    it('should logout user successfully', async () => {
      const response = await apiHelper.auth('/logout', {
        method: 'POST'
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.message).toContain('Logged out successfully');
    });
  });

  describe('Protected Routes', () => {
    it('should reject access to protected routes without token', async () => {
      // Clear all tokens
      apiHelper.clearAuthTokens();

      try {
        await apiHelper.user('/profile', {
          method: 'GET'
        });
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.response.status).toBe(401);
        expect(error.response.data.success).toBe(false);
        expect(error.response.data.message).toContain('No token provided');
      }
    });

    it('should reject access with expired token', async () => {
      // Set an expired token
      apiHelper.setAuthToken('user-service', 'expired-token');

      try {
        await apiHelper.user('/profile', {
          method: 'GET'
        });
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.response.status).toBe(401);
        expect(error.response.data.success).toBe(false);
        expect(error.response.data.message || error.response.data.error).toContain('token');
      }
    });
  });
});