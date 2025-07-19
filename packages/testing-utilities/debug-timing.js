/**
 * Debug timing issues in test authentication
 */
const { MongoClient } = require('mongodb');
const bcrypt = require('bcrypt');

async function debugTiming() {
  console.log('🚀 Testing timing issues...');
  
  const client = new MongoClient('mongodb://localhost:27018');
  await client.connect();
  const db = client.db('yggdrasil_test_w0');
  
  // Simulate rapid user creation and authentication (like in tests)
  for (let i = 0; i < 3; i++) {
    console.log(`\n🔄 Test ${i + 1}:`);
    
    const testUser = {
      _id: `w0_user_cd735028_00_timing${i}`,
      email: `w0_user_cd735028_00_timing${i}@test.yggdrasil.local`,
      password: await bcrypt.hash('TestPassword123!', 10),
      role: 'student',
      firstName: 'Timing',
      lastName: 'Test',
      isActive: true,
      preferences: {
        theme: 'light',
        language: 'en'
      }
    };
    
    // Clean up
    await db.collection('w0_users').deleteMany({ email: testUser.email });
    
    // Create user
    console.log('   📝 Creating user...');
    await db.collection('w0_users').insertOne(testUser);
    
    // Immediate authentication (no delay)
    console.log('   🔐 Immediate auth test...');
    try {
      const response = await fetch('http://localhost:3001/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testUser.email,
          password: 'TestPassword123!'
        })
      });
      
      const result = await response.json();
      console.log('      Status:', response.status, 'Success:', result.success);
      
      if (!result.success) {
        console.log('      Error:', result.error);
        console.log('      Full response:', JSON.stringify(result, null, 2));
      }
    } catch (error) {
      console.log('      Request failed:', error.message);
    }
    
    // Clean up
    await db.collection('w0_users').deleteOne({ _id: testUser._id });
  }
  
  await client.close();
  console.log('\n✅ Timing test complete!');
}

debugTiming().catch(console.error);