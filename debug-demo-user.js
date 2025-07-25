// Debug script to check demo user data in database
const { MongoClient } = require('mongodb');

async function checkDemoUser() {
  const client = new MongoClient('mongodb://localhost:27018/yggdrasil-dev');
  
  try {
    await client.connect();
    console.log('🔍 Connected to MongoDB');
    
    const db = client.db('yggdrasil-dev');
    const users = db.collection('users');
    
    // Find the demo teacher user
    const teacher = await users.findOne({ email: 'teacher@yggdrasil.edu' });
    
    if (teacher) {
      console.log('📋 Demo Teacher User Data:');
      console.log('Email:', teacher.email);
      console.log('Role:', teacher.role);
      console.log('Profile:', JSON.stringify(teacher.profile, null, 2));
      console.log('Has profile?', !!teacher.profile);
      console.log('Profile firstName:', teacher.profile?.firstName);
      console.log('Profile lastName:', teacher.profile?.lastName);
    } else {
      console.log('❌ Demo teacher user not found!');
    }
  } catch (error) {
    console.error('❌ Database error:', error);
  } finally {
    await client.close();
  }
}

checkDemoUser();