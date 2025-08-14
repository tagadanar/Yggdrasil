// packages/frontend/src/hooks/useAuthState.ts
// Additional utilities for authentication state management (complements AuthProvider)

import { useCallback, useMemo } from 'react';
import { useAuth } from '@/lib/auth/AuthProvider';
import { User } from '@yggdrasil/shared-utilities/client';

type UserRole = 'admin' | 'staff' | 'teacher' | 'student';

interface UseAuthStateReturn {
  // User data
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  
  // Role checking
  hasRole: (role: UserRole) => boolean;
  hasAnyRole: (roles: UserRole[]) => boolean;
  isAdmin: boolean;
  isStaff: boolean;
  isTeacher: boolean;
  isStudent: boolean;
  
  // Permission checking
  canManageUsers: boolean;
  canManageCourses: boolean;
  canViewAdminPanel: boolean;
  canViewStatistics: boolean;
  
  // Utility functions
  getUserDisplayName: () => string;
  getUserInitials: () => string;
  isUserOwnerOf: (ownerId: string) => boolean;
}

export function useAuthState(): UseAuthStateReturn {
  const { user, isLoading } = useAuth();
  
  const isAuthenticated = useMemo(() => !!user, [user]);
  
  // Role checking functions
  const hasRole = useCallback((role: UserRole): boolean => {
    return user?.role === role;
  }, [user]);
  
  const hasAnyRole = useCallback((roles: UserRole[]): boolean => {
    return user ? roles.includes(user.role as UserRole) : false;
  }, [user]);
  
  // Specific role checks
  const isAdmin = useMemo(() => hasRole('admin'), [hasRole]);
  const isStaff = useMemo(() => hasRole('staff'), [hasRole]);
  const isTeacher = useMemo(() => hasRole('teacher'), [hasRole]);
  const isStudent = useMemo(() => hasRole('student'), [hasRole]);
  
  // Permission checking
  const canManageUsers = useMemo(() => {
    return hasAnyRole(['admin', 'staff']);
  }, [hasAnyRole]);
  
  const canManageCourses = useMemo(() => {
    return hasAnyRole(['admin', 'staff', 'teacher']);
  }, [hasAnyRole]);
  
  const canViewAdminPanel = useMemo(() => {
    return hasAnyRole(['admin', 'staff']);
  }, [hasAnyRole]);
  
  const canViewStatistics = useMemo(() => {
    return hasAnyRole(['admin', 'staff', 'teacher']);
  }, [hasAnyRole]);
  
  // Utility functions
  const getUserDisplayName = useCallback((): string => {
    if (!user) return 'Guest';
    
    const { profile } = user;
    if (profile?.firstName && profile?.lastName) {
      return `${profile.firstName} ${profile.lastName}`;
    }
    if (profile?.firstName) {
      return profile.firstName;
    }
    if (user?.email) {
      return user.email.split('@')[0] || 'User';
    }
    return 'User';
  }, [user]);
  
  const getUserInitials = useCallback((): string => {
    if (!user) return 'G';
    
    const { profile } = user;
    if (profile?.firstName && profile?.lastName) {
      return `${profile.firstName[0]}${profile.lastName[0]}`.toUpperCase();
    }
    if (profile?.firstName) {
      return profile.firstName[0]?.toUpperCase() || 'U';
    }
    if (user?.email) {
      return user.email[0]?.toUpperCase() || 'U';
    }
    return 'U';
  }, [user]);
  
  const isUserOwnerOf = useCallback((ownerId: string): boolean => {
    if (!user || !ownerId) return false;
    return user._id === ownerId;
  }, [user]);
  
  return {
    // User data
    user,
    isLoading,
    isAuthenticated,
    
    // Role checking
    hasRole,
    hasAnyRole,
    isAdmin,
    isStaff,
    isTeacher,
    isStudent,
    
    // Permission checking
    canManageUsers,
    canManageCourses,
    canViewAdminPanel,
    canViewStatistics,
    
    // Utility functions
    getUserDisplayName,
    getUserInitials,
    isUserOwnerOf,
  };
}