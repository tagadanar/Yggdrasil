#!/usr/bin/env node

const axios = require('axios');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m'
};

async function checkDatabaseConnection(serviceName, port) {
  console.log(`${colors.yellow}Checking ${serviceName} database connection...${colors.reset}`);
  
  try {
    // Try to access a protected endpoint without auth to see the exact error
    const response = await axios.get(`http://localhost:${port}/api/statistics/dashboard`, {
      headers: {
        'Authorization': 'Bearer invalid-token'
      }
    });
    
    console.log(`${colors.green}${serviceName}: Unexpected success?${colors.reset}`);
  } catch (error) {
    const status = error.response?.status;
    const message = error.response?.data?.error || error.message;
    
    if (status === 401) {
      if (message.includes('Database connection not available')) {
        console.log(`${colors.red}❌ ${serviceName}: Database connection issue - ${message}${colors.reset}`);
      } else {
        console.log(`${colors.green}✅ ${serviceName}: Database connected (got proper auth error: ${message})${colors.reset}`);
      }
    } else {
      console.log(`${colors.yellow}⚠️  ${serviceName}: Unexpected status ${status} - ${message}${colors.reset}`);
    }
  }
}

async function main() {
  console.log(`${colors.cyan}🔍 Debugging Database Connections${colors.reset}\n`);
  
  await checkDatabaseConnection('Statistics Service', 3006);
  await checkDatabaseConnection('Planning Service', 3004);
  await checkDatabaseConnection('News Service', 3005);
  
  console.log(`\n${colors.cyan}Debug complete${colors.reset}`);
}

main();