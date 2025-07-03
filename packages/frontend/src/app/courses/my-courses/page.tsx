'use client';

import React, { useState } from 'react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/context/AuthContext';
import CourseListDisplay from '@/components/courses/CourseListDisplay';
import { useCourses } from '@/hooks/useCourses';
import { CourseSearchFilters, Course } from '@/types/course';
import Link from 'next/link';

type CourseFilter = 'all' | 'enrolled' | 'teaching' | 'completed';

export default function MyCoursesPage() {
  const { user } = useAuth();
  const [activeFilter, setActiveFilter] = useState<CourseFilter>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Base filters for user's courses
  const baseFilters: CourseSearchFilters = {
    limit: 12,
    offset: 0,
    sortBy: 'startDate',
    sortOrder: 'desc'
  };

  // Get all courses (we'll filter client-side for this page)
  const {
    courses: allCourses,
    loading,
    error,
    refresh
  } = useCourses(baseFilters);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your courses...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // ProtectedRoute will handle redirection
  }

  // Filter courses based on user relationship
  const filterCourses = (courses: Course[], filter: CourseFilter): Course[] => {
    const userId = user._id;
    if (!userId) return [];

    switch (filter) {
      case 'enrolled':
        return courses.filter(course => 
          course.enrolledStudents.includes(userId) && course.instructor !== userId
        );
      case 'teaching':
        return courses.filter(course => course.instructor === userId);
      case 'completed':
        // For now, we'll consider courses that have ended as completed
        return courses.filter(course => 
          course.enrolledStudents.includes(userId) && 
          new Date(course.endDate) < new Date()
        );
      case 'all':
      default:
        return courses.filter(course => 
          course.enrolledStudents.includes(userId) || course.instructor === userId
        );
    }
  };

  const filteredCourses = filterCourses(allCourses, activeFilter);

  const getCourseStats = () => {
    const userId = user._id;
    if (!userId) return { enrolled: 0, teaching: 0, completed: 0, total: 0 };

    const enrolled = allCourses.filter(course => 
      course.enrolledStudents.includes(userId) && course.instructor !== userId
    ).length;
    
    const teaching = allCourses.filter(course => course.instructor === userId).length;
    
    const completed = allCourses.filter(course => 
      course.enrolledStudents.includes(userId) && 
      new Date(course.endDate) < new Date()
    ).length;
    
    const total = allCourses.filter(course => 
      course.enrolledStudents.includes(userId) || course.instructor === userId
    ).length;

    return { enrolled, teaching, completed, total };
  };

  const stats = getCourseStats();

  const filterOptions: { key: CourseFilter; label: string; count: number }[] = [
    { key: 'all', label: 'All Courses', count: stats.total },
    { key: 'enrolled', label: 'Enrolled', count: stats.enrolled },
    { key: 'teaching', label: 'Teaching', count: stats.teaching },
    { key: 'completed', label: 'Completed', count: stats.completed },
  ];

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Error Loading Courses</h1>
          <p className="text-gray-600 mb-4">
            There was an error loading your courses. Please try again.
          </p>
          <button
            onClick={() => refresh()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <ProtectedRoute requiredRoles={['admin', 'staff', 'teacher', 'student']}>
      <div>
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">My Courses</h1>
              <p className="mt-2 text-gray-600">
                Manage your enrolled courses and courses you're teaching
              </p>
            </div>
            
            <div className="flex space-x-4">
              <Link
                href="/courses"
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Browse Courses
              </Link>
              <Link
                href="/courses/create"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Create Course
              </Link>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-2xl font-semibold text-gray-900">{stats.total}</p>
                <p className="text-sm text-gray-600">Total Courses</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-2xl font-semibold text-gray-900">{stats.enrolled}</p>
                <p className="text-sm text-gray-600">Enrolled</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <svg className="w-6 h-6 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-2xl font-semibold text-gray-900">{stats.teaching}</p>
                <p className="text-sm text-gray-600">Teaching</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <svg className="w-6 h-6 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-2xl font-semibold text-gray-900">{stats.completed}</p>
                <p className="text-sm text-gray-600">Completed</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8" aria-label="Tabs">
              {filterOptions.map((option) => (
                <button
                  key={option.key}
                  onClick={() => setActiveFilter(option.key)}
                  className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                    activeFilter === option.key
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {option.label}
                  <span className={`ml-2 py-0.5 px-2 rounded-full text-xs ${
                    activeFilter === option.key
                      ? 'bg-blue-100 text-blue-600'
                      : 'bg-gray-100 text-gray-900'
                  }`}>
                    {option.count}
                  </span>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* View Controls */}
        <div className="mb-6 flex justify-between items-center">
          <div className="text-sm text-gray-600">
            {loading ? (
              'Loading courses...'
            ) : (
              `Showing ${filteredCourses.length} course${filteredCourses.length !== 1 ? 's' : ''}`
            )}
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center border border-gray-300 rounded-md">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 ${
                viewMode === 'grid'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              title="Grid view"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 ${
                viewMode === 'list'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              title="List view"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>

        {/* Empty State */}
        {!loading && filteredCourses.length === 0 && (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              {activeFilter === 'all' && 'No courses found'}
              {activeFilter === 'enrolled' && 'Not enrolled in any courses'}
              {activeFilter === 'teaching' && 'Not teaching any courses'}
              {activeFilter === 'completed' && 'No completed courses'}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {activeFilter === 'all' && 'Get started by browsing available courses or creating your own.'}
              {activeFilter === 'enrolled' && 'Browse available courses to enroll in your first course.'}
              {activeFilter === 'teaching' && 'Create your first course to start teaching.'}
              {activeFilter === 'completed' && 'Complete some courses to see them here.'}
            </p>
            <div className="mt-6">
              {(activeFilter === 'all' || activeFilter === 'enrolled') && (
                <Link
                  href="/courses"
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Browse Courses
                </Link>
              )}
              {(activeFilter === 'all' || activeFilter === 'teaching') && (
                <Link
                  href="/courses/create"
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ml-3"
                >
                  Create Course
                </Link>
              )}
            </div>
          </div>
        )}

        {/* Course List */}
        {filteredCourses.length > 0 && (
          <CourseListDisplay
            courses={filteredCourses}
            loading={loading}
            viewMode={viewMode}
            totalCount={filteredCourses.length}
            currentPage={1}
            pageSize={filteredCourses.length}
            onPageChange={() => {}}
            onRefresh={refresh}
            showEnrollmentActions={false}
          />
        )}
      </div>
    </ProtectedRoute>
  );
}