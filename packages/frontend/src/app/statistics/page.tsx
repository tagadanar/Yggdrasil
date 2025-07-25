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
import { PageHeader } from '@/components/ui/PageHeader';
import { motion } from 'framer-motion';
import { ChartBarIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

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
            onError={(error) => { /* Handle error silently */ }}
            testId="student-error-boundary"
          >
            <StudentDashboard />
          </ErrorBoundary>
        );
      
      case 'teacher':
        return (
          <ErrorBoundary
            onError={(error) => { /* Handle error silently */ }}
            testId="teacher-error-boundary"
          >
            <TeacherDashboard />
          </ErrorBoundary>
        );
      
      case 'admin':
      case 'staff':
        return (
          <ErrorBoundary
            onError={(error) => { /* Handle error silently */ }}
            testId="admin-error-boundary"
          >
            <AdminDashboard />
          </ErrorBoundary>
        );
      
      default:
        return (
          <motion.div 
            className="text-center py-12"
            data-testid="error-state"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <ExclamationTriangleIcon className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
            <div className="text-gray-600 dark:text-gray-400">Unable to determine dashboard type for your role: {user.role}</div>
          </motion.div>
        );
    }
  };

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-6" data-testid="statistics-page">
          <PageHeader
            title="Statistics & Analytics"
            subtitle="Monitor your progress and performance metrics"
            icon={<ChartBarIcon className="w-10 h-10 text-primary-600" />}
          />
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            {renderDashboard()}
          </motion.div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}