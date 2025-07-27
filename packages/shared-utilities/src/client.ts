// packages/shared-utilities/src/client.ts
// Client-side only exports - safe for browser bundling

// Types - safe for client-side
export type {
  // Auth types
  AuthTokens, LoginRequest, RegisterRequest, JWTPayload, RefreshTokenPayload,
  AuthResult, User, UserProfile, UserPreferences, ContactInfo, AuthRequest
} from './types/auth';

export type {
  // Core strict types
  UserId, Email, JWT, RequestId, UserRole, USER_ROLES,
  ApiResponse, ValidationResult
} from './types/strict';

export type {
  // Other client-safe types
  PaginatedResponse
} from './types/api';

export type {
  NewsArticle
} from './types/news';

export type {
  Course, Chapter, Section, Exercise, ExerciseSubmission
} from './types/course';

export type {
  Event
} from './types/planning';

// Validation schemas - safe for client-side
export * from './validation/auth';
export * from './validation/news';
export * from './validation/course';
export * from './validation/planning';

// Constants - safe for client-side
export * from './constants';

// Client-safe helpers
export { ValidationHelper } from './helpers/validation';

// HTTP status codes and response helpers - safe for client-side
export { ResponseHelper } from './helpers/response';
export { HTTP_STATUS } from './constants';