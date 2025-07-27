'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { LoginRequestSchema, LoginRequestType } from '@yggdrasil/shared-utilities/client';
import { authFlowManager } from '@/lib/auth/AuthFlowManager';
import { Button } from '@/components/ui/Button';
import { EnvelopeIcon, LockClosedIcon, UserIcon } from '@heroicons/react/24/outline';

export default function LoginPage() {
  const { login, isLoading, user } = useAuth();
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string>('');

  // Redirect authenticated users using role-based navigation
  useEffect(() => {
    if (user) {
      authFlowManager.handleLoginSuccess(user, router).catch(() => {
        router.push('/dashboard');
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
    if (isSubmitting || isLoading) return;
    
    try {
      setSubmitError('');
      const result = await login(data.email, data.password, router);
      
      if (!result.success) {
        setSubmitError(result.error || 'Invalid email or password');
      }
    } catch (error) {
      setSubmitError('An unexpected error occurred');
    }
  };

  const handleDemoLogin = async (email: string, password: string) => {
    if (isSubmitting || isLoading) return;
    
    try {
      setSubmitError('');
      const result = await login(email, password, router);
      
      if (!result.success) {
        setSubmitError(result.error || 'Demo login failed');
      }
    } catch (error) {
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
          <div className="flex items-center justify-center mb-4">
            <UserIcon className="w-16 h-16 text-primary-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Welcome to Yggdrasil
          </h1>
          <p className="text-lg text-gray-600">
            Sign in to your account
          </p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)} noValidate data-testid="login-form">
            {/* Email Field */}
            <div className="form-group">
              <label htmlFor="email" className="form-label flex items-center gap-2">
                <EnvelopeIcon className="w-5 h-5 text-gray-400" />
                Email address
              </label>
              <div className="relative">
                <input
                  {...register('email')}
                  id="email"
                  type="email"
                  autoComplete="email"
                  data-testid="email-input"
                  className={`input pl-10 ${errors.email ? 'border-error-500 focus:border-error-500 focus:ring-error-500' : ''}`}
                  placeholder="Enter your email"
                />
                <EnvelopeIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              </div>
              {errors.email && (
                <p className="form-error">
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Password Field */}
            <div className="form-group">
              <label htmlFor="password" className="form-label flex items-center gap-2">
                <LockClosedIcon className="w-5 h-5 text-gray-400" />
                Password
              </label>
              <div className="relative">
                <input
                  {...register('password')}
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  data-testid="password-input"
                  className={`input pl-10 ${errors.password ? 'border-error-500 focus:border-error-500 focus:ring-error-500' : ''}`}
                  placeholder="Enter your password"
                />
                <LockClosedIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              </div>
              {errors.password && (
                <p className="form-error">
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Submit Error */}
            {submitError && (
              <div className="bg-error-50 border border-error-200 rounded-md p-3">
                <p className="text-error-700 text-sm">{submitError}</p>
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isSubmitting || isLoading}
              data-testid="login-button"
              variant="primary"
              size="lg"
              fullWidth
              icon={isSubmitting ? null : <UserIcon className="w-5 h-5" />}
            >
              {isSubmitting ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>
        </div>

        {/* Demo Accounts */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">Quick Demo Login</h3>
          <div className="space-y-3">
            <button
              onClick={() => handleDemoLogin('admin@yggdrasil.edu', 'Admin123!')}
              disabled={isSubmitting || isLoading}
              data-testid="demo-admin-button"
              className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 rounded-lg border border-blue-200 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
            >
              <div className="flex items-center">
                <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center mr-3">
                  <UserIcon className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <div className="text-sm font-medium text-gray-900">Admin Account</div>
                  <div className="text-xs text-gray-600">admin@yggdrasil.edu</div>
                </div>
              </div>
              <div className="text-xs text-blue-600 font-semibold">Login →</div>
            </button>
            
            <button
              onClick={() => handleDemoLogin('teacher@yggdrasil.edu', 'Admin123!')}
              disabled={isSubmitting || isLoading}
              data-testid="demo-teacher-button"
              className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-green-100 hover:from-green-100 hover:to-green-200 rounded-lg border border-green-200 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
            >
              <div className="flex items-center">
                <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center mr-3">
                  <UserIcon className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <div className="text-sm font-medium text-gray-900">Teacher Account</div>
                  <div className="text-xs text-gray-600">teacher@yggdrasil.edu</div>
                </div>
              </div>
              <div className="text-xs text-green-600 font-semibold">Login →</div>
            </button>
            
            <button
              onClick={() => handleDemoLogin('staff@yggdrasil.edu', 'Admin123!')}
              disabled={isSubmitting || isLoading}
              data-testid="demo-staff-button"
              className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-orange-50 to-orange-100 hover:from-orange-100 hover:to-orange-200 rounded-lg border border-orange-200 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
            >
              <div className="flex items-center">
                <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center mr-3">
                  <UserIcon className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <div className="text-sm font-medium text-gray-900">Staff Account</div>
                  <div className="text-xs text-gray-600">staff@yggdrasil.edu</div>
                </div>
              </div>
              <div className="text-xs text-orange-600 font-semibold">Login →</div>
            </button>
            
            <button
              onClick={() => handleDemoLogin('student@yggdrasil.edu', 'Admin123!')}
              disabled={isSubmitting || isLoading}
              data-testid="demo-student-button"
              className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-purple-100 hover:from-purple-100 hover:to-purple-200 rounded-lg border border-purple-200 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
            >
              <div className="flex items-center">
                <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center mr-3">
                  <UserIcon className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <div className="text-sm font-medium text-gray-900">Student Account</div>
                  <div className="text-xs text-gray-600">student@yggdrasil.edu</div>
                </div>
              </div>
              <div className="text-xs text-purple-600 font-semibold">Login →</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}