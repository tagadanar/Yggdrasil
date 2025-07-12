#!/usr/bin/env node

const axios = require('axios');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m'
};

let accessToken = null;

async function login() {
  console.log(`${colors.cyan}1. Attempting login...${colors.reset}`);
  
  try {
    const response = await axios.post('http://localhost:3001/api/auth/login', {
      email: 'admin@101school.com',
      password: 'Admin123!'
    });

    if (response.status === 200 && response.data.success) {
      accessToken = response.data.data.tokens.accessToken;
      console.log(`${colors.green}✅ Login successful${colors.reset}`);
      console.log(`${colors.yellow}Token preview: ${accessToken.substring(0, 20)}...${colors.reset}`);
      return true;
    }
  } catch (error) {
    console.log(`${colors.red}❌ Login failed: ${error.response?.data?.error || error.message}${colors.reset}`);
    return false;
  }
}

async function testTokenValidation(serviceName, url) {
  console.log(`\n${colors.cyan}Testing ${serviceName}: ${url}${colors.reset}`);
  
  if (!accessToken) {
    console.log(`${colors.red}❌ No access token available${colors.reset}`);
    return;
  }

  try {
    const response = await axios.get(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`${colors.green}✅ ${serviceName} - Success (${response.status})${colors.reset}`);
    
  } catch (error) {
    const status = error.response?.status || 'Network Error';
    const message = error.response?.data?.error || error.message;
    
    if (status === 401) {
      console.log(`${colors.red}❌ ${serviceName} - Authentication failed: ${message}${colors.reset}`);
      
      // Try to decode token and check details
      try {
        const tokenParts = accessToken.split('.');
        const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
        console.log(`${colors.yellow}   Token payload: id=${payload.id}, email=${payload.email}, role=${payload.role}${colors.reset}`);
        console.log(`${colors.yellow}   Token expires: ${new Date(payload.exp * 1000).toISOString()}${colors.reset}`);
        console.log(`${colors.yellow}   Current time:  ${new Date().toISOString()}${colors.reset}`);
      } catch (e) {
        console.log(`${colors.yellow}   Could not decode token${colors.reset}`);
      }
    } else {
      console.log(`${colors.yellow}⚠️  ${serviceName} - ${status}: ${message}${colors.reset}`);
    }
  }
}

async function main() {
  console.log(`${colors.cyan}🔍 Token Validation Debug${colors.reset}\n`);
  
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.log(`${colors.red}Cannot proceed without valid token${colors.reset}`);
    return;
  }

  // Test the same endpoints as the main test
  await testTokenValidation('Planning Service', 'http://localhost:3004/api/planning/events');
  await testTokenValidation('Statistics Service', 'http://localhost:3006/api/statistics/dashboard');
  await testTokenValidation('News Service', 'http://localhost:3005/api/news');
  await testTokenValidation('Auth Service', 'http://localhost:3001/api/auth/profile');
  
  console.log(`\n${colors.cyan}Debug complete${colors.reset}`);
}

main();