import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { EventEmitter } from 'events';

// Increase EventEmitter default max listeners to prevent memory leak warnings
// Multiple services add uncaughtException/unhandledRejection handlers
EventEmitter.defaultMaxListeners = 50;

// Increase console max listeners to prevent EventEmitter memory leak warnings
// Winston Console transport adds listeners for exception/rejection handling
// Only available in Node.js environment
if (typeof (console as any).setMaxListeners === 'function') {
  (console as any).setMaxListeners(50);
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

// Create logger factory
export class LoggerFactory {
  private static loggers = new Map<string, winston.Logger>();

  static createLogger(service: string): winston.Logger {
    if (this.loggers.has(service)) {
      return this.loggers.get(service)!;
    }

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

  private static createTransports(service: string): winston.transport[] {
    const transports: winston.transport[] = [];

    // Console transport (always enabled)
    // In test mode, disable handleExceptions/handleRejections to prevent listener leaks
    const isTestMode = process.env['NODE_ENV'] === 'test';
    transports.push(new winston.transports.Console({
      handleExceptions: !isTestMode,
      handleRejections: !isTestMode,
    }));

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
