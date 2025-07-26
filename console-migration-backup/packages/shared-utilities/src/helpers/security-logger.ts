import { logger } from '@yggdrasil/shared-utilities';

// packages/shared-utilities/src/helpers/security-logger.ts
// Security-aware logging helper to prevent sensitive data leakage

export class SecurityLogger {
  private static sensitivePatterns = [
    /password/i,
    /secret/i,
    /token/i,
    /authorization/i,
    /cookie/i,
    /session/i,
    /key/i,
    /salt/i,
    /hash/i,
    /credential/i,
    /auth/i,
  ];

  static sanitize(data: any): any {
    if (typeof data === 'string') {
      // Check if string contains sensitive data
      for (const pattern of this.sensitivePatterns) {
        if (pattern.test(data)) {
          return '[REDACTED]';
        }
      }
      return data;
    }

    if (typeof data === 'object' && data !== null) {
      const sanitized: any = Array.isArray(data) ? [] : {};

      for (const key in data) {
        // Check if key name is sensitive
        let isSensitive = false;
        for (const pattern of this.sensitivePatterns) {
          if (pattern.test(key)) {
            isSensitive = true;
            break;
          }
        }

        if (isSensitive) {
          sanitized[key] = '[REDACTED]';
        } else {
          sanitized[key] = this.sanitize(data[key]);
        }
      }

      return sanitized;
    }

    return data;
  }

  static log(level: string, message: string, data?: any) {
    const sanitizedData = data ? this.sanitize(data) : undefined;

    if (process.env['NODE_ENV'] === 'development' || process.env['NODE_ENV'] === 'test') {
      logger.info(`[${level}] ${message}`, sanitizedData || '');
    }
  }

  /**
   * Log authentication operations without sensitive data
   */
  static logAuthOperation(operation: string, email: string, success?: boolean) {
    const sanitizedLog = {
      operation,
      user: email.substring(0, 3) + '***@' + email.split('@')[1],
      timestamp: new Date().toISOString(),
      success: success !== undefined ? success : undefined,
      // Never log: passwords, hashes, comparison results, tokens
    };

    if (process.env['NODE_ENV'] === 'development') {
      logger.info('🔐 AUTH:', JSON.stringify(sanitizedLog));
    }
  }

  /**
   * Log security events without exposing sensitive information
   */
  static logSecurityEvent(event: string, details?: Record<string, any>) {
    const sanitizedDetails = details ? this.sanitize(details) : {};
    const logEntry = {
      event,
      timestamp: new Date().toISOString(),
      details: sanitizedDetails,
    };

    if (process.env['NODE_ENV'] === 'development') {
      logger.info('🛡️ SECURITY:', JSON.stringify(logEntry));
    }
  }
}
