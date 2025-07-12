#!/usr/bin/env node

const axios = require('axios');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m'
};

async function createTestUser() {
  console.log(`${colors.cyan}Creating test admin user...${colors.reset}`);
  
  try {
    const response = await axios.post('http://localhost:3001/api/auth/register', {
      email: 'admin@101school.com',
      password: 'Admin123!',
      role: 'admin',
      profile: {
        firstName: 'Test',
        lastName: 'Admin'
      }
    });

    if (response.status === 201 && response.data.success) {
      console.log(`${colors.green}✅ Test admin user created successfully${colors.reset}`);
      console.log(`   Email: admin@101school.com`);
      console.log(`   Password: Admin123!`);
      console.log(`   Role: admin`);
    } else {
      console.log(`${colors.red}❌ Failed to create user: ${response.data.error}${colors.reset}`);
    }
  } catch (error) {
    if (error.response?.status === 400 && error.response?.data?.error?.includes('already exists')) {
      console.log(`${colors.yellow}⚠️  Test admin user already exists${colors.reset}`);
    } else {
      console.log(`${colors.red}❌ Error creating user: ${error.response?.data?.error || error.message}${colors.reset}`);
    }
  }
}

createTestUser();