/**
 * Debug authentication with exact test user format
 */
const { MongoClient } = require('mongodb');
const bcrypt = require('bcrypt');

async function debugTestFormat() {
  console.log('🚀 Testing auth with exact test user format...');
  
  const client = new MongoClient('mongodb://localhost:27018');
  await client.connect();
  const db = client.db('yggdrasil_test_w0');
  
  // Create user with exact same format as test
  const testUser = {
    _id: 'w0_user_cd735028_00_testformat',
    email: 'w0_user_cd735028_00_testformat@test.yggdrasil.local',
    password: await bcrypt.hash('TestPassword123!', 10),
    role: 'student',
    firstName: 'Test',
    lastName: 'User',
    isActive: true,
    preferences: {
      theme: 'light',
      language: 'en'
    }
  };
  
  console.log('📝 Creating test user with exact format...');
  console.log('   Email:', testUser.email);
  console.log('   ID:', testUser._id);
  
  // Clean up first
  await db.collection('w0_users').deleteMany({ email: testUser.email });
  
  // Create user
  await db.collection('w0_users').insertOne(testUser);
  
  // Verify creation
  const userInDb = await db.collection('w0_users').findOne({ email: testUser.email });
  console.log('✅ User created:', !!userInDb);
  
  // Test auth
  console.log('🔐 Testing authentication...');
  try {
    const response = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: testUser.email,
        password: 'TestPassword123!'
      })
    });
    
    const result = await response.json();
    console.log('📊 Response status:', response.status);
    console.log('📊 Response body:', JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.log('❌ Request failed:', error.message);
  }
  
  // Clean up
  await db.collection('w0_users').deleteOne({ _id: testUser._id });
  await client.close();
}

debugTestFormat().catch(console.error);