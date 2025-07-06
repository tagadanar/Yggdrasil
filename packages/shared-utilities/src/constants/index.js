"use strict";
// Path: packages/shared-utilities/src/constants/index.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.API_ENDPOINTS = exports.DEFAULT_USER_PREFERENCES = exports.SUPPORTED_LANGUAGES = exports.AUDIT_ACTIONS = exports.NOTIFICATION_TYPES = exports.RECURRING_PATTERNS = exports.CONTENT_TYPES = exports.EVENT_TYPES = exports.FILE_UPLOAD_LIMITS = exports.VALIDATION_MESSAGES = exports.PAGINATION_DEFAULTS = exports.JWT_EXPIRY = exports.HTTP_STATUS = exports.USER_ROLES = void 0;
exports.USER_ROLES = {
    ADMIN: 'admin',
    STAFF: 'staff',
    TEACHER: 'teacher',
    STUDENT: 'student',
};
exports.HTTP_STATUS = {
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
};
exports.JWT_EXPIRY = {
    ACCESS_TOKEN: '2h',
    REFRESH_TOKEN: '24h',
    PASSWORD_RESET: '1h',
};
exports.PAGINATION_DEFAULTS = {
    PAGE: 1,
    LIMIT: 10,
    MAX_LIMIT: 100,
};
exports.VALIDATION_MESSAGES = {
    REQUIRED_FIELD: 'This field is required',
    INVALID_EMAIL: 'Please enter a valid email address',
    PASSWORD_MIN_LENGTH: 'Password must be at least 8 characters long',
    INVALID_USER_ROLE: 'Invalid user role specified',
    INVALID_DATE_RANGE: 'End date must be after start date',
    FILE_TOO_LARGE: 'File size exceeds maximum allowed limit',
    INVALID_FILE_TYPE: 'Invalid file type',
};
exports.FILE_UPLOAD_LIMITS = {
    PROFILE_PHOTO: {
        MAX_SIZE: 5 * 1024 * 1024, // 5MB
        ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
    },
    COURSE_ATTACHMENT: {
        MAX_SIZE: 50 * 1024 * 1024, // 50MB
        ALLOWED_TYPES: ['application/pdf', 'image/jpeg', 'image/png', 'text/plain'],
    },
};
exports.EVENT_TYPES = {
    CLASS: 'class',
    EXAM: 'exam',
    MEETING: 'meeting',
    EVENT: 'event',
};
exports.CONTENT_TYPES = {
    TEXT: 'text',
    VIDEO: 'video',
    EXERCISE: 'exercise',
    QUIZ: 'quiz',
};
exports.RECURRING_PATTERNS = {
    DAILY: 'daily',
    WEEKLY: 'weekly',
    MONTHLY: 'monthly',
};
exports.NOTIFICATION_TYPES = {
    SCHEDULE_CHANGE: 'schedule_change',
    NEW_ANNOUNCEMENT: 'new_announcement',
    ASSIGNMENT_REMINDER: 'assignment_reminder',
    COURSE_UPDATE: 'course_update',
    SYSTEM_ALERT: 'system_alert',
};
exports.AUDIT_ACTIONS = {
    CREATE: 'create',
    UPDATE: 'update',
    DELETE: 'delete',
    LOGIN: 'login',
    LOGOUT: 'logout',
    PASSWORD_CHANGE: 'password_change',
    ROLE_CHANGE: 'role_change',
};
exports.SUPPORTED_LANGUAGES = {
    FRENCH: 'fr',
    ENGLISH: 'en',
};
exports.DEFAULT_USER_PREFERENCES = {
    language: exports.SUPPORTED_LANGUAGES.FRENCH,
    timezone: 'Europe/Paris',
    theme: 'light',
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
        fontSize: 'medium',
        highContrast: false,
    },
};
exports.API_ENDPOINTS = {
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
};
//# sourceMappingURL=index.js.map