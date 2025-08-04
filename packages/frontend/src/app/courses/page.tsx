// packages/frontend/src/app/courses/page.tsx
// Courses page - comprehensive course management

'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/auth/AuthProvider';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { CourseList } from '@/components/courses/CourseList';
import { CourseForm } from '@/components/courses/CourseForm';
import { CourseDetail } from '@/components/courses/CourseDetail';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { AcademicCapIcon, ChartBarIcon, UserGroupIcon, PlusIcon } from '@heroicons/react/24/outline';

type ViewMode = 'list' | 'create' | 'edit' | 'detail';

interface Course {
  _id: string;
  title: string;
  description: string;
  slug: string;
  category: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  status: 'draft' | 'published' | 'archived';
  instructor: {
    _id: string;
    name: string;
    email: string;
  };
  tags: string[];
  prerequisites: string[];
  estimatedDuration: number;
  settings: {
    isPublic: boolean;
    allowEnrollment: boolean;
    requiresApproval: boolean;
    maxStudents?: number;
    startDate?: string;
    endDate?: string;
    allowLateSubmissions: boolean;
    enableDiscussions: boolean;
    enableCollaboration: boolean;
  };
  stats: {
    enrolledStudents: number;
    completedStudents: number;
    averageProgress: number;
    averageRating?: number;
    totalViews: number;
  };
}

export default function CoursesPage() {
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);

  const getTitleBasedOnRole = () => {
    if (user?.role === 'student') {
      return 'My Enrollments';
    } else if (user?.role === 'teacher') {
      return 'My Courses';
    } else if (user?.role === 'admin' || user?.role === 'staff') {
      return 'Course Management';
    }
    return 'Courses';
  };

  const getDescriptionBasedOnRole = () => {
    if (user?.role === 'teacher' || user?.role === 'admin' || user?.role === 'staff') {
      return 'Create, manage, and track your educational courses';
    } else if (user?.role === 'student') {
      return 'Explore and enroll in courses to advance your learning';
    }
    return 'Course management and learning platform';
  };

  const handleCreateCourse = () => {
    setSelectedCourse(null);
    setViewMode('create');
  };

  const handleEditCourse = (course: Course) => {
    setSelectedCourse(course);
    setViewMode('edit');
  };

  const handleViewCourse = (course: Course) => {
    setSelectedCourse(course);
    setViewMode('detail');
  };

  const handleCourseSaved = (course: Course) => {
    setSelectedCourse(course);
    setViewMode('detail');
  };

  const handleBackToList = () => {
    setSelectedCourse(null);
    setViewMode('list');
  };

  const renderContent = () => {
    switch (viewMode) {
      case 'create':
        return (
          <CourseForm
            course={null}
            onSave={handleCourseSaved}
            onCancel={handleBackToList}
          />
        );
      
      case 'edit':
        return (
          <CourseForm
            course={selectedCourse}
            onSave={handleCourseSaved}
            onCancel={handleBackToList}
          />
        );
      
      case 'detail':
        return selectedCourse ? (
          <CourseDetail
            courseId={selectedCourse._id}
            onEdit={() => handleEditCourse(selectedCourse)}
            onBack={handleBackToList}
          />
        ) : (
          <div className="text-center py-12">
            <div className="text-rose-600 dark:text-rose-400">Course not found</div>
            <Button
              onClick={handleBackToList}
              variant="primary"
              className="mt-4"
              icon={<AcademicCapIcon className="w-5 h-5" />}
            >
              Back to Courses
            </Button>
          </div>
        );
      
      default:
        return (
          <CourseList
            showCreateButton={['teacher', 'staff', 'admin'].includes(user?.role || '')}
            onCourseCreate={handleCreateCourse}
            onCourseEdit={handleEditCourse}
            onCourseView={handleViewCourse}
          />
        );
    }
  };

  return (
    <ProtectedRoute allowedRoles={['teacher', 'staff', 'admin']}>
      <DashboardLayout>
        <div className="max-w-7xl mx-auto py-6">
          {viewMode === 'list' && (
            <PageHeader
              title={getTitleBasedOnRole()}
              subtitle={getDescriptionBasedOnRole()}
              icon={user?.role === 'student' ? <UserGroupIcon className="w-10 h-10 text-primary-600" /> : 
                    user?.role === 'teacher' ? <AcademicCapIcon className="w-10 h-10 text-primary-600" /> :
                    <ChartBarIcon className="w-10 h-10 text-primary-600" />}
            />
          )}
          
          <div>
            {renderContent()}
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}