#!/usr/bin/env node

const axios = require('axios');

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// Service endpoints
const services = {
  auth: 'http://localhost:3001',
  planning: 'http://localhost:3004',
  statistics: 'http://localhost:3006',
  course: 'http://localhost:3003',
  news: 'http://localhost:3005'
};

let accessToken = null;

console.log(`${colors.cyan}${colors.bright}🔐 Yggdrasil Authentication Test Suite${colors.reset}`);
console.log(`${colors.blue}${'='.repeat(60)}${colors.reset}\n`);

async function testLogin() {
  console.log(`${colors.yellow}1. Testing user login...${colors.reset}`);
  
  try {
    const response = await axios.post(`${services.auth}/api/auth/login`, {
      email: 'admin@101school.com',
      password: 'Admin123!'
    });

    if (response.status === 200 && response.data.success) {
      accessToken = response.data.data.tokens.accessToken;
      console.log(`${colors.green}✅ Login successful${colors.reset}`);
      console.log(`${colors.blue}   User: ${response.data.data.user.email} (${response.data.data.user.role})${colors.reset}`);
      return true;
    } else {
      console.log(`${colors.red}❌ Login failed: ${response.data.error}${colors.reset}`);
      return false;
    }
  } catch (error) {
    console.log(`${colors.red}❌ Login error: ${error.response?.data?.error || error.message}${colors.reset}`);
    return false;
  }
}

async function testAuthenticatedEndpoint(serviceName, url, method = 'GET', data = null) {
  console.log(`${colors.yellow}Testing ${serviceName}: ${method} ${url}${colors.reset}`);
  
  if (!accessToken) {
    console.log(`${colors.red}❌ No access token available${colors.reset}`);
    return false;
  }

  try {
    const config = {
      method: method.toLowerCase(),
      url,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    };

    if (data && (method === 'POST' || method === 'PUT')) {
      config.data = data;
    }

    const response = await axios(config);
    
    if (response.status >= 200 && response.status < 300) {
      console.log(`${colors.green}✅ ${serviceName} - ${response.status} ${response.statusText}${colors.reset}`);
      return true;
    } else {
      console.log(`${colors.red}❌ ${serviceName} - ${response.status} ${response.statusText}${colors.reset}`);
      return false;
    }
  } catch (error) {
    const status = error.response?.status || 'Network Error';
    const message = error.response?.data?.error || error.message;
    console.log(`${colors.red}❌ ${serviceName} - ${status}: ${message}${colors.reset}`);
    return false;
  }
}

async function testCreateEvent() {
  console.log(`\n${colors.yellow}2. Testing event creation (Planning Service)...${colors.reset}`);
  
  const eventData = {
    title: 'Test Authentication Event',
    description: 'Testing if auth works for event creation',
    startTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
    endTime: new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString(), // Tomorrow + 1 hour
    type: 'lecture',
    isRecurring: false
  };

  return await testAuthenticatedEndpoint(
    'Planning Service',
    `${services.planning}/api/planning/events`,
    'POST',
    eventData
  );
}

async function testStatisticsDashboard() {
  console.log(`\n${colors.yellow}3. Testing statistics dashboard (Statistics Service)...${colors.reset}`);
  
  return await testAuthenticatedEndpoint(
    'Statistics Service',
    `${services.statistics}/api/statistics/dashboard`
  );
}

async function testGenerateReport() {
  console.log(`\n${colors.yellow}4. Testing PDF report generation (Statistics Service)...${colors.reset}`);
  
  return await testAuthenticatedEndpoint(
    'Statistics Service',
    `${services.statistics}/api/statistics/reports/generate?format=pdf&type=user-activity`
  );
}

async function testCourseList() {
  console.log(`\n${colors.yellow}5. Testing course list (Course Service)...${colors.reset}`);
  
  return await testAuthenticatedEndpoint(
    'Course Service',
    `${services.course}/api/courses`
  );
}

async function testCreateNews() {
  console.log(`\n${colors.yellow}6. Testing news creation (News Service)...${colors.reset}`);
  
  const newsData = {
    title: 'Test Authentication News',
    content: 'Testing if auth works for news creation',
    category: 'announcement',
    tags: ['test', 'authentication']
  };

  return await testAuthenticatedEndpoint(
    'News Service',
    `${services.news}/api/news`,
    'POST',
    newsData
  );
}

async function testAuthProfile() {
  console.log(`\n${colors.yellow}7. Testing auth profile endpoint (Auth Service)...${colors.reset}`);
  
  return await testAuthenticatedEndpoint(
    'Auth Service',
    `${services.auth}/api/auth/profile`
  );
}

async function runTests() {
  const results = [];
  
  // Test login first
  const loginSuccess = await testLogin();
  results.push({ test: 'Login', success: loginSuccess });
  
  if (!loginSuccess) {
    console.log(`\n${colors.red}${colors.bright}❌ Cannot proceed with authentication tests - login failed${colors.reset}`);
    return;
  }

  // Test authenticated endpoints
  results.push({ test: 'Event Creation', success: await testCreateEvent() });
  results.push({ test: 'Statistics Dashboard', success: await testStatisticsDashboard() });
  results.push({ test: 'PDF Report Generation', success: await testGenerateReport() });
  results.push({ test: 'Course List', success: await testCourseList() });
  results.push({ test: 'News Creation', success: await testCreateNews() });
  results.push({ test: 'Auth Profile', success: await testAuthProfile() });

  // Summary
  console.log(`\n${colors.blue}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.cyan}${colors.bright}📊 Test Results Summary${colors.reset}`);
  console.log(`${colors.blue}${'='.repeat(60)}${colors.reset}`);

  const successful = results.filter(r => r.success).length;
  const total = results.length;

  results.forEach(result => {
    const icon = result.success ? '✅' : '❌';
    const color = result.success ? colors.green : colors.red;
    console.log(`${color}${icon} ${result.test}${colors.reset}`);
  });

  console.log(`\n${colors.bright}Success Rate: ${successful}/${total} (${Math.round(successful/total*100)}%)${colors.reset}`);

  if (successful === total) {
    console.log(`\n${colors.green}${colors.bright}🎉 All authentication tests passed!${colors.reset}`);
    console.log(`${colors.green}✅ The 401 error issue appears to be resolved.${colors.reset}`);
  } else {
    console.log(`\n${colors.red}${colors.bright}⚠️  Some authentication tests failed.${colors.reset}`);
    console.log(`${colors.yellow}💡 Check the service logs for more details.${colors.reset}`);
  }
}

// Main execution
runTests().catch(error => {
  console.error(`${colors.red}Test suite error: ${error.message}${colors.reset}`);
  process.exit(1);
});