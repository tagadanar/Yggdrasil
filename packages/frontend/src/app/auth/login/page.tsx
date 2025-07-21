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
import { authFlowManager } from '@/lib/auth/AuthFlowManager';

export default function LoginPage() {
  const { login, isLoading, user } = useAuth();
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string>('');

  // Redirect authenticated users using role-based navigation (non-blocking)
  useEffect(() => {
    if (user) {
      console.log('🔐 LOGIN PAGE: User already authenticated, redirecting with AuthFlowManager');
      authFlowManager.handleLoginSuccess(user, router).then((result) => {
        console.log('🔐 LOGIN PAGE: Existing user navigation result:', result);
      }).catch((error) => {
        console.error('🔐 LOGIN PAGE: Existing user navigation failed:', error);
        // Fallback to news page
        router.push('/news');
      });
    }
  }, [user, router]);

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
    // Prevent multiple concurrent submissions
    if (isSubmitting || isLoading) {
      console.log('🔐 LOGIN FORM: Submission already in progress, ignoring duplicate');
      return;
    }
    
    try {
      console.log('🔐 LOGIN FORM: Form submitted with data:', data);
      console.log('🔐 LOGIN FORM: Setting submit error to empty');
      setSubmitError('');
      
      console.log('🔐 LOGIN FORM: Calling login function with router');
      const result = await login(data.email, data.password, router);
      
      console.log('🔐 LOGIN FORM: Login result:', result);
      
      if (result.success) {
        console.log('🔐 LOGIN FORM: Login successful, navigation handled by AuthFlowManager');
        // Navigation is now handled by AuthFlowManager - no manual redirect needed
        if (result.navigationResult && !result.navigationResult.success) {
          console.warn('🔐 LOGIN FORM: Navigation had issues but login succeeded:', result.navigationResult);
        }
      } else {
        console.log('🔐 LOGIN FORM: Login failed, setting error:', result.error);
        setSubmitError(result.error || 'Invalid email or password');
      }
    } catch (error) {
      console.error('🔐 LOGIN FORM: Exception during login:', error);
      setSubmitError('An unexpected error occurred');
    }
  };

  const handleDemoLogin = async (email: string, password: string) => {
    // Prevent multiple concurrent submissions
    if (isSubmitting || isLoading) {
      console.log('🔐 DEMO LOGIN: Submission already in progress, ignoring duplicate');
      return;
    }
    
    try {
      console.log('🔐 DEMO LOGIN: Starting demo login for:', email);
      setSubmitError('');
      const result = await login(email, password, router);
      
      console.log('🔐 DEMO LOGIN: Demo login result:', result);
      
      if (result.success) {
        console.log('🔐 DEMO LOGIN: Demo login successful, navigation handled by AuthFlowManager');
        // Navigation is now handled by AuthFlowManager - no manual redirect needed
        if (result.navigationResult && !result.navigationResult.success) {
          console.warn('🔐 DEMO LOGIN: Navigation had issues but login succeeded:', result.navigationResult);
        }
      } else {
        console.log('🔐 DEMO LOGIN: Demo login failed, setting error:', result.error);
        setSubmitError(result.error || 'Demo login failed');
      }
    } catch (error) {
      console.error('🔐 DEMO LOGIN: Exception during demo login:', error);
      setSubmitError('An unexpected error occurred');
    }
  };

  // Remove blocking loading screen - show login form immediately
  // Authentication happens in background without blocking UI

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-secondary-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <Link href="/" className="inline-block group">
            <div className="flex items-center justify-center mb-4">
              <div className="relative mr-3">
                <img 
                  src="/logo101.png" 
                  alt="Yggdrasil Logo" 
                  className="w-12 h-12 transition-transform duration-300 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-primary-500 opacity-0 group-hover:opacity-10 rounded-full transition-opacity duration-300"></div>
              </div>
              <h1 className="text-4xl font-bold text-gray-900 group-hover:text-primary-700 transition-colors duration-300">
                Yggdrasil
              </h1>
            </div>
          </Link>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Sign in to your account
          </h2>
          <p className="text-sm text-gray-600">
            Access is limited to authorized users
          </p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)} noValidate data-testid="login-form">
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
                data-testid="email-input"
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
                data-testid="password-input"
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

            {/* Submit Button - Ultra-Stable Static DOM */}
            <div>
              <button
                type="submit"
                disabled={isSubmitting}
                data-testid="login-button"
                className="w-full bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white py-3 px-4 rounded-lg text-base font-medium shadow-lg shadow-primary-500/25 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                style={{ minHeight: '48px' }}
              >
                Sign in
              </button>
            </div>
          </form>
        </div>

        {/* Demo Accounts */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">Quick Demo Login</h3>
          <div className="space-y-3">
            <button
              onClick={() => handleDemoLogin('admin@yggdrasil.edu', 'Admin123!')}
              disabled={isSubmitting}
              data-testid="demo-admin-button"
              className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 rounded-lg border border-blue-200 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
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
              data-testid="demo-teacher-button"
              className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-green-100 hover:from-green-100 hover:to-green-200 rounded-lg border border-green-200 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
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
              data-testid="demo-staff-button"
              className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-orange-50 to-orange-100 hover:from-orange-100 hover:to-orange-200 rounded-lg border border-orange-200 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
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
              data-testid="demo-student-button"
              className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-purple-100 hover:from-purple-100 hover:to-purple-200 rounded-lg border border-purple-200 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
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