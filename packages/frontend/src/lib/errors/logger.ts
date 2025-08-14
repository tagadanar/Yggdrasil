// packages/frontend/src/lib/errors/logger.ts
// Frontend logging system with multiple levels and proper formatting

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  data?: any;
  component?: string;
  stack?: string;
}

class Logger {
  private logLevel: LogLevel;
  private isDevelopment: boolean;
  private logBuffer: LogEntry[] = [];
  private maxBufferSize = 100;

  constructor() {
    this.isDevelopment = process.env['NODE_ENV'] !== 'production';
    this.logLevel = this.isDevelopment ? LogLevel.DEBUG : LogLevel.INFO;
  }

  private createLogEntry(level: LogLevel, message: string, data?: any, component?: string): LogEntry {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date(),
      data,
      component,
    };

    // Capture stack trace for errors
    if (level === LogLevel.ERROR) {
      entry.stack = new Error().stack;
    }

    return entry;
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.logLevel;
  }

  private formatMessage(entry: LogEntry): string {
    const timestamp = entry.timestamp.toISOString();
    const levelName = LogLevel[entry.level];
    const component = entry.component ? ` [${entry.component}]` : '';
    
    return `[${timestamp}] ${levelName}${component}: ${entry.message}`;
  }

  private writeToConsole(entry: LogEntry): void {
    const formattedMessage = this.formatMessage(entry);
    
    switch (entry.level) {
      case LogLevel.DEBUG:
        if (this.isDevelopment) {
          console.debug(formattedMessage, entry.data || '');
        }
        break;
      case LogLevel.INFO:
        console.info(formattedMessage, entry.data || '');
        break;
      case LogLevel.WARN:
        console.warn(formattedMessage, entry.data || '');
        break;
      case LogLevel.ERROR:
        console.error(formattedMessage, entry.data || '');
        if (entry.stack && this.isDevelopment) {
          console.error('Stack trace:', entry.stack);
        }
        break;
    }
  }

  private addToBuffer(entry: LogEntry): void {
    this.logBuffer.push(entry);
    
    // Keep buffer size manageable
    if (this.logBuffer.length > this.maxBufferSize) {
      this.logBuffer.shift();
    }
  }

  private log(level: LogLevel, message: string, data?: any, component?: string): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const entry = this.createLogEntry(level, message, data, component);
    
    // Always add to buffer for debugging
    this.addToBuffer(entry);
    
    // Write to console
    this.writeToConsole(entry);
    
    // Send to external monitoring service if available
    this.sendToMonitoring(entry);
  }

  private sendToMonitoring(entry: LogEntry): void {
    // Only send errors and warnings to external monitoring
    if (entry.level < LogLevel.WARN) {
      return;
    }

    // Send to monitoring service if available
    if (typeof window !== 'undefined' && (window as any).errorReporting) {
      const monitoringData = {
        message: entry.message,
        level: LogLevel[entry.level],
        timestamp: entry.timestamp.toISOString(),
        component: entry.component,
        data: entry.data,
        url: window.location.href,
        userAgent: navigator.userAgent,
      };

      if (entry.level === LogLevel.ERROR) {
        (window as any).errorReporting.captureException(new Error(entry.message), {
          extra: monitoringData,
          tags: {
            component: entry.component || 'unknown',
            level: LogLevel[entry.level],
          }
        });
      } else {
        (window as any).errorReporting.captureMessage(entry.message, 'warning', {
          extra: monitoringData
        });
      }
    }
  }

  // Public methods
  debug(message: string, data?: any, component?: string): void {
    this.log(LogLevel.DEBUG, message, data, component);
  }

  info(message: string, data?: any, component?: string): void {
    this.log(LogLevel.INFO, message, data, component);
  }

  warn(message: string, data?: any, component?: string): void {
    this.log(LogLevel.WARN, message, data, component);
  }

  error(message: string, data?: any, component?: string): void {
    this.log(LogLevel.ERROR, message, data, component);
  }

  // Utility methods
  setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  getLogLevel(): LogLevel {
    return this.logLevel;
  }

  getRecentLogs(count: number = 50): LogEntry[] {
    return this.logBuffer.slice(-count);
  }

  clearBuffer(): void {
    this.logBuffer = [];
  }

  // Create a component-specific logger
  createComponentLogger(componentName: string) {
    return {
      debug: (message: string, data?: any) => this.debug(message, data, componentName),
      info: (message: string, data?: any) => this.info(message, data, componentName),
      warn: (message: string, data?: any) => this.warn(message, data, componentName),
      error: (message: string, data?: any) => this.error(message, data, componentName),
    };
  }

  // Performance timing
  time(label: string): void {
    if (this.isDevelopment) {
      console.time(label);
    }
  }

  timeEnd(label: string): void {
    if (this.isDevelopment) {
      console.timeEnd(label);
    }
  }
}

// Create singleton instance
export const logger = new Logger();

// Export component logger creator for convenience
export const createComponentLogger = (componentName: string) => 
  logger.createComponentLogger(componentName);