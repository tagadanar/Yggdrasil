/**
 * Real-time authentication debugging script
 * This will create a user, verify it exists, then test authentication
 */
const { MongoClient } = require('mongodb');
const bcrypt = require('bcrypt');

async function debugAuthRealtime() {
  console.log('🚀 Starting real-time auth debugging...');
  
  const client = new MongoClient('mongodb://localhost:27018');
  await client.connect();
  const db = client.db('yggdrasil_test_w0');
  
  // 1. Clean up any existing test users
  console.log('🧹 Cleaning up existing test users...');
  await db.collection('w0_users').deleteMany({ email: /testuser.*@test\.yggdrasil\.local/ });
  
  // 2. Create a test user in the w0_users collection (same format as test infrastructure)
  const testUser = {
    _id: 'w0_testuser_debug_001',
    email: 'w0_testuser_debug_001@test.yggdrasil.local',
    password: await bcrypt.hash('TestPassword123!', 10),
    role: 'student',
    firstName: 'Debug',
    lastName: 'User',
    isActive: true,
    preferences: {
      theme: 'light',
      language: 'en'
    }
  };
  
  console.log('📝 Creating test user in w0_users collection...');
  console.log('   Email:', testUser.email);
  console.log('   ID:', testUser._id);
  console.log('   Role:', testUser.role);
  
  await db.collection('w0_users').insertOne(testUser);
  
  // 3. Verify user was created
  console.log('✅ Verifying user creation...');
  const userInDb = await db.collection('w0_users').findOne({ email: testUser.email });
  if (userInDb) {
    console.log('   ✅ User found in database');
    console.log('   Email:', userInDb.email);
    console.log('   Has password:', !!userInDb.password);
    console.log('   Password hash length:', userInDb.password ? userInDb.password.length : 0);
  } else {
    console.log('   ❌ User NOT found in database');
    await client.close();
    return;
  }
  
  // 4. Test authentication via API
  console.log('🔐 Testing authentication via API...');
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
    console.log('📊 Authentication result:');
    console.log('   Status:', response.status);
    console.log('   Success:', result.success);
    
    if (result.success) {
      console.log('   ✅ Authentication SUCCESSFUL!');
      console.log('   User:', result.data.user.email);
      console.log('   Role:', result.data.user.role);
      console.log('   Token length:', result.data.tokens.accessToken.length);
    } else {
      console.log('   ❌ Authentication FAILED!');
      console.log('   Error:', result.error || result.message);
      console.log('   Full response:', JSON.stringify(result, null, 2));
    }
  } catch (error) {
    console.log('   ❌ API request failed:', error.message);
  }
  
  // 5. Check if user still exists after auth attempt
  console.log('🔍 Checking if user still exists after auth attempt...');
  const userAfterAuth = await db.collection('w0_users').findOne({ email: testUser.email });
  if (userAfterAuth) {
    console.log('   ✅ User still exists in database');
  } else {
    console.log('   ❌ User disappeared from database');
  }
  
  // 6. Clean up
  console.log('🧹 Cleaning up test user...');
  await db.collection('w0_users').deleteOne({ _id: testUser._id });
  
  await client.close();
  console.log('✅ Debug complete!');
}

debugAuthRealtime().catch(console.error);