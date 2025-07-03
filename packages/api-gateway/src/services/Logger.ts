// Path: packages/api-gateway/src/services/Logger.ts
import winston from 'winston';
import { LoggingConfig, LogLevel, LogFormat } from '../types/gateway';

export class Logger {
  private logger: winston.Logger;

  constructor(config: LoggingConfig) {
    this.logger = winston.createLogger({
      level: config.level,
      format: this.createFormat(config.format),
      transports: this.createTransports(config),
      exitOnError: false
    });
  }

  private createFormat(format: LogFormat): winston.Logform.Format {
    const timestamp = winston.format.timestamp();
    const errors = winston.format.errors({ stack: true });

    switch (format) {
      case 'json':
        return winston.format.combine(
          timestamp,
          errors,
          winston.format.json()
        );
      case 'simple':
        return winston.format.combine(
          timestamp,
          errors,
          winston.format.simple()
        );
      case 'combined':
        return winston.format.combine(
          timestamp,
          errors,
          winston.format.printf(({ timestamp, level, message, ...meta }) => {
            return `${timestamp} [${level.toUpperCase()}]: ${message} ${
              Object.keys(meta).length ? JSON.stringify(meta) : ''
            }`;
          })
        );
      default:
        return winston.format.combine(
          timestamp,
          errors,
          winston.format.simple()
        );
    }
  }

  private createTransports(config: LoggingConfig): winston.transport[] {
    const transports: winston.transport[] = [];

    config.transports.forEach(transportType => {
      switch (transportType) {
        case 'console':
          transports.push(new winston.transports.Console({
            format: winston.format.combine(
              winston.format.colorize(),
              winston.format.simple()
            )
          }));
          break;
        case 'file':
          transports.push(
            new winston.transports.File({ 
              filename: 'logs/error.log', 
              level: 'error' 
            }),
            new winston.transports.File({ 
              filename: 'logs/combined.log' 
            })
          );
          break;
        default:
          // Default to console
          transports.push(new winston.transports.Console());
      }
    });

    return transports;
  }

  info(message: string, meta?: any): void {
    this.logger.info(message, meta);
  }

  error(message: string, meta?: any): void {
    this.logger.error(message, meta);
  }

  warn(message: string, meta?: any): void {
    this.logger.warn(message, meta);
  }

  debug(message: string, meta?: any): void {
    this.logger.debug(message, meta);
  }

  verbose(message: string, meta?: any): void {
    this.logger.verbose(message, meta);
  }
}