// packages/frontend/src/components/auth/ProtectedRoute.tsx
// Protected route component for authentication

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthProvider';
import { UserRole } from '@yggdrasil/shared-utilities/client';

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
      // 🔧 FIXED: Rely primarily on AuthProvider state for consistency
      const hasStoredTokens = tokens !== null;
      
      // Only redirect if we truly have no authentication from AuthProvider
      const hasAnyAuth = user || hasStoredTokens;
      
      // Redirect to login if authentication is required but no auth state exists
      if (requireAuth && !hasAnyAuth) {
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
  // 🔧 FIXED: Rely on AuthProvider state only for consistency
  const hasAnyAuth = user || tokens;
  
  if (requireAuth && !hasAnyAuth) {
    return null;
  }

  // Don't render children if role check failed
  if (user && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return null;
  }

  return <>{children}</>;
}