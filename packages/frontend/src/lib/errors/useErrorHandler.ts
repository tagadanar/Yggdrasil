// packages/frontend/src/lib/errors/useErrorHandler.ts
// Enhanced error handling hook with retry logic and user feedback

import { useState, useCallback, useRef } from 'react';
import { AppError, ErrorRecoveryOptions, ErrorHandlerConfig } from './types';
import { errorHandler } from './errorHandler';
import { logger, createComponentLogger } from './logger';

interface UseErrorHandlerReturn {
  error: AppError | null;
  isError: boolean;
  clearError: () => void;
  handleError: (error: any, context?: { component?: string; action?: string }) => AppError;
  retryWithBackoff: <T>(
    operation: () => Promise<T>,
    maxRetries?: number,
    context?: { component?: string; action?: string }
  ) => Promise<T>;
  wrapAsync: <T>(
    operation: () => Promise<T>,
    context?: { component?: string; action?: string }
  ) => Promise<T>;
}

interface UseErrorHandlerOptions extends ErrorHandlerConfig {
  component?: string;
  autoRetry?: boolean;
  showUserFeedback?: boolean;
  onErrorChange?: (error: AppError | null) => void;
}

export function useErrorHandler(options: UseErrorHandlerOptions = {}): UseErrorHandlerReturn {
  const {
    component,
    maxRetries = 3,
    retryDelay = 1000,
    autoRetry = false,
    showUserFeedback = true,
    shouldRetry,
    onError,
    onRetry,
    onRecovery,
    onErrorChange,
  } = options;

  const [error, setError] = useState<AppError | null>(null);
  const componentLogger = useRef(component ? createComponentLogger(component) : logger);
  const retryCount = useRef<Map<string, number>>(new Map());

  // Clear error state
  const clearError = useCallback(() => {
    setError(null);
    onErrorChange?.(null);
  }, [onErrorChange]);

  // Handle error with proper classification and logging
  const handleError = useCallback((
    rawError: any,
    context?: { component?: string; action?: string }
  ): AppError => {
    const appError = errorHandler.parseError(rawError, {
      component: context?.component || component,
      action: context?.action,
    });

    // Log the error
    componentLogger.current.error(appError.message, {
      type: appError.type,
      severity: appError.severity,
      originalError: appError.originalError,
    });

    // Set error state
    setError(appError);
    onErrorChange?.(appError);

    // Call custom error handler
    onError?.(appError);

    // Auto-retry if enabled and error is retryable
    if (autoRetry && appError.retryable) {
      const errorKey = `${appError.type}_${appError.message}`;
      const currentRetries = retryCount.current.get(errorKey) || 0;
      
      if (currentRetries < maxRetries && (!shouldRetry || shouldRetry(appError))) {
        retryCount.current.set(errorKey, currentRetries + 1);
        
        const delay = retryDelay * Math.pow(2, currentRetries);
        componentLogger.current.info(`Auto-retrying in ${delay}ms (attempt ${currentRetries + 1}/${maxRetries})`);
        
        setTimeout(() => {
          clearError();
          onRetry?.(appError, currentRetries + 1);
        }, delay);
      }
    }

    return appError;
  }, [
    component,
    maxRetries,
    retryDelay,
    autoRetry,
    shouldRetry,
    onError,
    onRetry,
    onErrorChange,
    clearError,
  ]);

  // Retry operation with exponential backoff
  const retryWithBackoff = useCallback(async <T>(
    operation: () => Promise<T>,
    operationMaxRetries?: number,
    context?: { component?: string; action?: string }
  ): Promise<T> => {
    const finalMaxRetries = operationMaxRetries ?? maxRetries;
    const errorContext = {
      component: context?.component || component,
      action: context?.action,
    };

    try {
      const result = await errorHandler.retryWithBackoff(
        operation,
        finalMaxRetries,
        retryDelay,
        2, // backoff factor
        errorContext
      );
      
      // Clear any previous errors on success
      clearError();
      return result;
    } catch (error) {
      const appError = handleError(error, errorContext);
      throw appError;
    }
  }, [maxRetries, retryDelay, component, handleError, clearError]);

  // Wrap async operations with error handling
  const wrapAsync = useCallback(async <T>(
    operation: () => Promise<T>,
    context?: { component?: string; action?: string }
  ): Promise<T> => {
    try {
      const result = await operation();
      clearError(); // Clear any previous errors on success
      return result;
    } catch (error) {
      const appError = handleError(error, context);
      throw appError;
    }
  }, [handleError, clearError]);

  return {
    error,
    isError: !!error,
    clearError,
    handleError,
    retryWithBackoff,
    wrapAsync,
  };
}

// Hook for specific error recovery patterns
export function useErrorRecovery(
  error: AppError | null,
  recoveryOptions: ErrorRecoveryOptions
) {
  const componentLogger = useRef(createComponentLogger('ErrorRecovery'));

  const recover = useCallback((method: keyof ErrorRecoveryOptions) => {
    if (!error) return;

    componentLogger.current.info(`Attempting recovery using ${method}`, { errorType: error.type });

    const handler = recoveryOptions[method];
    if (handler) {
      if (typeof handler === 'function') {
        handler();
      } else if (typeof handler === 'string' && method === 'redirect') {
        if (typeof window !== 'undefined') {
          window.location.href = handler;
        }
      } else if (typeof handler === 'boolean' && method === 'reload') {
        if (typeof window !== 'undefined') {
          window.location.reload();
        }
      }
    }
  }, [error, recoveryOptions]);

  return { recover };
}

// Hook for toast notifications integration
export function useErrorToast(error: AppError | null, onDismiss?: () => void) {
  const showToast = useCallback(() => {
    if (!error) return;

    // This would integrate with your toast system
    // For now, we'll use a simple alert as fallback
    if (typeof window !== 'undefined') {
      const message = error.userMessage || error.message;
      
      // In a real app, you'd replace this with your toast library
      if (window.confirm(`${message}\n\nWould you like to dismiss this error?`)) {
        onDismiss?.();
      }
    }
  }, [error, onDismiss]);

  return { showToast };
}