// Debug script to test user service API
const axios = require('axios');

async function testUserAPI() {
  try {
    console.log('🔍 Testing User Service API directly...');
    
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
    console.log('✅ Login successful');
    
    // Step 2: Call user service /profile endpoint
    console.log('\n📋 Step 2: Calling user service /profile...');
    const userResponse = await axios.get('http://localhost:3002/api/users/profile', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    if (!userResponse.data.success) {
      console.error('❌ User profile failed:', userResponse.data);
      return;
    }
    
    const userProfile = userResponse.data.data.user;
    
    console.log('✅ User profile successful');
    console.log('User Profile Data:', {
      email: userProfile.email,
      role: userProfile.role,
      hasProfile: !!userProfile.profile,
      profileData: userProfile.profile ? {
        firstName: userProfile.profile.firstName,
        lastName: userProfile.profile.lastName,
        department: userProfile.profile.department,
        keys: Object.keys(userProfile.profile)
      } : 'no profile'
    });
    
  } catch (error) {
    console.error('❌ API Test failed:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
  }
}

testUserAPI();