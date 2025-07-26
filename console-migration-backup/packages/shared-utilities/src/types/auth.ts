// packages/shared-utilities/src/types/auth.ts
// Authentication and authorization types

/**
 * User role enumeration defining access levels across the platform.
 * 
 * Roles follow hierarchical permissions model:
 * - admin: Full system access, user management, all content
 * - staff: Content management, user coordination, statistics access
 * - teacher: Course management, student progress, limited user access
 * - student: Course enrollment, personal progress, read-only access
 */
export type UserRole = 'admin' | 'staff' | 'teacher' | 'student';

/**
 * Authentication token pair for secure user sessions.
 * 
 * Contains both short-lived access tokens for API requests and
 * long-lived refresh tokens for session persistence.
 */
export interface AuthTokens {
  /** Short-lived JWT token for API authentication (2 hours) */
  accessToken: string;
  /** Long-lived JWT token for session refresh (24 hours) */
  refreshToken: string;
}

/**
 * User login request payload.
 * 
 * Contains credentials required for user authentication.
 */
export interface LoginRequest {
  /** User's registered email address */
  email: string;
  /** User's password in plain text (will be verified against bcrypt hash) */
  password: string;
}

/**
 * User registration request payload.
 * 
 * Contains all information required to create a new user account
 * with appropriate role and profile data.
 */
export interface RegisterRequest {
  /** Unique email address for the new account */
  email: string;
  /** Password meeting security requirements (min 8 chars, mixed case, numbers) */
  password: string;
  /** User role determining platform permissions */
  role: UserRole;
  /** Basic profile information */
  profile: {
    /** User's first name */
    firstName: string;
    /** User's last name */
    lastName: string;
  };
}

export interface AuthResult {
  success: boolean;
  user?: User;
  tokens?: AuthTokens;
  error?: string;
}

/**
 * JWT access token payload structure.
 * 
 * Contains user identity and role information for API authorization.
 * Includes both 'id' and 'userId' fields for backward compatibility.
 */
export interface JWTPayload {
  /** User ID (MongoDB ObjectId string) */
  id: string;
  /** Consistent field name for user ID (same as id, for compatibility) */
  userId: string;
  /** User's email address */
  email: string;
  /** User's role for permission checks */
  role: UserRole;
  /** Token version for invalidation support */
  tokenVersion: number;
  /** Token issued at timestamp (JWT standard) */
  iat?: number;
  /** Token expiration timestamp (JWT standard) */
  exp?: number;
}

/**
 * JWT refresh token payload structure.
 * 
 * Contains minimal user identification for token refresh operations.
 * Excludes sensitive information like email and role.
 */
export interface RefreshTokenPayload {
  /** User ID (MongoDB ObjectId string) */
  id: string;
  /** Consistent field name for user ID (same as id, for compatibility) */
  userId: string;
  /** Token version for invalidation support */
  tokenVersion: number;
  /** Token issued at timestamp (JWT standard) */
  iat?: number;
  /** Token expiration timestamp (JWT standard) */
  exp?: number;
}

/**
 * Core User interface representing a complete user account.
 * 
 * Contains all user data including authentication, profile, preferences,
 * and account status information used throughout the platform.
 */
export interface User {
  /** MongoDB ObjectId as string */
  _id: string;
  /** Unique email address for authentication */
  email: string;
  /** User role determining permissions */
  role: UserRole;
  /** Detailed profile information */
  profile: UserProfile;
  /** User-specific platform preferences */
  preferences: UserPreferences;
  /** Account activation status */
  isActive: boolean;
  /** Last successful login timestamp */
  lastLogin?: Date;
  /** Account creation timestamp */
  createdAt: Date;
  /** Last account modification timestamp */
  updatedAt: Date;
}

/**
 * User profile information with role-specific fields.
 * 
 * Contains personal information and role-specific data that varies
 * based on user type (student, teacher, staff, admin).
 */
export interface UserProfile {
  /** User's first name */
  firstName: string;
  /** User's last name */
  lastName: string;
  /** Optional profile photo URL or file path */
  photo?: string;
  /** Student identification number (students only) */
  studentId?: string;
  /** Department or faculty affiliation (staff only) */
  department?: string;
  /** Teaching specialties and subjects (teachers only) */
  specialties?: string[];
  /** Professional biography (teachers only) */
  bio?: string;
  /** Available office hours schedule (teachers only) */
  officeHours?: string;
  /** Extended contact information */
  contactInfo?: ContactInfo;
}

/**
 * Extended contact information for user profiles.
 * 
 * Contains optional contact details and emergency contact information
 * for comprehensive user records.
 */
export interface ContactInfo {
  /** Phone number for direct contact */
  phone?: string;
  /** Physical address */
  address?: string;
  /** Emergency contact information */
  emergencyContact?: {
    /** Emergency contact's full name */
    name: string;
    /** Emergency contact's phone number */
    phone: string;
    /** Relationship to user (parent, spouse, friend, etc.) */
    relation: string;
  };
}

/**
 * User preferences for platform customization.
 * 
 * Contains language, notification, and accessibility settings
 * that personalize the user experience.
 */
export interface UserPreferences {
  /** Interface language preference */
  language: 'fr' | 'en';
  /** Notification preferences */
  notifications: {
    /** Receive notifications for schedule changes */
    scheduleChanges: boolean;
    /** Receive notifications for new announcements */
    newAnnouncements: boolean;
    /** Receive assignment deadline reminders */
    assignmentReminders: boolean;
  };
  /** Accessibility settings */
  accessibility: {
    /** Enable colorblind-friendly interface */
    colorblindMode: boolean;
    /** Interface font size preference */
    fontSize: 'small' | 'medium' | 'large';
    /** Enable high contrast mode */
    highContrast: boolean;
  };
}

// Express Request with authenticated user
import { Request } from 'express';

export interface AuthRequest extends Request {
  user?: any; // Will be populated by auth middleware
}
