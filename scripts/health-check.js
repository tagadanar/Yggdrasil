#!/usr/bin/env node

const http = require('http');
const https = require('https');

const services = [
  { name: 'Frontend', url: 'http://localhost:3000', path: '/' },
  { name: 'Auth Service', url: 'http://localhost:3001', path: '/health' },
  { name: 'Course Service', url: 'http://localhost:3003', path: '/health' },
  { name: 'Planning Service', url: 'http://localhost:3004', path: '/health' },
  { name: 'News Service', url: 'http://localhost:3005', path: '/health' },
  { name: 'Statistics Service', url: 'http://localhost:3006', path: '/health' },
  { name: 'Notification Service', url: 'http://localhost:3007', path: '/health' }
];

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const client = urlObj.protocol === 'https:' ? https : http;
    
    const req = client.get(url, { timeout: 5000 }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          data: data,
          headers: res.headers
        });
      });
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.setTimeout(5000);
  });
}

async function checkService(service) {
  const fullUrl = service.url + service.path;
  
  try {
    const response = await makeRequest(fullUrl);
    
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return {
        ...service,
        status: 'healthy',
        statusCode: response.statusCode,
        responseTime: Date.now()
      };
    } else {
      return {
        ...service,
        status: 'unhealthy',
        statusCode: response.statusCode,
        error: `HTTP ${response.statusCode}`
      };
    }
  } catch (error) {
    return {
      ...service,
      status: 'down',
      error: error.message
    };
  }
}

async function runHealthChecks() {
  console.log(`${colors.cyan}${colors.bright}🏥 Yggdrasil Services Health Check${colors.reset}`);
  console.log(`${colors.blue}${'='.repeat(60)}${colors.reset}\n`);

  const results = [];
  
  for (const service of services) {
    process.stdout.write(`${colors.yellow}⏳ Checking ${service.name}...${colors.reset}`);
    
    const startTime = Date.now();
    const result = await checkService(service);
    const responseTime = Date.now() - startTime;
    
    result.responseTime = responseTime;
    results.push(result);

    // Clear the line and print result
    process.stdout.write('\r\x1b[K'); // Clear line
    
    if (result.status === 'healthy') {
      console.log(`${colors.green}✅ ${service.name.padEnd(20)} - Healthy (${responseTime}ms)${colors.reset}`);
    } else if (result.status === 'unhealthy') {
      console.log(`${colors.yellow}⚠️  ${service.name.padEnd(20)} - Unhealthy (${result.error})${colors.reset}`);
    } else {
      console.log(`${colors.red}❌ ${service.name.padEnd(20)} - Down (${result.error})${colors.reset}`);
    }
  }

  // Summary
  const healthy = results.filter(r => r.status === 'healthy').length;
  const total = results.length;
  
  console.log(`\n${colors.blue}${'='.repeat(60)}${colors.reset}`);
  
  if (healthy === total) {
    console.log(`${colors.green}${colors.bright}🎉 All services are healthy! (${healthy}/${total})${colors.reset}`);
    process.exit(0);
  } else {
    console.log(`${colors.red}${colors.bright}⚠️  ${healthy}/${total} services are healthy${colors.reset}`);
    
    const failed = results.filter(r => r.status !== 'healthy');
    console.log(`\n${colors.red}Failed services:${colors.reset}`);
    failed.forEach(service => {
      console.log(`  • ${service.name}: ${service.error || 'Unknown error'}`);
    });
    
    console.log(`\n${colors.yellow}💡 Make sure all services are running with: npm run dev${colors.reset}`);
    process.exit(1);
  }
}

// Handle command line arguments
const args = process.argv.slice(2);
const isWatch = args.includes('--watch') || args.includes('-w');
const interval = parseInt(args.find(arg => arg.startsWith('--interval='))?.split('=')[1]) || 30;

if (isWatch) {
  console.log(`${colors.magenta}🔄 Running health checks every ${interval} seconds (Ctrl+C to stop)${colors.reset}\n`);
  
  const runChecks = async () => {
    await runHealthChecks();
    setTimeout(runChecks, interval * 1000);
  };
  
  runChecks();
} else {
  runHealthChecks();
}