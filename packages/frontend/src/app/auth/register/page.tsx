// packages/frontend/src/app/auth/register/page.tsx
// Registration disabled page - redirects to login

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/AuthProvider';

export default function RegisterPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  // Redirect authenticated users to news page
  useEffect(() => {
    if (user && !isLoading) {
      router.push('/news');
    }
  }, [user, isLoading, router]);

  // Redirect to login page after a short delay
  useEffect(() => {
    const timer = setTimeout(() => {
      router.push('/auth/login');
    }, 3000);
    
    return () => clearTimeout(timer);
  }, [router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-secondary-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <Link href="/" className="inline-block">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              🌳 Yggdrasil
            </h1>
          </Link>
          <h2 className="text-2xl font-bold text-gray-900">
            Registration Disabled
          </h2>
        </div>

        {/* Message */}
        <div className="bg-white dark:bg-secondary-800 rounded-lg shadow-md p-8 text-center border border-secondary-200 dark:border-secondary-700">
          <div className="mx-auto w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Public Registration is Disabled
          </h3>
          
          <p className="text-gray-600 mb-6">
            User account creation is restricted to administrators only. 
            Please contact your system administrator to create new accounts.
          </p>

          <div className="space-y-4">
            <Link
              href="/auth/login"
              className="w-full btn-primary py-3 text-base inline-block"
            >
              Go to Login
            </Link>
            
            <div className="text-sm text-gray-500">
              You will be redirected to the login page in a few seconds...
            </div>
          </div>
        </div>

        {/* Footer Links */}
        <div className="text-center">
          <Link
            href="/"
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}