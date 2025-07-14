// packages/frontend/src/app/dashboard/page.tsx
// Main dashboard page - displays "Hello World" for authenticated users

'use client';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/lib/auth/AuthProvider';

export default function DashboardPage() {
  const { user } = useAuth();

  const getRoleEmoji = (role: string) => {
    switch (role) {
      case 'admin':
        return '👑';
      case 'staff':
        return '🏢';
      case 'teacher':
        return '👩‍🏫';
      case 'student':
        return '📚';
      default:
        return '👤';
    }
  };

  const getRoleDescription = (role: string) => {
    switch (role) {
      case 'admin':
        return 'You have full administrative access to the platform.';
      case 'staff':
        return 'You can manage users and oversee school operations.';
      case 'teacher':
        return 'You can create courses and track student progress.';
      case 'student':
        return 'You can access courses and track your learning progress.';
      default:
        return 'Welcome to the platform!';
    }
  };

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-6">
          {/* Welcome Card */}
          <div className="card">
            <div className="text-center">
              <div className="text-6xl mb-4">
                {getRoleEmoji(user?.role || '')}
              </div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                Hello World! 🌍
              </h1>
              <p className="text-xl text-gray-600 mb-4">
                Welcome back, {user?.profile?.firstName || 'User'}!
              </p>
              <p className="text-gray-500">
                {getRoleDescription(user?.role || '')}
              </p>
            </div>
          </div>

          {/* User Information Card */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Your Profile
              </h2>
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Full Name</dt>
                  <dd className="text-sm text-gray-900">
                    {user?.profile?.firstName || 'Unknown'} {user?.profile?.lastName || 'User'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Email</dt>
                  <dd className="text-sm text-gray-900">{user?.email}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Role</dt>
                  <dd className="text-sm text-gray-900 capitalize">{user?.role}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Language Preference</dt>
                  <dd className="text-sm text-gray-900 uppercase">
                    {user?.preferences?.language || 'FR'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Account Status</dt>
                  <dd className="text-sm">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-success-100 text-success-800">
                      {user?.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </dd>
                </div>
              </dl>
            </div>

            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Quick Stats
              </h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-primary-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-primary-900">Login Status</p>
                    <p className="text-xs text-primary-600">Successfully authenticated</p>
                  </div>
                  <div className="text-2xl">✅</div>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-success-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-success-900">Platform Access</p>
                    <p className="text-xs text-success-600">All systems operational</p>
                  </div>
                  <div className="text-2xl">🚀</div>
                </div>

                {user?.lastLogin && (
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-900">Last Login</p>
                      <p className="text-xs text-gray-600">
                        {new Date(user.lastLogin).toLocaleDateString()} at{' '}
                        {new Date(user.lastLogin).toLocaleTimeString()}
                      </p>
                    </div>
                    <div className="text-2xl">🕒</div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Getting Started Card */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              🎯 What's Next?
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl mb-2">📚</div>
                <h3 className="font-medium text-gray-900">Courses</h3>
                <p className="text-xs text-gray-600 mt-1">Browse available courses</p>
              </div>
              
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl mb-2">📅</div>
                <h3 className="font-medium text-gray-900">Schedule</h3>
                <p className="text-xs text-gray-600 mt-1">View your calendar</p>
              </div>
              
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl mb-2">📊</div>
                <h3 className="font-medium text-gray-900">Progress</h3>
                <p className="text-xs text-gray-600 mt-1">Track your performance</p>
              </div>
              
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl mb-2">📰</div>
                <h3 className="font-medium text-gray-900">News</h3>
                <p className="text-xs text-gray-600 mt-1">Latest announcements</p>
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}