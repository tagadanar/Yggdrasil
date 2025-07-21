// packages/frontend/src/components/dashboard/ErrorBoundary.tsx
// Error boundary for graceful error handling in statistics dashboards

'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import {
  ExclamationTriangleIcon,
  ArrowPathIcon,
  BugAntIcon
} from '@heroicons/react/24/outline';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  retryCount: number;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  maxRetries?: number;
  showErrorDetails?: boolean;
  testId?: string;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
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
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Dashboard Error Boundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo
    });

    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Send error to monitoring service if available
    if (typeof window !== 'undefined' && (window as any).errorReporting) {
      (window as any).errorReporting.captureException(error, {
        extra: errorInfo,
        tags: {
          component: 'StatisticsDashboard',
          section: 'ErrorBoundary'
        }
      });
    }
  }

  componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
  }

  handleRetry = () => {
    const { maxRetries = 3 } = this.props;
    const { retryCount } = this.state;

    if (retryCount < maxRetries) {
      this.setState({
        hasError: false,
        error: undefined,
        errorInfo: undefined,
        retryCount: retryCount + 1
      });

      // Auto-retry after a delay for the first retry
      if (retryCount === 0) {
        this.retryTimeoutId = setTimeout(() => {
          if (this.state.hasError) {
            this.handleRetry();
          }
        }, 2000);
      }
    }
  };

  handleReset = () => {
    this.setState({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
      retryCount: 0
    });
  };

  render() {
    const { hasError, error, errorInfo, retryCount } = this.state;
    const { children, fallback, maxRetries = 3, showErrorDetails = false, testId } = this.props;

    if (hasError) {
      // Use custom fallback if provided
      if (fallback) {
        return fallback;
      }

      const canRetry = retryCount < maxRetries;
      const isNetworkError = error?.message?.includes('fetch') || 
                            error?.message?.includes('network') ||
                            error?.message?.includes('ECONNREFUSED');

      return (
        <div 
          className="min-h-[400px] flex items-center justify-center p-6"
          data-testid={testId || 'error-boundary'}
        >
          <div className="max-w-md w-full">
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
              <div className="flex items-center mb-4">
                <ExclamationTriangleIcon className="h-8 w-8 text-red-600 dark:text-red-400 mr-3" />
                <div>
                  <h3 className="text-lg font-medium text-red-800 dark:text-red-200">
                    Dashboard Error
                  </h3>
                  <p className="text-sm text-red-600 dark:text-red-300">
                    {isNetworkError 
                      ? 'Unable to connect to the statistics service'
                      : 'Something went wrong while loading the dashboard'
                    }
                  </p>
                </div>
              </div>

              {showErrorDetails && error && (
                <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 rounded border">
                  <div className="flex items-center mb-2">
                    <BugAntIcon className="h-4 w-4 text-red-600 dark:text-red-400 mr-2" />
                    <span className="text-sm font-medium text-red-700 dark:text-red-300">
                      Error Details
                    </span>
                  </div>
                  <p className="text-xs text-red-600 dark:text-red-400 font-mono">
                    {error.message}
                  </p>
                  {errorInfo?.componentStack && (
                    <details className="mt-2">
                      <summary className="text-xs text-red-600 dark:text-red-400 cursor-pointer">
                        Component Stack
                      </summary>
                      <pre className="text-xs text-red-600 dark:text-red-400 mt-1 whitespace-pre-wrap">
                        {errorInfo.componentStack}
                      </pre>
                    </details>
                  )}
                </div>
              )}

              <div className="flex space-x-3">
                {canRetry && (
                  <button
                    onClick={this.handleRetry}
                    className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
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
                  Reset Dashboard
                </button>
              </div>

              {!canRetry && (
                <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    Maximum retry attempts reached. Please refresh the page or contact support if the problem persists.
                  </p>
                </div>
              )}

              {isNetworkError && (
                <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    <strong>Troubleshooting:</strong>
                  </p>
                  <ul className="text-sm text-blue-700 dark:text-blue-300 mt-1 ml-4 list-disc">
                    <li>Check your internet connection</li>
                    <li>Verify that the statistics service is running</li>
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

// Hook version for functional components
export const useErrorHandler = () => {
  const [error, setError] = React.useState<Error | null>(null);

  const resetError = React.useCallback(() => {
    setError(null);
  }, []);

  const captureError = React.useCallback((error: Error) => {
    console.error('Dashboard error captured:', error);
    setError(error);
  }, []);

  // Reset error when component unmounts
  React.useEffect(() => {
    return () => {
      setError(null);
    };
  }, []);

  return {
    error,
    resetError,
    captureError,
    hasError: !!error
  };
};