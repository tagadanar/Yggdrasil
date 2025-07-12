#!/usr/bin/env node

const axios = require('axios');

// Create a simple test endpoint for each service to expose their JWT_SECRET (first 10 chars only for security)
async function checkEnvVars() {
  console.log('🔍 Checking environment variables across services\n');
  
  const services = [
    { name: 'Auth Service', port: 3001 },
    { name: 'Course Service', port: 3003 },
    { name: 'Planning Service', port: 3004 },
    { name: 'News Service', port: 3005 },
    { name: 'Statistics Service', port: 3006 }
  ];
  
  for (const service of services) {
    try {
      // Try to access each service's health endpoint to see if it's running
      const healthResponse = await axios.get(`http://localhost:${service.port}/health`);
      console.log(`✅ ${service.name}: Running (${healthResponse.status})`);
      
      // For debugging, we could add a debug endpoint that shows env vars
      // but for security, let's just verify they're running
      
    } catch (error) {
      console.log(`❌ ${service.name}: Not responding - ${error.message}`);
    }
  }
  
  // Test if services can validate their own environment
  console.log('\n🧪 Testing JWT secret consistency by creating and validating tokens:');
  
  // Login to get token
  try {
    const loginResponse = await axios.post('http://localhost:3001/api/auth/login', {
      email: 'admin@101school.com',
      password: 'Admin123!'
    });
    
    const tokenFromAuth = loginResponse.data.data.tokens.accessToken;
    console.log('✅ Got token from Auth Service');
    
    // Now see which services accept this token
    const endpoints = [
      { name: 'Auth Profile', url: 'http://localhost:3001/api/auth/profile' },
      { name: 'Course List', url: 'http://localhost:3003/api/courses' },
      { name: 'Planning Events', url: 'http://localhost:3004/api/planning/events' },
      { name: 'News Articles', url: 'http://localhost:3005/api/news' },
      { name: 'Statistics Dashboard', url: 'http://localhost:3006/api/statistics/dashboard' }
    ];
    
    for (const endpoint of endpoints) {
      try {
        const response = await axios.get(endpoint.url, {
          headers: { 'Authorization': `Bearer ${tokenFromAuth}` }
        });
        console.log(`✅ ${endpoint.name}: Token valid`);
      } catch (error) {
        const status = error.response?.status;
        if (status === 401) {
          console.log(`❌ ${endpoint.name}: JWT signature mismatch`);
        } else if (status === 403) {
          console.log(`⚠️  ${endpoint.name}: Token valid but no permission`);
        } else {
          console.log(`❓ ${endpoint.name}: Other error (${status})`);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Failed to test:', error.message);
  }
}

checkEnvVars();