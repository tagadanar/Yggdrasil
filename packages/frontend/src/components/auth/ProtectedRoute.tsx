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
      // Simple, direct check based on AuthProvider state
      const hasAnyAuth = user || tokens;
      
      // Debug logging for test troubleshooting
      console.log('🔐 ProtectedRoute: Auth check', { 
        user: !!user, 
        tokens: !!tokens, 
        hasAnyAuth, 
        requireAuth,
        isLoading,
        env: process.env.NODE_ENV
      });
      
      // Redirect to login if authentication is required but no auth exists
      if (requireAuth && !hasAnyAuth) {
        console.log('🔐 ProtectedRoute: Redirecting to /auth/login');
        router.push('/auth/login');
        return;
      }

      // Check role-based authorization only after user is loaded
      if (user && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
        console.log('🔐 ProtectedRoute: Redirecting to /news (access denied)');
        router.push('/news?error=access_denied');
        return;
      }
    }
  }, [user, isLoading, tokens, router, allowedRoles, requireAuth]);

  // Show loading spinner while checking authentication
  // Also show loading if we have tokens but user is not loaded yet
  if (isLoading || (requireAuth && tokens && !user)) {
    return (
      <div className="min-h-screen flex items-center justify-center" data-testid="protected-route-loading">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  // Don't render children if auth check failed
  // Check both AuthProvider state and direct token storage
  const hasAuthProviderAuth = user || tokens;
  
  // For rendering decisions, we need to handle the redirect case properly
  // Instead of returning null (which causes 404), show loading while redirect happens
  if (requireAuth && !hasAuthProviderAuth) {
    // Immediate redirect attempt
    if (!isLoading) {
      router.push('/auth/login');
    }
    
    // Show loading spinner while redirect is happening
    return (
      <div className="min-h-screen flex items-center justify-center" data-testid="protected-route-redirecting">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  // Don't render children if role check failed
  if (user && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center" data-testid="access-denied">
        <div className="text-center">
          <div className="text-6xl mb-4">🚫</div>
          <h1 className="text-2xl font-bold text-red-600 mb-2">Access Denied</h1>
          <p className="text-gray-600">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  return <div data-testid="protected-route-success">{children}</div>;
}