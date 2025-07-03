'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Course } from '../../types/course';
import { useCourseEnrollment } from '../../hooks/useCourses';

interface CourseCardProps {
  course: Course;
  viewMode: 'grid' | 'list';
  instructorView?: boolean;
  onUpdate?: () => void;
  showEnrollmentActions?: boolean;
}

const CourseCard: React.FC<CourseCardProps> = ({ 
  course, 
  viewMode, 
  instructorView = false,
  onUpdate,
  showEnrollmentActions = true
}) => {
  const [showFullDescription, setShowFullDescription] = useState(false);
  const { enrollmentStatus, enroll, unenroll, loading: enrollmentLoading } = useCourseEnrollment(course._id);

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatDuration = (duration: { weeks: number; hoursPerWeek: number; totalHours: number }) => {
    return `${duration.weeks} weeks • ${duration.hoursPerWeek}h/week • ${duration.totalHours}h total`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published':
        return 'bg-green-100 text-green-800';
      case 'draft':
        return 'bg-yellow-100 text-yellow-800';
      case 'archived':
        return 'bg-gray-100 text-gray-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'beginner':
        return 'bg-blue-100 text-blue-800';
      case 'intermediate':
        return 'bg-yellow-100 text-yellow-800';
      case 'advanced':
        return 'bg-orange-100 text-orange-800';
      case 'expert':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getAvailableSpots = () => {
    return course.capacity - course.enrolledStudents.length;
  };

  const handleEnrollmentAction = async () => {
    if (enrollmentStatus?.enrolled) {
      const result = await unenroll();
      if (result.success && onUpdate) {
        onUpdate();
      }
    } else {
      const result = await enroll();
      if (result.success && onUpdate) {
        onUpdate();
      }
    }
  };

  const truncatedDescription = course.description.length > 150 
    ? `${course.description.substring(0, 150)}...`
    : course.description;

  if (viewMode === 'list') {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <Link 
                href={`/courses/${course._id}`}
                className="text-xl font-semibold text-gray-900 hover:text-blue-600 transition-colors"
              >
                {course.title}
              </Link>
              <span className="text-sm text-gray-500">({course.code})</span>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(course.status)}`}>
                {course.status}
              </span>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getLevelColor(course.level)}`}>
                {course.level}
              </span>
            </div>
            
            <p className="text-gray-600 mb-4">
              {showFullDescription ? course.description : truncatedDescription}
              {course.description.length > 150 && (
                <button
                  onClick={() => setShowFullDescription(!showFullDescription)}
                  className="text-blue-600 hover:text-blue-800 ml-1 text-sm"
                >
                  {showFullDescription ? 'Show less' : 'Show more'}
                </button>
              )}
            </p>

            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
              <div className="flex items-center">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                {course.instructorInfo 
                  ? `${course.instructorInfo.firstName} ${course.instructorInfo.lastName}`
                  : 'Instructor TBD'
                }
              </div>
              
              <div className="flex items-center">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {formatDuration(course.duration)}
              </div>
              
              <div className="flex items-center">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                {course.enrolledStudents.length}/{course.capacity} enrolled
              </div>
              
              <div className="flex items-center">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {formatDate(course.startDate)} - {formatDate(course.endDate)}
              </div>
            </div>

            {course.tags && course.tags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {course.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-800"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="ml-6 flex flex-col items-end gap-3">
            {!instructorView && course.status === 'published' && (
              <button
                onClick={handleEnrollmentAction}
                disabled={enrollmentLoading || getAvailableSpots() <= 0}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  enrollmentStatus?.enrolled
                    ? 'bg-red-100 text-red-700 hover:bg-red-200 border border-red-200'
                    : getAvailableSpots() > 0
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {enrollmentLoading 
                  ? 'Loading...'
                  : enrollmentStatus?.enrolled 
                  ? 'Unenroll'
                  : getAvailableSpots() > 0 
                  ? 'Enroll'
                  : 'Full'
                }
              </button>
            )}

            <Link
              href={`/courses/${course._id}`}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            >
              View Details
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Grid view
  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
      <div className="p-6">
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(course.status)}`}>
              {course.status}
            </span>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getLevelColor(course.level)}`}>
              {course.level}
            </span>
          </div>
          <span className="text-sm text-gray-500">{course.code}</span>
        </div>

        <Link 
          href={`/courses/${course._id}`}
          className="block mb-3"
        >
          <h3 className="text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors line-clamp-2">
            {course.title}
          </h3>
        </Link>

        <p className="text-gray-600 text-sm mb-4 line-clamp-3">
          {course.description}
        </p>

        <div className="space-y-2 text-sm text-gray-500 mb-4">
          <div className="flex items-center">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="truncate">
              {course.instructorInfo 
                ? `${course.instructorInfo.firstName} ${course.instructorInfo.lastName}`
                : 'Instructor TBD'
              }
            </span>
          </div>
          
          <div className="flex items-center">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{course.duration.weeks} weeks • {course.duration.totalHours}h</span>
          </div>
          
          <div className="flex items-center">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span>{course.enrolledStudents.length}/{course.capacity} enrolled</span>
          </div>
        </div>

        {course.tags && course.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
            {course.tags.slice(0, 3).map((tag, index) => (
              <span
                key={index}
                className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-800"
              >
                {tag}
              </span>
            ))}
            {course.tags.length > 3 && (
              <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-800">
                +{course.tags.length - 3} more
              </span>
            )}
          </div>
        )}

        <div className="flex gap-2">
          {!instructorView && course.status === 'published' && (
            <button
              onClick={handleEnrollmentAction}
              disabled={enrollmentLoading || getAvailableSpots() <= 0}
              className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                enrollmentStatus?.enrolled
                  ? 'bg-red-100 text-red-700 hover:bg-red-200 border border-red-200'
                  : getAvailableSpots() > 0
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {enrollmentLoading 
                ? 'Loading...'
                : enrollmentStatus?.enrolled 
                ? 'Unenroll'
                : getAvailableSpots() > 0 
                ? 'Enroll'
                : 'Full'
              }
            </button>
          )}

          <Link
            href={`/courses/${course._id}`}
            className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
          >
            View Details
          </Link>
        </div>
      </div>
    </div>
  );
};

export default CourseCard;