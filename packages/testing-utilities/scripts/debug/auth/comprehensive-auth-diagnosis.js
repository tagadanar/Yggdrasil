#!/usr/bin/env node

// Quick diagnostic script to check demo user authentication
// This will help identify if the issue is user creation, database access, or password hashing

const { MongoClient } = require('mongodb');
const bcrypt = require('bcrypt');

async function diagnoseAuthIssue() {
  console.log('🔍 DIAGNOSIS: Starting authentication issue diagnosis...');
  
  try {
    // Connect to the test database
    const dbName = 'yggdrasil_test_w0';
    const connectionString = 'mongodb://localhost:27018';
    const client = new MongoClient(connectionString);
    
    await client.connect();
    console.log(`✅ DIAGNOSIS: Connected to MongoDB at ${connectionString}`);
    
    const db = client.db(dbName);
    console.log(`✅ DIAGNOSIS: Using database: ${dbName}`);
    
    // List all collections
    const collections = await db.listCollections().toArray();
    console.log(`📋 DIAGNOSIS: Available collections: ${collections.map(c => c.name).join(', ')}`);
    
    // Check both possible user collection names
    const possibleCollections = ['w0_users', 'users', 'w0_User', 'User'];
    
    for (const collectionName of possibleCollections) {
      try {
        const collection = db.collection(collectionName);
        const userCount = await collection.countDocuments();
        console.log(`👥 DIAGNOSIS: Collection '${collectionName}': ${userCount} users`);
        
        if (userCount > 0) {
          // Get all users
          const users = await collection.find({}).toArray();
          console.log(`📊 DIAGNOSIS: Users in '${collectionName}':`);
          
          for (const user of users) {
            console.log(`  - Email: ${user.email}`);
            console.log(`    Role: ${user.role}`);
            console.log(`    Active: ${user.isActive}`);
            console.log(`    Has Password: ${!!user.password}`);
            console.log(`    Password Hash: ${user.password ? user.password.substring(0, 20) + '...' : 'none'}`);
            
            // Test password verification for demo users
            if (user.email === 'student@yggdrasil.edu') {
              console.log(`🔑 DIAGNOSIS: Testing password for student@yggdrasil.edu`);
              const testPassword = 'Admin123!';
              
              try {
                const bcryptResult = await bcrypt.compare(testPassword, user.password);
                console.log(`🔑 DIAGNOSIS: bcrypt.compare('${testPassword}', hash) = ${bcryptResult}`);
                
                // Also test other common demo passwords
                const altPasswords = ['admin123', 'password', 'Student123!', 'Demo123!'];
                for (const altPassword of altPasswords) {
                  const altResult = await bcrypt.compare(altPassword, user.password);
                  if (altResult) {
                    console.log(`🔑 DIAGNOSIS: ✅ Alternative password '${altPassword}' works!`);
                  }
                }
              } catch (bcryptError) {
                console.error(`❌ DIAGNOSIS: bcrypt error:`, bcryptError.message);
              }
            }
            
            console.log(''); // Empty line for readability
          }
        }
      } catch (error) {
        console.log(`❌ DIAGNOSIS: Error checking collection '${collectionName}': ${error.message}`);
      }
    }
    
    await client.close();
    console.log('✅ DIAGNOSIS: Diagnosis complete');
    
  } catch (error) {
    console.error('💥 DIAGNOSIS: Fatal error:', error);
  }
}

// Run diagnosis
diagnoseAuthIssue().catch(console.error);