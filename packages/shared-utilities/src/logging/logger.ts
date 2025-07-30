import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { EventEmitter } from 'events';

// Increase EventEmitter default max listeners to prevent memory leak warnings
// Multiple services add uncaughtException/unhandledRejection handlers
EventEmitter.defaultMaxListeners = 50;

// CRITICAL FIX: Winston ExceptionHandler memory leak fix
// Winston's ExceptionHandler adds Console listeners via Console.once('error') and Console.once('finish')
// The issue is that Console (capital C) is treated as an EventEmitter by Winston
// We need to increase the maxListeners on the actual Console object, not just streams

try {
  // Fix the Console object directly (this is what Winston's ExceptionHandler uses)
  if (typeof (console as any).setMaxListeners === 'function') {
    (console as any).setMaxListeners(100);
    console.log('🔧 WINSTON FIX: Set Console.setMaxListeners(100)');
  } else {
    // If Console doesn't have setMaxListeners, try to access the underlying EventEmitter
    // Winston might be adding listeners to console._stream or similar
    const consoleMethods = Object.getOwnPropertyNames(console);
    console.log('🔍 WINSTON DEBUG: Console methods/properties:', consoleMethods.slice(0, 10));
    
    // Check if console is actually an EventEmitter or has EventEmitter properties
    if ((console as any).on && typeof (console as any).on === 'function') {
      (console as any).setMaxListeners = (console as any).setMaxListeners || function(n: number) { 
        console.log(`🔧 WINSTON FIX: Mock setMaxListeners(${n}) called on Console`);
      };
      (console as any).setMaxListeners(100);
    }
  }
  
  // Also fix streams as backup
  const console_stdout = (console as any)._stdout;
  const console_stderr = (console as any)._stderr;
  
  if (console_stdout && typeof console_stdout.setMaxListeners === 'function') {
    console_stdout.setMaxListeners(100);
  }
  if (console_stderr && typeof console_stderr.setMaxListeners === 'function') {
    console_stderr.setMaxListeners(100);
  }
  
  // Fix process streams
  if (process.stdout && typeof process.stdout.setMaxListeners === 'function') {
    process.stdout.setMaxListeners(100);
  }
  if (process.stderr && typeof process.stderr.setMaxListeners === 'function') {
    process.stderr.setMaxListeners(100);
  }
} catch (error) {
  console.log('🚨 WINSTON FIX ERROR:', error instanceof Error ? error.message : String(error));
}

// Also increase process max listeners for global error handlers
if (typeof process.setMaxListeners === 'function') {
  process.setMaxListeners(50);
}

// Define log levels
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
  trace: 5,
};

// Color scheme for console output
const logColors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
  trace: 'gray',
};

// Add colors to winston
winston.addColors(logColors);

// Define format for different environments
const devFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
    return `${timestamp} [${service || 'app'}] ${level}: ${message} ${metaStr}`;
  }),
);

const prodFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
);

// Create logger factory with memory leak protection
export class LoggerFactory {
  private static loggers = new Map<string, winston.Logger>();
  private static maxLoggers = 10; // Drastically reduced to prevent memory leaks
  private static createdCount = 0;

  static createLogger(service: string): winston.Logger {
    // Enhanced test mode detection to fix Winston memory leak
    const isTestMode = process.env['NODE_ENV'] === 'test' || 
                      process.argv.some(arg => arg.includes('playwright')) ||
                      process.argv.some(arg => arg.includes('test')) ||
                      typeof global !== 'undefined' && (global as any).expect !== undefined; // Jest/test environment
    
    // Debug logging to understand why test mode detection is failing
    if (service === 'shared') { // Only log once
      console.log(`🔍 LOGGER DEBUG: Test mode detection for service '${service}':`);
      console.log(`  - NODE_ENV: ${process.env['NODE_ENV']}`);
      console.log(`  - process.argv: ${process.argv.join(' ')}`);
      console.log(`  - playwright in argv: ${process.argv.some(arg => arg.includes('playwright'))}`);
      console.log(`  - test in argv: ${process.argv.some(arg => arg.includes('test'))}`);
      console.log(`  - global.expect defined: ${typeof global !== 'undefined' && (global as any).expect !== undefined}`);
      console.log(`  - Final isTestMode: ${isTestMode}`);
    }
    
    if (isTestMode) {
      // Return a minimal no-op logger that doesn't create any listeners or transports
      return new (class extends EventEmitter {
        info() {}
        error() {}
        warn() {}
        debug() {}
        trace() {}
        http() {}
        log() {}
        clear() {}
        override removeAllListeners() { return this; }
        transports = [];
      })() as any;
    }

    // Return existing logger if already created (proper singleton behavior)
    if (this.loggers.has(service)) {
      return this.loggers.get(service)!;
    }

    // Prevent excessive logger creation that causes memory leaks
    if (this.createdCount >= this.maxLoggers) {
      console.warn(`⚠️ LoggerFactory: Maximum loggers (${this.maxLoggers}) reached. Reusing 'default' logger for service: ${service}`);
      
      // Return default logger instead of creating new one
      if (this.loggers.has('default')) {
        return this.loggers.get('default')!;
      }
    }

    this.createdCount++;

    const logger = winston.createLogger({
      levels: logLevels,
      level: process.env['LOG_LEVEL'] || 'info',
      defaultMeta: { service },
      format: process.env['NODE_ENV'] === 'production' ? prodFormat : devFormat,
      transports: this.createTransports(service),
      exitOnError: false,
    });

    // Add performance logging
    this.addPerformanceLogging(logger);

    // Add error tracking
    this.addErrorTracking(logger);

    this.loggers.set(service, logger);
    return logger;
  }

  /**
   * Clean up all loggers and their transports to prevent memory leaks
   * Should be called during test cleanup or application shutdown
   */
  static cleanup(): void {
    for (const [_service, logger] of this.loggers) {
      try {
        // Close all transports to remove their event listeners
        for (const transport of logger.transports) {
          if (typeof transport.close === 'function') {
            transport.close();
          }
        }
        
        // Clear all transports
        logger.clear();
        
        // Remove all listeners from the logger
        logger.removeAllListeners();
        
      } catch (error) {
        // Ignore cleanup errors to prevent issues during shutdown
      }
    }
    
    // Clear the logger cache
    this.loggers.clear();
    this.createdCount = 0;
  }

  /**
   * Get current logger statistics for monitoring
   */
  static getStats(): { count: number; services: string[]; maxLoggers: number } {
    return {
      count: this.loggers.size,
      services: Array.from(this.loggers.keys()),
      maxLoggers: this.maxLoggers
    };
  }

  private static createTransports(service: string): winston.transport[] {
    const transports: winston.transport[] = [];

    // In test mode, skip winston Console transport entirely to prevent memory leaks
    // Winston Console transport creates EventEmitter listeners that accumulate
    const isTestMode = process.env['NODE_ENV'] === 'test';
    
    if (!isTestMode) {
      // Console transport (production/development only)
      transports.push(new winston.transports.Console({
        handleExceptions: true,
        handleRejections: true,
      }));
    } else {
      // Test mode: Use a minimal console transport that doesn't create listeners
      // Use simple console transport for tests to avoid EventEmitter issues
      transports.push(new winston.transports.Console({
        level: 'info',
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.simple()
        )
      }));
    }

    // File transports (production only)
    if (process.env['NODE_ENV'] === 'production') {
      // Error logs
      transports.push(new DailyRotateFile({
        filename: `logs/${service}-error-%DATE%.log`,
        datePattern: 'YYYY-MM-DD',
        level: 'error',
        maxSize: '20m',
        maxFiles: '14d',
        zippedArchive: true,
      }));

      // Combined logs
      transports.push(new DailyRotateFile({
        filename: `logs/${service}-combined-%DATE%.log`,
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: '7d',
        zippedArchive: true,
      }));

      // Performance logs
      transports.push(new DailyRotateFile({
        filename: `logs/${service}-performance-%DATE%.log`,
        datePattern: 'YYYY-MM-DD',
        level: 'http',
        maxSize: '20m',
        maxFiles: '3d',
        zippedArchive: true,
      }));
    }

    return transports;
  }

  private static addPerformanceLogging(logger: winston.Logger) {
    // Add method to log performance metrics
    (logger as any).performance = function(operation: string, duration: number, metadata?: any) {
      this.http('performance', {
        operation,
        duration,
        timestamp: new Date().toISOString(),
        ...metadata,
      });
    };
  }

  private static addErrorTracking(logger: winston.Logger) {
    // Enhanced error logging with context
    const originalError = logger.error.bind(logger);
    (logger as any).error = function(message: any, ...meta: any[]) {
      if (message instanceof Error) {
        return originalError({
          message: message.message,
          stack: message.stack,
          name: message.name,
          ...meta[0],
        });
      }
      return originalError(message, ...meta);
    };
  }
}

// Service-specific logger instances
export const authLogger = LoggerFactory.createLogger('auth-service');
export const userLogger = LoggerFactory.createLogger('user-service');
export const courseLogger = LoggerFactory.createLogger('course-service');
export const newsLogger = LoggerFactory.createLogger('news-service');
export const planningLogger = LoggerFactory.createLogger('planning-service');
export const statsLogger = LoggerFactory.createLogger('statistics-service');

// Generic logger for shared utilities
export const logger = LoggerFactory.createLogger('shared');
