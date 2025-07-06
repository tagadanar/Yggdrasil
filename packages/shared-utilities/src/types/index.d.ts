export interface User {
    _id: string;
    email: string;
    role: UserRole;
    profile: UserProfile;
    preferences: UserPreferences;
    isActive: boolean;
    lastLogin?: Date;
    createdAt: Date;
    updatedAt: Date;
}
export type UserRole = 'admin' | 'staff' | 'teacher' | 'student';
export interface UserProfile {
    firstName: string;
    lastName: string;
    photo?: string;
    phone?: string;
    bio?: string;
    studentId?: string;
    department?: string;
    specialties?: string[];
    officeHours?: string;
    promotion?: string;
    contactInfo?: ContactInfo;
    profilePhoto?: string;
}
export interface ContactInfo {
    phone?: string;
    address?: string;
    emergencyContact?: {
        name: string;
        phone: string;
        relation: string;
    };
}
export interface UserPreferences {
    language: string;
    timezone?: string;
    theme?: 'light' | 'dark' | 'auto';
    notifications: NotificationPreferences;
    accessibility: AccessibilityPreferences;
}
export interface NotificationPreferences {
    email: boolean;
    push: boolean;
    sms: boolean;
    scheduleChanges: boolean;
    newAnnouncements: boolean;
    assignmentReminders: boolean;
}
export interface AccessibilityPreferences {
    colorblindMode: boolean;
    fontSize: 'small' | 'medium' | 'large';
    highContrast: boolean;
}
export interface AuthTokens {
    accessToken: string;
    refreshToken: string;
}
export interface JWTPayload {
    id: string;
    email: string;
    role: UserRole;
    iat: number;
    exp: number;
}
export interface UserActivity {
    action: string;
    details: Record<string, any>;
    timestamp: Date;
}
export * from './course';
export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}
export interface Course {
    _id: string;
    title: string;
    description: string;
    instructor: string;
    chapters: Chapter[];
    isPublished: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export interface Chapter {
    _id: string;
    title: string;
    description: string;
    sections: Section[];
    order: number;
}
export interface Section {
    _id: string;
    title: string;
    content: string;
    type: 'text' | 'video' | 'exercise' | 'quiz';
    order: number;
}
export interface CalendarEvent {
    _id: string;
    title: string;
    description?: string;
    startDate: Date;
    endDate: Date;
    type: 'class' | 'exam' | 'meeting' | 'event';
    attendees: string[];
    location?: string;
    isRecurring: boolean;
    recurringPattern?: RecurringPattern;
}
export interface RecurringPattern {
    type: 'daily' | 'weekly' | 'monthly';
    interval: number;
    endDate?: Date;
    daysOfWeek?: number[];
}
export interface NewsArticle {
    _id: string;
    title: string;
    content: string;
    author: string;
    category: string;
    tags: string[];
    isPublished: boolean;
    publishedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}
export interface AuditLog {
    _id: string;
    userId: string;
    action: string;
    resource: string;
    resourceId: string;
    details: {
        before?: any;
        after?: any;
        metadata?: any;
    };
    ipAddress: string;
    userAgent: string;
    timestamp: Date;
    sessionId: string;
}
//# sourceMappingURL=index.d.ts.map