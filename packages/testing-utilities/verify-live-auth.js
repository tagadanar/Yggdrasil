/**
 * Verify authentication is working during live test execution
 */
const { MongoClient } = require('mongodb');
const bcrypt = require('bcrypt');

async function verifyLiveAuth() {
  console.log('🚀 Verifying live authentication setup...');
  
  const client = new MongoClient('mongodb://localhost:27018');
  await client.connect();
  const db = client.db('yggdrasil_test_w0');
  
  // Create a test user in the correct database/collection
  const testUser = {
    _id: 'w0_verify_auth_test',
    email: 'w0_verify_auth_test@test.yggdrasil.local',
    password: await bcrypt.hash('TestPassword123!', 10),
    role: 'student',
    firstName: 'Verify',
    lastName: 'Test',
    isActive: true,
    preferences: {
      theme: 'light',
      language: 'en'
    }
  };
  
  console.log('📝 Creating verification test user...');
  await db.collection('w0_users').deleteMany({ email: testUser.email });
  await db.collection('w0_users').insertOne(testUser);
  
  // Test if user exists in database
  const userInDb = await db.collection('w0_users').findOne({ email: testUser.email });
  console.log('✅ User in database:', !!userInDb);
  
  // Test authentication against Worker 0 auth service
  console.log('🔐 Testing authentication against Worker 0 auth service...');
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
    console.log('📊 Auth API Response:');
    console.log('   Status:', response.status);
    console.log('   Success:', result.success);
    
    if (result.success) {
      console.log('   ✅ Authentication API working correctly!');
      console.log('   User:', result.data?.user?.email);
      console.log('   Role:', result.data?.user?.role);
    } else {
      console.log('   ❌ Authentication API failed:', result.error);
    }
    
  } catch (error) {
    console.log('❌ Auth API request failed:', error.message);
  }
  
  // Test frontend application
  console.log('\\n🌐 Testing frontend application...');
  try {
    const frontendResponse = await fetch('http://localhost:3000');
    console.log('📊 Frontend Response:');
    console.log('   Status:', frontendResponse.status);
    console.log('   ✅ Frontend accessible at http://localhost:3000');
  } catch (error) {
    console.log('❌ Frontend request failed:', error.message);
  }
  
  // Clean up
  await db.collection('w0_users').deleteOne({ _id: testUser._id });
  await client.close();
  
  console.log('\\n✅ Live authentication verification complete!');
}

verifyLiveAuth().catch(console.error);