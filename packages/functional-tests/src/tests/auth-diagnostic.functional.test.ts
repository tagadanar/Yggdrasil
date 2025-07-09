import { apiHelper } from '../utils/ApiTestHelper';

describe('Authentication Diagnostic Test', () => {
  beforeAll(async () => {
    await apiHelper.waitForServices();
    console.log('✅ Services ready for diagnostic testing');
  });

  beforeEach(async () => {
    apiHelper.clearAuthTokens();
  });

  afterEach(async () => {
    try {
      await apiHelper.logoutUser();
    } catch (error) {
      // Ignore logout errors in cleanup
    }
  });

  it('should debug the complete registration and login flow', async () => {
    console.log('🔍 Starting diagnostic test...');
    
    // Step 1: Generate test data
    const userData = apiHelper.createTestData().user.student;
    console.log('📝 Generated test data:', {
      email: userData.email,
      password: userData.password,
      role: userData.role
    });
    
    // Step 2: Register user
    console.log('🔐 Attempting registration...');
    const registerResponse = await apiHelper.auth('/register', {
      method: 'POST',
      data: userData
    });
    
    console.log('✅ Registration response:', {
      status: registerResponse.status,
      success: registerResponse.data.success,
      userEmail: registerResponse.data.data.user.email,
      hasTokens: !!registerResponse.data.data.tokens,
      accessToken: registerResponse.data.data.tokens?.accessToken ? 'present' : 'missing'
    });
    
    expect(registerResponse.status).toBe(201);
    expect(registerResponse.data.success).toBe(true);
    
    // Step 3: Clear tokens (simulate fresh login)
    apiHelper.clearAuthTokens();
    console.log('🧹 Cleared auth tokens');
    
    // Step 4: Attempt login with exact same credentials
    console.log('🔑 Attempting login with same credentials...');
    console.log('📧 Login email:', userData.email);
    console.log('🔐 Login password:', userData.password);
    
    try {
      const loginResponse = await apiHelper.auth('/login', {
        method: 'POST',
        data: {
          email: userData.email,
          password: userData.password
        }
      });
      
      console.log('✅ Login successful:', {
        status: loginResponse.status,
        success: loginResponse.data.success,
        userEmail: loginResponse.data.data.user.email,
        hasTokens: !!loginResponse.data.data.tokens
      });
      
      expect(loginResponse.status).toBe(200);
      expect(loginResponse.data.success).toBe(true);
      
    } catch (error: any) {
      console.error('❌ Login failed:', {
        status: error.response?.status,
        success: error.response?.data?.success,
        error: error.response?.data?.error,
        message: error.message
      });
      
      // Log the full error response for debugging
      console.error('🔍 Full error response:', error.response?.data);
      
      // Re-throw to fail the test
      throw error;
    }
  });

  it('should test registration only', async () => {
    console.log('🔍 Testing registration only...');
    
    const userData = apiHelper.createTestData().user.teacher;
    console.log('📝 Test data:', {
      email: userData.email,
      password: userData.password,
      role: userData.role
    });
    
    const response = await apiHelper.auth('/register', {
      method: 'POST',
      data: userData
    });
    
    console.log('✅ Registration response:', {
      status: response.status,
      success: response.data.success,
      userEmail: response.data.data.user.email,
      userRole: response.data.data.user.role,
      userIsActive: response.data.data.user.isActive,
      hasTokens: !!response.data.data.tokens
    });
    
    expect(response.status).toBe(201);
    expect(response.data.success).toBe(true);
    expect(response.data.data.user.email).toBe(userData.email);
    expect(response.data.data.user.role).toBe(userData.role);
    expect(response.data.data.user.isActive).toBe(true);
    expect(response.data.data.tokens.accessToken).toBeDefined();
    expect(response.data.data.tokens.refreshToken).toBeDefined();
  });

  it('should test login with hardcoded user', async () => {
    console.log('🔍 Testing login with hardcoded user...');
    
    // First register a user with known credentials
    const testUser = {
      email: 'debug-test@example.com',
      password: 'DebugPassword123!',
      role: 'student',
      profile: {
        firstName: 'Debug',
        lastName: 'User'
      }
    };
    
    console.log('📝 Registering hardcoded user:', testUser.email);
    
    const registerResponse = await apiHelper.auth('/register', {
      method: 'POST',
      data: testUser
    });
    
    console.log('✅ Registration successful for hardcoded user');
    
    // Clear tokens
    apiHelper.clearAuthTokens();
    
    // Now try to login
    console.log('🔑 Attempting login with hardcoded credentials...');
    
    try {
      const loginResponse = await apiHelper.auth('/login', {
        method: 'POST',
        data: {
          email: testUser.email,
          password: testUser.password
        }
      });
      
      console.log('✅ Login successful with hardcoded user');
      expect(loginResponse.status).toBe(200);
      expect(loginResponse.data.success).toBe(true);
      
    } catch (error: any) {
      console.error('❌ Login failed with hardcoded user:', {
        status: error.response?.status,
        error: error.response?.data?.error,
        message: error.message
      });
      throw error;
    }
  });
});