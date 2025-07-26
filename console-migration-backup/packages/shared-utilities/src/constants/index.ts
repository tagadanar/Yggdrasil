// packages/shared-utilities/src/constants/index.ts
// Shared constants across the platform

/**
 * JWT Token Configuration Constants.
 * 
 * Defines token expiration times for both string format (JWT library)
 * and numeric format (manual calculations) to ensure consistency
 * across all authentication operations.
 */
export const JWT_CONFIG = {
  /** Access token expiration in string format for JWT library */
  ACCESS_TOKEN_EXPIRES_IN: '2h',
  /** Refresh token expiration in string format for JWT library */
  REFRESH_TOKEN_EXPIRES_IN: '24h',
  /** Access token expiration in seconds for manual calculations */
  ACCESS_TOKEN_EXPIRES_IN_SECONDS: 2 * 60 * 60, // 2 hours
  /** Refresh token expiration in seconds for manual calculations */
  REFRESH_TOKEN_EXPIRES_IN_SECONDS: 24 * 60 * 60, // 24 hours
} as const;

/**
 * Password Security Configuration.
 * 
 * Defines security parameters for password handling including
 * strength requirements and bcrypt hashing settings.
 */
export const PASSWORD_CONFIG = {
  /** Minimum password length requirement */
  MIN_LENGTH: 8,
  /** Bcrypt salt rounds for password hashing (higher = more secure but slower) */
  SALT_ROUNDS: 12,
  /** Password reset token expiration time */
  RESET_TOKEN_EXPIRES_IN: '1h',
} as const;

/**
 * User Role Constants.
 * 
 * Defines the four user roles supported by the platform.
 * Used for role-based access control and permission management.
 */
export const USER_ROLES = {
  /** Administrator with full system access */
  ADMIN: 'admin',
  /** Staff member with content and user management access */
  STAFF: 'staff',
  /** Teacher with course and student management access */
  TEACHER: 'teacher',
  /** Student with learning and course access */
  STUDENT: 'student',
} as const;

export const ROLE_PERMISSIONS = {
  [USER_ROLES.ADMIN]: [
    'user:read',
    'user:write',
    'user:delete',
    'course:read',
    'course:write',
    'course:delete',
    'news:read',
    'news:write',
    'news:delete',
    'planning:read',
    'planning:write',
    'planning:delete',
    'statistics:read',
    'statistics:write',
    'system:admin',
  ],
  [USER_ROLES.STAFF]: [
    'user:read',
    'user:write',
    'course:read',
    'course:write',
    'news:read',
    'news:write',
    'planning:read',
    'planning:write',
    'statistics:read',
  ],
  [USER_ROLES.TEACHER]: [
    'user:read',
    'course:read',
    'course:write',
    'news:read',
    'planning:read',
    'statistics:read',
  ],
  [USER_ROLES.STUDENT]: [
    'user:read',
    'course:read',
    'news:read',
    'planning:read',
  ],
} as const;

/**
 * HTTP Status Code Constants.
 * 
 * Commonly used HTTP status codes for consistent API responses
 * across all services in the platform.
 */
export const HTTP_STATUS = {
  /** Request successful */
  OK: 200,
  /** Resource created successfully */
  CREATED: 201,
  /** Request successful with no response body */
  NO_CONTENT: 204,
  /** Client error - invalid request format */
  BAD_REQUEST: 400,
  /** Authentication required or failed */
  UNAUTHORIZED: 401,
  /** Access denied - insufficient permissions */
  FORBIDDEN: 403,
  /** Requested resource not found */
  NOT_FOUND: 404,
  /** Resource conflict (duplicate, constraint violation) */
  CONFLICT: 409,
  /** Request data validation failed */
  UNPROCESSABLE_ENTITY: 422,
  /** Server error - unexpected failure */
  INTERNAL_SERVER_ERROR: 500,
} as const;

/**
 * Standardized Error Messages.
 * 
 * Provides consistent, user-friendly error messages across all services.
 * Organized by category for easy maintenance and localization support.
 */
export const ERROR_MESSAGES = {
  // Authentication errors
  /** Invalid login credentials provided */
  INVALID_CREDENTIALS: 'Invalid email or password',
  /** Account locked due to security concerns */
  ACCOUNT_LOCKED: 'Account has been locked due to multiple failed login attempts',
  /** JWT token has expired and needs refresh */
  TOKEN_EXPIRED: 'Token has expired',
  /** JWT token is malformed or invalid */
  TOKEN_INVALID: 'Invalid token',
  /** Request requires authentication */
  UNAUTHORIZED: 'Unauthorized access',
  /** User lacks required permissions */
  FORBIDDEN: 'Insufficient permissions',

  // Validation errors
  /** General validation failure message */
  VALIDATION_FAILED: 'Validation failed',
  /** Required field is missing or empty */
  REQUIRED_FIELD: 'This field is required',
  /** Email format is invalid */
  INVALID_EMAIL: 'Invalid email format',
  /** Password doesn't meet security requirements */
  PASSWORD_TOO_WEAK: 'Password must contain uppercase, lowercase, and number',

  // Generic errors
  /** Requested resource could not be found */
  NOT_FOUND: 'Resource not found',
  /** Unexpected server error occurred */
  INTERNAL_ERROR: 'Internal server error',
  /** Client request is malformed */
  BAD_REQUEST: 'Bad request',

  // User errors
  /** Specific user account not found */
  USER_NOT_FOUND: 'User not found',
  /** Attempt to create duplicate user */
  USER_ALREADY_EXISTS: 'User already exists',
  /** Email address already registered */
  EMAIL_ALREADY_EXISTS: 'Email already exists',
} as const;

// File Upload Configuration
export const FILE_CONFIG = {
  MAX_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
  ALLOWED_DOCUMENT_TYPES: ['application/pdf', 'text/plain', 'application/msword'],
  PROFILE_PHOTO_MAX_SIZE: 2 * 1024 * 1024, // 2MB
} as const;

// Pagination defaults
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100,
} as const;

// Default user preferences
export const DEFAULT_USER_PREFERENCES = {
  language: 'fr',
  notifications: {
    scheduleChanges: true,
    newAnnouncements: true,
    assignmentReminders: true,
  },
  accessibility: {
    colorblindMode: false,
    fontSize: 'medium',
    highContrast: false,
  },
} as const;

// Development mode settings
export const DEV_CONFIG = {
  BYPASS_AUTH: process.env['NODE_ENV'] === 'development' && process.env['BYPASS_AUTH'] === 'true',
  LOG_LEVEL: process.env['NODE_ENV'] === 'development' ? 'debug' : 'info',
} as const;
