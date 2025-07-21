// packages/frontend/src/app/statistics/page.tsx
// Statistics and analytics dashboard with role-based views

'use client';

import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/lib/auth/AuthProvider';
import { StudentDashboard } from '@/components/dashboard/StudentDashboard';
import { TeacherDashboard } from '@/components/dashboard/TeacherDashboard';
import { AdminDashboard } from '@/components/dashboard/AdminDashboard';
import { ErrorBoundary } from '@/components/dashboard/ErrorBoundary';
import { LoadingState } from '@/components/dashboard/LoadingState';

export default function StatisticsPage() {
  const { user } = useAuth();

  const renderDashboard = () => {
    if (!user) {
      return <LoadingState type="dashboard" message="Loading user information..." testId="loading-state" />;
    }

    switch (user.role) {
      case 'student':
        return (
          <ErrorBoundary
            onError={(error) => console.error('Student dashboard error:', error)}
            testId="student-error-boundary"
          >
            <StudentDashboard />
          </ErrorBoundary>
        );
      
      case 'teacher':
        return (
          <ErrorBoundary
            onError={(error) => console.error('Teacher dashboard error:', error)}
            testId="teacher-error-boundary"
          >
            <TeacherDashboard />
          </ErrorBoundary>
        );
      
      case 'admin':
      case 'staff':
        return (
          <ErrorBoundary
            onError={(error) => console.error('Admin dashboard error:', error)}
            testId="admin-error-boundary"
          >
            <AdminDashboard />
          </ErrorBoundary>
        );
      
      default:
        return (
          <div className="text-center py-12" data-testid="error-state">
            <div className="text-gray-600 dark:text-gray-400">Unable to determine dashboard type for your role: {user.role}</div>
          </div>
        );
    }
  };

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-6" data-testid="statistics-page">
          {renderDashboard()}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}