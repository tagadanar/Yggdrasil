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
            <div className="text-red-600">Course not found</div>
            <button
              onClick={handleBackToList}
              className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              Back to Courses
            </button>
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
    <ProtectedRoute>
      <DashboardLayout>
        <div className="max-w-7xl mx-auto py-6">
          {viewMode === 'list' && (
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{getTitleBasedOnRole()}</h1>
              <p className="text-gray-600">{getDescriptionBasedOnRole()}</p>
            </div>
          )}
          
          {renderContent()}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}