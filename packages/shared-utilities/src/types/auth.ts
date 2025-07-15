// packages/shared-utilities/src/types/auth.ts
// Authentication and authorization types

export type UserRole = 'admin' | 'staff' | 'teacher' | 'student';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  role: UserRole;
  profile: {
    firstName: string;
    lastName: string;
  };
}

export interface AuthResult {
  success: boolean;
  user?: User;
  tokens?: AuthTokens;
  error?: string;
}

export interface JWTPayload {
  id: string;
  userId: string;  // Consistent field name for user ID
  email: string;
  role: UserRole;
  tokenVersion: number;
  iat?: number;
  exp?: number;
}

export interface RefreshTokenPayload {
  id: string;
  userId: string;  // Consistent field name for user ID
  tokenVersion: number;
  iat?: number;
  exp?: number;
}

// Core User interface
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

export interface UserProfile {
  firstName: string;
  lastName: string;
  photo?: string;
  studentId?: string; // students only
  department?: string; // staff only
  specialties?: string[]; // teachers only
  bio?: string; // teachers only
  officeHours?: string; // teachers only
  contactInfo?: ContactInfo;
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
  language: 'fr' | 'en';
  notifications: {
    scheduleChanges: boolean;
    newAnnouncements: boolean;
    assignmentReminders: boolean;
  };
  accessibility: {
    colorblindMode: boolean;
    fontSize: 'small' | 'medium' | 'large';
    highContrast: boolean;
  };
}

// Express Request with authenticated user
import { Request } from 'express';

export interface AuthRequest extends Request {
  user?: any; // Will be populated by auth middleware
}