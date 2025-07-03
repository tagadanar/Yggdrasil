'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { UserRole } from '@101-school/shared-utilities';

interface UseAuthRedirectOptions {
  requiredRoles?: UserRole[];
  fallbackPath?: string;
  redirectOnSuccess?: string;
  storeCurrentPath?: boolean;
}

export function useAuthRedirect({
  requiredRoles = [],
  fallbackPath = '/login',
  redirectOnSuccess = '/dashboard',
  storeCurrentPath = true,
}: UseAuthRedirectOptions = {}) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading) {
      // Handle unauthenticated users
      if (!isAuthenticated) {
        if (storeCurrentPath) {
          const isPublicPath = ['/login', '/register', '/'].includes(pathname);
          if (!isPublicPath) {
            sessionStorage.setItem('redirectAfterLogin', pathname);
          }
        }
        router.push(fallbackPath);
        return;
      }

      // Handle authenticated users with insufficient permissions
      if (requiredRoles.length > 0 && user && !requiredRoles.includes(user.role)) {
        router.push('/unauthorized');
        return;
      }

      // Handle successful authentication redirect
      if (isAuthenticated && redirectOnSuccess && pathname === '/') {
        const storedPath = sessionStorage.getItem('redirectAfterLogin');
        if (storedPath) {
          sessionStorage.removeItem('redirectAfterLogin');
          router.push(storedPath);
        } else {
          router.push(redirectOnSuccess);
        }
      }
    }
  }, [
    isAuthenticated,
    isLoading,
    user,
    requiredRoles,
    router,
    pathname,
    fallbackPath,
    redirectOnSuccess,
    storeCurrentPath,
  ]);

  return {
    isAuthenticated,
    isLoading,
    user,
    canAccess: isAuthenticated && (requiredRoles.length === 0 || (user && requiredRoles.includes(user.role))),
  };
}

// Helper hooks for common scenarios
export function useRequireAuth(options?: Omit<UseAuthRedirectOptions, 'requiredRoles'>) {
  return useAuthRedirect({ ...options, requiredRoles: [] });
}

export function useRequireRole(roles: UserRole[], options?: Omit<UseAuthRedirectOptions, 'requiredRoles'>) {
  return useAuthRedirect({ ...options, requiredRoles: roles });
}

export function useRequireAdmin(options?: Omit<UseAuthRedirectOptions, 'requiredRoles'>) {
  return useAuthRedirect({ ...options, requiredRoles: ['admin'] });
}

export function useRequireStaff(options?: Omit<UseAuthRedirectOptions, 'requiredRoles'>) {
  return useAuthRedirect({ ...options, requiredRoles: ['admin', 'staff'] });
}

export function useRequireTeacher(options?: Omit<UseAuthRedirectOptions, 'requiredRoles'>) {
  return useAuthRedirect({ ...options, requiredRoles: ['admin', 'staff', 'teacher'] });
}

export function useRequireStudent(options?: Omit<UseAuthRedirectOptions, 'requiredRoles'>) {
  return useAuthRedirect({ ...options, requiredRoles: ['admin', 'staff', 'teacher', 'student'] });
}