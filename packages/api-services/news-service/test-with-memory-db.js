// Test script that starts in-memory MongoDB and tests the API
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const http = require('http');

async function runTest() {
  console.log('Starting in-memory MongoDB...');
  
  // Start in-memory MongoDB
  const mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  console.log('MongoDB URI:', uri);

  // Connect mongoose
  await mongoose.connect(uri);
  console.log('Connected to in-memory MongoDB');

  // Set environment variable for the service
  process.env.MONGODB_URI = uri;
  process.env.PORT = 3005;

  // Start the news service
  console.log('Starting news service...');
  const app = require('./dist/index.js').default;
  
  // Wait a bit for the service to start
  setTimeout(() => {
    console.log('Testing API call...');
    testAPICall();
  }, 1000);

  async function testAPICall() {
    const testData = {
      title: 'Test Article with Memory DB',
      content: 'This tests the full flow with an in-memory database.',
      excerpt: 'Memory DB test',
      category: 'general',
      tags: ['test', 'memory-db'],
      isPublished: true,
      isPinned: false
    };

    const postData = JSON.stringify(testData);

    const options = {
      hostname: 'localhost',
      port: 3005,
      path: '/api/news',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      console.log(`✅ Status: ${res.statusCode}`);

      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', async () => {
        console.log('Response:', data);
        try {
          const response = JSON.parse(data);
          
          if (response.success) {
            console.log('🎉 SUCCESS! Article created:', response.data.title);
            console.log('Article ID:', response.data._id);
            console.log('Status:', response.data.status);
          } else {
            console.log('❌ FAILED:', response.error);
          }
        } catch (e) {
          console.log('❌ Failed to parse response');
        }

        // Cleanup
        await mongoose.disconnect();
        await mongod.stop();
        process.exit(0);
      });
    });

    req.on('error', (e) => {
      console.log(`❌ Request error: ${e.message}`);
    });

    req.write(postData);
    req.end();
  }
}

runTest().catch(console.error);