// packages/frontend/src/app/auth/login/page.tsx
// Login page component

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { LoginRequestSchema, LoginRequestType } from '@yggdrasil/shared-utilities';

export default function LoginPage() {
  const { login, isLoading, user } = useAuth();
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string>('');

  // Redirect authenticated users to news page
  useEffect(() => {
    if (user && !isLoading) {
      router.push('/news');
    }
  }, [user, isLoading, router]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch
  } = useForm<LoginRequestType>({
    resolver: zodResolver(LoginRequestSchema),
  });

  // Clear submit error when user types
  useEffect(() => {
    const subscription = watch(() => {
      if (submitError) {
        setSubmitError('');
      }
    });
    return () => subscription.unsubscribe();
  }, [watch, submitError]);

  const onSubmit = async (data: LoginRequestType) => {
    try {
      setSubmitError('');
      const result = await login(data.email, data.password);
      
      if (result.success) {
        router.push('/news');
      } else {
        setSubmitError(result.error || 'Invalid email or password');
      }
    } catch (error) {
      setSubmitError('An unexpected error occurred');
    }
  };

  const handleDemoLogin = async (email: string, password: string) => {
    try {
      setSubmitError('');
      const result = await login(email, password);
      
      if (result.success) {
        router.push('/news');
      } else {
        setSubmitError(result.error || 'Demo login failed');
      }
    } catch (error) {
      setSubmitError('An unexpected error occurred');
    }
  };

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
            Sign in to your account
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Access is limited to authorized users
          </p>
        </div>

        {/* Form */}
        <div className="card">
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)} noValidate>
            {/* Email Field */}
            <div className="form-group">
              <label htmlFor="email" className="form-label">
                Email address
              </label>
              <input
                {...register('email')}
                id="email"
                type="email"
                autoComplete="email"
                className={`input ${errors.email ? 'border-error-500 focus:border-error-500 focus:ring-error-500' : ''}`}
                placeholder="Enter your email"
              />
              {errors.email && (
                <p className="form-error">{errors.email.message}</p>
              )}
            </div>

            {/* Password Field */}
            <div className="form-group">
              <label htmlFor="password" className="form-label">
                Password
              </label>
              <input
                {...register('password')}
                id="password"
                type="password"
                autoComplete="current-password"
                className={`input ${errors.password ? 'border-error-500 focus:border-error-500 focus:ring-error-500' : ''}`}
                placeholder="Enter your password"
              />
              {errors.password && (
                <p className="form-error">{errors.password.message}</p>
              )}
            </div>

            {/* Submit Error */}
            {submitError && (
              <div className="bg-error-50 border border-error-200 rounded-md p-3">
                <p className="text-error-700 text-sm">{submitError}</p>
              </div>
            )}

            {/* Submit Button */}
            <div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full btn-primary py-3 text-base disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Signing in...
                  </span>
                ) : (
                  'Sign in'
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Demo Accounts */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Quick Demo Login</h3>
          <div className="space-y-2">
            <button
              onClick={() => handleDemoLogin('admin@yggdrasil.edu', 'Admin123!')}
              disabled={isSubmitting}
              className="w-full flex items-center justify-between p-3 bg-blue-50 hover:bg-blue-100 rounded-md border border-blue-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-center">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center mr-3">
                  <span className="text-white text-xs font-bold">A</span>
                </div>
                <div className="text-left">
                  <div className="text-sm font-medium text-gray-900">Admin Account</div>
                  <div className="text-xs text-gray-600">admin@yggdrasil.edu</div>
                </div>
              </div>
              <div className="text-xs text-blue-600">Click to login</div>
            </button>
            
            <button
              onClick={() => handleDemoLogin('teacher@yggdrasil.edu', 'Admin123!')}
              disabled={isSubmitting}
              className="w-full flex items-center justify-between p-3 bg-green-50 hover:bg-green-100 rounded-md border border-green-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-center">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center mr-3">
                  <span className="text-white text-xs font-bold">T</span>
                </div>
                <div className="text-left">
                  <div className="text-sm font-medium text-gray-900">Teacher Account</div>
                  <div className="text-xs text-gray-600">teacher@yggdrasil.edu</div>
                </div>
              </div>
              <div className="text-xs text-green-600">Click to login</div>
            </button>
            
            <button
              onClick={() => handleDemoLogin('staff@yggdrasil.edu', 'Admin123!')}
              disabled={isSubmitting}
              className="w-full flex items-center justify-between p-3 bg-orange-50 hover:bg-orange-100 rounded-md border border-orange-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-center">
                <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center mr-3">
                  <span className="text-white text-xs font-bold">ST</span>
                </div>
                <div className="text-left">
                  <div className="text-sm font-medium text-gray-900">Staff Account</div>
                  <div className="text-xs text-gray-600">staff@yggdrasil.edu</div>
                </div>
              </div>
              <div className="text-xs text-orange-600">Click to login</div>
            </button>
            
            <button
              onClick={() => handleDemoLogin('student@yggdrasil.edu', 'Admin123!')}
              disabled={isSubmitting}
              className="w-full flex items-center justify-between p-3 bg-purple-50 hover:bg-purple-100 rounded-md border border-purple-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-center">
                <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center mr-3">
                  <span className="text-white text-xs font-bold">S</span>
                </div>
                <div className="text-left">
                  <div className="text-sm font-medium text-gray-900">Student Account</div>
                  <div className="text-xs text-gray-600">student@yggdrasil.edu</div>
                </div>
              </div>
              <div className="text-xs text-purple-600">Click to login</div>
            </button>
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