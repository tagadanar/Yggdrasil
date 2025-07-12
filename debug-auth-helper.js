#!/usr/bin/env node

const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

// Load environment variables
require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m'
};

// Simulate the AuthHelper validation method with debug logging
async function debugValidateAccessTokenWithDatabase(token) {
  console.log(`${colors.cyan}🔍 Debug: validateAccessTokenWithDatabase${colors.reset}`);
  
  try {
    // Step 1: Verify JWT token structure and signature
    console.log(`${colors.yellow}Step 1: Verifying JWT token...${colors.reset}`);
    const jwtSecret = process.env.JWT_SECRET || 'fallback-secret';
    console.log(`${colors.yellow}   JWT Secret: ${jwtSecret.substring(0, 10)}...${colors.reset}`);
    
    const decoded = jwt.verify(token, jwtSecret);
    console.log(`${colors.green}✅ JWT token verified successfully${colors.reset}`);
    console.log(`   User ID: ${decoded.id}`);
    console.log(`   Email: ${decoded.email}`);
    console.log(`   Role: ${decoded.role}`);
    
    // Step 2: Check database connection
    console.log(`${colors.yellow}Step 2: Checking database connection...${colors.reset}`);
    const db = mongoose.connection.db;
    if (!db) {
      console.log(`${colors.red}❌ Database connection not available${colors.reset}`);
      console.log(`   mongoose.connection.readyState: ${mongoose.connection.readyState}`);
      return { success: false, error: 'Database connection not available' };
    }
    console.log(`${colors.green}✅ Database connection available${colors.reset}`);
    console.log(`   Database name: ${db.databaseName}`);
    
    // Step 3: Get user collection
    console.log(`${colors.yellow}Step 3: Accessing users collection...${colors.reset}`);
    const UserCollection = db.collection('users');
    console.log(`${colors.green}✅ Users collection accessed${colors.reset}`);
    
    // Step 4: Find user in database
    console.log(`${colors.yellow}Step 4: Looking up user in database...${colors.reset}`);
    const userId = decoded.id || decoded.userId || decoded._id;
    console.log(`   Looking for user ID: ${userId}`);
    
    const user = await UserCollection.findOne({ 
      _id: new mongoose.Types.ObjectId(userId) 
    });
    
    if (!user) {
      console.log(`${colors.red}❌ User not found in database${colors.reset}`);
      
      // Debug: Check if any users exist
      const userCount = await UserCollection.countDocuments();
      console.log(`   Total users in database: ${userCount}`);
      
      if (userCount > 0) {
        const sampleUsers = await UserCollection.find({}).limit(3).toArray();
        console.log(`   Sample user IDs:`, sampleUsers.map(u => u._id.toString()));
      }
      
      return { success: false, error: 'User not found' };
    }
    
    console.log(`${colors.green}✅ User found in database${colors.reset}`);
    console.log(`   User email: ${user.email}`);
    console.log(`   User role: ${user.role}`);
    console.log(`   User active: ${user.isActive}`);
    
    // Step 5: Check if user is active
    if (!user.isActive) {
      console.log(`${colors.red}❌ User account is inactive${colors.reset}`);
      return { success: false, error: 'Account is inactive' };
    }
    
    console.log(`${colors.green}✅ Authentication successful${colors.reset}`);
    return { 
      success: true, 
      user: {
        _id: user._id,
        id: user._id.toString(),
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        profile: user.profile
      }
    };
  } catch (error) {
    console.log(`${colors.red}❌ Error during validation: ${error.message}${colors.reset}`);
    console.log(`   Stack trace: ${error.stack}`);
    
    if (error.message.includes('Invalid or expired')) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Token validation failed' };
  }
}

async function testWithPlanningServiceConnection() {
  console.log(`\n${colors.cyan}🔗 Testing with Planning Service Database Connection${colors.reset}`);
  
  // Connect to database the same way Planning Service does
  const MONGO_URI = process.env.MONGODB_URI || 'mongodb://yggdrasil_app:app_password_2024@localhost:27017/yggdrasil-dev';
  console.log(`${colors.yellow}Connecting to: ${MONGO_URI}${colors.reset}`);
  
  try {
    await mongoose.connect(MONGO_URI);
    console.log(`${colors.green}✅ Connected to MongoDB${colors.reset}`);
    console.log(`   Database: ${mongoose.connection.db.databaseName}`);
    console.log(`   Ready state: ${mongoose.connection.readyState}`);
    
    // Test with a real token
    console.log(`\n${colors.cyan}Testing with real token...${colors.reset}`);
    
    // Login to get a token
    const axios = require('axios');
    const loginResponse = await axios.post('http://localhost:3001/api/auth/login', {
      email: 'admin@101school.com',
      password: 'Admin123!'
    });
    
    const token = loginResponse.data.data.tokens.accessToken;
    console.log(`${colors.green}✅ Got token from login${colors.reset}`);
    
    // Test the validation
    const result = await debugValidateAccessTokenWithDatabase(token);
    
    if (result.success) {
      console.log(`\n${colors.green}🎉 Validation successful!${colors.reset}`);
    } else {
      console.log(`\n${colors.red}❌ Validation failed: ${result.error}${colors.reset}`);
    }
    
  } catch (error) {
    console.log(`${colors.red}❌ Database connection failed: ${error.message}${colors.reset}`);
  } finally {
    await mongoose.disconnect();
  }
}

testWithPlanningServiceConnection();