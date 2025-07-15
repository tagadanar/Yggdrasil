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
  const { user, isLoading, tokens } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      // Check if we have tokens in storage even if user is not yet loaded
      const hasStoredTokens = tokens !== null;
      
      // Redirect to login if authentication is required but no tokens exist
      if (requireAuth && !user && !hasStoredTokens) {
        router.push('/auth/login');
        return;
      }

      // Check role-based authorization only after user is loaded
      if (user && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
        router.push('/news?error=access_denied'); // Redirect to news page if role not allowed
        return;
      }
    }
  }, [user, isLoading, tokens, router, allowedRoles, requireAuth]);

  // Show loading spinner while checking authentication
  // Also show loading if we have tokens but user is not loaded yet
  if (isLoading || (requireAuth && tokens && !user)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  // Don't render children if auth check failed
  if (requireAuth && !user && !tokens) {
    return null;
  }

  // Don't render children if role check failed
  if (user && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return null;
  }

  return <>{children}</>;
}