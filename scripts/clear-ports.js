#!/usr/bin/env node

const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// Ports used by Yggdrasil services
const PORTS = [3000, 3001, 3002, 3003, 3004, 3005, 3006, 3007];

async function findProcessOnPort(port) {
  try {
    // Use ss to find process using the port (more reliable than lsof)
    const { stdout } = await execAsync(`ss -tulpn | grep :${port}`);
    
    if (stdout.trim()) {
      // Parse ss output to extract PID
      // Example: tcp   LISTEN 1      511  *:3000  *:*  users:(("next-server",pid=32627,fd=22))
      const match = stdout.match(/pid=(\d+)/);
      
      if (match) {
        const pid = parseInt(match[1]);
        
        // Get process details
        const { stdout: processInfo } = await execAsync(`ps -p ${pid} -o pid,comm,args --no-headers`);
        return {
          pid: pid,
          info: processInfo.trim()
        };
      }
    }
    
    return null;
  } catch (error) {
    // Try fallback with lsof if ss fails
    try {
      const { stdout } = await execAsync(`lsof -ti:${port}`);
      const pid = stdout.trim();
      
      if (pid) {
        const { stdout: processInfo } = await execAsync(`ps -p ${pid} -o pid,comm,args --no-headers`);
        return {
          pid: parseInt(pid),
          info: processInfo.trim()
        };
      }
    } catch (lsofError) {
      // Port is not in use
    }
    
    return null;
  }
}

async function killProcess(pid, signal = 'TERM') {
  try {
    await execAsync(`kill -${signal} ${pid}`);
    return true;
  } catch (error) {
    return false;
  }
}

async function waitForProcessToEnd(pid, maxWait = 5000) {
  const startTime = Date.now();
  
  while (Date.now() - startTime < maxWait) {
    try {
      await execAsync(`ps -p ${pid}`);
      // Process still exists, wait a bit more
      await new Promise(resolve => setTimeout(resolve, 200));
    } catch (error) {
      // Process no longer exists
      return true;
    }
  }
  
  return false;
}

async function clearPort(port) {
  const process = await findProcessOnPort(port);
  
  if (!process) {
    console.log(`${colors.green}✅ Port ${port} is already free${colors.reset}`);
    return true;
  }
  
  console.log(`${colors.yellow}⚠️  Port ${port} is in use by PID ${process.pid}${colors.reset}`);
  console.log(`   ${colors.cyan}${process.info}${colors.reset}`);
  
  // Try graceful termination first
  console.log(`${colors.blue}🔄 Attempting graceful termination...${colors.reset}`);
  const gracefulKill = await killProcess(process.pid, 'TERM');
  
  if (!gracefulKill) {
    console.log(`${colors.red}❌ Failed to send TERM signal to PID ${process.pid}${colors.reset}`);
    return false;
  }
  
  // Wait for process to end gracefully
  const gracefulEnd = await waitForProcessToEnd(process.pid, 3000);
  
  if (gracefulEnd) {
    console.log(`${colors.green}✅ Port ${port} cleared gracefully${colors.reset}`);
    return true;
  }
  
  // If graceful termination didn't work, try force kill
  console.log(`${colors.yellow}⚠️  Graceful termination timed out, trying force kill...${colors.reset}`);
  const forceKill = await killProcess(process.pid, 'KILL');
  
  if (!forceKill) {
    console.log(`${colors.red}❌ Failed to force kill PID ${process.pid}${colors.reset}`);
    return false;
  }
  
  // Wait for force kill to take effect
  const forceEnd = await waitForProcessToEnd(process.pid, 2000);
  
  if (forceEnd) {
    console.log(`${colors.green}✅ Port ${port} cleared with force${colors.reset}`);
    return true;
  } else {
    console.log(`${colors.red}❌ Failed to clear port ${port}${colors.reset}`);
    return false;
  }
}

async function clearAllPorts() {
  console.log(`${colors.cyan}${colors.bright}🧹 Yggdrasil Port Cleaner${colors.reset}`);
  console.log(`${colors.blue}${'='.repeat(50)}${colors.reset}`);
  console.log(`${colors.blue}Clearing ports: ${PORTS.join(', ')}${colors.reset}\n`);
  
  const results = [];
  
  for (const port of PORTS) {
    const success = await clearPort(port);
    results.push({ port, success });
  }
  
  console.log(`\n${colors.blue}${'='.repeat(50)}${colors.reset}`);
  
  const successful = results.filter(r => r.success).length;
  const total = results.length;
  
  if (successful === total) {
    console.log(`${colors.green}${colors.bright}🎉 All ports cleared successfully! (${successful}/${total})${colors.reset}`);
    return true;
  } else {
    console.log(`${colors.red}${colors.bright}⚠️  ${successful}/${total} ports cleared successfully${colors.reset}`);
    
    const failed = results.filter(r => !r.success);
    console.log(`\n${colors.red}Failed to clear ports:${colors.reset}`);
    failed.forEach(result => {
      console.log(`  • Port ${result.port}`);
    });
    
    console.log(`\n${colors.yellow}💡 You may need to manually check these ports${colors.reset}`);
    return false;
  }
}

async function main() {
  try {
    const success = await clearAllPorts();
    process.exit(success ? 0 : 1);
  } catch (error) {
    console.error(`${colors.red}❌ Error clearing ports: ${error.message}${colors.reset}`);
    process.exit(1);
  }
}

// Only run if this script is executed directly
if (require.main === module) {
  main();
}

module.exports = { clearAllPorts, clearPort, findProcessOnPort };