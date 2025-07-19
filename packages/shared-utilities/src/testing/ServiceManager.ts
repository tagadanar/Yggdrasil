// packages/shared-utilities/src/testing/ServiceManager.ts
// Centralized service management for all test infrastructure

import { spawn, ChildProcess, execSync } from 'child_process';
import { promisify } from 'util';
import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import { WorkerConfigManager, WorkerConfig } from './WorkerConfig';

const sleep = promisify(setTimeout);

export interface ServiceInfo {
  name: string;
  port: number;
  healthPath: string;
  command: string[];
  cwd: string;
  process?: ChildProcess;
}

export interface ServiceManagerOptions {
  workerId?: number;
  maxWaitTime?: number;
  checkInterval?: number;
  logLevel?: 'verbose' | 'normal' | 'quiet';
}

export class ServiceManager {
  private workerConfig: WorkerConfig;
  private services: ServiceInfo[];
  private processes: ChildProcess[] = [];
  private isShuttingDown = false;
  private lockFile: string;
  private pidFile: string;
  private options: Required<ServiceManagerOptions>;

  constructor(options: ServiceManagerOptions = {}) {
    this.workerConfig = WorkerConfigManager.generateWorkerConfig(
      options.workerId ?? WorkerConfigManager.detectWorkerId()
    );
    
    this.options = {
      workerId: this.workerConfig.workerId,
      maxWaitTime: options.maxWaitTime ?? 120000, // 2 minutes
      checkInterval: options.checkInterval ?? 2000, // 2 seconds
      logLevel: options.logLevel ?? 'normal'
    };

    this.lockFile = path.join(process.cwd(), `.service-manager-worker-${this.workerConfig.workerId}.lock`);
    this.pidFile = path.join(process.cwd(), `.service-manager-worker-${this.workerConfig.workerId}.pids`);

    // Define services with their configuration
    this.services = [
      {
        name: 'Frontend',
        port: this.workerConfig.ports.frontend,
        healthPath: '/', // Frontend doesn't have /health endpoint
        command: ['npm', 'run', 'dev'],
        cwd: this.getServicePath('frontend')
      },
      {
        name: 'Auth Service',
        port: this.workerConfig.ports.auth,
        healthPath: '/health',
        command: ['npm', 'run', 'dev'],
        cwd: this.getServicePath('auth-service')
      },
      {
        name: 'User Service',
        port: this.workerConfig.ports.user,
        healthPath: '/health',
        command: ['npm', 'run', 'dev'],
        cwd: this.getServicePath('user-service')
      },
      {
        name: 'News Service',
        port: this.workerConfig.ports.news,
        healthPath: '/health',
        command: ['npm', 'run', 'dev'],
        cwd: this.getServicePath('news-service')
      },
      {
        name: 'Course Service',
        port: this.workerConfig.ports.course,
        healthPath: '/health',
        command: ['npm', 'run', 'dev'],
        cwd: this.getServicePath('course-service')
      },
      {
        name: 'Planning Service',
        port: this.workerConfig.ports.planning,
        healthPath: '/health',
        command: ['npm', 'run', 'dev'],
        cwd: this.getServicePath('planning-service')
      },
      {
        name: 'Statistics Service',
        port: this.workerConfig.ports.statistics,
        healthPath: '/health',
        command: ['npm', 'run', 'dev'],
        cwd: this.getServicePath('statistics-service')
      }
    ];

    this.log(`🔧 SERVICE MANAGER: Initialized for Worker ${this.workerConfig.workerId}`);
    this.log(`🔧 SERVICE MANAGER: Ports ${this.workerConfig.basePort}-${this.workerConfig.basePort + 6}`);
  }

  private log(message: string, level: 'verbose' | 'normal' | 'error' = 'normal'): void {
    if (level === 'error' || this.options.logLevel === 'verbose' || 
        (this.options.logLevel === 'normal' && level === 'normal')) {
      console.log(message);
    }
  }

  private getServicePath(serviceName: string): string {
    const rootDir = path.join(__dirname, '../../../..');
    if (serviceName === 'frontend') {
      return path.join(rootDir, 'packages/frontend');
    }
    return path.join(rootDir, `packages/api-services/${serviceName}`);
  }

  /**
   * Check if a service is healthy
   */
  async checkServiceHealth(service: ServiceInfo): Promise<boolean> {
    try {
      const url = `http://localhost:${service.port}${service.healthPath}`;
      const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Check if port is in use
   */
  async isPortInUse(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const req = http.get(`http://localhost:${port}`, { timeout: 1000 }, () => {
        resolve(true);
      });
      req.on('error', () => resolve(false));
      req.on('timeout', () => {
        req.destroy();
        resolve(false);
      });
    });
  }

  /**
   * Kill processes using specific ports
   */
  async killPortProcesses(ports: number[]): Promise<void> {
    this.log(`🧹 Cleaning ports: ${ports.join(', ')}`);
    
    try {
      // Kill processes using lsof
      const command = `lsof -ti:${ports.join(',')} | xargs -r kill -9 2>/dev/null || true`;
      execSync(command, { stdio: 'ignore' });
      
      // Additional cleanup for Node.js processes
      try {
        execSync('pkill -f "next-server" 2>/dev/null || true', { stdio: 'ignore' });
        execSync('pkill -f "ts-node-dev.*src/index.ts" 2>/dev/null || true', { stdio: 'ignore' });
      } catch (e) {
        // Ignore errors - processes might not exist
      }
      
      // Wait for processes to die
      await sleep(1000);
      
    } catch (error) {
      this.log('⚠️ Port cleanup completed (some ports may have been free)', 'verbose');
    }
  }

  /**
   * Ensure only one service manager instance is running per worker
   */
  async ensureSingleInstance(): Promise<void> {
    if (fs.existsSync(this.lockFile)) {
      const lockContent = fs.readFileSync(this.lockFile, 'utf8');
      const lockPid = parseInt(lockContent.trim());
      
      try {
        // Check if process is still running
        process.kill(lockPid, 0);
        this.log(`⚠️ Another service manager is running (PID: ${lockPid})`);
        this.log('🔄 Killing existing instance and starting fresh...');
        
        // Kill existing instance
        try {
          process.kill(lockPid, 'SIGTERM');
          await sleep(2000);
          process.kill(lockPid, 'SIGKILL');
        } catch (e) {
          // Process might already be dead
        }
        
        // Clean up lock file
        if (fs.existsSync(this.lockFile)) {
          fs.unlinkSync(this.lockFile);
        }
      } catch (e) {
        // Process doesn't exist, remove stale lock file
        if (fs.existsSync(this.lockFile)) {
          fs.unlinkSync(this.lockFile);
        }
      }
    }

    // Create new lock file
    fs.writeFileSync(this.lockFile, process.pid.toString());
    
    // Setup cleanup on process exit
    const cleanup = () => {
      if (fs.existsSync(this.lockFile)) {
        fs.unlinkSync(this.lockFile);
      }
      if (fs.existsSync(this.pidFile)) {
        fs.unlinkSync(this.pidFile);
      }
    };

    process.on('exit', cleanup);
    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
  }

  /**
   * Start all services for this worker
   */
  async startServices(): Promise<boolean> {
    await this.ensureSingleInstance();
    
    // Clean ports first
    const ports = this.services.map(s => s.port);
    await this.killPortProcesses(ports);
    
    this.log(`🚀 Worker ${this.workerConfig.workerId}: Starting services...`);
    
    // Start each service
    for (const service of this.services) {
      await this.startService(service);
    }
    
    // Store PIDs
    const pids = this.processes.map(p => p.pid).filter(Boolean);
    if (pids.length > 0) {
      fs.writeFileSync(this.pidFile, pids.join(','));
    }

    // Wait for all services to be ready
    const allReady = await this.waitForServices();
    
    if (!allReady) {
      this.log('❌ Failed to start all services, stopping...', 'error');
      await this.stopServices();
      return false;
    }

    this.log('✅ All services started successfully!');
    return true;
  }

  /**
   * Start a single service
   */
  private async startService(service: ServiceInfo): Promise<void> {
    this.log(`📦 Starting ${service.name} on port ${service.port}...`, 'verbose');
    
    const serviceEnv = {
      ...process.env,
      ...this.workerConfig.environment,
      PORT: service.port.toString()
    };

    const serviceProcess = spawn(service.command[0], service.command.slice(1), {
      cwd: service.cwd,
      stdio: ['pipe', 'pipe', 'pipe'],
      detached: false,
      env: serviceEnv
    });

    // Handle process events
    serviceProcess.on('error', (error: any) => {
      this.log(`❌ Failed to start ${service.name}:`, 'error');
      this.log(error.toString(), 'error');
    });

    serviceProcess.on('exit', (code: any) => {
      if (!this.isShuttingDown) {
        this.log(`📋 ${service.name} exited with code ${code}`, 'verbose');
      }
    });

    // Log output for auth service (most critical for debugging)
    if (service.name === 'Auth Service') {
      serviceProcess.stdout?.on('data', (data: any) => {
        this.log(`🔐 AUTH: ${data.toString().trim()}`, 'verbose');
      });
      serviceProcess.stderr?.on('data', (data: any) => {
        this.log(`🚨 AUTH ERROR: ${data.toString().trim()}`, 'verbose');
      });
    }

    service.process = serviceProcess;
    this.processes.push(serviceProcess);
  }

  /**
   * Wait for all services to be ready
   */
  async waitForServices(): Promise<boolean> {
    this.log('🔍 Waiting for all services to be ready...');
    
    const startTime = Date.now();
    
    while (Date.now() - startTime < this.options.maxWaitTime) {
      const healthChecks = await Promise.allSettled(
        this.services.map(async service => {
          const isReady = await this.checkServiceHealth(service);
          return { service: service.name, ready: isReady };
        })
      );
      
      const readyServices = healthChecks
        .filter(result => result.status === 'fulfilled' && result.value.ready)
        .map(result => (result as any).value.service);
      
      const notReadyServices = this.services
        .map(s => s.name)
        .filter(name => !readyServices.includes(name));
      
      if (readyServices.length === this.services.length) {
        this.log('✅ All services are ready!');
        this.log(`   ${readyServices.join(', ')}`, 'verbose');
        return true;
      }
      
      this.log(`⏳ Waiting for: ${notReadyServices.join(', ')}`, 'verbose');
      if (readyServices.length > 0) {
        this.log(`   Ready: ${readyServices.join(', ')}`, 'verbose');
      }
      
      await sleep(this.options.checkInterval);
    }
    
    this.log('❌ Timeout waiting for services to be ready', 'error');
    return false;
  }

  /**
   * Stop all services
   */
  async stopServices(): Promise<void> {
    if (this.isShuttingDown) return;
    this.isShuttingDown = true;

    this.log('🛑 Shutting down services...');
    
    // Stop all processes
    for (let i = 0; i < this.processes.length; i++) {
      const process = this.processes[i];
      const service = this.services[i];
      
      if (process && !process.killed) {
        this.log(`🛑 Stopping ${service.name}...`, 'verbose');
        process.kill('SIGTERM');
      }
    }
    
    // Wait for graceful shutdown
    await sleep(3000);
    
    // Force kill any remaining processes
    for (let i = 0; i < this.processes.length; i++) {
      const process = this.processes[i];
      const service = this.services[i];
      
      if (process && !process.killed) {
        this.log(`🔥 Force killing ${service.name}...`, 'verbose');
        process.kill('SIGKILL');
      }
    }

    // Clean ports as final step
    const ports = this.services.map(s => s.port);
    await this.killPortProcesses(ports);
    
    this.log('✅ Services shut down successfully');
  }

  /**
   * Perform health check on all services
   */
  async healthCheck(): Promise<boolean> {
    const results = await Promise.allSettled(
      this.services.map(async service => {
        const isReady = await this.checkServiceHealth(service);
        return { service: service.name, ready: isReady, port: service.port };
      })
    );

    this.log('🏥 Service Health Check:');
    results.forEach(result => {
      if (result.status === 'fulfilled') {
        const { service, ready, port } = result.value;
        const status = ready ? '✅' : '❌';
        this.log(`   ${status} ${service} (http://localhost:${port})`);
      }
    });

    const allHealthy = results.every(result => 
      result.status === 'fulfilled' && result.value.ready
    );

    return allHealthy;
  }

  /**
   * Get worker configuration
   */
  getWorkerConfig(): WorkerConfig {
    return this.workerConfig;
  }

  /**
   * Get service information
   */
  getServices(): ServiceInfo[] {
    return this.services;
  }
}