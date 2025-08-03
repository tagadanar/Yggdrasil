#!/usr/bin/env node

/**
 * Service Coordinator - Manages service state and coordinates between health monitor and test execution
 * 
 * This singleton class provides:
 * - Shared state management for service health
 * - Coordination between health monitor and test runner
 * - Restart synchronization and completion tracking
 * - Test execution control during service recovery
 */

const fs = require('fs');
const path = require('path');
const EventEmitter = require('events');

// State file for inter-process communication
const STATE_FILE = path.join(__dirname, '.service-coordinator-state.json');

class ServiceCoordinator extends EventEmitter {
  constructor() {
    super();
    this.state = {
      servicesHealthy: true,
      restartInProgress: false,
      lastRestartTime: null,
      unhealthyServices: [],
      testsPaused: false,
      restartCount: 0,
      lastHealthCheck: null
    };
    
    // Load existing state if available
    this.loadState();
    
    // Auto-save state on changes
    this.on('stateChanged', () => this.saveState());
    
    // Increase max listeners for multiple test processes
    this.setMaxListeners(100);
  }
  
  /**
   * Load state from file for IPC
   */
  loadState() {
    try {
      if (fs.existsSync(STATE_FILE)) {
        const data = fs.readFileSync(STATE_FILE, 'utf8');
        this.state = JSON.parse(data);
      }
    } catch (error) {
      console.warn('⚠️ Could not load coordinator state:', error.message);
    }
  }
  
  /**
   * Save state to file for IPC
   */
  saveState() {
    try {
      fs.writeFileSync(STATE_FILE, JSON.stringify(this.state, null, 2));
    } catch (error) {
      console.error('❌ Could not save coordinator state:', error.message);
    }
  }
  
  /**
   * Check if services are healthy and tests can proceed
   */
  canRunTests() {
    // Reload state to get latest from other processes
    this.loadState();
    
    // Be more lenient - allow tests if restart failed but some services are healthy
    if (this.state.restartInProgress || this.state.testsPaused) {
      return false;
    }
    
    // If we recently had a failed restart, still allow tests if some services are healthy
    if (!this.state.servicesHealthy && this.state.restartCount > 0) {
      // Allow tests if we have fewer than 3 unhealthy services (majority working)
      return this.state.unhealthyServices.length <= 3;
    }
    
    return this.state.servicesHealthy;
  }
  
  /**
   * Wait for services to be ready for testing
   */
  async waitForServices(timeout = 90000) {  // Increased from 60s to 90s
    const startTime = Date.now();
    
    console.log('⏳ SERVICE COORDINATOR: Waiting for services to be ready...');
    
    while (Date.now() - startTime < timeout) {
      this.loadState();
      
      if (this.canRunTests()) {
        console.log('✅ SERVICE COORDINATOR: Services ready for testing');
        return true;
      }
      
      if (this.state.restartInProgress) {
        const elapsed = Math.round((Date.now() - startTime) / 1000);
        console.log(`🔄 SERVICE COORDINATOR: Service restart #${this.state.restartCount} in progress (${elapsed}s elapsed)`);
        
        // If restart is taking too long, warn but continue waiting
        if (elapsed > 60) {
          console.log(`⚠️ SERVICE COORDINATOR: Restart taking longer than expected...`);
        }
      } else if (!this.state.servicesHealthy) {
        console.log(`⚠️ SERVICE COORDINATOR: Services unhealthy: ${this.state.unhealthyServices.join(', ')}`);
      }
      
      // Wait before checking again
      await new Promise(resolve => setTimeout(resolve, 3000)); // Increased from 2s to 3s
    }
    
    console.error(`❌ SERVICE COORDINATOR: Timeout waiting for services after ${timeout}ms`);
    return false;
  }
  
  /**
   * Mark services as unhealthy
   */
  markUnhealthy(services) {
    this.state.servicesHealthy = false;
    this.state.unhealthyServices = services;
    this.state.lastHealthCheck = new Date().toISOString();
    this.emit('stateChanged');
    console.log(`🚨 SERVICE COORDINATOR: Marked services as unhealthy: ${services.join(', ')}`);
  }
  
  /**
   * Mark all services as healthy
   */
  markHealthy() {
    this.state.servicesHealthy = true;
    this.state.unhealthyServices = [];
    this.state.lastHealthCheck = new Date().toISOString();
    this.emit('stateChanged');
    console.log('✅ SERVICE COORDINATOR: All services marked as healthy');
  }
  
  /**
   * Start service restart process
   */
  startRestart() {
    if (this.state.restartInProgress) {
      console.log('⚠️ SERVICE COORDINATOR: Restart already in progress, skipping');
      return false;
    }
    
    this.state.restartInProgress = true;
    this.state.testsPaused = true;
    this.state.lastRestartTime = new Date().toISOString();
    this.state.restartCount++;
    this.emit('stateChanged');
    
    console.log(`🔄 SERVICE COORDINATOR: Starting service restart #${this.state.restartCount}`);
    return true;
  }
  
  /**
   * Complete service restart process
   */
  completeRestart(success = true) {
    this.state.restartInProgress = false;
    this.state.testsPaused = false;
    
    if (success) {
      this.state.servicesHealthy = true;
      this.state.unhealthyServices = [];
      console.log(`✅ SERVICE COORDINATOR: Service restart #${this.state.restartCount} completed successfully`);
    } else {
      console.error(`❌ SERVICE COORDINATOR: Service restart #${this.state.restartCount} failed`);
    }
    
    this.emit('stateChanged');
  }
  
  /**
   * Pause test execution
   */
  pauseTests(reason) {
    this.state.testsPaused = true;
    this.emit('stateChanged');
    console.log(`⏸️ SERVICE COORDINATOR: Tests paused - ${reason}`);
  }
  
  /**
   * Resume test execution
   */
  resumeTests() {
    this.state.testsPaused = false;
    this.emit('stateChanged');
    console.log('▶️ SERVICE COORDINATOR: Tests resumed');
  }
  
  /**
   * Get current coordinator state
   */
  getState() {
    this.loadState(); // Always get fresh state
    return { ...this.state };
  }
  
  /**
   * Reset coordinator state (for testing)
   */
  reset() {
    this.state = {
      servicesHealthy: true,
      restartInProgress: false,
      lastRestartTime: null,
      unhealthyServices: [],
      testsPaused: false,
      restartCount: 0,
      lastHealthCheck: null
    };
    this.saveState();
    console.log('🔄 SERVICE COORDINATOR: State reset');
  }
  
  /**
   * Cleanup coordinator resources
   */
  cleanup() {
    try {
      if (fs.existsSync(STATE_FILE)) {
        fs.unlinkSync(STATE_FILE);
      }
    } catch (error) {
      console.warn('⚠️ Could not cleanup coordinator state file:', error.message);
    }
  }
}

// Singleton instance
let instance = null;

function getInstance() {
  if (!instance) {
    instance = new ServiceCoordinator();
  }
  return instance;
}

// Export singleton getter
module.exports = {
  getInstance,
  ServiceCoordinator
};

// CLI interface for testing
if (require.main === module) {
  const coordinator = getInstance();
  const command = process.argv[2];
  
  switch (command) {
    case 'status':
      console.log('📊 SERVICE COORDINATOR STATUS:');
      console.log(JSON.stringify(coordinator.getState(), null, 2));
      break;
      
    case 'reset':
      coordinator.reset();
      console.log('✅ Coordinator state reset');
      break;
      
    case 'pause':
      coordinator.pauseTests('Manual pause via CLI');
      console.log('⏸️ Tests paused');
      break;
      
    case 'resume':
      coordinator.resumeTests();
      console.log('▶️ Tests resumed');
      break;
      
    case 'cleanup':
      coordinator.cleanup();
      console.log('🧹 Coordinator cleaned up');
      break;
      
    default:
      console.log('Usage: node service-coordinator.js [status|reset|pause|resume|cleanup]');
      process.exit(1);
  }
}