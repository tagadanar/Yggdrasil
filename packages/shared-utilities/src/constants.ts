// packages/shared-utilities/src/constants.ts
// Shared constants for Yggdrasil platform

export const JWT_CONFIG = {
  ACCESS_TOKEN_EXPIRES_IN: '15m',
  REFRESH_TOKEN_EXPIRES_IN: '7d',
  ISSUER: 'yggdrasil-auth-service',
  AUDIENCE: 'yggdrasil-platform'
};

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500
};

export const USER_ROLES = {
  ADMIN: 'admin',
  STAFF: 'staff',
  TEACHER: 'teacher',
  STUDENT: 'student'
} as const;

export const NEWS_CATEGORIES = {
  GENERAL: 'general',
  ACADEMIC: 'academic',
  EVENTS: 'events',
  ANNOUNCEMENTS: 'announcements'
} as const;

export const ERROR_MESSAGES = {
  EMAIL_ALREADY_EXISTS: 'Email already exists',
  INTERNAL_ERROR: 'Internal server error',
  INVALID_CREDENTIALS: 'Invalid email or password',
  ACCOUNT_LOCKED: 'Account locked',
  TOKEN_INVALID: 'Invalid token',
  USER_NOT_FOUND: 'User not found',
  REGISTRATION_FAILED: 'Registration failed',
  LOGIN_FAILED: 'Login failed',
  UNAUTHORIZED: 'Unauthorized',
  FORBIDDEN: 'Forbidden',
  NOT_FOUND: 'Not found',
  VALIDATION_ERROR: 'Validation error'
} as const;

export const PASSWORD_CONFIG = {
  SALT_ROUNDS: process.env.NODE_ENV === 'test' ? 4 : 12, // Faster hashing for tests
  MIN_LENGTH: 6,
  MAX_LENGTH: 128,
  REQUIRE_UPPERCASE: true,
  REQUIRE_LOWERCASE: true,
  REQUIRE_NUMBERS: true,
  REQUIRE_SYMBOLS: false
} as const;

export const DEFAULT_USER_PREFERENCES = {
  language: 'en' as const,
  notifications: {
    scheduleChanges: true,
    newAnnouncements: true,
    assignmentReminders: true,
  },
  accessibility: {
    colorblindMode: false,
    fontSize: 'medium' as const,
    highContrast: false,
  },
} as const;