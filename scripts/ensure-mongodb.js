#!/usr/bin/env node
/**
 * MongoDB Enforcement Script for Yggdrasil Development
 * 
 * This script ensures MongoDB is running and accessible before starting any services.
 * It will NOT allow fallback to in-memory storage - MongoDB must be available.
 * 
 * Features:
 * - Checks if MongoDB is running
 * - Auto-starts MongoDB via Docker if not running
 * - Validates database connection and initialization
 * - Fails fast with clear error messages if MongoDB unavailable
 * - Ensures consistent development environment
 */

const { spawn, execSync } = require('child_process');
const { MongoClient } = require('mongodb');
const path = require('path');
const fs = require('fs');

// Configuration
const CONFIG = {
  MONGO_HOST: process.env.MONGO_HOST || 'localhost',
  MONGO_PORT: process.env.MONGO_PORT || '27017',
  MONGO_USER: process.env.MONGO_USER || 'admin',
  MONGO_PASSWORD: process.env.MONGO_PASSWORD || 'dev_password_2024',
  MONGO_DATABASE: process.env.MONGO_DATABASE || 'yggdrasil-dev',
  MAX_RETRIES: 30,
  RETRY_INTERVAL: 2000, // milliseconds
  STARTUP_TIMEOUT: 60000 // milliseconds
};

// Colors for console output
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

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  error: (msg) => console.error(`${colors.red}❌ ${msg}${colors.reset}`),
  waiting: (msg) => console.log(`${colors.cyan}⏳ ${msg}${colors.reset}`),
  progress: (msg) => console.log(`${colors.magenta}🔄 ${msg}${colors.reset}`)
};

/**
 * Check if MongoDB is accessible
 */
async function checkMongoDBConnection() {
  const uri = `mongodb://${CONFIG.MONGO_USER}:${CONFIG.MONGO_PASSWORD}@${CONFIG.MONGO_HOST}:${CONFIG.MONGO_PORT}/${CONFIG.MONGO_DATABASE}?authSource=admin`;
  
  try {
    const client = new MongoClient(uri, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
      socketTimeoutMS: 5000
    });
    
    await client.connect();
    await client.db(CONFIG.MONGO_DATABASE).admin().ping();
    await client.close();
    
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Check if Docker is available
 */
function checkDockerAvailability() {
  try {
    execSync('docker --version', { stdio: 'ignore' });
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Check if docker-compose.dev.yml exists
 */
function checkDockerComposeFile() {
  const composeFile = path.join(process.cwd(), 'docker-compose.dev.yml');
  return fs.existsSync(composeFile);
}

/**
 * Start MongoDB using Docker Compose
 */
async function startMongoDBWithDocker() {
  return new Promise((resolve, reject) => {
    log.info('Starting MongoDB with Docker Compose...');
    
    const dockerCompose = spawn('docker-compose', ['-f', 'docker-compose.dev.yml', 'up', '-d', 'mongodb'], {
      stdio: 'pipe'
    });
    
    let output = '';
    let errorOutput = '';
    
    dockerCompose.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    dockerCompose.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });
    
    dockerCompose.on('close', (code) => {
      if (code === 0) {
        log.success('MongoDB Docker container started successfully');
        resolve();
      } else {
        log.error(`Docker Compose failed with code ${code}`);
        if (errorOutput) {
          console.error(errorOutput);
        }
        reject(new Error(`Docker Compose failed: ${errorOutput}`));
      }
    });
    
    dockerCompose.on('error', (error) => {
      log.error(`Failed to start Docker Compose: ${error.message}`);
      reject(error);
    });
  });
}

/**
 * Wait for MongoDB to be ready with retries
 */
async function waitForMongoDB() {
  log.waiting('Waiting for MongoDB to be ready...');
  
  for (let attempt = 1; attempt <= CONFIG.MAX_RETRIES; attempt++) {
    try {
      const isConnected = await checkMongoDBConnection();
      if (isConnected) {
        log.success(`MongoDB is ready! (attempt ${attempt}/${CONFIG.MAX_RETRIES})`);
        return true;
      }
    } catch (error) {
      // Connection failed, continue retrying
    }
    
    if (attempt < CONFIG.MAX_RETRIES) {
      log.progress(`Connection attempt ${attempt}/${CONFIG.MAX_RETRIES} failed, retrying in ${CONFIG.RETRY_INTERVAL/1000}s...`);
      await new Promise(resolve => setTimeout(resolve, CONFIG.RETRY_INTERVAL));
    }
  }
  
  return false;
}

/**
 * Get MongoDB status information
 */
async function getMongoDBStatus() {
  const uri = `mongodb://${CONFIG.MONGO_USER}:${CONFIG.MONGO_PASSWORD}@${CONFIG.MONGO_HOST}:${CONFIG.MONGO_PORT}/${CONFIG.MONGO_DATABASE}?authSource=admin`;
  
  try {
    const client = new MongoClient(uri, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
      socketTimeoutMS: 5000
    });
    
    await client.connect();
    const adminDb = client.db().admin();
    const buildInfo = await adminDb.buildInfo();
    const listDatabases = await adminDb.listDatabases();
    
    log.info(`MongoDB Status:`);
    console.log(`  📊 Version: ${buildInfo.version}`);
    console.log(`  🌐 Host: ${CONFIG.MONGO_HOST}:${CONFIG.MONGO_PORT}`);
    console.log(`  🗄️  Database: ${CONFIG.MONGO_DATABASE}`);
    console.log(`  📚 Available Databases:`);
    
    listDatabases.databases.forEach(db => {
      const sizeMB = (db.sizeOnDisk / 1024 / 1024).toFixed(2);
      console.log(`    - ${db.name} (${sizeMB} MB)`);
    });
    
    await client.close();
    return true;
  } catch (error) {
    log.error(`Failed to get MongoDB status: ${error.message}`);
    return false;
  }
}

/**
 * Main function to ensure MongoDB is available
 */
async function ensureMongoDB() {
  console.log(`${colors.bright}🌳 Yggdrasil MongoDB Enforcement${colors.reset}`);
  console.log(`${colors.bright}=====================================${colors.reset}`);
  
  // Step 1: Check if MongoDB is already running
  log.info('Checking MongoDB connection...');
  const isRunning = await checkMongoDBConnection();
  
  if (isRunning) {
    log.success('MongoDB is already running and accessible');
    await getMongoDBStatus();
    console.log(`${colors.green}🚀 MongoDB is ready for development!${colors.reset}`);
    return;
  }
  
  // Step 2: MongoDB not running, try to start it
  log.warning('MongoDB is not accessible, attempting to start...');
  
  // Check prerequisites
  if (!checkDockerAvailability()) {
    log.error('Docker is not available!');
    log.error('Please install Docker to run MongoDB for development');
    log.error('Visit: https://docs.docker.com/get-docker/');
    process.exit(1);
  }
  
  if (!checkDockerComposeFile()) {
    log.error('docker-compose.dev.yml not found!');
    log.error('Please ensure you are in the project root directory');
    process.exit(1);
  }
  
  // Step 3: Start MongoDB with Docker
  try {
    await startMongoDBWithDocker();
    
    // Wait for MongoDB to be ready
    const isReady = await waitForMongoDB();
    
    if (!isReady) {
      log.error('MongoDB failed to start within the timeout period');
      log.error('Please check Docker logs: docker-compose -f docker-compose.dev.yml logs mongodb');
      process.exit(1);
    }
    
    // Step 4: Verify and display status
    await getMongoDBStatus();
    console.log(`${colors.green}🎉 MongoDB started successfully and is ready for development!${colors.reset}`);
    
  } catch (error) {
    log.error(`Failed to start MongoDB: ${error.message}`);
    log.error('Manual steps to resolve:');
    log.error('1. Check Docker is running: docker ps');
    log.error('2. Try manual start: docker-compose -f docker-compose.dev.yml up -d mongodb');
    log.error('3. Check logs: docker-compose -f docker-compose.dev.yml logs mongodb');
    process.exit(1);
  }
}

/**
 * Handle script interruption
 */
process.on('SIGINT', () => {
  log.warning('MongoDB enforcement interrupted');
  process.exit(1);
});

process.on('SIGTERM', () => {
  log.warning('MongoDB enforcement terminated');
  process.exit(1);
});

// Run the script
if (require.main === module) {
  ensureMongoDB().catch(error => {
    log.error(`Unexpected error: ${error.message}`);
    process.exit(1);
  });
}

module.exports = { ensureMongoDB, checkMongoDBConnection };