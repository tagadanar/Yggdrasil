// Service health monitoring script
const fetch = require('node-fetch');

const services = [
  { name: 'frontend', port: 3000, path: '/' },
  { name: 'auth', port: 3001, path: '/health' },
  { name: 'user', port: 3002, path: '/health' },
  { name: 'news', port: 3003, path: '/health' },
  { name: 'course', port: 3004, path: '/health' },
  { name: 'planning', port: 3005, path: '/health' },
  { name: 'statistics', port: 3006, path: '/health' },
];

async function checkServiceHealth() {
  console.log(`🏥 SERVICE HEALTH CHECK - ${new Date().toISOString()}`);
  console.log('=' .repeat(80));
  
  for (const service of services) {
    try {
      const start = Date.now();
      const response = await Promise.race([
        fetch(`http://localhost:${service.port}${service.path}`, {
          timeout: 10000,
          headers: { 'Accept': 'application/json' }
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 10000)
        )
      ]);
      
      const responseTime = Date.now() - start;
      const status = response.status;
      const statusText = response.statusText;
      
      if (response.ok) {
        if (responseTime < 1000) {
          console.log(`✅ ${service.name.padEnd(12)} (${service.port}): ${status} ${statusText} (${responseTime}ms)`);
        } else if (responseTime < 5000) {
          console.log(`⚠️  ${service.name.padEnd(12)} (${service.port}): ${status} ${statusText} (${responseTime}ms) - SLOW`);
        } else {
          console.log(`🚨 ${service.name.padEnd(12)} (${service.port}): ${status} ${statusText} (${responseTime}ms) - VERY SLOW`);
        }
      } else {
        console.log(`❌ ${service.name.padEnd(12)} (${service.port}): ${status} ${statusText} (${responseTime}ms) - ERROR`);
      }
      
    } catch (error) {
      console.log(`💥 ${service.name.padEnd(12)} (${service.port}): ${error.message} - UNREACHABLE`);
    }
  }
  
  // Check system resources
  const memory = process.memoryUsage();
  console.log('');
  console.log('💾 SYSTEM RESOURCES:');
  console.log(`   Heap Used: ${Math.round(memory.heapUsed / 1024 / 1024)}MB`);
  console.log(`   Heap Total: ${Math.round(memory.heapTotal / 1024 / 1024)}MB`);
  console.log(`   External: ${Math.round(memory.external / 1024 / 1024)}MB`);
  console.log(`   RSS: ${Math.round(memory.rss / 1024 / 1024)}MB`);
  
  console.log('=' .repeat(80));
}

// Run health check
checkServiceHealth().catch(console.error);