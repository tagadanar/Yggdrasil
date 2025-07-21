#!/usr/bin/env node

/**
 * Demo User Cleanup Utility
 * 
 * This script cleans up demo users (@yggdrasil.edu) from test databases
 * to reset the state for authentication testing.
 * 
 * Usage:
 *   node scripts/cleanup-demo-users.js [--workers=1] [--dry-run]
 * 
 * Options:
 *   --workers=N    Number of workers to clean (default: 1)
 *   --dry-run      Show what would be deleted without actually deleting
 *   --force        Skip confirmation prompt
 */

const { MongoClient } = require('mongodb');

const DEMO_EMAILS = [
  'admin@yggdrasil.edu',
  'teacher@yggdrasil.edu', 
  'staff@yggdrasil.edu',
  'student@yggdrasil.edu'
];

const DEFAULT_MONGO_URI = 'mongodb://localhost:27018';

class DemoUserCleanup {
  constructor(options = {}) {
    this.workerCount = options.workers || 1;
    this.dryRun = options.dryRun || false;
    this.force = options.force || false;
    this.mongoUri = options.mongoUri || DEFAULT_MONGO_URI;
    this.client = null;
  }

  async connect() {
    console.log(`🔌 Connecting to MongoDB: ${this.mongoUri}`);
    this.client = new MongoClient(this.mongoUri);
    await this.client.connect();
    console.log('✅ Connected to MongoDB');
  }

  async disconnect() {
    if (this.client) {
      await this.client.close();
      console.log('🔌 Disconnected from MongoDB');
    }
  }

  async getDemoUsers(workerId) {
    const dbName = `yggdrasil_test_w${workerId}`;
    const collectionName = `w${workerId}_users`;
    
    console.log(`🔍 Checking Worker ${workerId}: ${dbName}.${collectionName}`);
    
    try {
      const db = this.client.db(dbName);
      const collection = db.collection(collectionName);
      
      // Check if collection exists
      const collections = await db.listCollections({ name: collectionName }).toArray();
      if (collections.length === 0) {
        console.log(`   ⚠️  Collection ${collectionName} does not exist`);
        return [];
      }
      
      // Find demo users
      const demoUsers = await collection.find({
        email: { $in: DEMO_EMAILS }
      }).toArray();
      
      console.log(`   📊 Found ${demoUsers.length} demo users`);
      
      return demoUsers.map(user => ({
        workerId,
        dbName,
        collectionName,
        user: {
          _id: user._id,
          email: user.email,
          role: user.role,
          createdAt: user.createdAt
        }
      }));
      
    } catch (error) {
      console.warn(`   ⚠️  Error checking Worker ${workerId}:`, error.message);
      return [];
    }
  }

  async getAllDemoUsers() {
    console.log(`🔍 Scanning ${this.workerCount} workers for demo users...`);
    
    const allDemoUsers = [];
    
    for (let workerId = 0; workerId < this.workerCount; workerId++) {
      const workerDemoUsers = await this.getDemoUsers(workerId);
      allDemoUsers.push(...workerDemoUsers);
    }
    
    return allDemoUsers;
  }

  async deleteDemoUsers(demoUsers) {
    if (this.dryRun) {
      console.log('🧪 DRY RUN: Would delete the following demo users:');
      for (const entry of demoUsers) {
        console.log(`   🗑️  ${entry.user.email} (${entry.user.role}) from ${entry.dbName}.${entry.collectionName}`);
      }
      return;
    }

    console.log(`🗑️  Deleting ${demoUsers.length} demo users...`);
    
    let deletedCount = 0;
    let errorCount = 0;
    
    for (const entry of demoUsers) {
      try {
        const db = this.client.db(entry.dbName);
        const collection = db.collection(entry.collectionName);
        
        const result = await collection.deleteOne({ _id: entry.user._id });
        
        if (result.deletedCount > 0) {
          console.log(`   ✅ Deleted ${entry.user.email} from Worker ${entry.workerId}`);
          deletedCount++;
        } else {
          console.warn(`   ⚠️  ${entry.user.email} not found in Worker ${entry.workerId}`);
        }
      } catch (error) {
        console.error(`   ❌ Failed to delete ${entry.user.email} from Worker ${entry.workerId}:`, error.message);
        errorCount++;
      }
    }
    
    console.log(`📊 Cleanup Summary:`);
    console.log(`   ✅ Deleted: ${deletedCount} demo users`);
    console.log(`   ❌ Errors: ${errorCount} demo users`);
  }

  async confirmDeletion(demoUsers) {
    if (this.force || this.dryRun) {
      return true;
    }

    console.log(`\n⚠️  You are about to delete ${demoUsers.length} demo users:`);
    
    // Group by worker for display
    const byWorker = {};
    for (const entry of demoUsers) {
      if (!byWorker[entry.workerId]) {
        byWorker[entry.workerId] = [];
      }
      byWorker[entry.workerId].push(entry.user);
    }
    
    for (const [workerId, users] of Object.entries(byWorker)) {
      console.log(`   Worker ${workerId}: ${users.map(u => u.email).join(', ')}`);
    }

    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    return new Promise((resolve) => {
      rl.question('\nAre you sure you want to proceed? (y/N): ', (answer) => {
        rl.close();
        resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
      });
    });
  }

  async run() {
    try {
      await this.connect();
      
      const demoUsers = await this.getAllDemoUsers();
      
      if (demoUsers.length === 0) {
        console.log('✅ No demo users found. Nothing to clean up.');
        return;
      }
      
      console.log(`\n📋 Found ${demoUsers.length} demo users across ${this.workerCount} workers`);
      
      const confirmed = await this.confirmDeletion(demoUsers);
      
      if (!confirmed) {
        console.log('❌ Cleanup cancelled by user');
        return;
      }
      
      await this.deleteDemoUsers(demoUsers);
      
      if (!this.dryRun) {
        console.log('\n✅ Demo user cleanup completed!');
        console.log('🔄 Demo users will be recreated automatically during next test run');
      }
      
    } catch (error) {
      console.error('❌ Cleanup failed:', error);
      process.exit(1);
    } finally {
      await this.disconnect();
    }
  }
}

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {};
  
  for (const arg of args) {
    if (arg.startsWith('--workers=')) {
      options.workers = parseInt(arg.split('=')[1]);
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--force') {
      options.force = true;
    } else if (arg === '--help' || arg === '-h') {
      console.log(`
Demo User Cleanup Utility

Usage: node scripts/cleanup-demo-users.js [options]

Options:
  --workers=N    Number of workers to clean (default: 1)
  --dry-run      Show what would be deleted without actually deleting
  --force        Skip confirmation prompt
  --help, -h     Show this help message

Examples:
  node scripts/cleanup-demo-users.js                    # Interactive cleanup of 1 worker
  node scripts/cleanup-demo-users.js --dry-run          # Show what would be deleted
  node scripts/cleanup-demo-users.js --workers=1        # Clean single worker
  node scripts/cleanup-demo-users.js --force            # Skip confirmation
`);
      process.exit(0);
    }
  }
  
  return options;
}

// Main execution
if (require.main === module) {
  const options = parseArgs();
  const cleanup = new DemoUserCleanup(options);
  
  console.log('🧹 Demo User Cleanup Utility');
  console.log('=============================\n');
  
  cleanup.run().catch((error) => {
    console.error('💥 Unexpected error:', error);
    process.exit(1);
  });
}

module.exports = DemoUserCleanup;