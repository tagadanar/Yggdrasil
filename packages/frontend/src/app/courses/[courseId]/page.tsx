// packages/frontend/src/app/courses/[courseId]/page.tsx
// Course overview page - main course content and details

'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthProvider';
import { courseApi } from '@/lib/api/courses';
import { CourseDetail } from '@/components/courses/CourseDetail';
import { Button } from '@/components/ui/Button';
import { Course } from '@yggdrasil/shared-utilities';
import {
  PencilIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';

export default function CoursePage() {
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);

  const courseId = params['courseId'] as string;

  useEffect(() => {
    const loadCourse = async () => {
      try {
        setLoading(true);
        const response = await courseApi.getCourseById(courseId);
        if (response.success && response.data) {
          setCourse(response.data);
        }
      } catch (err) {
        console.error('Error loading course:', err);
      } finally {
        setLoading(false);
      }
    };

    if (courseId) {
      loadCourse();
    }
  }, [courseId]);

  const isInstructor = user && course && (
    user.role === 'admin' ||
    user.role === 'staff' ||
    course.instructor._id === user._id
  );

  const handleEditCourse = () => {
    router.push(`/courses/${courseId}/settings`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-gray-600">Loading course details...</div>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 text-xl mb-4">Course not found</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Course Actions */}
      {isInstructor && (
        <div className="flex justify-end space-x-3 border-b pb-4">
          <Button
            onClick={handleEditCourse}
            variant="secondary"
            icon={<Cog6ToothIcon className="w-4 h-4" />}
          >
            Course Settings
          </Button>
          <Button
            onClick={() => router.push(`/courses/${courseId}/manage`)}
            variant="primary"
            icon={<PencilIcon className="w-4 h-4" />}
          >
            Manage Students
          </Button>
        </div>
      )}

      {/* Course Detail Component */}
      <CourseDetail
        courseId={courseId}
        onEdit={handleEditCourse}
        onBack={() => router.push('/courses')}
      />
    </div>
  );
}
