import { apiHelper } from '../utils/ApiTestHelper';
import jwt from 'jsonwebtoken';

describe('JWT Debug Test', () => {
  beforeAll(async () => {
    await apiHelper.waitForServices();
    console.log('✅ Services ready for JWT debugging');
  });

  beforeEach(async () => {
    apiHelper.clearAuthTokens();
  });

  it('should debug JWT token generation and validation', async () => {
    console.log('🔍 Testing JWT token generation and validation...');
    
    // Step 1: Register user and get token
    const userData = apiHelper.createTestData().user.student;
    console.log('📝 Registering user:', userData.email);
    
    const registerResponse = await apiHelper.auth('/register', {
      method: 'POST',
      data: userData
    });
    
    const { user, tokens } = registerResponse.data.data;
    console.log('✅ Registration successful');
    console.log('🔑 Access token received:', tokens.accessToken ? 'YES' : 'NO');
    console.log('🔑 Refresh token received:', tokens.refreshToken ? 'YES' : 'NO');
    
    // Step 2: Decode the token to see its contents
    const decodedToken = jwt.decode(tokens.accessToken, { complete: true });
    console.log('🔍 Decoded token header:', decodedToken?.header);
    console.log('🔍 Decoded token payload:', decodedToken?.payload);
    
    // Step 3: Try to verify the token using the same secret
    const JWT_SECRET = 'test-secret-key-for-functional-tests';
    
    try {
      const verified = jwt.verify(tokens.accessToken, JWT_SECRET) as any;
      console.log('✅ Token verification successful');
      console.log('🔍 Verified payload:', {
        id: verified.id,
        email: verified.email,
        role: verified.role,
        exp: new Date(verified.exp * 1000).toISOString()
      });
    } catch (error: any) {
      console.error('❌ Token verification failed:', error.message);
      throw error;
    }
    
    // Step 4: Test manual API call to user service
    console.log('🔍 Testing manual API call to user service...');
    
    try {
      const userResponse = await apiHelper.user('/profile', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${tokens.accessToken}`
        }
      });
      
      console.log('✅ User service API call successful');
      console.log('📊 User profile response:', {
        status: userResponse.status,
        email: userResponse.data.data?.email,
        role: userResponse.data.data?.role
      });
      
    } catch (error: any) {
      console.error('❌ User service API call failed:', {
        status: error.response?.status,
        error: error.response?.data?.error,
        message: error.message
      });
      
      // Check if it's an auth error
      if (error.response?.status === 401) {
        console.error('🔍 Authentication error - checking token details...');
        console.error('🔍 Token being sent:', tokens.accessToken.substring(0, 50) + '...');
        console.error('🔍 Full error response:', error.response?.data);
      }
      
      throw error;
    }
    
    // Step 5: Test using apiHelper's automatic token management
    console.log('🔍 Testing apiHelper automatic token management...');
    
    apiHelper.clearAuthTokens();
    
    // Set the token manually
    apiHelper.setAuthToken('user-service', tokens.accessToken);
    
    try {
      const autoResponse = await apiHelper.user('/profile', {
        method: 'GET'
      });
      
      console.log('✅ ApiHelper automatic token management successful');
      console.log('📊 Response:', {
        status: autoResponse.status,
        email: autoResponse.data.data?.email
      });
      
    } catch (error: any) {
      console.error('❌ ApiHelper automatic token management failed:', {
        status: error.response?.status,
        error: error.response?.data?.error
      });
      throw error;
    }
  });

  it('should test service environment variables', async () => {
    console.log('🔍 Testing service environment variables...');
    
    // Test auth service health with detailed info
    try {
      const authHealth = await apiHelper.auth('/health', {
        method: 'GET'
      });
      
      console.log('✅ Auth service health check:', {
        status: authHealth.status,
        response: authHealth.data
      });
      
    } catch (error: any) {
      console.error('❌ Auth service health check failed:', error.message);
    }
    
    // Test user service health
    try {
      const userHealth = await apiHelper.user('/health', {
        method: 'GET'
      });
      
      console.log('✅ User service health check:', {
        status: userHealth.status,
        response: userHealth.data
      });
      
    } catch (error: any) {
      console.error('❌ User service health check failed - this might be the issue!');
      console.error('🔍 Error details:', {
        status: error.response?.status,
        message: error.message
      });
    }
  });
});