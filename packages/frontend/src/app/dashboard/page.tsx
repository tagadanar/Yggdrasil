// packages/frontend/src/app/dashboard/page.tsx
// Main dashboard page for authenticated users

'use client';

import { useAuth } from '@/lib/auth/AuthProvider';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function DashboardPage() {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showAccessDenied, setShowAccessDenied] = useState(false);

  // Check for access denied error
  useEffect(() => {
    if (searchParams.get('error') === 'access_denied') {
      setShowAccessDenied(true);
      // Clear the error parameter from URL
      router.replace('/dashboard');
    }
  }, [searchParams, router]);

  // Redirect unauthenticated users to login
  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/auth/login');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect to login
  }

  const getDashboardContent = () => {
    switch (user.role) {
      case 'admin':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Admin Dashboard</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">User Management</h3>
                <p className="text-gray-600 mb-4">Manage users, roles, and permissions</p>
                <Link href="/admin/users" className="btn-primary">
                  Manage Users
                </Link>
              </div>
            </div>
          </div>
        );
      case 'teacher':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Teacher Dashboard</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">My Courses</h3>
                <p className="text-gray-600 mb-4">Manage your courses and lessons</p>
                <Link href="/courses" className="btn-primary">
                  View Courses
                </Link>
              </div>
            </div>
          </div>
        );
      case 'staff':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Staff Dashboard</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Academic Planning</h3>
                <p className="text-gray-600 mb-4">Manage schedules and academic calendar</p>
                <Link href="/planning" className="btn-primary">
                  View Planning
                </Link>
              </div>
            </div>
          </div>
        );
      case 'student':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Student Dashboard</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">My Enrollments</h3>
                <p className="text-gray-600 mb-4">View your enrolled courses</p>
                <Link href="/courses" className="btn-primary">
                  View Courses
                </Link>
              </div>
            </div>
          </div>
        );
      default:
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
            <p className="text-gray-600">Welcome to your dashboard!</p>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Link href="/" className="text-2xl font-bold text-gray-900">
                🌳 Yggdrasil
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                Welcome, {user.profile.firstName} {user.profile.lastName}
              </div>
              <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                {user.role.toUpperCase()}
              </div>
              <button
                onClick={() => logout()}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {showAccessDenied && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Access Denied</h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>You don't have permission to access the requested page.</p>
                  </div>
                  <div className="mt-4">
                    <button
                      onClick={() => setShowAccessDenied(false)}
                      className="text-sm bg-red-100 text-red-800 px-3 py-1 rounded hover:bg-red-200"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          {getDashboardContent()}
        </div>
      </main>
    </div>
  );
}