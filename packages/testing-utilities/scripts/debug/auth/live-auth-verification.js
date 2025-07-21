#!/usr/bin/env node

/**
 * Live Authentication Verification Script
 * Enhanced version of verify-live-auth.js with better error handling and integration
 * Verifies complete auth flow during test execution
 */

const axios = require('axios');
const { MongoClient } = require('mongodb');
const bcrypt = require('bcrypt');

class LiveAuthVerifier {
  constructor(options = {}) {
    this.workerId = options.workerId || '0';
    this.dbUri = options.dbUri || 'mongodb://localhost:27018';
    this.dbName = options.dbName || `yggdrasil_test_w${this.workerId}`;
    this.collectionName = options.collectionName || `w${this.workerId}_users`;
    this.authServiceUrl = options.authServiceUrl || 'http://localhost:3001';
    this.frontendUrl = options.frontendUrl || 'http://localhost:3000';
    this.client = null;
    this.testUser = null;
  }

  async initialize() {
    console.log('🚀 Initializing live auth verification...');
    console.log(`   Worker: ${this.workerId}`);
    console.log(`   Database: ${this.dbName}`);
    console.log(`   Collection: ${this.collectionName}`);
    
    try {
      this.client = new MongoClient(this.dbUri);
      await this.client.connect();
      console.log('✅ Database connection established');
    } catch (error) {
      throw new Error(`Database connection failed: ${error.message}`);
    }
  }

  async createTestUser() {
    console.log('\n📝 Creating verification test user...');
    
    const timestamp = Date.now();
    this.testUser = {
      _id: `w${this.workerId}_live_auth_verify_${timestamp}`,
      email: `w${this.workerId}_live_auth_verify_${timestamp}@test.yggdrasil.local`,
      password: await bcrypt.hash('LiveAuthVerify123!', 10),
      role: 'student',
      firstName: 'Live',
      lastName: 'Verify',
      isActive: true,
      preferences: {
        theme: 'light',
        language: 'en'
      },
      tokenVersion: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    try {
      const db = this.client.db(this.dbName);
      const collection = db.collection(this.collectionName);
      
      // Clean up any existing test user
      await collection.deleteMany({ email: { $regex: /_live_auth_verify_/ } });
      
      // Create new test user
      await collection.insertOne(this.testUser);
      
      // Verify user exists
      const userInDb = await collection.findOne({ email: this.testUser.email });
      if (!userInDb) {
        throw new Error('User not found after creation');
      }
      
      console.log('✅ Test user created successfully');
      console.log(`   Email: ${this.testUser.email}`);
      console.log(`   ID: ${this.testUser._id}`);
      
      return true;
      
    } catch (error) {
      console.error(`❌ Test user creation failed: ${error.message}`);
      return false;
    }
  }

  async verifyAuthService() {
    console.log('\n🔐 Verifying auth service...');
    
    // First check if auth service is running
    try {
      const healthResponse = await axios.get(`${this.authServiceUrl}/health`, { timeout: 5000 });
      console.log('✅ Auth service health check passed');
      console.log(`   Status: ${healthResponse.status}`);
    } catch (error) {
      console.error('❌ Auth service health check failed:', error.message);
      return false;
    }

    // Test authentication with test user
    try {
      console.log('🔑 Testing authentication...');
      
      const authResponse = await axios.post(`${this.authServiceUrl}/api/auth/login`, {
        email: this.testUser.email,
        password: 'LiveAuthVerify123!'
      }, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      console.log('📊 Auth API Response:');
      console.log(`   Status: ${authResponse.status}`);
      
      if (authResponse.status === 200) {
        const { user, accessToken, refreshToken } = authResponse.data;
        console.log('✅ Authentication successful!');
        console.log(`   User: ${user.email}`);
        console.log(`   Role: ${user.role}`);
        console.log(`   Access Token: ${accessToken ? 'Present' : 'Missing'}`);
        console.log(`   Refresh Token: ${refreshToken ? 'Present' : 'Missing'}`);
        return true;
      } else {
        console.error(`❌ Authentication failed with status: ${authResponse.status}`);
        console.error(`   Response: ${JSON.stringify(authResponse.data)}`);
        return false;
      }

    } catch (error) {
      console.error('❌ Authentication API request failed:', error.message);
      if (error.response) {
        console.error(`   Status: ${error.response.status}`);
        console.error(`   Data: ${JSON.stringify(error.response.data)}`);
      }
      return false;
    }
  }

  async verifyFrontend() {
    console.log('\n🌐 Verifying frontend application...');
    
    try {
      const frontendResponse = await axios.get(this.frontendUrl, { 
        timeout: 5000,
        validateStatus: (status) => status < 500 // Accept redirects
      });
      
      console.log('📊 Frontend Response:');
      console.log(`   Status: ${frontendResponse.status}`);
      console.log('✅ Frontend accessible');
      
      // Check if we get expected content
      if (frontendResponse.data && frontendResponse.data.includes('Yggdrasil')) {
        console.log('✅ Frontend serving expected content');
      }
      
      return true;
      
    } catch (error) {
      console.error('❌ Frontend request failed:', error.message);
      return false;
    }
  }

  async cleanup() {
    console.log('\n🧹 Cleaning up test resources...');
    
    if (this.testUser && this.client) {
      try {
        const db = this.client.db(this.dbName);
        const collection = db.collection(this.collectionName);
        await collection.deleteOne({ _id: this.testUser._id });
        console.log('✅ Test user cleaned up');
      } catch (error) {
        console.warn(`⚠️ Cleanup warning: ${error.message}`);
      }
    }

    if (this.client) {
      try {
        await this.client.close();
        console.log('✅ Database connection closed');
      } catch (error) {
        console.warn(`⚠️ Connection close warning: ${error.message}`);
      }
    }
  }

  async generateReport(results) {
    console.log('\n📊 LIVE AUTH VERIFICATION REPORT');
    console.log('='.repeat(50));
    
    let passedChecks = 0;
    const totalChecks = Object.keys(results).length;
    
    for (const [check, passed] of Object.entries(results)) {
      const status = passed ? '✅ PASS' : '❌ FAIL';
      console.log(`${status} ${check}`);
      if (passed) passedChecks++;
    }
    
    console.log('='.repeat(50));
    console.log(`📈 SUMMARY: ${passedChecks}/${totalChecks} checks passed`);
    
    if (passedChecks === totalChecks) {
      console.log('🎉 All authentication systems are working correctly!');
    } else {
      console.log('⚠️ Some authentication systems need attention');
      console.log('💡 Check the failed items above for troubleshooting');
    }
    
    return passedChecks === totalChecks;
  }
}

async function main() {
  const verifier = new LiveAuthVerifier();
  const results = {};
  
  try {
    await verifier.initialize();
    
    results['Database Connection'] = true;
    results['Test User Creation'] = await verifier.createTestUser();
    
    if (results['Test User Creation']) {
      results['Auth Service Verification'] = await verifier.verifyAuthService();
    } else {
      results['Auth Service Verification'] = false;
    }
    
    results['Frontend Accessibility'] = await verifier.verifyFrontend();
    
    const allPassed = await verifier.generateReport(results);
    
    if (!allPassed) {
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Live auth verification failed:', error.message);
    process.exit(1);
  } finally {
    await verifier.cleanup();
  }
  
  console.log('\n✅ Live authentication verification completed successfully');
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = LiveAuthVerifier;