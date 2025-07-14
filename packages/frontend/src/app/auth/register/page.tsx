// packages/frontend/src/app/auth/register/page.tsx
// Registration page component

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { RegisterRequestSchema, RegisterRequestType } from '@yggdrasil/shared-utilities';

export default function RegisterPage() {
  const { register: registerUser, isLoading, user } = useAuth();
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string>('');

  // Redirect authenticated users to home
  useEffect(() => {
    if (user && !isLoading) {
      router.push('/');
    }
  }, [user, isLoading, router]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<RegisterRequestType>({
    resolver: zodResolver(RegisterRequestSchema),
    defaultValues: {
      role: 'student',
    },
  });

  const onSubmit = async (data: RegisterRequestType) => {
    try {
      setSubmitError('');
      const result = await registerUser(data);
      
      if (result.success) {
        router.push('/');
      } else {
        setSubmitError(result.error || 'Registration failed');
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
            Create your account
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Or{' '}
            <Link
              href="/auth/login"
              className="font-medium text-primary-600 hover:text-primary-500"
            >
              sign in to existing account
            </Link>
          </p>
        </div>

        {/* Form */}
        <div className="card">
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            {/* First Name */}
            <div className="form-group">
              <label htmlFor="firstName" className="form-label">
                First Name
              </label>
              <input
                {...register('profile.firstName')}
                id="firstName"
                type="text"
                autoComplete="given-name"
                className={`input ${errors.profile?.firstName ? 'border-error-500 focus:border-error-500 focus:ring-error-500' : ''}`}
                placeholder="Enter your first name"
              />
              {errors.profile?.firstName && (
                <p className="form-error">{errors.profile.firstName.message}</p>
              )}
            </div>

            {/* Last Name */}
            <div className="form-group">
              <label htmlFor="lastName" className="form-label">
                Last Name
              </label>
              <input
                {...register('profile.lastName')}
                id="lastName"
                type="text"
                autoComplete="family-name"
                className={`input ${errors.profile?.lastName ? 'border-error-500 focus:border-error-500 focus:ring-error-500' : ''}`}
                placeholder="Enter your last name"
              />
              {errors.profile?.lastName && (
                <p className="form-error">{errors.profile.lastName.message}</p>
              )}
            </div>

            {/* Email */}
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

            {/* Password */}
            <div className="form-group">
              <label htmlFor="password" className="form-label">
                Password
              </label>
              <input
                {...register('password')}
                id="password"
                type="password"
                autoComplete="new-password"
                className={`input ${errors.password ? 'border-error-500 focus:border-error-500 focus:ring-error-500' : ''}`}
                placeholder="Enter your password"
              />
              {errors.password && (
                <p className="form-error">{errors.password.message}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Password must be at least 8 characters with uppercase, lowercase, and number
              </p>
            </div>

            {/* Role */}
            <div className="form-group">
              <label htmlFor="role" className="form-label">
                Role
              </label>
              <select
                {...register('role')}
                id="role"
                className={`input ${errors.role ? 'border-error-500 focus:border-error-500 focus:ring-error-500' : ''}`}
              >
                <option value="student">Student</option>
                <option value="teacher">Teacher</option>
                <option value="staff">Staff</option>
              </select>
              {errors.role && (
                <p className="form-error">{errors.role.message}</p>
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
                    Creating account...
                  </span>
                ) : (
                  'Create account'
                )}
              </button>
            </div>
          </form>
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