#!/usr/bin/env node

const axios = require('axios');

async function testJWTSecrets() {
  console.log('🔍 Testing JWT Secrets across services\n');

  // Get a token from auth service
  try {
    const loginResponse = await axios.post('http://localhost:3001/api/auth/login', {
      email: 'admin@101school.com',
      password: 'Admin123!'
    });
    
    const token = loginResponse.data.data.tokens.accessToken;
    console.log('✅ Got token from auth service');
    console.log(`Token preview: ${token.substring(0, 50)}...`);
    
    // Test token validation by trying to access debug endpoints
    console.log('\n🧪 Testing token validation across services:');
    
    const services = [
      { name: 'Auth Service', url: 'http://localhost:3001/api/auth/profile' },
      { name: 'Planning Service', url: 'http://localhost:3004/api/planning/events' },
      { name: 'Statistics Service', url: 'http://localhost:3006/api/statistics/dashboard' },
      { name: 'News Service', url: 'http://localhost:3005/api/news' },
      { name: 'Course Service', url: 'http://localhost:3003/api/courses' }
    ];
    
    for (const service of services) {
      try {
        const response = await axios.get(service.url, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        console.log(`✅ ${service.name}: Token accepted (${response.status})`);
      } catch (error) {
        const status = error.response?.status;
        const message = error.response?.data?.error;
        
        if (status === 401) {
          console.log(`❌ ${service.name}: Token rejected (401) - ${message}`);
        } else if (status === 403) {
          console.log(`⚠️  ${service.name}: Token accepted but insufficient permissions (403)`);
        } else {
          console.log(`❓ ${service.name}: Unexpected response (${status}) - ${message}`);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Failed to get token:', error.message);
  }
}

testJWTSecrets();