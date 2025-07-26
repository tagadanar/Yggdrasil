// packages/shared-utilities/src/index.ts
// Main export file for shared utilities

// Types - explicit exports to avoid conflicts
// Use strict types over basic types for better type safety
export type {
  // From types/strict.ts (preferred for type safety)
  UserId, Email, JWT, HashedPassword, PlainPassword, RequestId, SessionId,
  NodeEnvironment, LogLevel,
  UserRole, USER_ROLES,
  ApiResponse, StrictRequest, StrictResponse,
  ValidationResult, ErrorHandler,
  AsyncFunction, RequestHandler,
  Nullable, Optional, Maybe, Brand,
  StrictOmit, StrictPartial, StrictRequired,
  DeepReadonly, DeepPartial,
  StrictJWTPayload, StrictTimestamps, StrictDocument,
  ServiceResult
} from './types/strict';

// Type guards and utilities from strict
export {
  isUserId, isEmail, isJWT, isRequestId, isNodeEnvironment, isLogLevel, isUserRole,
  exhaustiveCheck
} from './types/strict';

// From types/auth.ts (non-conflicting exports)
export type { 
  AuthTokens, LoginRequest, RegisterRequest, JWTPayload, RefreshTokenPayload,
  AuthResult, User, UserProfile, UserPreferences, ContactInfo, AuthRequest
} from './types/auth';

// From types/api.ts (use PaginatedResponse which doesn't conflict)
export type { PaginatedResponse } from './types/api';

// All other types without conflicts
export * from './types/news';
export * from './types/course';
export * from './types/planning';

// Validation schemas
export * from './validation/auth';
export * from './validation/news';
export * from './validation/course';
export * from './validation/planning';

// Constants
export * from './constants';

// Helpers - explicit exports to avoid ValidationResult conflict
export { ResponseHelper } from './helpers/response';
export { ValidationHelper } from './helpers/validation'; // Avoid ValidationResult conflict
export { SharedJWTHelper, initializeJWT } from './helpers/jwt';
export { SecurityLogger } from './helpers/security-logger';

// Logging
export * from './logging/logger';

// Error handling
export * from './errors/AppError';
export * from './errors/error-monitor';
export * from './errors/circuit-breaker';

// Configuration
export * from './config/env-validator';

// Middleware - explicit exports to avoid ErrorHandler conflict
export { AuthMiddleware, AuthFactory } from './middleware/auth';
export { attachRequestId, logRequest } from './middleware/request-logger';
export { ErrorHandler as ErrorHandlerMiddleware } from './middleware/error-handler';

// Legacy middleware exports for backward compatibility
export { AuthMiddleware as verifyToken } from './middleware/auth';

// Testing utilities are exported separately to avoid Node.js dependencies in browser builds
// Use: import { ... } from '@yggdrasil/shared-utilities/testing' for test infrastructure

// OpenAPI utilities
export {
  createOpenAPIDocument,
  getSharedSchemas,
  getSharedResponses,
  getSharedParameters,
  addCommonResponses,
  createPaginatedResponse
} from './openapi';
export { setupSwagger, combineOpenAPIDocs, documentRoute } from './openapi/setup-swagger';