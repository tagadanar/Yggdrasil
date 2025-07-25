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
      // 🔧 ENHANCED: Check for tokens in multiple places to avoid false redirects
      const hasStoredTokens = tokens !== null;
      
      // Also check cookies directly to catch cases where AuthProvider hasn't loaded yet
      const hasCookieTokens = typeof document !== 'undefined' && (
        document.cookie.includes('yggdrasil_access_token') || 
        document.cookie.includes('yggdrasil_refresh_token')
      );
      
      
      // Only redirect if we truly have no authentication tokens anywhere
      const hasAnyAuth = user || hasStoredTokens || hasCookieTokens;
      
      // Redirect to login if authentication is required but no tokens exist
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
  // 🔧 ENHANCED: Check cookies as fallback to avoid false auth failures
  const hasCookieTokens = typeof document !== 'undefined' && (
    document.cookie.includes('yggdrasil_access_token') || 
    document.cookie.includes('yggdrasil_refresh_token')
  );
  
  const hasAnyAuth = user || tokens || hasCookieTokens;
  
  if (requireAuth && !hasAnyAuth) {
    return null;
  }

  // Don't render children if role check failed
  if (user && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return null;
  }

  return <>{children}</>;
}