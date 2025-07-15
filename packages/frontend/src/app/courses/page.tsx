// packages/frontend/src/app/courses/page.tsx
// Courses page - role-based content

'use client';

import React from 'react';
import { useAuth } from '@/lib/auth/AuthProvider';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { UnderConstruction } from '@/components/ui/UnderConstruction';

export default function CoursesPage() {
  const { user } = useAuth();

  const getTitleBasedOnRole = () => {
    if (user?.role === 'teacher' || user?.role === 'admin') {
      return 'My Courses';
    } else if (user?.role === 'student') {
      return 'My Enrollments';
    }
    return 'Courses';
  };

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="max-w-6xl mx-auto py-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{getTitleBasedOnRole()}</h1>
            <p className="text-gray-600">
              {user?.role === 'teacher' || user?.role === 'admin' 
                ? 'Manage your courses and assignments'
                : user?.role === 'student'
                ? 'View your enrolled courses and assignments'
                : 'Course management system'
              }
            </p>
          </div>
          
          <UnderConstruction
            title=""
            description="The course management system is currently under development. This will include course creation, enrollment, assignments, and progress tracking."
            expectedCompletion="Phase 3 - Expected completion in 4-6 weeks"
          />
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}