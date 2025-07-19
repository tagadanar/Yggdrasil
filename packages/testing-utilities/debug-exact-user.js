/**
 * Test with the exact user from the failing test
 */
const { MongoClient } = require('mongodb');
const bcrypt = require('bcrypt');

async function debugExactUser() {
  console.log('🚀 Testing with exact user from failing test...');
  
  const client = new MongoClient('mongodb://localhost:27018');
  await client.connect();
  const db = client.db('yggdrasil_test_w0');
  
  // Exact user from the test
  const testUser = {
    _id: 'w0_user_cd735028_00_d7ee17d2_pool_stu',
    email: 'w0_user_cd735028_00_d7ee17d2_pool_stu@test.yggdrasil.local',
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
  
  console.log('📝 Creating exact test user...');
  console.log('   Email:', testUser.email);
  console.log('   ID:', testUser._id);
  
  // Clean up first
  await db.collection('w0_users').deleteMany({ email: testUser.email });
  
  // Create user
  await db.collection('w0_users').insertOne(testUser);
  
  // Verify creation
  const userInDb = await db.collection('w0_users').findOne({ email: testUser.email });
  console.log('✅ User created:', !!userInDb);
  
  // Test auth immediately
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
    
    if (response.status === 200) {
      console.log('✅ Authentication SUCCESSFUL!');
      console.log('   Success:', result.success);
      console.log('   User email:', result.data?.user?.email);
    } else {
      console.log('❌ Authentication FAILED!');
      console.log('   Response:', JSON.stringify(result, null, 2));
    }
    
  } catch (error) {
    console.log('❌ Request failed:', error.message);
  }
  
  // Also test with admin account to see the difference
  console.log('\\n🔐 Testing admin account...');
  try {
    const response = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'admin@yggdrasil.edu',
        password: 'Admin123!'
      })
    });
    
    const result = await response.json();
    console.log('📊 Admin response status:', response.status);
    console.log('📊 Admin response:', JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.log('❌ Admin request failed:', error.message);
  }
  
  // Clean up
  await db.collection('w0_users').deleteOne({ _id: testUser._id });
  await client.close();
}

debugExactUser().catch(console.error);