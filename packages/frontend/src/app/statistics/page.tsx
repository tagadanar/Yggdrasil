// packages/frontend/src/app/statistics/page.tsx
// Statistics and analytics dashboard with role-based views

'use client';

import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/lib/auth/AuthProvider';
import { StudentDashboard } from '@/components/dashboard/StudentDashboard';
import { UnderConstruction } from '@/components/ui/UnderConstruction';

export default function StatisticsPage() {
  const { user } = useAuth();

  const renderDashboard = () => {
    if (!user) {
      return (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          <span className="ml-3 text-gray-600">Loading...</span>
        </div>
      );
    }

    switch (user.role) {
      case 'student':
        return <StudentDashboard />;
      
      case 'teacher':
        return (
          <UnderConstruction
            title="Teacher Analytics Dashboard"
            description="The teacher analytics dashboard is currently under development. This will include course performance metrics, student progress tracking, and engagement analytics."
            expectedCompletion="Coming in next update"
          />
        );
      
      case 'admin':
      case 'staff':
        return (
          <UnderConstruction
            title="Administrative Analytics Dashboard"
            description="The administrative analytics dashboard is currently under development. This will include platform-wide statistics, user management metrics, and system performance data."
            expectedCompletion="Coming in next update"
          />
        );
      
      default:
        return (
          <div className="text-center py-12">
            <div className="text-gray-600">Unable to determine dashboard type for your role.</div>
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