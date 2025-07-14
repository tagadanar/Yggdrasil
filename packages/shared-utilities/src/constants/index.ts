// packages/shared-utilities/src/constants/index.ts
// Shared constants across the platform

// JWT Token Configuration
export const JWT_CONFIG = {
  ACCESS_TOKEN_EXPIRES_IN: '2h',
  REFRESH_TOKEN_EXPIRES_IN: '24h',
  ACCESS_TOKEN_EXPIRES_IN_SECONDS: 2 * 60 * 60, // 2 hours
  REFRESH_TOKEN_EXPIRES_IN_SECONDS: 24 * 60 * 60, // 24 hours
} as const;

// Password Security
export const PASSWORD_CONFIG = {
  MIN_LENGTH: 8,
  SALT_ROUNDS: 12,
  RESET_TOKEN_EXPIRES_IN: '1h',
} as const;

// User Roles with permissions
export const USER_ROLES = {
  ADMIN: 'admin',
  STAFF: 'staff', 
  TEACHER: 'teacher',
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

// HTTP Status Codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  // Authentication errors
  INVALID_CREDENTIALS: 'Invalid email or password',
  ACCOUNT_LOCKED: 'Account has been locked due to multiple failed login attempts',
  TOKEN_EXPIRED: 'Token has expired',
  TOKEN_INVALID: 'Invalid token',
  UNAUTHORIZED: 'Unauthorized access',
  FORBIDDEN: 'Insufficient permissions',
  
  // Validation errors
  VALIDATION_FAILED: 'Validation failed',
  REQUIRED_FIELD: 'This field is required',
  INVALID_EMAIL: 'Invalid email format',
  PASSWORD_TOO_WEAK: 'Password must contain uppercase, lowercase, and number',
  
  // Generic errors
  NOT_FOUND: 'Resource not found',
  INTERNAL_ERROR: 'Internal server error',
  BAD_REQUEST: 'Bad request',
  
  // User errors
  USER_NOT_FOUND: 'User not found',
  USER_ALREADY_EXISTS: 'User already exists',
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
  BYPASS_AUTH: process.env.NODE_ENV === 'development' && process.env.BYPASS_AUTH === 'true',
  LOG_LEVEL: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
} as const;