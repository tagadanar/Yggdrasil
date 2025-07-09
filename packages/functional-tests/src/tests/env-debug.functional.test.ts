import { apiHelper } from '../utils/ApiTestHelper';
import axios from 'axios';

describe('Environment Debug Test', () => {
  beforeAll(async () => {
    await apiHelper.waitForServices();
    console.log('✅ Services ready for environment debugging');
  });

  it('should debug service environment variables', async () => {
    console.log('🔍 Testing service environment variables...');
    
    // Test if services are responding to basic health checks
    const services = [
      { name: 'auth-service', port: 3101, url: 'http://localhost:3101' },
      { name: 'user-service', port: 3102, url: 'http://localhost:3102' },
      { name: 'planning-service', port: 3104, url: 'http://localhost:3104' }
    ];
    
    for (const service of services) {
      try {
        console.log(`🔍 Testing ${service.name} health...`);
        const response = await axios.get(`${service.url}/health`, { timeout: 5000 });
        
        console.log(`✅ ${service.name} health check successful:`, {
          status: response.status,
          data: response.data
        });
        
      } catch (error: any) {
        console.error(`❌ ${service.name} health check failed:`, {
          status: error.response?.status,
          message: error.message
        });
      }
    }
  });

  it('should test JWT token generation and validation manually', async () => {
    console.log('🔍 Testing JWT token generation manually...');
    
    // Step 1: Register a user via auth service
    const userData = {
      email: 'env-debug@test.com',
      password: 'DebugPassword123!',
      role: 'student',
      profile: {
        firstName: 'Debug',
        lastName: 'User'
      }
    };
    
    console.log('📝 Registering user via auth service...');
    
    try {
      const registerResponse = await axios.post('http://localhost:3101/api/auth/register', userData, {
        timeout: 10000
      });
      
      console.log('✅ Registration successful:', {
        status: registerResponse.status,
        success: registerResponse.data.success,
        hasTokens: !!registerResponse.data.data?.tokens,
        userEmail: registerResponse.data.data?.user?.email
      });
      
      const { tokens } = registerResponse.data.data;
      
      // Step 2: Try to access user service with the token
      console.log('🔍 Testing user service with auth token...');
      
      try {
        const userResponse = await axios.get('http://localhost:3102/api/users/profile', {
          headers: {
            'Authorization': `Bearer ${tokens.accessToken}`
          },
          timeout: 10000
        });
        
        console.log('✅ User service access successful:', {
          status: userResponse.status,
          data: userResponse.data
        });
        
      } catch (error: any) {
        console.error('❌ User service access failed:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          message: error.message
        });
        
        // Log additional debug info
        console.log('🔍 Debug info:', {
          tokenLength: tokens.accessToken.length,
          tokenStart: tokens.accessToken.substring(0, 20),
          requestHeaders: {
            'Authorization': `Bearer ${tokens.accessToken.substring(0, 20)}...`
          }
        });
      }
      
    } catch (error: any) {
      console.error('❌ Registration failed:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
      throw error;
    }
  });

  it('should test auth service login directly', async () => {
    console.log('🔍 Testing auth service login directly...');
    
    // First register a user
    const userData = {
      email: 'login-debug@test.com',
      password: 'LoginPassword123!',
      role: 'student',
      profile: {
        firstName: 'Login',
        lastName: 'Debug'
      }
    };
    
    console.log('📝 Registering user for login test...');
    
    try {
      const registerResponse = await axios.post('http://localhost:3101/api/auth/register', userData, {
        timeout: 10000
      });
      
      console.log('✅ Registration for login test successful');
      
      // Now try to login
      console.log('🔑 Testing login...');
      
      const loginResponse = await axios.post('http://localhost:3101/api/auth/login', {
        email: userData.email,
        password: userData.password
      }, {
        timeout: 10000
      });
      
      console.log('✅ Login successful:', {
        status: loginResponse.status,
        success: loginResponse.data.success,
        hasTokens: !!loginResponse.data.data?.tokens,
        userEmail: loginResponse.data.data?.user?.email
      });
      
      const { tokens } = loginResponse.data.data;
      
      // Test the token with user service
      console.log('🔍 Testing login token with user service...');
      
      try {
        const userResponse = await axios.get('http://localhost:3102/api/users/profile', {
          headers: {
            'Authorization': `Bearer ${tokens.accessToken}`
          },
          timeout: 10000
        });
        
        console.log('✅ User service access with login token successful:', {
          status: userResponse.status,
          userEmail: userResponse.data.data?.email
        });
        
      } catch (error: any) {
        console.error('❌ User service access with login token failed:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          message: error.message
        });
      }
      
    } catch (error: any) {
      console.error('❌ Login test failed:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
      throw error;
    }
  });
});