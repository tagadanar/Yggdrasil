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

  useEffect(() => {
    // Redirect unauthenticated users to login
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

  // Show landing page for unauthenticated users (though they should be redirected)
  if (!user) {
    return null;
  }

  // Main page for authenticated users
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