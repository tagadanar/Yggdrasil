// packages/frontend/src/lib/errors/types.ts
// Error types and utilities for frontend error handling

export enum ErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  API_ERROR = 'API_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  NOT_FOUND_ERROR = 'NOT_FOUND_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export interface ErrorContext {
  component?: string;
  action?: string;
  userId?: string;
  url?: string;
  userAgent?: string;
  timestamp: Date;
  sessionId?: string;
}

export interface AppError {
  type: ErrorType;
  message: string;
  severity: ErrorSeverity;
  originalError?: Error;
  context?: ErrorContext;
  recoverable: boolean;
  userMessage: string;
  retryable: boolean;
  stack?: string;
}

export interface ErrorRecoveryOptions {
  retry?: () => Promise<void> | void;
  fallback?: () => void;
  redirect?: string;
  reload?: boolean;
}

export interface ErrorHandlerConfig {
  maxRetries?: number;
  retryDelay?: number;
  shouldRetry?: (error: AppError) => boolean;
  onError?: (error: AppError) => void;
  onRetry?: (error: AppError, attempt: number) => void;
  onRecovery?: (error: AppError, method: string) => void;
}