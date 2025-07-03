'use client';

import React, { useState } from 'react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/context/AuthContext';
import CourseListDisplay from '@/components/courses/CourseListDisplay';
import CourseFilters from '@/components/courses/CourseFilters';
import { useCourses } from '@/hooks/useCourses';
import { CourseSearchFilters } from '@/types/course';
import Link from 'next/link';

export default function CoursesPage() {
  const { user } = useAuth();
  const [filters, setFilters] = useState<CourseSearchFilters>({
    limit: 12,
    offset: 0,
    sortBy: 'title',
    sortOrder: 'asc'
  });
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const {
    courses,
    total: totalCount,
    loading,
    error,
    refresh
  } = useCourses(filters);

  const handleFiltersChange = (newFilters: CourseSearchFilters) => {
    setFilters({ ...newFilters, offset: 0 });
  };

  const handlePageChange = (page: number) => {
    setFilters(prev => ({
      ...prev,
      offset: (page - 1) * (prev.limit || 12)
    }));
  };

  const handleViewModeChange = (mode: 'grid' | 'list') => {
    setViewMode(mode);
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Error Loading Courses</h1>
          <p className="text-gray-600 mb-4">
            There was an error loading the courses. Please try again.
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
              <h1 className="text-3xl font-bold text-gray-900">Courses</h1>
              <p className="mt-2 text-gray-600">
                Explore our comprehensive course catalog
                {totalCount > 0 && ` (${totalCount} courses available)`}
              </p>
            </div>
            
            {user && (
              <div className="flex space-x-4">
                <Link
                  href="/courses/my-courses"
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  My Courses
                </Link>
                {(user.role === 'admin' || user.role === 'staff' || user.role === 'teacher') && (
                  <Link
                    href="/courses/create"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    Create Course
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filters Sidebar */}
          <div className="w-full lg:w-64 flex-shrink-0">
            <div className="sticky top-4">
              <CourseFilters
                filters={filters}
                onFilterChange={handleFiltersChange}
                onClearFilters={() => setFilters({
                  limit: 12,
                  offset: 0,
                  sortBy: 'title',
                  sortOrder: 'asc'
                })}
              />
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {/* View Controls */}
            <div className="mb-6 flex justify-between items-center">
              <div className="text-sm text-gray-600">
                {loading ? (
                  'Loading courses...'
                ) : (
                  <>
                    Showing {Math.min((filters.offset || 0) + 1, totalCount)} to{' '}
                    {Math.min((filters.offset || 0) + (filters.limit || 12), totalCount)} of{' '}
                    {totalCount} courses
                  </>
                )}
              </div>

              <div className="flex items-center space-x-4">
                {/* Sort Options */}
                <div className="flex items-center space-x-2">
                  <label htmlFor="sort" className="text-sm font-medium text-gray-700">
                    Sort by:
                  </label>
                  <select
                    id="sort"
                    value={`${filters.sortBy}-${filters.sortOrder}`}
                    onChange={(e) => {
                      const [sortBy, sortOrder] = e.target.value.split('-') as [
                        'title' | 'createdAt' | 'startDate' | 'popularity',
                        'asc' | 'desc'
                      ];
                      setFilters(prev => ({ ...prev, sortBy, sortOrder, offset: 0 }));
                    }}
                    className="text-sm border border-gray-300 rounded-md px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="title-asc">Title A-Z</option>
                    <option value="title-desc">Title Z-A</option>
                    <option value="startDate-asc">Start Date (Earliest)</option>
                    <option value="startDate-desc">Start Date (Latest)</option>
                    <option value="createdAt-desc">Newest First</option>
                    <option value="createdAt-asc">Oldest First</option>
                    <option value="popularity-desc">Most Popular</option>
                  </select>
                </div>

                {/* View Mode Toggle */}
                <div className="flex items-center border border-gray-300 rounded-md">
                  <button
                    onClick={() => handleViewModeChange('grid')}
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
                    onClick={() => handleViewModeChange('list')}
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
            </div>

            {/* Course List */}
            <CourseListDisplay
              courses={courses}
              loading={loading}
              viewMode={viewMode}
              totalCount={totalCount}
              currentPage={Math.floor((filters.offset || 0) / (filters.limit || 12)) + 1}
              pageSize={filters.limit || 12}
              onPageChange={handlePageChange}
              onRefresh={refresh}
            />
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}