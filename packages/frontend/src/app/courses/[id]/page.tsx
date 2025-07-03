'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import CourseDetail from '@/components/courses/CourseDetail';

export default function CourseDetailPage() {
  const params = useParams();
  const courseId = params.id as string;

  return (
    <ProtectedRoute requiredRoles={['admin', 'staff', 'teacher', 'student']}>
      <CourseDetail courseId={courseId} />
    </ProtectedRoute>
  );
}