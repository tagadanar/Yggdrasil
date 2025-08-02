#!/usr/bin/env node
// Test auth API directly to isolate the issue

const fetch = require('node-fetch');

async function testAuthAPI() {
  try {
    console.log('🔍 DEBUG: Testing auth API directly...');
    
    const loginData = {
      email: 'student@yggdrasil.edu',
      password: 'Admin123!'
    };
    
    console.log('📡 DEBUG: Making POST request to /api/auth/login');
    console.log('   Email:', loginData.email);
    console.log('   Password:', loginData.password);
    
    const response = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(loginData),
    });
    
    console.log('📡 DEBUG: Response status:', response.status);
    console.log('📡 DEBUG: Response headers:', Object.fromEntries(response.headers));
    
    const responseText = await response.text();
    console.log('📡 DEBUG: Response body:', responseText);
    
    let responseJson;
    try {
      responseJson = JSON.parse(responseText);
      console.log('📡 DEBUG: Parsed response:', JSON.stringify(responseJson, null, 2));
    } catch (parseError) {
      console.log('❌ DEBUG: Failed to parse response as JSON:', parseError.message);
    }
    
    if (response.status === 200) {
      console.log('✅ DEBUG: Auth API test passed!');
    } else {
      console.log('❌ DEBUG: Auth API test failed!');
      
      if (responseJson && responseJson.details && responseJson.details.debug) {
        console.log('🐛 DEBUG: Debug info from auth service:');
        console.log('   Email:', responseJson.details.debug.email);
        console.log('   Error:', responseJson.details.debug.error);
        console.log('   Timestamp:', responseJson.details.debug.timestamp);
      }
    }
    
  } catch (error) {
    console.log('💥 DEBUG: Error testing auth API:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('🚨 DEBUG: Auth service not running on port 3001!');
      console.log('   Please start the auth service first');
    }
  }
}

testAuthAPI().catch(console.error);