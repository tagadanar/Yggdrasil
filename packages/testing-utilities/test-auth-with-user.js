/**
 * Create a test user and test authentication
 */
const { MongoClient } = require('mongodb');
const bcrypt = require('bcrypt');

async function testAuthWithUser() {
  console.log('🔍 Creating test user and testing authentication...');
  
  // Connect to database
  const client = new MongoClient('mongodb://localhost:27018');
  await client.connect();
  const db = client.db('yggdrasil_test_w0');
  
  // Create a test user in w0_users collection
  const testUser = {
    _id: 'test_user_12345',
    email: 'testuser@test.yggdrasil.local',
    password: await bcrypt.hash('TestPassword123!', 10),
    role: 'student',
    firstName: 'Test',
    lastName: 'User'
  };
  
  console.log('📝 Creating test user in w0_users collection...');
  await db.collection('w0_users').insertOne(testUser);
  
  console.log('✅ User created. Testing authentication...');
  
  // Test authentication
  const response = await fetch('http://localhost:3001/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email: 'testuser@test.yggdrasil.local',
      password: 'TestPassword123!'
    })
  });
  
  const result = await response.json();
  console.log('🔐 Authentication result:', result);
  
  // Check if user exists in database
  const userInDb = await db.collection('w0_users').findOne({ email: 'testuser@test.yggdrasil.local' });
  console.log('🗄️ User in database:', userInDb ? `Found: ${userInDb.email}` : 'Not found');
  
  // Clean up
  await db.collection('w0_users').deleteOne({ _id: 'test_user_12345' });
  console.log('🧹 Test user cleaned up');
  
  await client.close();
}

testAuthWithUser().catch(console.error);