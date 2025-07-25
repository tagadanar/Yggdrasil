// packages/frontend/src/app/page.tsx
// Main landing page

'use client';

import { useAuth } from '@/lib/auth/AuthProvider';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';

export default function HomePage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Yggdrasil Platform...</p>
        </div>
      </div>
    );
  }

  // Landing page for unauthenticated users
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-white">
        <div className="container mx-auto px-4 py-16">
          <div className="text-center mb-12">
            <h1 className="text-6xl font-bold text-gray-900 mb-6">
              🌳 Yggdrasil
            </h1>
            <h2 className="text-3xl font-semibold text-gray-700 mb-4">
              Educational Platform
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              A modern educational platform for IT schools built with clean architecture,
              TDD principles, and comprehensive role-based access control.
            </p>
          </div>
          
          <div className="flex justify-center space-x-4 mb-16">
            <button 
              onClick={() => router.push('/auth/login')}
              className="px-8 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-semibold"
            >
              Sign In
            </button>
            <button 
              onClick={() => router.push('/auth/register')}
              className="px-8 py-3 border border-primary-600 text-primary-600 rounded-lg hover:bg-primary-50 transition-colors font-semibold"
            >
              Register
            </button>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <div className="text-center p-8 bg-white rounded-xl shadow-lg">
              <div className="text-5xl mb-4">🔐</div>
              <h3 className="text-xl font-semibold mb-4">Secure Authentication</h3>
              <p className="text-gray-600">
                JWT-based authentication with role-based access control for students, teachers, staff, and administrators.
              </p>
            </div>
            <div className="text-center p-8 bg-white rounded-xl shadow-lg">
              <div className="text-5xl mb-4">📚</div>
              <h3 className="text-xl font-semibold mb-4">Course Management</h3>
              <p className="text-gray-600">
                Comprehensive course creation, enrollment, and progress tracking with modern educational tools.
              </p>
            </div>
            <div className="text-center p-8 bg-white rounded-xl shadow-lg">
              <div className="text-5xl mb-4">📊</div>
              <h3 className="text-xl font-semibold mb-4">Analytics & Insights</h3>
              <p className="text-gray-600">
                Detailed statistics and reporting for student progress, course effectiveness, and platform usage.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // For authenticated users, render the full dashboard
  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Welcome Section */}
        <div className="card text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            🌳 Welcome to Yggdrasil Educational Platform
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            A modern educational platform for IT schools built with clean architecture,
            TDD principles, and comprehensive role-based access control.
          </p>
        </div>

        {/* User Info Section */}
        <div className="card">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">
            👤 Your Authentication Information
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">Profile Details</h3>
              <dl className="space-y-2">
                <div className="flex justify-between">
                  <dt className="text-gray-500">Name:</dt>
                  <dd className="font-medium">{user.profile?.firstName} {user.profile?.lastName}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Email:</dt>
                  <dd className="font-medium">{user.email}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Role:</dt>
                  <dd className="font-medium capitalize">{user.role}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">User ID:</dt>
                  <dd className="font-mono text-sm">{user._id}</dd>
                </div>
              </dl>
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">Session Information</h3>
              <dl className="space-y-2">
                <div className="flex justify-between">
                  <dt className="text-gray-500">Account Status:</dt>
                  <dd className="font-medium">
                    <span className="text-green-600">
                      {user.isActive ? '✅ Active' : '❌ Inactive'}
                    </span>
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Language:</dt>
                  <dd className="font-medium uppercase">{user.preferences?.language || 'EN'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Created:</dt>
                  <dd className="font-medium">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Last Updated:</dt>
                  <dd className="font-medium">
                    {new Date(user.updatedAt).toLocaleDateString()}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </div>

        {/* Platform Features */}
        <div className="card">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">
            🚀 Platform Features
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center p-6 bg-gray-50 rounded-lg">
              <div className="text-4xl mb-3">🔐</div>
              <h3 className="font-semibold mb-2">JWT Authentication</h3>
              <p className="text-sm text-gray-600">
                Secure authentication with access and refresh tokens
              </p>
            </div>
            <div className="text-center p-6 bg-gray-50 rounded-lg">
              <div className="text-4xl mb-3">👥</div>
              <h3 className="font-semibold mb-2">Role-Based Access</h3>
              <p className="text-sm text-gray-600">
                Admin, Staff, Teacher, and Student roles with permissions
              </p>
            </div>
            <div className="text-center p-6 bg-gray-50 rounded-lg">
              <div className="text-4xl mb-3">🏗️</div>
              <h3 className="font-semibold mb-2">Clean Architecture</h3>
              <p className="text-sm text-gray-600">
                Monorepo structure with TypeScript and TDD practices
              </p>
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="card">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">
            📍 Quick Navigation
          </h2>
          <div className="grid md:grid-cols-4 gap-4">
            <a href="/dashboard" className="block p-4 text-center bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors">
              <div className="text-2xl mb-2">📊</div>
              <div className="font-medium">Dashboard</div>
            </a>
            <a href="/courses" className="block p-4 text-center bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <div className="text-2xl mb-2">📚</div>
              <div className="font-medium">Courses</div>
            </a>
            <a href="/profile" className="block p-4 text-center bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <div className="text-2xl mb-2">⚙️</div>
              <div className="font-medium">Settings</div>
            </a>
            <a href="/help" className="block p-4 text-center bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <div className="text-2xl mb-2">❓</div>
              <div className="font-medium">Help</div>
            </a>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

/* OLD LANDING PAGE CODE - REMOVED
return (
*/
// Landing page code has been removed as we now redirect unauthenticated users to login