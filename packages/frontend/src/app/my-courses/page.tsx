// packages/frontend/src/app/my-courses/page.tsx
// Student's accessible courses through their promotion

'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/AuthProvider';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { promotionApi } from '@/lib/api/promotions';
import { courseApi } from '@/lib/api/courses';
import { PageHeader } from '@/components/ui/PageHeader';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Button } from '@/components/ui/Button';
import { StudentPromotionView } from '@yggdrasil/shared-utilities';
import {
  AcademicCapIcon,
  CalendarDaysIcon,
  ClockIcon,
  BookOpenIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';

interface Course {
  _id: string;
  title: string;
  description: string;
  category: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  instructor: {
    _id: string;
    name: string;
    email: string;
  };
  estimatedDuration: number;
  thumbnail?: string;
}

interface PromotionEvent {
  _id: string;
  title: string;
  startDate: string;
  endDate: string;
  linkedCourse?: Course;
}


export default function MyCoursesPage() {
  const { user } = useAuth();
  const [promotion, setPromotion] = useState<StudentPromotionView | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.role === 'student') {
      loadStudentCourses();
    }
  }, [user]);

  const loadStudentCourses = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get student's promotion
      const promotionResponse = await promotionApi.getMyPromotion();

      if (!promotionResponse.success || !promotionResponse.data) {
        setError('You are not assigned to a promotion. Contact your administrator.');
        return;
      }

      setPromotion(promotionResponse.data);

      // Extract courses from promotion events
      const promotionData = promotionResponse.data as StudentPromotionView;
      const coursesFromEvents = promotionData.events
        ?.filter((event: any) => event.linkedCourse)
        .map((event: any) => event.linkedCourse!)
        .filter((course: Course, index: number, self: Course[]) =>
          // Remove duplicates by ID
          self.findIndex(c => c._id === course._id) === index,
        ) || [];

      setCourses(coursesFromEvents);

    } catch (err: any) {
      console.error('Error loading student courses:', err);
      setError(`Failed to load your courses: ${err.message || 'Please try again.'}`);
    } finally {
      setLoading(false);
    }
  };

  const getLevelBadgeColor = (level: string) => {
    switch (level) {
      case 'beginner':
        return 'bg-green-100 text-green-800';
      case 'intermediate':
        return 'bg-yellow-100 text-yellow-800';
      case 'advanced':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins > 0 ? mins + 'm' : ''}`;
    }
    return `${mins}m`;
  };

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={['student']}>
        <DashboardLayout>
          <div className="flex justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['student']}>
      <DashboardLayout>
        <div className="max-w-7xl mx-auto py-6">
          <PageHeader
            title="My Courses"
            subtitle="Courses accessible through your promotion calendar"
            icon={<BookOpenIcon className="w-10 h-10 text-primary-600" />}
          />

          {error && (
            <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <div className="flex">
                <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400 mt-0.5" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">
                    No Courses Available
                  </h3>
                  <p className="text-sm text-yellow-700 mt-1">
                    {error}
                  </p>
                  <div className="mt-3">
                    <Button
                      onClick={() => window.location.href = '/planning'}
                      variant="secondary"
                      size="sm"
                    >
                      View Promotion Calendar
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {promotion && (
            <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-6">
              <div className="flex items-center gap-3">
                <AcademicCapIcon className="w-6 h-6 text-blue-600" />
                <div>
                  <h3 className="text-lg font-medium text-blue-900">
                    {promotion.promotion.name}
                  </h3>
                  <p className="text-sm text-blue-700">
                    {promotion.promotion.academicYear} • Semester {promotion.promotion.semester} • {promotion.promotion.intake} intake
                  </p>
                </div>
              </div>
            </div>
          )}

          {courses.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg border">
              <CalendarDaysIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No courses yet</h3>
              <p className="mt-1 text-sm text-gray-500">
                {promotion
                  ? 'No courses have been linked to your promotion events yet.'
                  : 'You need to be assigned to a promotion to access courses.'
                }
              </p>
              <div className="mt-6">
                <Button
                  onClick={() => window.location.href = '/planning'}
                  variant="primary"
                >
                  View Promotion Calendar
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses.map((course) => (
                <div
                  key={course._id}
                  className="bg-white rounded-lg border hover:shadow-md transition-shadow"
                  data-testid={`course-card-${course._id}`}
                >
                  {course.thumbnail && (
                    <div className="aspect-video rounded-t-lg bg-gray-200">
                      <img
                        src={course.thumbnail}
                        alt={course.title}
                        className="w-full h-full object-cover rounded-t-lg"
                      />
                    </div>
                  )}

                  <div className="p-6">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getLevelBadgeColor(course.level)}`}>
                        {course.level}
                      </span>
                      <span className="text-xs text-gray-500 capitalize">
                        {course.category}
                      </span>
                    </div>

                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {course.title}
                    </h3>

                    <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                      {course.description}
                    </p>

                    <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                      <div className="flex items-center gap-1">
                        <AcademicCapIcon className="w-4 h-4" />
                        <span>{course.instructor.name}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <ClockIcon className="w-4 h-4" />
                        <span>{formatDuration(course.estimatedDuration)}</span>
                      </div>
                    </div>

                    <Link
                      href={`/courses/${course._id}`}
                      className="block w-full"
                    >
                      <Button
                        variant="primary"
                        className="w-full"
                        data-testid={`view-course-${course._id}`}
                      >
                        View Course
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}

          {courses.length > 0 && (
            <div className="mt-8 text-center">
              <p className="text-sm text-gray-500 mb-4">
                Need to see when your courses are scheduled?
              </p>
              <Button
                onClick={() => window.location.href = '/planning'}
                variant="secondary"
                icon={<CalendarDaysIcon className="w-4 h-4" />}
              >
                View Promotion Calendar
              </Button>
            </div>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
