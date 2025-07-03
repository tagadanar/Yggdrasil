'use client';

import React, { ReactNode } from 'react';
import { useAuth } from '@/context/AuthContext';
import { UserRole } from '@101-school/shared-utilities';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRoles?: UserRole[];
  fallbackPath?: string;
  showLoading?: boolean;
}

export default function ProtectedRoute({
  children,
  requiredRoles = [],
  fallbackPath = '/login',
  showLoading = true,
}: ProtectedRouteProps) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [hasRedirected, setHasRedirected] = useState(false);

  useEffect(() => {
    if (!isLoading && !hasRedirected) {
      if (!isAuthenticated) {
        // Store the current path for redirect after login
        const currentPath = pathname;
        const isPublicPath = ['/login', '/register', '/'].includes(currentPath);
        
        if (!isPublicPath) {
          // Store the intended destination for redirect after login
          sessionStorage.setItem('redirectAfterLogin', currentPath);
        }
        
        setHasRedirected(true);
        router.push(fallbackPath);
        return;
      }

      if (requiredRoles.length > 0 && user && !requiredRoles.includes(user.role)) {
        // User doesn't have required role, redirect to unauthorized page
        setHasRedirected(true);
        router.push('/unauthorized');
        return;
      }
    }
  }, [isAuthenticated, isLoading, user, requiredRoles, router, fallbackPath, pathname, hasRedirected]);

  // Reset redirect flag when authentication state changes
  useEffect(() => {
    setHasRedirected(false);
  }, [isAuthenticated, isLoading]);

  if (isLoading && showLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect in useEffect
  }

  if (requiredRoles.length > 0 && user && !requiredRoles.includes(user.role)) {
    return null; // Will redirect in useEffect
  }

  return <>{children}</>;
}

// Higher-order component for admin-only routes
export function AdminRoute({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute requiredRoles={['admin']} fallbackPath="/unauthorized">
      {children}
    </ProtectedRoute>
  );
}

// Higher-order component for staff-only routes (admin + staff)
export function StaffRoute({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute requiredRoles={['admin', 'staff']} fallbackPath="/unauthorized">
      {children}
    </ProtectedRoute>
  );
}

// Higher-order component for teacher routes (admin + staff + teacher)
export function TeacherRoute({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute requiredRoles={['admin', 'staff', 'teacher']} fallbackPath="/unauthorized">
      {children}
    </ProtectedRoute>
  );
}

// Higher-order component for student routes (all authenticated users)
export function StudentRoute({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute requiredRoles={['admin', 'staff', 'teacher', 'student']}>
      {children}
    </ProtectedRoute>
  );
}

// Enhanced route protection with better redirect handling
export function withAuthRedirect<T = {}>(Component: React.ComponentType<T>, options?: {
  requiredRoles?: UserRole[];
  fallbackPath?: string;
}) {
  return function AuthenticatedComponent(props: T) {
    return (
      <ProtectedRoute 
        requiredRoles={options?.requiredRoles}
        fallbackPath={options?.fallbackPath}
      >
        <Component {...props} />
      </ProtectedRoute>
    );
  };
}