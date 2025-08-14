// packages/frontend/src/lib/errors/ErrorBoundary.tsx
// Enhanced general-purpose error boundary with improved error handling

'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import {
  ExclamationTriangleIcon,
  ArrowPathIcon,
  BugAntIcon,
  HomeIcon,
} from '@heroicons/react/24/outline';
import { AppError, ErrorType, ErrorSeverity } from './types';
import { errorHandler } from './errorHandler';
import { createComponentLogger } from './logger';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: AppError;
  retryCount: number;
  autoRetryTimeoutId?: NodeJS.Timeout;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: AppError, errorInfo: ErrorInfo) => void;
  maxRetries?: number;
  autoRetryDelay?: number;
  showErrorDetails?: boolean;
  testId?: string;
  component?: string;
  level?: 'page' | 'section' | 'component';
  enableAutoRetry?: boolean;
  enableRecoveryOptions?: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private componentLogger = createComponentLogger(this.props.component || 'ErrorBoundary');
  private retryTimeoutId: NodeJS.Timeout | null = null;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
    };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const appError = errorHandler.parseError(error, {
      component: this.props.component || 'ErrorBoundary',
      action: 'render',
    });

    this.componentLogger.error('Error boundary caught an error', {
      error,
      errorInfo,
      appError,
    });

    this.setState({
      error: appError,
    });

    // Handle the error with the error handler
    errorHandler.handleError(appError);

    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(appError, errorInfo);
    }

    // Auto-retry for certain error types
    if (this.props.enableAutoRetry && appError.retryable && this.state.retryCount === 0) {
      const delay = this.props.autoRetryDelay || 2000;
      this.componentLogger.info(`Auto-retrying in ${delay}ms`);
      
      this.retryTimeoutId = setTimeout(() => {
        this.handleRetry();
      }, delay);
    }
  }

  override componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
  }

  handleRetry = () => {
    const { maxRetries = 3 } = this.props;
    const { retryCount, error } = this.state;

    if (retryCount < maxRetries) {
      this.componentLogger.info(`Retrying component render (attempt ${retryCount + 1}/${maxRetries})`);
      
      this.setState({
        hasError: false,
        error: undefined,
        retryCount: retryCount + 1
      });
    } else {
      this.componentLogger.warn('Maximum retry attempts reached');
    }
  };

  handleReset = () => {
    this.componentLogger.info('Resetting error boundary');
    
    this.setState({
      hasError: false,
      error: undefined,
      retryCount: 0
    });
  };

  handleGoHome = () => {
    this.componentLogger.info('Navigating to home');
    
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  };

  handleReload = () => {
    this.componentLogger.info('Reloading page');
    
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  getErrorTitle(): string {
    const { level = 'component' } = this.props;
    
    switch (level) {
      case 'page':
        return 'Page Error';
      case 'section':
        return 'Section Error';
      default:
        return 'Component Error';
    }
  }

  getErrorIcon() {
    const { error } = this.state;
    const iconProps = { className: "h-8 w-8 mr-3" };
    
    if (error?.severity === ErrorSeverity.CRITICAL || error?.severity === ErrorSeverity.HIGH) {
      return <ExclamationTriangleIcon {...iconProps} className="h-8 w-8 text-red-600 dark:text-red-400 mr-3" />;
    }
    
    return <ExclamationTriangleIcon {...iconProps} className="h-8 w-8 text-yellow-600 dark:text-yellow-400 mr-3" />;
  }

  getErrorColorClasses(): string {
    const { error } = this.state;
    
    if (error?.severity === ErrorSeverity.CRITICAL || error?.severity === ErrorSeverity.HIGH) {
      return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
    }
    
    return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800';
  }

  override render() {
    const { hasError, error, retryCount } = this.state;
    const {
      children,
      fallback,
      maxRetries = 3,
      showErrorDetails = false,
      testId,
      level = 'component',
      enableRecoveryOptions = true,
    } = this.props;

    if (hasError) {
      // Use custom fallback if provided
      if (fallback) {
        return fallback;
      }

      const canRetry = retryCount < maxRetries;
      const isPageLevel = level === 'page';
      
      return (
        <div 
          className={`${isPageLevel ? 'min-h-[400px]' : 'min-h-[200px]'} flex items-center justify-center p-6`}
          data-testid={testId || 'error-boundary'}
        >
          <div className={`max-w-md w-full`}>
            <div className={`${this.getErrorColorClasses()} border rounded-lg p-6`}>
              <div className="flex items-center mb-4">
                {this.getErrorIcon()}
                <div>
                  <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">
                    {this.getErrorTitle()}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {error?.userMessage || 'Something went wrong'}
                  </p>
                </div>
              </div>

              {/* Error Type Badge */}
              {error && (
                <div className="mb-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    error.severity === ErrorSeverity.HIGH || error.severity === ErrorSeverity.CRITICAL
                      ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                      : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                  }`}>
                    {error.type.replace('_', ' ').toLowerCase()}
                  </span>
                </div>
              )}

              {/* Error Details */}
              {showErrorDetails && error && (
                <div className="mb-4 p-3 bg-gray-100 dark:bg-gray-900/30 rounded border">
                  <div className="flex items-center mb-2">
                    <BugAntIcon className="h-4 w-4 text-gray-600 dark:text-gray-400 mr-2" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Error Details
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 font-mono">
                    {error.message}
                  </p>
                  {error.stack && (
                    <details className="mt-2">
                      <summary className="text-xs text-gray-600 dark:text-gray-400 cursor-pointer">
                        Stack Trace
                      </summary>
                      <pre className="text-xs text-gray-600 dark:text-gray-400 mt-1 whitespace-pre-wrap max-h-32 overflow-y-auto">
                        {error.stack}
                      </pre>
                    </details>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3">
                {canRetry && error?.retryable && (
                  <button
                    onClick={this.handleRetry}
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                    data-testid="retry-button"
                  >
                    <ArrowPathIcon className="h-4 w-4 mr-2" />
                    Retry ({retryCount}/{maxRetries})
                  </button>
                )}
                
                <button
                  onClick={this.handleReset}
                  className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium"
                  data-testid="reset-button"
                >
                  Reset
                </button>

                {enableRecoveryOptions && isPageLevel && (
                  <>
                    <button
                      onClick={this.handleGoHome}
                      className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                      data-testid="home-button"
                    >
                      <HomeIcon className="h-4 w-4 mr-2" />
                      Go Home
                    </button>
                    
                    <button
                      onClick={this.handleReload}
                      className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
                      data-testid="reload-button"
                    >
                      Reload Page
                    </button>
                  </>
                )}
              </div>

              {/* Max Retries Warning */}
              {!canRetry && error?.retryable && (
                <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    Maximum retry attempts reached. Please try reloading the page or contact support if the problem persists.
                  </p>
                </div>
              )}

              {/* Recovery Suggestions */}
              {error?.type === ErrorType.NETWORK_ERROR && (
                <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    <strong>Troubleshooting:</strong>
                  </p>
                  <ul className="text-sm text-blue-700 dark:text-blue-300 mt-1 ml-4 list-disc">
                    <li>Check your internet connection</li>
                    <li>Verify that the server is running</li>
                    <li>Try refreshing the page</li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    return children;
  }
}