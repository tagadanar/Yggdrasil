#!/usr/bin/env node

/**
 * Quick health check test for auth service during test environment
 */

const axios = require('axios');

async function checkAuthService() {
  const authUrls = [
    'http://localhost:3001',
    'http://localhost:3001/health', 
    'http://localhost:3001/api/auth',
    'http://localhost:3001/api/auth/login'
  ];
  
  console.log('🔍 Testing auth service endpoints...\n');
  
  for (const url of authUrls) {
    try {
      console.log(`🌐 Testing: ${url}`);
      
      if (url.includes('/login')) {
        // Test POST to login endpoint
        const response = await axios.post(url, {
          email: 'admin@yggdrasil.edu',
          password: 'Admin123!'
        }, { 
          timeout: 5000,
          validateStatus: () => true // Accept any status code
        });
        
        console.log(`  📡 Status: ${response.status}`);
        console.log(`  📋 Response: ${JSON.stringify(response.data).substring(0, 100)}...`);
        
      } else {
        // Test GET to other endpoints
        const response = await axios.get(url, { 
          timeout: 5000,
          validateStatus: () => true // Accept any status code
        });
        
        console.log(`  📡 Status: ${response.status}`);
        if (response.status === 200) {
          console.log(`  ✅ Success: ${JSON.stringify(response.data).substring(0, 100)}...`);
        } else {
          console.log(`  📋 Response: ${JSON.stringify(response.data).substring(0, 100)}...`);
        }
      }
      
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        console.log(`  ❌ Connection refused - service not running`);
      } else if (error.code === 'ENOTFOUND') {
        console.log(`  ❌ Host not found`);
      } else if (error.code === 'ETIMEDOUT') {
        console.log(`  ⏰ Timeout - service too slow`);
      } else {
        console.log(`  ❌ Error: ${error.message}`);
      }
    }
    
    console.log('');
  }
  
  console.log('🎯 Summary:');
  console.log('- If health check fails: auth service not running');
  console.log('- If health check passes but login fails with 404: routing issue');
  console.log('- If login returns 200/401: service is working, check authentication logic');
}

// Run the test
checkAuthService();