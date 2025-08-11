// packages/frontend/src/components/courses/CourseList.tsx
// Course list component with search, filtering, and role-based actions

'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/AuthProvider';
import { courseApi } from '@/lib/api/courses';
import { User as SharedUser, Course } from '@yggdrasil/shared-utilities/client';


interface CourseListProps {
  showCreateButton?: boolean;
  onCourseCreate?: () => void;
  onCourseEdit?: (course: Course) => void;
  onCourseView?: (course: Course) => void;
}

export const CourseList: React.FC<CourseListProps> = ({
  showCreateButton = true,
  onCourseCreate,
  onCourseEdit,
  onCourseView,
}) => {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'my-courses' | 'published' | 'all'>('my-courses');

  useEffect(() => {
    loadCourses();
    loadCategories();
  }, [viewMode, user]);

  const loadCourses = async () => {
    try {
      setLoading(true);
      setError(null);

      let response;

      if (viewMode === 'my-courses' && user) {
        response = await courseApi.getMyCourses();
      } else if (viewMode === 'published') {
        response = await courseApi.getPublishedCourses();
      } else {
        // Search all courses with filters
        response = await courseApi.searchCourses({
          search: searchQuery || undefined,
          category: selectedCategory || undefined,
          level: selectedLevel || undefined,
          limit: 50,
        });
      }

      if (response.success) {
        const coursesData = viewMode === 'all' && response.data.courses
          ? response.data.courses
          : response.data;
        setCourses(Array.isArray(coursesData) ? coursesData : []);
      } else {
        setError(response.error || 'Failed to load courses');
      }
    } catch (err: any) {
      console.error('Error loading courses:', err);
      setError(err.response?.data?.error || 'Failed to load courses');
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const categoryList = await courseApi.getCourseCategories();
      setCategories(categoryList as string[]);
    } catch (err) {
      console.error('Error loading categories:', err);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (viewMode === 'all') {
      loadCourses();
    }
  };


  const handlePublishToggle = async (course: Course) => {
    try {
      const publish = course.status !== 'published';
      const response = await courseApi.publishCourse(course._id, publish);
      if (response.success) {
        alert(`Course ${publish ? 'published' : 'unpublished'} successfully!`);
        loadCourses(); // Refresh the list
      } else {
        alert(response.error || 'Failed to update course status');
      }
    } catch (err: any) {
      console.error('Error updating course status:', err);
      alert(err.response?.data?.error || 'Failed to update course status');
    }
  };

  const canManageCourse = (course: Course) => {
    if (!user) return false;
    return (
      user.role === 'admin' ||
      course.instructor._id === (user as SharedUser)._id ||
      user.role === 'staff'
    );
  };

  const getLevelBadgeColor = (level: string) => {
    switch (level) {
      case 'beginner': return 'bg-green-100 text-green-800';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'published': return 'bg-green-100 text-green-800';
      case 'draft': return 'bg-yellow-100 text-yellow-800';
      case 'archived': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading courses...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="course-list">
      {/* Header with view mode selector */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex space-x-4">
          <button
            onClick={() => setViewMode('my-courses')}
            className={`px-4 py-2 rounded-md font-medium ${
              viewMode === 'my-courses'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            data-testid="my-courses-tab"
          >
            {user?.role === 'student' ? 'My Accessible Courses' : 'My Courses'}
          </button>
          <button
            onClick={() => setViewMode('published')}
            className={`px-4 py-2 rounded-md font-medium ${
              viewMode === 'published'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Browse Courses
          </button>
          {(user?.role === 'admin' || user?.role === 'staff') && (
            <button
              onClick={() => setViewMode('all')}
              className={`px-4 py-2 rounded-md font-medium ${
                viewMode === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All Courses
            </button>
          )}
        </div>

        {showCreateButton && user && ['teacher', 'staff', 'admin'].includes(user.role) && (
          <button
            onClick={onCourseCreate}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 font-medium"
            data-testid="create-course-btn"
          >
            + Create Course
          </button>
        )}
      </div>

      {/* Search and filters */}
      {viewMode === 'all' && (
        <div className="bg-white p-4 rounded-lg border">
          <form onSubmit={handleSearch} className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search courses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                data-testid="course-search"
              />
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              data-testid="category-filter"
            >
              <option value="">All Categories</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
            <select
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              data-testid="level-filter"
            >
              <option value="">All Levels</option>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
            <button
              type="submit"
              className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
            >
              Search
            </button>
          </form>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Course grid */}
      {courses.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-500 text-lg">
            {viewMode === 'my-courses'
              ? (user?.role === 'student' ? 'No accessible courses yet.' : 'No courses created yet.')
              : 'No courses found.'
            }
          </div>
          {viewMode === 'my-courses' && user?.role === 'student' && (
            <p className="text-gray-400 mt-2">
              Courses become available through your promotion calendar.
            </p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="courses-container">
          {courses.map((course) => (
            <div
              key={course._id}
              className="bg-white rounded-lg border hover:shadow-lg transition-shadow duration-200"
              data-testid={`course-card-${course._id}`}
            >
              {/* Course thumbnail */}
              <div className="h-48 bg-gray-200 rounded-t-lg flex items-center justify-center">
                {course.thumbnail ? (
                  <img
                    src={course.thumbnail}
                    alt={course.title}
                    className="w-full h-full object-cover rounded-t-lg"
                  />
                ) : (
                  <div className="text-gray-400 text-4xl">📚</div>
                )}
              </div>

              <div className="p-4">
                {/* Course title and status */}
                <div className="flex items-start justify-between mb-2">
                  <h3
                    className="text-lg font-semibold text-gray-900 cursor-pointer hover:text-blue-600"
                    onClick={() => onCourseView?.(course)}
                    data-testid="course-title"
                  >
                    {course.title}
                  </h3>
                  <div className="flex flex-col space-y-1 ml-2">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getLevelBadgeColor(course.level)}`}>
                      {course.level}
                    </span>
                    {canManageCourse(course) && (
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadgeColor(course.status)}`}>
                        {course.status}
                      </span>
                    )}
                  </div>
                </div>

                {/* Course description */}
                <p className="text-gray-600 text-sm mb-3 line-clamp-2" data-testid="course-description">
                  {course.description}
                </p>

                {/* Course metadata */}
                <div className="text-xs text-gray-500 mb-3 space-y-1">
                  <div>Instructor: {course.instructor.name}</div>
                  <div>Category: {course.category}</div>
                  {course.estimatedDuration > 0 && (
                    <div>Duration: {Math.round(course.estimatedDuration / 60)}h</div>
                  )}
                  <div>Views: {course.stats.totalViews}</div>
                </div>

                {/* Tags */}
                {course.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {course.tags.slice(0, 3).map((tag, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded"
                      >
                        {tag}
                      </span>
                    ))}
                    {course.tags.length > 3 && (
                      <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                        +{course.tags.length - 3} more
                      </span>
                    )}
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex space-x-2">
                  {user?.role === 'student' && (
                    <button
                      onClick={() => onCourseView?.(course)}
                      className="flex-1 bg-blue-600 text-white py-2 px-3 rounded text-sm hover:bg-blue-700"
                      data-testid={`view-course-${course._id}`}
                    >
                      View Course
                    </button>
                  )}

                  {canManageCourse(course) && (
                    <>
                      <button
                        onClick={() => onCourseEdit?.(course)}
                        className="flex-1 bg-gray-100 text-gray-700 py-2 px-3 rounded text-sm hover:bg-gray-200"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handlePublishToggle(course)}
                        className={`flex-1 py-2 px-3 rounded text-sm ${
                          course.status === 'published'
                            ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                            : 'bg-green-100 text-green-700 hover:bg-green-200'
                        }`}
                        data-testid={course.status === 'published' ? 'unpublish-course-btn' : 'publish-course-btn'}
                      >
                        {course.status === 'published' ? 'Unpublish' : 'Publish'}
                      </button>
                    </>
                  )}

                  {!canManageCourse(course) && user?.role !== 'student' && (
                    <button
                      onClick={() => onCourseView?.(course)}
                      className="bg-gray-100 text-gray-700 py-2 px-3 rounded text-sm hover:bg-gray-200"
                      data-testid={`view-course-${course._id}`}
                    >
                      View
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CourseList;
