// Debug mongoose serialization issue
const { MongoClient } = require('mongodb');

async function testSerialization() {
  const client = new MongoClient('mongodb://localhost:27018/yggdrasil-dev');
  
  try {
    await client.connect();
    console.log('🔍 Connected to MongoDB');
    
    const db = client.db('yggdrasil-dev');
    const users = db.collection('users');
    
    // Get the user directly from MongoDB (not through mongoose)
    const rawUser = await users.findOne({ email: 'teacher@yggdrasil.edu' });
    
    console.log('📋 Raw MongoDB Document:');
    console.log('Profile:', JSON.stringify(rawUser.profile, null, 2));
    
    // Test what happens when we serialize/deserialize
    const serialized = JSON.stringify(rawUser);
    const deserialized = JSON.parse(serialized);
    
    console.log('📋 After JSON.stringify/parse:');
    console.log('Profile:', JSON.stringify(deserialized.profile, null, 2));
    
    // Test what happens when we create a new object like the middleware does
    const middlewareStyleObject = {
      id: rawUser._id.toString(),
      userId: rawUser._id.toString(),
      email: rawUser.email,
      role: rawUser.role,
      isActive: rawUser.isActive,
      tokenVersion: rawUser.tokenVersion,
      firstName: rawUser.profile?.firstName || rawUser.firstName,
      lastName: rawUser.profile?.lastName || rawUser.lastName,
      profile: rawUser.profile,
      _id: rawUser._id
    };
    
    console.log('📋 Middleware-style object:');
    console.log('Profile:', JSON.stringify(middlewareStyleObject.profile, null, 2));
    console.log('Has profile:', !!middlewareStyleObject.profile);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
  }
}

testSerialization();