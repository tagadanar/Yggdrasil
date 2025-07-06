export declare const USER_ROLES: {
    readonly ADMIN: "admin";
    readonly STAFF: "staff";
    readonly TEACHER: "teacher";
    readonly STUDENT: "student";
};
export declare const HTTP_STATUS: {
    readonly OK: 200;
    readonly CREATED: 201;
    readonly NO_CONTENT: 204;
    readonly BAD_REQUEST: 400;
    readonly UNAUTHORIZED: 401;
    readonly FORBIDDEN: 403;
    readonly NOT_FOUND: 404;
    readonly CONFLICT: 409;
    readonly UNPROCESSABLE_ENTITY: 422;
    readonly TOO_MANY_REQUESTS: 429;
    readonly INTERNAL_SERVER_ERROR: 500;
    readonly SERVICE_UNAVAILABLE: 503;
};
export declare const JWT_EXPIRY: {
    readonly ACCESS_TOKEN: "2h";
    readonly REFRESH_TOKEN: "24h";
    readonly PASSWORD_RESET: "1h";
};
export declare const PAGINATION_DEFAULTS: {
    readonly PAGE: 1;
    readonly LIMIT: 10;
    readonly MAX_LIMIT: 100;
};
export declare const VALIDATION_MESSAGES: {
    readonly REQUIRED_FIELD: "This field is required";
    readonly INVALID_EMAIL: "Please enter a valid email address";
    readonly PASSWORD_MIN_LENGTH: "Password must be at least 8 characters long";
    readonly INVALID_USER_ROLE: "Invalid user role specified";
    readonly INVALID_DATE_RANGE: "End date must be after start date";
    readonly FILE_TOO_LARGE: "File size exceeds maximum allowed limit";
    readonly INVALID_FILE_TYPE: "Invalid file type";
};
export declare const FILE_UPLOAD_LIMITS: {
    readonly PROFILE_PHOTO: {
        readonly MAX_SIZE: number;
        readonly ALLOWED_TYPES: readonly ["image/jpeg", "image/png", "image/webp"];
    };
    readonly COURSE_ATTACHMENT: {
        readonly MAX_SIZE: number;
        readonly ALLOWED_TYPES: readonly ["application/pdf", "image/jpeg", "image/png", "text/plain"];
    };
};
export declare const EVENT_TYPES: {
    readonly CLASS: "class";
    readonly EXAM: "exam";
    readonly MEETING: "meeting";
    readonly EVENT: "event";
};
export declare const CONTENT_TYPES: {
    readonly TEXT: "text";
    readonly VIDEO: "video";
    readonly EXERCISE: "exercise";
    readonly QUIZ: "quiz";
};
export declare const RECURRING_PATTERNS: {
    readonly DAILY: "daily";
    readonly WEEKLY: "weekly";
    readonly MONTHLY: "monthly";
};
export declare const NOTIFICATION_TYPES: {
    readonly SCHEDULE_CHANGE: "schedule_change";
    readonly NEW_ANNOUNCEMENT: "new_announcement";
    readonly ASSIGNMENT_REMINDER: "assignment_reminder";
    readonly COURSE_UPDATE: "course_update";
    readonly SYSTEM_ALERT: "system_alert";
};
export declare const AUDIT_ACTIONS: {
    readonly CREATE: "create";
    readonly UPDATE: "update";
    readonly DELETE: "delete";
    readonly LOGIN: "login";
    readonly LOGOUT: "logout";
    readonly PASSWORD_CHANGE: "password_change";
    readonly ROLE_CHANGE: "role_change";
};
export declare const SUPPORTED_LANGUAGES: {
    readonly FRENCH: "fr";
    readonly ENGLISH: "en";
};
export declare const DEFAULT_USER_PREFERENCES: {
    language: "fr";
    timezone: string;
    theme: "light";
    notifications: {
        email: boolean;
        push: boolean;
        sms: boolean;
        scheduleChanges: boolean;
        newAnnouncements: boolean;
        assignmentReminders: boolean;
    };
    accessibility: {
        colorblindMode: boolean;
        fontSize: "medium";
        highContrast: boolean;
    };
};
export declare const API_ENDPOINTS: {
    readonly AUTH: {
        readonly LOGIN: "/api/auth/login";
        readonly LOGOUT: "/api/auth/logout";
        readonly REFRESH: "/api/auth/refresh";
        readonly FORGOT_PASSWORD: "/api/auth/forgot-password";
        readonly RESET_PASSWORD: "/api/auth/reset-password";
    };
    readonly USERS: {
        readonly PROFILE: "/api/users/profile";
        readonly PREFERENCES: "/api/users/preferences";
        readonly ACTIVITY_LOGS: "/api/users/activity-logs";
    };
    readonly COURSES: {
        readonly LIST: "/api/courses";
        readonly DETAIL: "/api/courses/:id";
        readonly CHAPTERS: "/api/courses/:id/chapters";
        readonly SECTIONS: "/api/courses/:id/chapters/:chapterId/sections";
    };
    readonly PLANNING: {
        readonly EVENTS: "/api/planning/events";
        readonly CONFLICTS: "/api/planning/conflicts";
    };
    readonly NEWS: {
        readonly LIST: "/api/news";
        readonly DETAIL: "/api/news/:id";
    };
    readonly STATISTICS: {
        readonly DASHBOARD: "/api/statistics/dashboard";
        readonly ATTENDANCE: "/api/statistics/attendance";
        readonly GRADES: "/api/statistics/grades";
    };
};
//# sourceMappingURL=index.d.ts.map