/**
 * Debug script to monitor authentication during live test
 */
const { exec, spawn } = require('child_process');
const { MongoClient } = require('mongodb');

async function monitorAuth() {
  console.log('🔍 Starting live auth debugging...');
  
  // Connect to database
  const client = new MongoClient('mongodb://localhost:27018');
  await client.connect();
  const db = client.db('yggdrasil_test_w0');
  
  let testRunning = false;
  let authAttemptSeen = false;
  
  // Monitor database changes
  const checkUsers = async () => {
    if (!testRunning) return;
    
    try {
      const collections = await db.listCollections().toArray();
      const userCollections = collections.filter(c => c.name.includes('user'));
      
      for (const collection of userCollections) {
        const users = await db.collection(collection.name).find({}).toArray();
        if (users.length > 0) {
          console.log(`\n🗄️ DATABASE: Found ${users.length} users in ${collection.name}:`);
          for (const user of users) {
            console.log(`   📧 ${user.email} (id: ${user._id}, role: ${user.role})`);
          }
        }
      }
    } catch (error) {
      console.error('❌ Error checking users:', error.message);
    }
  };
  
  // Start monitoring
  const userMonitor = setInterval(checkUsers, 2000);
  
  // Start test
  console.log('\n🧪 Starting test...');
  testRunning = true;
  
  const testProcess = spawn('npm', ['run', 'test:single', '--', '--grep', 'AUTH-001: Complete JWT Security Lifecycle'], {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env }
  });
  
  testProcess.stdout.on('data', (data) => {
    const output = data.toString();
    if (output.includes('Invalid email or password')) {
      authAttemptSeen = true;
      console.log('\n🚨 AUTH FAILURE DETECTED! Checking database state...');
      checkUsers();
    }
    // Only show auth-related output
    if (output.includes('AUTH') || output.includes('LOGIN') || output.includes('auth') || output.includes('🔐')) {
      console.log('📝 TEST OUTPUT:', output.trim());
    }
  });
  
  testProcess.stderr.on('data', (data) => {
    const output = data.toString();
    if (output.includes('AUTH') || output.includes('LOGIN') || output.includes('auth') || output.includes('🔐')) {
      console.log('⚠️ TEST ERROR:', output.trim());
    }
  });
  
  testProcess.on('close', (code) => {
    testRunning = false;
    clearInterval(userMonitor);
    console.log(`\n✅ Test completed with code ${code}`);
    client.close();
  });
  
  // Timeout after 60 seconds
  setTimeout(() => {
    if (testRunning) {
      console.log('\n⏰ Timeout reached, stopping test...');
      testProcess.kill();
      testRunning = false;
      clearInterval(userMonitor);
      client.close();
    }
  }, 60000);
}

monitorAuth().catch(console.error);