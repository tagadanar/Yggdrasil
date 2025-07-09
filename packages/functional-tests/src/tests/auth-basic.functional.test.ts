import { apiHelper } from '../utils/ApiTestHelper';

describe('Basic Auth Service - Functional Tests', () => {
  beforeAll(async () => {
    // Services are already started by globalSetup
    await apiHelper.waitForServices();
    console.log('✅ Services ready for basic auth testing');
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

  describe('User Registration', () => {
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
  });

  describe('User Login', () => {
    let testUser: any;

    beforeEach(async () => {
      // Register a user for login tests
      const userData = apiHelper.createTestData().user.teacher;
      const registerResponse = await apiHelper.registerUser(userData);
      testUser = registerResponse.user;
      
      // Clear tokens after registration
      apiHelper.clearAuthTokens();
    });

    it('should login user with valid credentials', async () => {
      const userData = apiHelper.createTestData().user.teacher;
      
      const response = await apiHelper.auth('/login', {
        method: 'POST',
        data: {
          email: userData.email,
          password: userData.password
        }
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data.user.email).toBe(userData.email);
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
  });

  describe('User Service Cross-Authentication', () => {
    let testUser: any;

    beforeEach(async () => {
      // Register and login user
      const userData = apiHelper.createTestData().user.admin;
      const loginResponse = await apiHelper.loginUser(userData.email, userData.password);
      testUser = loginResponse.user;
    });

    it('should access user service with valid token', async () => {
      const response = await apiHelper.user('/profile', {
        method: 'GET'
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data.email).toBe(testUser.email);
    });

    it('should reject access to user service without token', async () => {
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
        expect(error.response.data.error).toContain('No token provided');
      }
    });
  });
});