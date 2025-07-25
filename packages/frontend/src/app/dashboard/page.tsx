'use client';

import { useAuth } from '@/lib/auth/AuthProvider';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Link } from '@/components/ui/Link';
import { 
  UserGroupIcon, 
  AcademicCapIcon, 
  CalendarIcon, 
  ChartBarIcon,
  DocumentTextIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';

function DashboardPageContent() {
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
            <h2 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <UserGroupIcon className="w-10 h-10 text-primary-600" />
              Admin Dashboard
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Link
                href="/admin/users"
                className="block p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition-all"
              >
                <UserGroupIcon className="w-8 h-8 text-blue-600 mb-3" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">User Management</h3>
                <p className="text-gray-600">Manage users, roles, and permissions</p>
              </Link>
              <Link
                href="/statistics"
                className="block p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition-all"
              >
                <ChartBarIcon className="w-8 h-8 text-purple-600 mb-3" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Platform Statistics</h3>
                <p className="text-gray-600">View platform analytics and reports</p>
              </Link>
              <Link
                href="/courses"
                className="block p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition-all"
              >
                <AcademicCapIcon className="w-8 h-8 text-green-600 mb-3" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Course Overview</h3>
                <p className="text-gray-600">Monitor all courses and enrollments</p>
              </Link>
            </div>
          </div>
        );
      case 'teacher':
        return (
          <div className="space-y-6">
            <h2 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <AcademicCapIcon className="w-10 h-10 text-blue-600" />
              Teacher Dashboard
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Link
                href="/courses"
                className="block p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition-all"
              >
                <AcademicCapIcon className="w-8 h-8 text-green-600 mb-3" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">My Courses</h3>
                <p className="text-gray-600">Manage your courses and lessons</p>
              </Link>
              <Link
                href="/statistics"
                className="block p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition-all"
              >
                <ChartBarIcon className="w-8 h-8 text-purple-600 mb-3" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Class Statistics</h3>
                <p className="text-gray-600">View student progress and grades</p>
              </Link>
              <Link
                href="/planning"
                className="block p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition-all"
              >
                <CalendarIcon className="w-8 h-8 text-blue-600 mb-3" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Schedule</h3>
                <p className="text-gray-600">View your teaching schedule</p>
              </Link>
            </div>
          </div>
        );
      case 'staff':
        return (
          <div className="space-y-6">
            <h2 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <CalendarIcon className="w-10 h-10 text-orange-600" />
              Staff Dashboard
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Link
                href="/planning"
                className="block p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition-all"
              >
                <CalendarIcon className="w-8 h-8 text-blue-600 mb-3" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Academic Planning</h3>
                <p className="text-gray-600">Manage schedules and academic calendar</p>
              </Link>
              <Link
                href="/news"
                className="block p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition-all"
              >
                <DocumentTextIcon className="w-8 h-8 text-orange-600 mb-3" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Announcements</h3>
                <p className="text-gray-600">Create and manage platform news</p>
              </Link>
              <Link
                href="/courses"
                className="block p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition-all"
              >
                <AcademicCapIcon className="w-8 h-8 text-green-600 mb-3" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Course Management</h3>
                <p className="text-gray-600">Oversee course offerings</p>
              </Link>
            </div>
          </div>
        );
      case 'student':
        return (
          <div className="space-y-6">
            <h2 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <AcademicCapIcon className="w-10 h-10 text-green-600" />
              Student Dashboard
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Link
                href="/courses"
                className="block p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition-all"
              >
                <AcademicCapIcon className="w-8 h-8 text-green-600 mb-3" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">My Courses</h3>
                <p className="text-gray-600">View your enrolled courses</p>
              </Link>
              <Link
                href="/planning"
                className="block p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition-all"
              >
                <CalendarIcon className="w-8 h-8 text-blue-600 mb-3" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Class Schedule</h3>
                <p className="text-gray-600">View your class timetable</p>
              </Link>
              <Link
                href="/statistics"
                className="block p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition-all"
              >
                <ChartBarIcon className="w-8 h-8 text-purple-600 mb-3" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">My Progress</h3>
                <p className="text-gray-600">Track your academic performance</p>
              </Link>
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
    <DashboardLayout>
      <div className="space-y-6">
        {showAccessDenied && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <XCircleIcon className="h-5 w-5 text-red-400" />
              </div>
              <div className="ml-3 flex-1">
                <h3 className="text-sm font-medium text-red-800">Access Denied</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>You don't have permission to access the requested page.</p>
                </div>
                <div className="mt-4">
                  <button
                    onClick={() => setShowAccessDenied(false)}
                    className="text-sm bg-red-100 text-red-800 px-3 py-1 rounded hover:bg-red-200 transition-colors"
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
    </DashboardLayout>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    }>
      <DashboardPageContent />
    </Suspense>
  );
}