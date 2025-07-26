#!/usr/bin/env node

// Create the missing demo users that the tests expect
// The diagnostic showed that only pool users exist, but tests expect simple demo emails

const { MongoClient } = require('mongodb');
const bcrypt = require('bcrypt');

async function createDemoUsers() {
  console.log('🌱 DEMO SETUP: Creating demo users that tests expect...');
  
  try {
    // Connect to the test database
    const dbName = 'yggdrasil_test_w0';
    const connectionString = 'mongodb://localhost:27018';
    const client = new MongoClient(connectionString);
    
    await client.connect();
    console.log(`✅ DEMO SETUP: Connected to MongoDB at ${connectionString}`);
    
    const db = client.db(dbName);
    const collection = db.collection('w0_users');
    
    // Demo users that the tests expect
    const demoUsers = [
      {
        email: 'admin@yggdrasil.edu',
        password: 'Admin123!',
        role: 'admin',
        profile: {
          firstName: 'Admin',
          lastName: 'User'
        }
      },
      {
        email: 'teacher@yggdrasil.edu', 
        password: 'Admin123!',
        role: 'teacher',
        profile: {
          firstName: 'Teacher',
          lastName: 'Demo'
        }
      },
      {
        email: 'staff@yggdrasil.edu',
        password: 'Admin123!', 
        role: 'staff',
        profile: {
          firstName: 'Staff',
          lastName: 'User'
        }
      },
      {
        email: 'student@yggdrasil.edu',
        password: 'Admin123!',
        role: 'student', 
        profile: {
          firstName: 'Student',
          lastName: 'Demo'
        }
      }
    ];
    
    for (const userData of demoUsers) {
      console.log(`🔧 DEMO SETUP: Creating demo user: ${userData.email}`);
      
      // Check if user already exists
      const existingUser = await collection.findOne({ email: userData.email });
      if (existingUser) {
        console.log(`⚠️ DEMO SETUP: User already exists: ${userData.email}, skipping`);
        continue;
      }
      
      // Hash the password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(userData.password, saltRounds);
      console.log(`🔑 DEMO SETUP: Credentials hashed for ${userData.email}`);
      
      // Create user document
      const userDoc = {
        email: userData.email,
        password: hashedPassword,
        role: userData.role,
        profile: userData.profile,
        isActive: true,
        tokenVersion: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Insert user
      const result = await collection.insertOne(userDoc);
      console.log(`✅ DEMO SETUP: Created demo user: ${userData.email} with ID: ${result.insertedId}`);
      
      // Verify password works
      const testResult = await bcrypt.compare(userData.password, hashedPassword);
      console.log(`🔑 DEMO SETUP: Password verification test: ${testResult}`);
    }
    
    await client.close();
    console.log('🎉 DEMO SETUP: All demo users created successfully!');
    
  } catch (error) {
    console.error('💥 DEMO SETUP: Fatal error:', error);
  }
}

// Run demo user creation
createDemoUsers().catch(console.error);