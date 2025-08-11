// packages/frontend/src/app/courses/[courseId]/layout.tsx
// Course-specific layout with navigation tabs

'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthProvider';
import { courseApi } from '@/lib/api/courses';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Button } from '@/components/ui/Button';
import {
  AcademicCapIcon,
  CogIcon,
  ChartBarIcon,
  PencilSquareIcon,
  UserGroupIcon,
  ArrowLeftIcon,
} from '@heroicons/react/24/outline';

interface Course {
  _id: string;
  title: string;
  description: string;
  status: 'draft' | 'published' | 'archived';
  instructor: {
    _id: string;
    name: string;
    email: string;
  };
}

interface CourseLayoutProps {
  children: React.ReactNode;
}

export default function CourseLayout({ children }: CourseLayoutProps) {
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const courseId = params['courseId'] as string;

  useEffect(() => {
    const loadCourse = async () => {
      try {
        setLoading(true);
        const response = await courseApi.getCourseById(courseId);
        if (response.success && response.data) {
          setCourse(response.data);
        } else {
          setError('Course not found');
        }
      } catch (err) {
        console.error('Error loading course:', err);
        setError('Failed to load course');
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

  const navigationTabs = [
    {
      key: 'overview',
      label: 'Overview',
      href: `/courses/${courseId}`,
      icon: <AcademicCapIcon className="w-5 h-5" />,
      roles: ['student', 'teacher', 'admin', 'staff'],
    },
    {
      key: 'analytics',
      label: 'Analytics',
      href: `/courses/${courseId}/analytics`,
      icon: <ChartBarIcon className="w-5 h-5" />,
      roles: ['teacher', 'admin', 'staff'],
    },
    {
      key: 'grading',
      label: 'Grading',
      href: `/courses/${courseId}/grading`,
      icon: <PencilSquareIcon className="w-5 h-5" />,
      roles: ['teacher', 'admin', 'staff'],
    },
    {
      key: 'manage',
      label: 'Students',
      href: `/courses/${courseId}/manage`,
      icon: <UserGroupIcon className="w-5 h-5" />,
      roles: ['teacher', 'admin', 'staff'],
    },
    {
      key: 'settings',
      label: 'Settings',
      href: `/courses/${courseId}/settings`,
      icon: <CogIcon className="w-5 h-5" />,
      roles: ['teacher', 'admin', 'staff'],
    },
  ];

  const currentTab = navigationTabs.find(tab => tab.href === pathname)?.key || 'overview';

  const availableTabs = navigationTabs.filter(tab =>
    tab.roles.includes(user?.role || '') && (
      tab.roles.includes('student') || isInstructor
    ),
  );

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={['student', 'teacher', 'staff', 'admin']}>
        <DashboardLayout>
          <div className="max-w-7xl mx-auto py-6">
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
                <div className="text-gray-600">Loading course...</div>
              </div>
            </div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  if (error || !course) {
    return (
      <ProtectedRoute allowedRoles={['student', 'teacher', 'staff', 'admin']}>
        <DashboardLayout>
          <div className="max-w-7xl mx-auto py-6">
            <div className="text-center py-12">
              <div className="text-red-600 text-xl mb-4">{error || 'Course not found'}</div>
              <Button
                onClick={() => router.push('/courses')}
                variant="primary"
                icon={<ArrowLeftIcon className="w-5 h-5" />}
              >
                Back to Courses
              </Button>
            </div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['student', 'teacher', 'staff', 'admin']}>
      <DashboardLayout>
        <div className="max-w-7xl mx-auto py-6">
          {/* Course Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Button
                  onClick={() => router.push('/courses')}
                  variant="ghost"
                  size="sm"
                  icon={<ArrowLeftIcon className="w-4 h-4" />}
                >
                  Back to Courses
                </Button>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900" data-testid="course-header-title">
                    {course.title}
                  </h1>
                  <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600">
                    <span>Instructor: {course.instructor.name}</span>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      course.status === 'published'
                        ? 'bg-green-100 text-green-800'
                        : course.status === 'draft'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {course.status.charAt(0).toUpperCase() + course.status.slice(1)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="flex space-x-8" aria-label="Course navigation">
              {availableTabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => router.push(tab.href)}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                    currentTab === tab.key
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Page Content */}
          <div>
            {children}
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
