'use client';

import { useAuth } from '@/lib/auth/AuthProvider';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';

export default function CoursesPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

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
    return null;
  }

  const getCoursesContent = () => {
    switch (user.role) {
      case 'teacher':
        return (
          <>
            <h1 className="text-3xl font-bold text-gray-900 mb-8">My Courses</h1>
            <div className="bg-white shadow rounded-lg p-6">
              <p className="text-gray-600">Manage your courses and lessons here...</p>
            </div>
          </>
        );
      case 'student':
        return (
          <>
            <h1 className="text-3xl font-bold text-gray-900 mb-8">My Enrollments</h1>
            <div className="bg-white shadow rounded-lg p-6">
              <p className="text-gray-600">View your enrolled courses here...</p>
            </div>
          </>
        );
      default:
        return (
          <>
            <h1 className="text-3xl font-bold text-gray-900 mb-8">Courses</h1>
            <div className="bg-white shadow rounded-lg p-6">
              <p className="text-gray-600">Course management interface...</p>
            </div>
          </>
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
            <nav className="flex items-center space-x-8">
              <Link href="/dashboard" className="text-gray-600 hover:text-gray-900">
                Dashboard
              </Link>
              <span className="text-gray-900 font-semibold">
                {user.role === 'teacher' ? 'Teaching' : user.role === 'student' ? 'Learning' : 'Courses'}
              </span>
            </nav>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {getCoursesContent()}
        </div>
      </main>
    </div>
  );
}