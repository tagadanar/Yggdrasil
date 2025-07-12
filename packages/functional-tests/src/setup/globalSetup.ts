import { spawn, ChildProcess } from 'child_process';
import { promisify } from 'util';
import axios from 'axios';
import path from 'path';
import fs from 'fs';

const sleep = promisify(setTimeout);

// Store process references globally
declare global {
  var __YGGDRASIL_SERVICES__: ChildProcess[];
  var __YGGDRASIL_SETUP_DONE__: boolean;
}

/**
 * Kill any processes using the test ports (310X) to ensure clean startup
 */
async function cleanupTestPorts(): Promise<void> {
  const testPorts = [3101, 3102, 3103, 3104, 3105, 3106, 3107];
  
  console.log('🧹 Cleaning up any processes using test ports...');
  
  for (const port of testPorts) {
    try {
      const { exec } = require('child_process');
      await new Promise<void>((resolve) => {
        exec(`lsof -ti:${port} | xargs kill -9 2>/dev/null || true`, (error: any) => {
          // Ignore errors - ports may not be in use
          resolve();
        });
      });
    } catch (error) {
      // Ignore cleanup errors
    }
  }
  
  // Wait a moment for ports to be fully released
  await sleep(2000);
  console.log('✅ Port cleanup complete');
}

interface ServiceConfig {
  name: string;
  path: string;
  port: number;
  healthEndpoint: string;
  env?: Record<string, string>;
}

// Start with working services only - can be expanded as services are fixed
const SERVICES: ServiceConfig[] = [
  {
    name: 'auth-service',
    path: '../../../api-services/auth-service',
    port: 3101,
    healthEndpoint: '/health',
    env: {
      NODE_ENV: 'functional-test', // Use different env to enable server startup
      PORT: '3101',
      MONGODB_URI: 'mongodb://admin:dev_password_2024@localhost:27017/yggdrasil-test?authSource=admin',
      JWT_SECRET: 'test-secret-key-for-functional-tests',
      BCRYPT_ROUNDS: '8', // Faster for tests
      DB_TIMEOUT: '30000', // Increase timeout for tests
      MONGOOSE_BUFFER_TIMEOUT: '30000'
    }
  },
  {
    name: 'user-service',
    path: '../../../api-services/user-service',
    port: 3102,
    healthEndpoint: '/health',
    env: {
      NODE_ENV: 'functional-test', // Use different env to enable server startup
      PORT: '3102',
      MONGODB_URI: 'mongodb://admin:dev_password_2024@localhost:27017/yggdrasil-test?authSource=admin',
      JWT_SECRET: 'test-secret-key-for-functional-tests',
      DB_TIMEOUT: '30000',
      MONGOOSE_BUFFER_TIMEOUT: '30000'
    }
  },
  {
    name: 'planning-service',
    path: '../../../api-services/planning-service',
    port: 3104,
    healthEndpoint: '/health',
    env: {
      NODE_ENV: 'functional-test', // Use different env to enable server startup
      PORT: '3104',
      MONGODB_URI: 'mongodb://admin:dev_password_2024@localhost:27017/yggdrasil-test?authSource=admin',
      JWT_SECRET: 'test-secret-key-for-functional-tests',
      START_SERVER: 'true',
      DB_TIMEOUT: '30000',
      MONGOOSE_BUFFER_TIMEOUT: '30000'
    }
  },
  {
    name: 'course-service',
    path: '../../../api-services/course-service',
    port: 3103,
    healthEndpoint: '/health',
    env: {
      NODE_ENV: 'functional-test',
      PORT: '3103',
      MONGODB_URI: 'mongodb://admin:dev_password_2024@localhost:27017/yggdrasil-test?authSource=admin',
      JWT_SECRET: 'test-secret-key-for-functional-tests',
      DB_TIMEOUT: '30000',
      MONGOOSE_BUFFER_TIMEOUT: '30000'
    }
  },
  {
    name: 'news-service',
    path: '../../../api-services/news-service',
    port: 3105,
    healthEndpoint: '/health',
    env: {
      NODE_ENV: 'functional-test',
      PORT: '3105',
      MONGODB_URI: 'mongodb://admin:dev_password_2024@localhost:27017/yggdrasil-test?authSource=admin',
      JWT_SECRET: 'test-secret-key-for-functional-tests',
      DB_TIMEOUT: '30000',
      MONGOOSE_BUFFER_TIMEOUT: '30000'
    }
  },
  {
    name: 'statistics-service',
    path: '../../../api-services/statistics-service',
    port: 3106,
    healthEndpoint: '/health',
    env: {
      NODE_ENV: 'functional-test',
      PORT: '3106',
      MONGODB_URI: 'mongodb://admin:dev_password_2024@localhost:27017/yggdrasil-test?authSource=admin',
      JWT_SECRET: 'test-secret-key-for-functional-tests',
      DB_TIMEOUT: '30000',
      MONGOOSE_BUFFER_TIMEOUT: '30000'
    }
  },
  {
    name: 'notification-service',
    path: '../../../api-services/notification-service',
    port: 3107,
    healthEndpoint: '/health',
    env: {
      NODE_ENV: 'functional-test',
      PORT: '3107',
      MONGODB_URI: 'mongodb://admin:dev_password_2024@localhost:27017/yggdrasil-test?authSource=admin',
      JWT_SECRET: 'test-secret-key-for-functional-tests',
      DB_TIMEOUT: '30000',
      MONGOOSE_BUFFER_TIMEOUT: '30000'
    }
  }
];

/**
 * Check if a service is healthy
 */
async function checkServiceHealth(service: ServiceConfig): Promise<boolean> {
  try {
    const response = await axios.get(`http://localhost:${service.port}${service.healthEndpoint}`, {
      timeout: 5000
    });
    return response.status === 200;
  } catch (error) {
    return false;
  }
}

/**
 * Wait for a service to be ready
 */
async function waitForService(service: ServiceConfig, maxAttempts = 30): Promise<boolean> {
  console.log(`⏳ Waiting for ${service.name} to be ready...`);
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const isHealthy = await checkServiceHealth(service);
    
    if (isHealthy) {
      console.log(`✅ ${service.name} is ready (${attempt}/${maxAttempts})`);
      return true;
    }
    
    if (attempt === maxAttempts) {
      console.log(`❌ ${service.name} failed to start after ${maxAttempts} attempts`);
      return false;
    }
    
    await sleep(2000); // Wait 2 seconds between attempts
  }
  
  return false;
}

/**
 * Start a service process
 */
async function startService(service: ServiceConfig): Promise<ChildProcess> {
  const servicePath = path.resolve(__dirname, service.path);
  
  // Check if service directory exists
  if (!fs.existsSync(servicePath)) {
    throw new Error(`Service directory not found: ${servicePath}`);
  }
  
  console.log(`🚀 Starting ${service.name} on port ${service.port}...`);
  
  // Use ts-node directly for testing to avoid nodemon's file watching (EMFILE issue)
  const serviceProcess = spawn('npx', ['ts-node', '--files', 'src/index.ts'], {
    cwd: servicePath,
    env: { ...process.env, ...service.env },
    stdio: ['pipe', 'pipe', 'pipe'],
    detached: false
  });
  
  // Handle process output
  serviceProcess.stdout?.on('data', (data) => {
    const output = data.toString();
    if (output.includes('listening') || output.includes('ready') || output.includes('connected')) {
      console.log(`📡 ${service.name}: ${output.trim()}`);
    }
  });
  
  serviceProcess.stderr?.on('data', (data) => {
    const error = data.toString();
    if (!error.includes('DeprecationWarning')) {
      console.error(`🚨 ${service.name} error: ${error.trim()}`);
    }
  });
  
  serviceProcess.on('exit', (code) => {
    if (code !== 0) {
      console.error(`💥 ${service.name} exited with code ${code}`);
    }
  });
  
  return serviceProcess;
}

/**
 * Start all services and wait for them to be ready
 */
async function startAllServices(): Promise<ChildProcess[]> {
  const processes: ChildProcess[] = [];
  
  console.log('🌳 Starting Yggdrasil services for functional tests...');
  
  // Start all services
  for (const service of SERVICES) {
    try {
      const process = await startService(service);
      processes.push(process);
    } catch (error) {
      console.error(`❌ Failed to start ${service.name}:`, error);
      throw error;
    }
  }
  
  // Wait for all services to be ready
  console.log('⏳ Waiting for all services to be ready...');
  const healthChecks = SERVICES.map(service => waitForService(service));
  const results = await Promise.all(healthChecks);
  
  const failedServices = SERVICES.filter((_, index) => !results[index]);
  
  if (failedServices.length > 0) {
    console.error(`❌ Failed to start services: ${failedServices.map(s => s.name).join(', ')}`);
    throw new Error(`Services failed to start: ${failedServices.map(s => s.name).join(', ')}`);
  }
  
  console.log('🎉 All services are ready for functional tests!');
  return processes;
}

/**
 * Global setup function - runs once before all tests
 */
export default async function globalSetup(): Promise<void> {
  if (global.__YGGDRASIL_SETUP_DONE__) {
    console.log('✅ Services already started, skipping setup');
    return;
  }
  
  try {
    console.log('🔧 Setting up functional test environment...');
    
    // Clean up any processes using test ports first
    await cleanupTestPorts();
    
    // Start all services
    const processes = await startAllServices();
    
    // Store process references globally
    global.__YGGDRASIL_SERVICES__ = processes;
    global.__YGGDRASIL_SETUP_DONE__ = true;
    
    console.log('✅ Functional test environment setup complete!');
    
  } catch (error) {
    console.error('❌ Failed to setup functional test environment:', error);
    
    // Clean up any started processes
    if (global.__YGGDRASIL_SERVICES__) {
      console.log('🧹 Cleaning up started services...');
      global.__YGGDRASIL_SERVICES__.forEach(process => {
        if (process.pid && !process.killed) {
          process.kill('SIGTERM');
        }
      });
    }
    
    throw error;
  }
}

// Export service configurations for use in tests
export { SERVICES, ServiceConfig };