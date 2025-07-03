'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import CourseFormWizard from '@/components/courses/CourseFormWizard';

export default function EditCoursePage() {
  const params = useParams();
  const courseId = params.id as string;

  return (
    <ProtectedRoute requiredRoles={['admin', 'staff', 'teacher']}>
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Edit Course</h1>
          <p className="mt-2 text-gray-600">
            Update course information and settings
          </p>
        </div>
        
        <CourseFormWizard 
          mode="edit" 
          courseId={courseId}
        />
      </div>
    </ProtectedRoute>
  );
}