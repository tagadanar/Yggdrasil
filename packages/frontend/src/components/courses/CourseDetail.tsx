'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Course } from '../../types/course';
import { useCourse, useCourseEnrollment, useCourseProgress } from '../../hooks/useCourses';
import { courseApi } from '../../utils/courseApi';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../ui/LoadingSpinner';
import toast from 'react-hot-toast';

interface CourseDetailProps {
  courseId: string;
}

const CourseDetail: React.FC<CourseDetailProps> = ({ courseId }) => {
  const router = useRouter();
  const { user } = useAuth();
  const { course, loading, error, refresh } = useCourse(courseId);
  const { enrollmentStatus, enroll, unenroll, loading: enrollmentLoading } = useCourseEnrollment(courseId);
  const { progress } = useCourseProgress(courseId);
  const [activeTab, setActiveTab] = useState<'overview' | 'curriculum' | 'resources' | 'assessments'>('overview');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-4">
          <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Course not found</h3>
        <p className="text-gray-600 mb-4">{error || 'The course you are looking for does not exist.'}</p>
        <Link 
          href="/courses"
          className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
        >
          Back to Courses
        </Link>
      </div>
    );
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatDuration = (duration: { weeks: number; hoursPerWeek: number; totalHours: number }) => {
    return `${duration.weeks} weeks • ${duration.hoursPerWeek} hours per week • ${duration.totalHours} total hours`;
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
      await unenroll();
    } else {
      await enroll();
    }
  };

  const canEditCourse = () => {
    if (!user || !course) return false;
    return (
      user.role === 'admin' || 
      user.role === 'staff' || 
      (user.role === 'teacher' && course.instructor === user._id)
    );
  };

  const canDeleteCourse = () => {
    if (!user || !course) return false;
    return (
      user.role === 'admin' || 
      user.role === 'staff' || 
      (user.role === 'teacher' && course.instructor === user._id)
    );
  };

  const handleEditCourse = () => {
    router.push(`/courses/${courseId}/edit`);
  };

  const handleDeleteCourse = async () => {
    setActionLoading(true);
    try {
      const result = await courseApi.deleteCourse(courseId);
      if (result.success) {
        toast.success('Course deleted successfully');
        router.push('/courses');
      } else {
        toast.error(result.error || 'Failed to delete course');
      }
    } catch (error) {
      toast.error('Failed to delete course');
    } finally {
      setActionLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  const handlePublishCourse = async () => {
    setActionLoading(true);
    try {
      const result = await courseApi.publishCourse(courseId);
      if (result.success) {
        toast.success('Course published successfully');
        refresh(); // Refresh course data
      } else {
        toast.error(result.error || 'Failed to publish course');
      }
    } catch (error) {
      toast.error('Failed to publish course');
    } finally {
      setActionLoading(false);
    }
  };

  const handleArchiveCourse = async () => {
    setActionLoading(true);
    try {
      const result = await courseApi.archiveCourse(courseId);
      if (result.success) {
        toast.success('Course archived successfully');
        refresh(); // Refresh course data
      } else {
        toast.error(result.error || 'Failed to archive course');
      }
    } catch (error) {
      toast.error('Failed to archive course');
    } finally {
      setActionLoading(false);
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">Description</h3>
              <p className="text-gray-600 leading-relaxed">{course.description}</p>
            </div>

            {course.prerequisites && course.prerequisites.length > 0 && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">Prerequisites</h3>
                <ul className="list-disc list-inside space-y-1 text-gray-600">
                  {course.prerequisites.map((prereq, index) => (
                    <li key={index}>{prereq}</li>
                  ))}
                </ul>
              </div>
            )}

            {course.schedule && course.schedule.length > 0 && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">Schedule</h3>
                <div className="space-y-2">
                  {course.schedule.map((schedule, index) => (
                    <div key={index} className="flex items-center text-gray-600">
                      <span className="font-medium w-20">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][schedule.dayOfWeek]}
                      </span>
                      <span>{schedule.startTime} - {schedule.endTime}</span>
                      {schedule.location && <span className="ml-2 text-gray-500">({schedule.location})</span>}
                      <span className="ml-2 px-2 py-1 text-xs bg-gray-100 rounded-full">
                        {schedule.type}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {progress && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">Your Progress</h3>
                <div className="bg-gray-200 rounded-full h-3 mb-2">
                  <div 
                    className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${progress.completionPercentage}%` }}
                  ></div>
                </div>
                <p className="text-sm text-gray-600">
                  {progress.completionPercentage}% complete • {progress.timeSpent} hours spent
                </p>
              </div>
            )}
          </div>
        );

      case 'curriculum':
        return (
          <div className="space-y-6">
            {course.chapters && course.chapters.length > 0 ? (
              course.chapters.map((chapter, chapterIndex) => (
                <div key={chapter._id} className="border border-gray-200 rounded-lg">
                  <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-medium text-gray-900">
                      Chapter {chapterIndex + 1}: {chapter.title}
                    </h3>
                    <p className="text-gray-600 mt-1">{chapter.description}</p>
                    <div className="flex items-center mt-2 text-sm text-gray-500">
                      <span>{chapter.estimatedDuration} minutes</span>
                      {chapter.isRequired && (
                        <span className="ml-3 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                          Required
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {chapter.sections && (
                    <div className="px-6 py-4">
                      <div className="space-y-3">
                        {chapter.sections.map((section, sectionIndex) => (
                          <div key={section._id} className="flex items-center justify-between">
                            <div className="flex items-center">
                              <span className="text-sm text-gray-500 w-8">
                                {sectionIndex + 1}.
                              </span>
                              <div>
                                <p className="font-medium text-gray-900">{section.title}</p>
                                <p className="text-sm text-gray-600">{section.description}</p>
                              </div>
                            </div>
                            <div className="flex items-center text-sm text-gray-500">
                              <span>{section.estimatedDuration} min</span>
                              {section.isCompleted && (
                                <svg className="w-5 h-5 text-green-500 ml-2" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                <p>Curriculum not yet available</p>
              </div>
            )}
          </div>
        );

      case 'resources':
        return (
          <div className="space-y-4">
            {course.resources && course.resources.length > 0 ? (
              course.resources.map((resource) => (
                <div key={resource._id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <svg className="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div className="ml-4">
                      <h4 className="text-lg font-medium text-gray-900">{resource.title}</h4>
                      <p className="text-gray-600">{resource.description}</p>
                      <div className="flex items-center mt-1 text-sm text-gray-500">
                        <span className="capitalize">{resource.type}</span>
                        {resource.isRequired && (
                          <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                            Required
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {resource.url && (
                    <a
                      href={resource.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                    >
                      Open
                      <svg className="ml-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                <p>No resources available yet</p>
              </div>
            )}
          </div>
        );

      case 'assessments':
        return (
          <div className="space-y-4">
            {course.assessments && course.assessments.length > 0 ? (
              course.assessments.map((assessment) => (
                <div key={assessment._id} className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-lg font-medium text-gray-900">{assessment.title}</h4>
                      <p className="text-gray-600 mt-1">{assessment.description}</p>
                      <div className="flex items-center mt-2 text-sm text-gray-500">
                        <span className="capitalize">{assessment.type}</span>
                        <span className="mx-2">•</span>
                        <span>{assessment.weight}% of grade</span>
                        <span className="mx-2">•</span>
                        <span>{assessment.maxScore} points</span>
                        {assessment.isRequired && (
                          <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                            Required
                          </span>
                        )}
                      </div>
                      {assessment.dueDate && (
                        <p className="text-sm text-gray-500 mt-1">
                          Due: {formatDate(assessment.dueDate)}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="mt-3">
                    <p className="text-sm text-gray-600">{assessment.instructions}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
                <p>No assessments defined yet</p>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-6 py-8">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(course.status)}`}>
                  {course.status}
                </span>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getLevelColor(course.level)}`}>
                  {course.level}
                </span>
                <span className="text-sm text-gray-500">({course.code})</span>
              </div>
              
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{course.title}</h1>
              
              <div className="flex flex-wrap items-center gap-6 text-sm text-gray-600">
                <div className="flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  {course.instructorInfo 
                    ? `${course.instructorInfo.firstName} ${course.instructorInfo.lastName}`
                    : 'Instructor TBD'
                  }
                </div>
                
                <div className="flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {formatDuration(course.duration)}
                </div>
                
                <div className="flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  {course.enrolledStudents.length}/{course.capacity} enrolled
                </div>
                
                <div className="flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {formatDate(course.startDate)} - {formatDate(course.endDate)}
                </div>
              </div>

              {course.tags && course.tags.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {course.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium bg-gray-100 text-gray-800"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Actions Sidebar */}
            <div className="ml-8 flex flex-col gap-3 min-w-[200px]">
              {/* Admin/Instructor Controls */}
              {canEditCourse() && (
                <div className="border-b border-gray-200 pb-3 mb-3">
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={handleEditCourse}
                      className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
                    >
                      Edit Course
                    </button>
                    
                    {course.status === 'draft' && (
                      <button
                        onClick={handlePublishCourse}
                        disabled={actionLoading}
                        className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm font-medium disabled:opacity-50"
                      >
                        {actionLoading ? 'Publishing...' : 'Publish Course'}
                      </button>
                    )}
                    
                    {course.status === 'published' && (
                      <button
                        onClick={handleArchiveCourse}
                        disabled={actionLoading}
                        className="w-full px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors text-sm font-medium disabled:opacity-50"
                      >
                        {actionLoading ? 'Archiving...' : 'Archive Course'}
                      </button>
                    )}
                    
                    {canDeleteCourse() && (
                      <button
                        onClick={() => setShowDeleteConfirm(true)}
                        className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm font-medium"
                      >
                        Delete Course
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Enrollment Actions */}
              {course.status === 'published' && !canEditCourse() && (
                <>
                  {enrollmentStatus?.enrolled ? (
                    <div className="text-center p-4 bg-green-50 border border-green-200 rounded-lg">
                      <svg className="mx-auto h-8 w-8 text-green-500 mb-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <p className="text-sm font-medium text-green-800">You're enrolled!</p>
                      {enrollmentStatus.enrollmentDate && (
                        <p className="text-xs text-green-600 mt-1">
                          Since {formatDate(enrollmentStatus.enrollmentDate)}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="text-center p-4 border border-gray-200 rounded-lg">
                      <p className="text-sm text-gray-600 mb-3">
                        {getAvailableSpots()} spots available
                      </p>
                    </div>
                  )}

                  <button
                    onClick={handleEnrollmentAction}
                    disabled={enrollmentLoading || (!enrollmentStatus?.enrolled && getAvailableSpots() <= 0)}
                    className={`w-full px-6 py-3 rounded-md text-sm font-medium transition-colors ${
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
                      ? 'Unenroll from Course'
                      : getAvailableSpots() > 0 
                      ? 'Enroll in Course'
                      : 'Course Full'
                    }
                  </button>
                </>
              )}

              {/* Course Info for Instructors */}
              {canEditCourse() && (
                <div className="text-center p-4 border border-gray-200 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">
                    {course.enrolledStudents.length}/{course.capacity} enrolled
                  </p>
                  <p className="text-xs text-gray-500">
                    {getAvailableSpots()} spots available
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200">
        <nav className="px-6 flex space-x-8">
          {[
            { key: 'overview', label: 'Overview' },
            { key: 'curriculum', label: 'Curriculum' },
            { key: 'resources', label: 'Resources' },
            { key: 'assessments', label: 'Assessments' }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white">
        <div className="px-6 py-8">
          {renderTabContent()}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center mb-4">
              <svg className="h-6 w-6 text-red-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900">Delete Course</h3>
            </div>
            <div className="mb-4">
              <p className="text-sm text-gray-500">
                Are you sure you want to delete "{course.title}"? This action cannot be undone. 
                All enrolled students will be unenrolled and all course data will be permanently removed.
              </p>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={actionLoading}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteCourse}
                disabled={actionLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                {actionLoading ? 'Deleting...' : 'Delete Course'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CourseDetail;