#!/usr/bin/env node

/**
 * Comprehensive Auth API Testing Script
 * Tests authentication endpoints and validates responses
 */

const axios = require('axios');

async function testAuthAPI() {
  console.log('🔍 Testing Auth API Endpoints...\n');
  
  const baseURL = 'http://localhost:3001';
  const endpoints = [
    { url: `${baseURL}/health`, method: 'GET', description: 'Health Check' },
    { url: `${baseURL}/api/auth`, method: 'GET', description: 'Auth Base Route' },
  ];
  
  // Test basic endpoints
  for (const endpoint of endpoints) {
    try {
      console.log(`🌐 Testing: ${endpoint.description} (${endpoint.method} ${endpoint.url})`);
      
      const response = await axios({
        method: endpoint.method,
        url: endpoint.url,
        timeout: 5000,
        validateStatus: () => true // Accept any status code
      });
      
      console.log(`  📡 Status: ${response.status}`);
      if (response.status === 200) {
        console.log(`  ✅ Success: ${JSON.stringify(response.data).substring(0, 100)}...`);
      } else {
        console.log(`  📋 Response: ${JSON.stringify(response.data).substring(0, 100)}...`);
      }
      
    } catch (error) {
      console.log(`  ❌ Error: ${error.message}`);
    }
    console.log('');
  }
  
  // Test login endpoints with demo users
  const demoUsers = [
    { email: 'admin@yggdrasil.edu', password: 'Admin123!', role: 'admin' },
    { email: 'teacher@yggdrasil.edu', password: 'Admin123!', role: 'teacher' },
    { email: 'student@yggdrasil.edu', password: 'Admin123!', role: 'student' }
  ];
  
  console.log('🔐 Testing Login Authentication...\n');
  
  for (const user of demoUsers) {
    try {
      console.log(`👤 Testing login for: ${user.email} (${user.role})`);
      
      const response = await axios.post(`${baseURL}/api/auth/login`, {
        email: user.email,
        password: user.password
      }, {
        timeout: 10000,
        validateStatus: () => true,
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log(`  📡 Status: ${response.status}`);
      
      if (response.status === 200) {
        const { user: authUser, accessToken, refreshToken } = response.data;
        console.log(`  ✅ Success: Authenticated as ${authUser.email} (${authUser.role})`);
        console.log(`  🔑 Access Token: ${accessToken ? 'Present' : 'Missing'}`);
        console.log(`  🔄 Refresh Token: ${refreshToken ? 'Present' : 'Missing'}`);
      } else {
        console.log(`  ❌ Failed: ${JSON.stringify(response.data).substring(0, 200)}...`);
      }
      
    } catch (error) {
      console.log(`  💥 Error: ${error.message}`);
      if (error.response) {
        console.log(`  📡 Status: ${error.response.status}`);
        console.log(`  📋 Data: ${JSON.stringify(error.response.data).substring(0, 100)}...`);
      }
    }
    console.log('');
  }
  
  console.log('🎯 Test Summary:');
  console.log('- If health check fails: auth service not running');
  console.log('- If health check passes but login fails with 404: routing issue');
  console.log('- If login returns 200: authentication working correctly');
  console.log('- If login returns 401: check user credentials or credential verification');
}

// Run the test
if (require.main === module) {
  testAuthAPI().catch(console.error);
}

module.exports = testAuthAPI;