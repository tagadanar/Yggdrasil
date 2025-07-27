// packages/shared-utilities/src/index.ts
// Main export file for shared utilities

// Types - explicit exports to avoid conflicts
// Use strict types over basic types for better type safety
export type {
  // From types/strict.ts (preferred for type safety)
  UserId,
  Email,
  JWT,
  HashedPassword,
  PlainPassword,
  RequestId,
  SessionId,
  NodeEnvironment,
  LogLevel,
  UserRole,
  USER_ROLES,
  ApiResponse,
  StrictRequest,
  StrictResponse,
  ValidationResult,
  ErrorHandler,
  AsyncFunction,
  RequestHandler,
  Nullable,
  Optional,
  Maybe,
  Brand,
  StrictOmit,
  StrictPartial,
  StrictRequired,
  DeepReadonly,
  DeepPartial,
  StrictJWTPayload,
  StrictTimestamps,
  StrictDocument,
  ServiceResult,
} from './types/strict';

// Type guards and utilities from strict
export {
  isUserId,
  isEmail,
  isJWT,
  isRequestId,
  isNodeEnvironment,
  isLogLevel,
  isUserRole,
  exhaustiveCheck,
} from './types/strict';

// From types/auth.ts (non-conflicting exports)
export type {
  AuthTokens,
  LoginRequest,
  RegisterRequest,
  JWTPayload,
  RefreshTokenPayload,
  AuthResult,
  User,
  UserProfile,
  UserPreferences,
  ContactInfo,
  AuthRequest,
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

// Helpers - client-safe only
export { ResponseHelper } from './helpers/response';
export { ValidationHelper } from './helpers/validation';

// JWT utilities (server-side only)
export { SharedJWTHelper, initializeJWT } from './helpers/jwt';
// SecurityLogger - TEMPORARILY added back for backend services ONLY
// Frontend should use @yggdrasil/shared-utilities/client
export { SecurityLogger } from './helpers/security-logger';

// Logging utilities - TEMPORARILY added back for backend services ONLY
// Frontend should use @yggdrasil/shared-utilities/client
export {
  logger,
  authLogger,
  userLogger,
  courseLogger,
  newsLogger,
  planningLogger,
  statsLogger,
} from './logging/logger';

// Error handling (basic types only, not Node.js modules)
export * from './errors/AppError';

// Configuration - TEMPORARILY added back for backend services ONLY
// Frontend should use @yggdrasil/shared-utilities/client
export { config } from './config/env-validator';

// Middleware - TEMPORARILY added back for backend services ONLY
// Frontend should use @yggdrasil/shared-utilities/client
export { AuthFactory } from './middleware/auth-enhanced';
export { AuthMiddleware } from './middleware/auth';

// Testing utilities are exported separately to avoid Node.js dependencies in browser builds
// Use: import { ... } from '@yggdrasil/shared-utilities/testing' for test infrastructure

// OpenAPI utilities (server-side only)
export {
  createOpenAPIDocument,
  getSharedSchemas,
  getSharedResponses,
  getSharedParameters,
  addCommonResponses,
  createPaginatedResponse,
} from './openapi';
export { setupSwagger } from './openapi/setup-swagger';
