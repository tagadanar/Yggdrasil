// packages/frontend/src/lib/errors/errorHandler.ts
// Comprehensive error handling utilities for the frontend

import { AppError, ErrorType, ErrorSeverity, ErrorContext, ErrorRecoveryOptions } from './types';
import { logger } from './logger';

export class ErrorHandler {
  private static instance: ErrorHandler;
  
  private constructor() {}
  
  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  /**
   * Create a standardized AppError from various error sources
   */
  createError(
    type: ErrorType,
    message: string,
    originalError?: Error | any,
    context?: Partial<ErrorContext>
  ): AppError {
    const errorContext: ErrorContext = {
      timestamp: new Date(),
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      userAgent: typeof window !== 'undefined' ? navigator.userAgent : undefined,
      ...context,
    };

    const severity = this.determineSeverity(type, originalError);
    const userMessage = this.generateUserMessage(type, message);
    const recoverable = this.isRecoverable(type);
    const retryable = this.isRetryable(type);

    return {
      type,
      message,
      severity,
      originalError,
      context: errorContext,
      recoverable,
      userMessage,
      retryable,
      stack: originalError?.stack,
    };
  }

  /**
   * Parse and classify errors from various sources
   */
  parseError(error: any, context?: Partial<ErrorContext>): AppError {
    // Network errors
    if (this.isNetworkError(error)) {
      return this.createError(
        ErrorType.NETWORK_ERROR,
        'Network connection failed',
        error,
        context
      );
    }

    // API errors
    if (this.isApiError(error)) {
      const message = error.response?.data?.message || error.response?.data?.error || 'API request failed';
      return this.createError(
        ErrorType.API_ERROR,
        message,
        error,
        context
      );
    }

    // Authentication errors
    if (this.isAuthError(error)) {
      return this.createError(
        ErrorType.AUTHENTICATION_ERROR,
        'Authentication failed',
        error,
        context
      );
    }

    // Authorization errors
    if (this.isAuthzError(error)) {
      return this.createError(
        ErrorType.AUTHORIZATION_ERROR,
        'Access denied',
        error,
        context
      );
    }

    // 404 errors
    if (this.isNotFoundError(error)) {
      return this.createError(
        ErrorType.NOT_FOUND_ERROR,
        'Resource not found',
        error,
        context
      );
    }

    // Timeout errors
    if (this.isTimeoutError(error)) {
      return this.createError(
        ErrorType.TIMEOUT_ERROR,
        'Request timed out',
        error,
        context
      );
    }

    // Validation errors
    if (this.isValidationError(error)) {
      const message = this.extractValidationMessage(error);
      return this.createError(
        ErrorType.VALIDATION_ERROR,
        message,
        error,
        context
      );
    }

    // Unknown errors
    return this.createError(
      ErrorType.UNKNOWN_ERROR,
      error?.message || 'An unexpected error occurred',
      error,
      context
    );
  }

  /**
   * Handle an error with appropriate logging and user feedback
   */
  handleError(error: AppError, recoveryOptions?: ErrorRecoveryOptions): void {
    // Log the error
    logger.error(
      `${error.type}: ${error.message}`,
      {
        error: error.originalError,
        context: error.context,
        stack: error.stack,
      },
      error.context?.component
    );

    // Send to monitoring service
    this.sendToMonitoring(error);

    // Handle recovery if options provided
    if (recoveryOptions) {
      this.handleRecovery(error, recoveryOptions);
    }
  }

  /**
   * Retry logic with exponential backoff
   */
  async retryWithBackoff<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    initialDelay: number = 1000,
    backoffFactor: number = 2,
    context?: Partial<ErrorContext>
  ): Promise<T> {
    let lastError: any;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        logger.debug(`Attempting operation (attempt ${attempt + 1}/${maxRetries + 1})`, {}, context?.component);
        return await operation();
      } catch (error) {
        lastError = error;
        const appError = this.parseError(error, { ...context, action: 'retry' });
        
        if (attempt === maxRetries || !appError.retryable) {
          logger.error(`Operation failed after ${attempt + 1} attempts`, { error }, context?.component);
          throw appError;
        }
        
        const delay = initialDelay * Math.pow(backoffFactor, attempt);
        logger.warn(`Operation failed, retrying in ${delay}ms`, { error, attempt: attempt + 1 }, context?.component);
        
        await this.sleep(delay);
      }
    }
    
    throw this.parseError(lastError, context);
  }

  // Private helper methods
  private determineSeverity(type: ErrorType, originalError?: any): ErrorSeverity {
    switch (type) {
      case ErrorType.AUTHENTICATION_ERROR:
      case ErrorType.AUTHORIZATION_ERROR:
        return ErrorSeverity.HIGH;
      case ErrorType.NETWORK_ERROR:
      case ErrorType.TIMEOUT_ERROR:
        return ErrorSeverity.MEDIUM;
      case ErrorType.VALIDATION_ERROR:
        return ErrorSeverity.LOW;
      case ErrorType.API_ERROR:
        // Determine based on status code
        const status = originalError?.response?.status;
        if (status >= 500) return ErrorSeverity.HIGH;
        if (status >= 400) return ErrorSeverity.MEDIUM;
        return ErrorSeverity.LOW;
      default:
        return ErrorSeverity.MEDIUM;
    }
  }

  private generateUserMessage(type: ErrorType, technicalMessage: string): string {
    switch (type) {
      case ErrorType.NETWORK_ERROR:
        return 'Unable to connect to the server. Please check your internet connection and try again.';
      case ErrorType.AUTHENTICATION_ERROR:
        return 'Your session has expired. Please log in again.';
      case ErrorType.AUTHORIZATION_ERROR:
        return 'You do not have permission to perform this action.';
      case ErrorType.NOT_FOUND_ERROR:
        return 'The requested resource could not be found.';
      case ErrorType.TIMEOUT_ERROR:
        return 'The request took too long to complete. Please try again.';
      case ErrorType.VALIDATION_ERROR:
        return technicalMessage; // Validation messages are usually user-friendly
      case ErrorType.API_ERROR:
        return 'A server error occurred. Please try again or contact support if the problem persists.';
      default:
        return 'An unexpected error occurred. Please try again or contact support if the problem persists.';
    }
  }

  private isRecoverable(type: ErrorType): boolean {
    return [
      ErrorType.NETWORK_ERROR,
      ErrorType.TIMEOUT_ERROR,
      ErrorType.API_ERROR,
    ].includes(type);
  }

  private isRetryable(type: ErrorType): boolean {
    return [
      ErrorType.NETWORK_ERROR,
      ErrorType.TIMEOUT_ERROR,
    ].includes(type);
  }

  private isNetworkError(error: any): boolean {
    return (
      error?.code === 'NETWORK_ERROR' ||
      error?.code === 'ERR_NETWORK' ||
      error?.message?.includes('Network Error') ||
      error?.message?.includes('fetch') ||
      error?.name === 'AbortError' ||
      !error?.response
    );
  }

  private isApiError(error: any): boolean {
    return error?.response && error?.response?.status >= 400;
  }

  private isAuthError(error: any): boolean {
    return error?.response?.status === 401;
  }

  private isAuthzError(error: any): boolean {
    return error?.response?.status === 403;
  }

  private isNotFoundError(error: any): boolean {
    return error?.response?.status === 404;
  }

  private isTimeoutError(error: any): boolean {
    return (
      error?.code === 'ECONNABORTED' ||
      error?.message?.includes('timeout') ||
      error?.name === 'TimeoutError'
    );
  }

  private isValidationError(error: any): boolean {
    return (
      error?.response?.status === 400 ||
      error?.response?.data?.errors ||
      error?.name === 'ValidationError'
    );
  }

  private extractValidationMessage(error: any): string {
    if (error?.response?.data?.errors) {
      const errors = error.response.data.errors;
      if (Array.isArray(errors)) {
        return errors.map(e => e.message || e).join(', ');
      }
      if (typeof errors === 'object') {
        return Object.values(errors).flat().join(', ');
      }
    }
    return error?.response?.data?.message || error?.message || 'Validation failed';
  }

  private handleRecovery(error: AppError, options: ErrorRecoveryOptions): void {
    logger.info('Attempting error recovery', { errorType: error.type, options }, error.context?.component);

    if (options.retry && error.retryable) {
      logger.info('Executing retry recovery', {}, error.context?.component);
      options.retry();
      return;
    }

    if (options.fallback) {
      logger.info('Executing fallback recovery', {}, error.context?.component);
      options.fallback();
      return;
    }

    if (options.redirect) {
      logger.info('Executing redirect recovery', { url: options.redirect }, error.context?.component);
      if (typeof window !== 'undefined') {
        window.location.href = options.redirect;
      }
      return;
    }

    if (options.reload) {
      logger.info('Executing reload recovery', {}, error.context?.component);
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
      return;
    }
  }

  private sendToMonitoring(error: AppError): void {
    if (typeof window !== 'undefined' && (window as any).errorReporting) {
      const monitoringData = {
        type: error.type,
        severity: error.severity,
        context: error.context,
        userMessage: error.userMessage,
        recoverable: error.recoverable,
        retryable: error.retryable,
      };

      if (error.severity === ErrorSeverity.HIGH || error.severity === ErrorSeverity.CRITICAL) {
        (window as any).errorReporting.captureException(
          error.originalError || new Error(error.message),
          {
            extra: monitoringData,
            tags: {
              errorType: error.type,
              severity: error.severity,
              component: error.context?.component || 'unknown',
            }
          }
        );
      }
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const errorHandler = ErrorHandler.getInstance();