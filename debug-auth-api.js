// Debug script to test auth API directly
const axios = require('axios');

async function testAuthAPI() {
  try {
    console.log('🔍 Testing Auth API directly...');
    
    // Step 1: Login to get access token
    console.log('📋 Step 1: Logging in...');
    const loginResponse = await axios.post('http://localhost:3001/api/auth/login', {
      email: 'teacher@yggdrasil.edu',
      password: 'Admin123!'
    });
    
    if (!loginResponse.data.success) {
      console.error('❌ Login failed:', loginResponse.data);
      return;
    }
    
    const accessToken = loginResponse.data.data.tokens.accessToken;
    const loginUser = loginResponse.data.data.user;
    
    console.log('✅ Login successful');
    console.log('Login User Data:', {
      email: loginUser.email,
      role: loginUser.role,
      hasProfile: !!loginUser.profile,
      profileData: loginUser.profile ? {
        firstName: loginUser.profile.firstName,
        lastName: loginUser.profile.lastName,
        department: loginUser.profile.department,
        keys: Object.keys(loginUser.profile)
      } : 'no profile'
    });
    
    // Step 2: Call /auth/me endpoint
    console.log('\n📋 Step 2: Calling /auth/me...');
    const meResponse = await axios.get('http://localhost:3001/api/auth/me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    if (!meResponse.data.success) {
      console.error('❌ /auth/me failed:', meResponse.data);
      return;
    }
    
    const meUser = meResponse.data.data.user;
    
    console.log('✅ /auth/me successful');
    console.log('Me User Data:', {
      email: meUser.email,
      role: meUser.role,
      hasProfile: !!meUser.profile,
      profileData: meUser.profile ? {
        firstName: meUser.profile.firstName,
        lastName: meUser.profile.lastName,
        department: meUser.profile.department,
        keys: Object.keys(meUser.profile)
      } : 'no profile'
    });
    
  } catch (error) {
    console.error('❌ API Test failed:', error.response?.data || error.message);
  }
}

testAuthAPI();