#!/usr/bin/env node

/**
 * Kill All Services Script
 * Comprehensive cleanup of all test services and processes
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🧹 Starting comprehensive service cleanup...');

// Kill all ts-node-dev processes
console.log('\n1️⃣ Killing all ts-node-dev processes...');
try {
  execSync('pkill -f "ts-node-dev.*src/index.ts" || true', { stdio: 'inherit' });
  console.log('✅ ts-node-dev processes killed');
} catch (error) {
  console.log('⚠️ No ts-node-dev processes found or error killing them');
}

// Kill all Next.js dev servers
console.log('\n2️⃣ Killing all Next.js dev servers...');
try {
  execSync('pkill -f "next dev" || true', { stdio: 'inherit' });
  console.log('✅ Next.js processes killed');
} catch (error) {
  console.log('⚠️ No Next.js processes found or error killing them');
}

// Kill processes on single worker test ports
console.log('\n3️⃣ Killing processes on single worker test ports...');
const worker = 0;
const basePort = 3000 + (worker * 10);
for (let offset = 0; offset <= 6; offset++) {
  const port = basePort + offset;
  try {
    const pid = execSync(`lsof -t -i:${port} || true`, { encoding: 'utf8' }).trim();
    if (pid) {
      execSync(`kill -9 ${pid}`, { stdio: 'inherit' });
      console.log(`✅ Killed process on port ${port} (PID: ${pid})`);
    }
  } catch (error) {
    // Port is free, nothing to do
  }
}

// Clean up lock files
console.log('\n4️⃣ Cleaning up lock files...');
const lockFiles = [
  '.service-manager.lock',
  '.service-manager.pids',
  '.service-manager-worker-0.lock',
  '.service-manager-worker-0.pids',
  '.service-manager-worker-1.lock',
  '.service-manager-worker-1.pids',
  '.service-manager-worker-2.lock',
  '.service-manager-worker-2.pids',
  '.service-manager-worker-3.lock',
  '.service-manager-worker-3.pids'
];

lockFiles.forEach(file => {
  const filePath = path.join(process.cwd(), file);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    console.log(`✅ Removed ${file}`);
  }
});

// Clean up test artifacts
console.log('\n5️⃣ Cleaning up test artifacts...');
try {
  execSync('rm -rf test-results test-results-enhanced playwright-report .playwright-cache', { stdio: 'inherit' });
  console.log('✅ Test artifacts cleaned');
} catch (error) {
  console.log('⚠️ Error cleaning test artifacts');
}

// Kill any remaining node processes related to the project
console.log('\n6️⃣ Killing any remaining project node processes...');
try {
  execSync('pkill -f "@yggdrasil" || true', { stdio: 'inherit' });
  console.log('✅ Remaining project processes killed');
} catch (error) {
  console.log('⚠️ No remaining processes found');
}

// Final check
console.log('\n7️⃣ Final process check...');
const nodeProcessCount = execSync('ps aux | grep node | grep -E "(service-manager|ts-node)" | wc -l', { encoding: 'utf8' }).trim();
console.log(`📊 Remaining node processes: ${nodeProcessCount}`);

if (parseInt(nodeProcessCount) > 2) { // Allow for the grep process itself
  console.warn('⚠️ Warning: There are still some node processes running');
  console.log('\nRemaining processes:');
  execSync('ps aux | grep node | grep -E "(service-manager|ts-node)" | grep -v grep', { stdio: 'inherit' });
} else {
  console.log('\n✅ All services and processes cleaned successfully!');
}

console.log('\n🎉 Cleanup complete! You can now run tests with a clean environment.');
