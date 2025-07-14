// packages/frontend/src/components/auth/ProtectedRoute.tsx
// Protected route component for authentication

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthProvider';
import { UserRole } from '@yggdrasil/shared-utilities';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
  requireAuth?: boolean;
}

export function ProtectedRoute({ 
  children, 
  allowedRoles = [], 
  requireAuth = true 
}: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      // Redirect to login if authentication is required but user is not logged in
      if (requireAuth && !user) {
        router.push('/auth/login');
        return;
      }

      // Check role-based authorization
      if (user && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
        router.push('/dashboard'); // Redirect to dashboard if role not allowed
        return;
      }
    }
  }, [user, isLoading, router, allowedRoles, requireAuth]);

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  // Don't render children if auth check failed
  if (requireAuth && !user) {
    return null;
  }

  // Don't render children if role check failed
  if (user && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return null;
  }

  return <>{children}</>;
}