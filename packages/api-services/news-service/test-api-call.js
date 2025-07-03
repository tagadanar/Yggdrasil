// Simple test to verify the API endpoint works as expected
const http = require('http');

const testData = {
  title: 'Test Article from Script',
  content: 'This is test content to verify the API endpoint works.',
  excerpt: 'Test excerpt',
  category: 'general',
  tags: ['test', 'api'],
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

console.log('Testing news service API...');
console.log('Sending data:', JSON.stringify(testData, null, 2));

const req = http.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  console.log(`Headers:`, res.headers);

  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('Response body:', data);
    try {
      const response = JSON.parse(data);
      console.log('Parsed response:', JSON.stringify(response, null, 2));
      
      if (response.success) {
        console.log('✅ API call successful!');
      } else {
        console.log('❌ API call failed:', response.error);
      }
    } catch (e) {
      console.log('❌ Failed to parse response as JSON');
    }
  });
});

req.on('error', (e) => {
  console.log(`❌ Request error: ${e.message}`);
  console.log('This likely means the news service is not running on port 3005');
  console.log('To start it: cd packages/api-services/news-service && npm run dev');
});

req.write(postData);
req.end();