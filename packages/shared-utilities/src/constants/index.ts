// Path: packages/shared-utilities/src/constants/index.ts

export const USER_ROLES = {
  ADMIN: 'admin',
  STAFF: 'staff',
  TEACHER: 'teacher',
  STUDENT: 'student',
} as const;

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
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

export const JWT_EXPIRY = {
  ACCESS_TOKEN: '2h',
  REFRESH_TOKEN: '24h',
  PASSWORD_RESET: '1h',
} as const;

export const PAGINATION_DEFAULTS = {
  PAGE: 1,
  LIMIT: 10,
  MAX_LIMIT: 100,
} as const;

export const VALIDATION_MESSAGES = {
  REQUIRED_FIELD: 'This field is required',
  INVALID_EMAIL: 'Please enter a valid email address',
  PASSWORD_MIN_LENGTH: 'Password must be at least 8 characters long',
  INVALID_USER_ROLE: 'Invalid user role specified',
  INVALID_DATE_RANGE: 'End date must be after start date',
  FILE_TOO_LARGE: 'File size exceeds maximum allowed limit',
  INVALID_FILE_TYPE: 'Invalid file type',
} as const;

export const FILE_UPLOAD_LIMITS = {
  PROFILE_PHOTO: {
    MAX_SIZE: 5 * 1024 * 1024, // 5MB
    ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
  },
  COURSE_ATTACHMENT: {
    MAX_SIZE: 50 * 1024 * 1024, // 50MB
    ALLOWED_TYPES: ['application/pdf', 'image/jpeg', 'image/png', 'text/plain'],
  },
} as const;

export const EVENT_TYPES = {
  CLASS: 'class',
  EXAM: 'exam',
  MEETING: 'meeting',
  EVENT: 'event',
} as const;

export const CONTENT_TYPES = {
  TEXT: 'text',
  VIDEO: 'video',
  EXERCISE: 'exercise',
  QUIZ: 'quiz',
} as const;

export const RECURRING_PATTERNS = {
  DAILY: 'daily',
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
} as const;

export const NOTIFICATION_TYPES = {
  SCHEDULE_CHANGE: 'schedule_change',
  NEW_ANNOUNCEMENT: 'new_announcement',
  ASSIGNMENT_REMINDER: 'assignment_reminder',
  COURSE_UPDATE: 'course_update',
  SYSTEM_ALERT: 'system_alert',
} as const;

export const AUDIT_ACTIONS = {
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  LOGIN: 'login',
  LOGOUT: 'logout',
  PASSWORD_CHANGE: 'password_change',
  ROLE_CHANGE: 'role_change',
} as const;

export const SUPPORTED_LANGUAGES = {
  FRENCH: 'fr',
  ENGLISH: 'en',
} as const;

export const DEFAULT_USER_PREFERENCES = {
  language: SUPPORTED_LANGUAGES.FRENCH,
  timezone: 'Europe/Paris',
  theme: 'light' as const,
  notifications: {
    email: true,
    push: true,
    sms: false,
    scheduleChanges: true,
    newAnnouncements: true,
    assignmentReminders: true,
  },
  accessibility: {
    colorblindMode: false,
    fontSize: 'medium' as const,
    highContrast: false,
  },
};

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/api/auth/login',
    LOGOUT: '/api/auth/logout',
    REFRESH: '/api/auth/refresh',
    FORGOT_PASSWORD: '/api/auth/forgot-password',
    RESET_PASSWORD: '/api/auth/reset-password',
  },
  USERS: {
    PROFILE: '/api/users/profile',
    PREFERENCES: '/api/users/preferences',
    ACTIVITY_LOGS: '/api/users/activity-logs',
  },
  COURSES: {
    LIST: '/api/courses',
    DETAIL: '/api/courses/:id',
    CHAPTERS: '/api/courses/:id/chapters',
    SECTIONS: '/api/courses/:id/chapters/:chapterId/sections',
  },
  PLANNING: {
    EVENTS: '/api/planning/events',
    CONFLICTS: '/api/planning/conflicts',
  },
  NEWS: {
    LIST: '/api/news',
    DETAIL: '/api/news/:id',
  },
  STATISTICS: {
    DASHBOARD: '/api/statistics/dashboard',
    ATTENDANCE: '/api/statistics/attendance',
    GRADES: '/api/statistics/grades',
  },
} as const;