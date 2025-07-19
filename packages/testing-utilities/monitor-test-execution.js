/**
 * Monitor test execution and database state in real-time
 */
const { MongoClient } = require('mongodb');
const { spawn } = require('child_process');

async function monitorTestExecution() {
  console.log('🚀 Starting test execution monitoring...');
  
  const client = new MongoClient('mongodb://localhost:27018');
  await client.connect();
  const db = client.db('yggdrasil_test_w0');
  
  let testRunning = false;
  let monitorActive = true;
  
  // Monitor database changes every 2 seconds
  const databaseMonitor = setInterval(async () => {
    if (!monitorActive) return;
    
    try {
      const users = await db.collection('w0_users').find({}).toArray();
      if (users.length > 0) {
        console.log(`\\n📊 DATABASE STATE: Found ${users.length} users in w0_users:`);
        for (const user of users.slice(0, 5)) { // Show first 5 users
          console.log(`   - ${user.email} (${user.role})`);
        }
        
        // Test authentication for the first user
        if (users.length > 0 && users[0].email.includes('test.yggdrasil.local')) {
          console.log(`🔐 LIVE TEST: Testing auth for ${users[0].email}...`);
          try {
            const response = await fetch('http://localhost:3001/api/auth/login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                email: users[0].email,
                password: 'TestPassword123!'
              })
            });
            const result = await response.json();
            console.log(`🔐 LIVE TEST: Auth result - Status: ${response.status}, Success: ${result.success}`);
          } catch (error) {
            console.log(`🔐 LIVE TEST: Auth test failed - ${error.message}`);
          }
        }
      } else {
        console.log(`📊 DATABASE STATE: No users in w0_users collection`);
      }
    } catch (error) {
      console.log(`❌ DATABASE MONITOR: Error - ${error.message}`);
    }
  }, 3000);
  
  // Start the test
  console.log('🧪 Starting Playwright test...');
  const testProcess = spawn('npm', ['run', 'test:single', '--', '--grep', 'AUTH-001: Complete JWT Security Lifecycle'], {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env, PLAYWRIGHT_WORKER_ID: '0' }
  });
  
  testProcess.stdout.on('data', (data) => {
    const output = data.toString();
    if (output.includes('Authentication failed') || output.includes('Login result')) {
      console.log(`\\n🧪 TEST EVENT: ${output.trim()}`);
    }
  });
  
  testProcess.on('close', (code) => {
    testRunning = false;
    monitorActive = false;
    clearInterval(databaseMonitor);
    console.log(`\\n✅ Test completed with code ${code}`);
    client.close();
  });
  
  // Timeout after 60 seconds
  setTimeout(() => {
    if (testRunning) {
      console.log('\\n⏰ Timeout reached, stopping test...');
      testProcess.kill();
      monitorActive = false;
      clearInterval(databaseMonitor);
      client.close();
    }
  }, 60000);
}

monitorTestExecution().catch(console.error);