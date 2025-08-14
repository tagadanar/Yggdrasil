// packages/frontend/src/lib/errors/index.ts
// Central export point for all error handling utilities

// Types
export * from './types';

// Error handler
export { errorHandler } from './errorHandler';

// Logging
export { logger, createComponentLogger, LogLevel } from './logger';

// React hooks
export { useErrorHandler, useErrorRecovery, useErrorToast } from './useErrorHandler';

// Components
export { ErrorBoundary } from './ErrorBoundary';

// Legacy exports for backward compatibility - using main ErrorBoundary
export { ErrorBoundary as DashboardErrorBoundary } from './ErrorBoundary';