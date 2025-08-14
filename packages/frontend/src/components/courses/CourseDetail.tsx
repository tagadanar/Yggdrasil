// packages/frontend/src/components/courses/CourseDetail.tsx
// Detailed course view with chapters, sections, and content

'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/AuthProvider';
import { courseApi } from '@/lib/api/courses';
import { StatisticsApi } from '@/lib/api/statistics';
import { User as SharedUser } from '@yggdrasil/shared-utilities/client';
import { Course, Chapter, CourseResource, Section, Content } from '@yggdrasil/shared-utilities';
import { useAsyncResource } from '@/hooks/useAsyncResource';
import { useModalManager } from '@/hooks/useModalManager';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { ExerciseSubmission } from './ExerciseSubmission';
import { ProgressTracker } from '../progress/ProgressTracker';
import { CourseContentEditor } from './CourseContentEditor';

interface CourseDetailProps {
  courseId: string;
  onEdit?: () => void;
  onBack?: () => void;
}

export const CourseDetail: React.FC<CourseDetailProps> = ({
  courseId,
  onEdit,
  onBack,
}) => {
  const { user } = useAuth();
  
  // Enhanced course data fetching with caching
  const courseResource = useAsyncResource(
    async () => {
      const response = await courseApi.getCourseById(courseId);
      if (response.success) {
        return response.data;
      } else {
        throw new Error(response.error || 'Failed to load course');
      }
    },
    {
      dependencies: [courseId],
      cacheTime: 5 * 60 * 1000, // Cache for 5 minutes
      component: 'CourseDetail'
    }
  );

  // Enhanced progress data fetching for students
  const progressResource = useAsyncResource(
    async () => {
      if (!user || user.role !== 'student' || !courseId || !user._id) {
        return null;
      }

      const response = await StatisticsApi.getStudentCourseProgress(user._id, courseId);
      if (response.success && response.data) {
        const remainingProgress = 100 - response.data.overallProgress;
        const estimatedTimeRemaining = Math.round(
          (courseResource.data?.estimatedDuration || 60) * (remainingProgress / 100)
        );

        return {
          hasAccess: response.data.accessStatus === 'active' || response.data.accessStatus === 'completed',
          overallProgress: response.data.overallProgress,
          timeSpent: response.data.timeSpent,
          estimatedTimeRemaining,
          chapters: response.data.chapters,
        };
      }
      return { hasAccess: false };
    },
    {
      dependencies: [user?._id, courseId, user?.role, courseResource.data?.estimatedDuration],
      cacheTime: 2 * 60 * 1000, // Cache for 2 minutes (more dynamic)
      component: 'CourseDetail-Progress'
    }
  );

  // Modal management for exercises and content editing
  const modalManager = useModalManager();

  // Persistent UI states with localStorage
  const [expandedChapters, setExpandedChapters] = useLocalStorage<string[]>(`course-${courseId}-expanded-chapters`, []);
  const [expandedSections, setExpandedSections] = useLocalStorage<string[]>(`course-${courseId}-expanded-sections`, []);
  const [activeTab, setActiveTab] = useLocalStorage<'overview' | 'content' | 'resources' | 'analytics' | 'progress'>(`course-${courseId}-active-tab`, 'overview');
  
  // Simple state for selected exercise (doesn't need persistence)
  const [selectedExercise, setSelectedExercise] = useState<any | null>(null);

  // Computed values from resources
  const course = courseResource.data;
  const loading = courseResource.loading;
  const error = courseResource.error;
  const progressData = progressResource.data;
  const hasAccess = progressData?.hasAccess || false;

  const canManageCourse = () => {
    if (!user || !course) return false;
    return (
      user.role === 'admin' ||
      course.instructor._id === (user as SharedUser)._id ||
      user.role === 'staff' ||
      course.collaborators.some(collab => collab._id === (user as SharedUser)._id)
    );
  };


  // Enhanced toggle functions with persistent arrays
  const toggleChapter = (chapterId: string) => {
    setExpandedChapters(prev => {
      if (prev.includes(chapterId)) {
        return prev.filter(id => id !== chapterId);
      } else {
        return [...prev, chapterId];
      }
    });
  };

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      if (prev.includes(sectionId)) {
        return prev.filter(id => id !== sectionId);
      } else {
        return [...prev, sectionId];
      }
    });
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

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  // Enhanced exercise handlers with modal management
  const handleContentClick = (content: Content) => {
    if (content.type === 'exercise' && user?.role === 'student') {
      // Convert content data to exercise format
      const exercise = {
        _id: content._id,
        title: content.title || 'Exercise',
        description: content.data?.exercise?.description || 'Complete this exercise',
        type: content.data?.exercise?.type || 'code',
        instructions: content.data?.exercise?.instructions || 'Follow the instructions to complete this exercise',
        starterCode: content.data?.exercise?.starterCode,
        solution: content.data?.exercise?.solution,
        testCases: content.data?.exercise?.testCases,
        hints: content.data?.exercise?.hints,
        difficulty: content.data?.exercise?.difficulty || 'medium',
        programmingLanguage: content.data?.exercise?.programmingLanguage,
        maxAttempts: content.data?.exercise?.maxAttempts,
        timeLimit: content.data?.exercise?.timeLimit,
      };
      
      setSelectedExercise(exercise);
      modalManager.open('exercise', { exercise });
    }
  };

  const handleExerciseSubmissionComplete = (submission: any) => {
    // Refresh progress data after submission
    progressResource.refresh();
    modalManager.close('exercise');
  };

  const handleBackFromExercise = () => {
    setSelectedExercise(null);
    modalManager.close('exercise');
  };

  const handleContentUpdate = async (updatedChapters: any[]) => {
    if (!course) return;

    try {
      // Here you would typically save to the backend
      // const response = await courseApi.updateCourseContent(courseId, { chapters: updatedChapters });
      // if (!response.success) {
      //   throw new Error(response.error);
      // }
      
      // Refresh course data to get latest changes
      courseResource.refresh();
    } catch (error) {
      console.error('Error updating course content:', error);
      // Refresh course data to revert any local changes
      courseResource.refresh();
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading course...</span>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 text-lg mb-4">{error || 'Course not found'}</div>
        <button
          onClick={onBack}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
        >
          Back to Courses
        </button>
      </div>
    );
  }

  // Show exercise submission interface if modal is open
  if (modalManager.isOpen('exercise') && selectedExercise) {
    return (
      <ExerciseSubmission
        exercise={selectedExercise}
        courseId={courseId}
        onSubmissionComplete={handleExerciseSubmissionComplete}
        onBack={handleBackFromExercise}
      />
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6" data-testid="course-detail">
      {/* Header */}
      <div className="bg-white rounded-lg border p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              {onBack && (
                <button
                  onClick={onBack}
                  className="text-gray-600 hover:text-gray-800"
                >
                  ← Back
                </button>
              )}
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2" data-testid="course-detail-title">
              {course.title}
            </h1>
            <p className="text-gray-600 mb-4" data-testid="course-description">
              {course.description}
            </p>

            <div className="flex flex-wrap items-center gap-4">
              <span className={`px-3 py-1 text-sm font-medium rounded-full ${getLevelBadgeColor(course.level)}`}>
                {course.level}
              </span>
              {canManageCourse() && (
                <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusBadgeColor(course.status)}`}>
                  {course.status}
                </span>
              )}
              <span className="text-sm text-gray-500">
                by {course.instructor.name}
              </span>
              <span className="text-sm text-gray-500">
                {course.stats.totalViews} views
              </span>
              {course.estimatedDuration > 0 && (
                <span className="text-sm text-gray-500">
                  {formatDuration(course.estimatedDuration)}
                </span>
              )}
            </div>
          </div>

          <div className="flex space-x-2">
            {user?.role === 'student' && !hasAccess && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-md px-4 py-2 text-sm text-yellow-800">
                Access through your promotion calendar
              </div>
            )}
            {canManageCourse() && onEdit && (
              <button
                onClick={onEdit}
                className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200"
              >
                Edit Course
              </button>
            )}
          </div>
        </div>

        {/* Tags and Prerequisites */}
        <div className="space-y-3">
          {course.tags.length > 0 && (
            <div>
              <span className="text-sm font-medium text-gray-700 mr-2">Tags:</span>
              <div className="inline-flex flex-wrap gap-1">
                {course.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {course.prerequisites.length > 0 && (
            <div>
              <span className="text-sm font-medium text-gray-700 mr-2">Prerequisites:</span>
              <div className="inline-flex flex-wrap gap-1">
                {course.prerequisites.map((prereq, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded"
                  >
                    {prereq}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white rounded-lg border">
        <div className="border-b">
          <nav className="flex space-x-8 px-6">
            {(['overview', 'content', 'resources'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 text-sm font-medium border-b-2 ${
                  activeTab === tab
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
            {user?.role === 'student' && hasAccess && (
              <button
                onClick={() => setActiveTab('progress')}
                className={`py-4 text-sm font-medium border-b-2 ${
                  activeTab === 'progress'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Progress
              </button>
            )}
            {canManageCourse() && (
              <button
                onClick={() => setActiveTab('analytics')}
                className={`py-4 text-sm font-medium border-b-2 ${
                  activeTab === 'analytics'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Analytics
              </button>
            )}
          </nav>
        </div>

        <div className="p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Course Information</h3>
                <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Category</dt>
                    <dd className="text-sm text-gray-900">{course.category}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Level</dt>
                    <dd className="text-sm text-gray-900 capitalize">{course.level}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Duration</dt>
                    <dd className="text-sm text-gray-900">{formatDuration(course.estimatedDuration)}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Total Views</dt>
                    <dd className="text-sm text-gray-900">{course.stats.totalViews}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Chapters</dt>
                    <dd className="text-sm text-gray-900">{course.chapters.length}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
                    <dd className="text-sm text-gray-900">
                      {new Date(course.lastModified).toLocaleDateString()}
                    </dd>
                  </div>
                </dl>
              </div>

              {course.collaborators.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Collaborators</h3>
                  <div className="space-y-2">
                    {course.collaborators.map((collaborator) => (
                      <div key={collaborator._id} className="flex items-center justify-between py-2">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{collaborator.name}</div>
                          <div className="text-sm text-gray-500">{collaborator.email}</div>
                        </div>
                        <span className="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded">
                          {collaborator.role}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Content Tab */}
          {activeTab === 'content' && (
            <div className="space-y-4" data-testid="course-chapters">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Course Content</h3>
                {canManageCourse() && (
                  <button
                    onClick={() => modalManager.toggle('contentEditor')}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm"
                    data-testid="edit-content-btn"
                  >
                    {modalManager.isOpen('contentEditor') ? 'View Mode' : 'Edit Content'}
                  </button>
                )}
              </div>

              {modalManager.isOpen('contentEditor') && canManageCourse() ? (
                <CourseContentEditor
                  courseId={courseId}
                  chapters={course.chapters}
                  onContentUpdate={handleContentUpdate}
                  canEdit={canManageCourse()}
                />
              ) : course.chapters.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-gray-500">No chapters added yet.</div>
                  {canManageCourse() && (
                    <button
                      onClick={() => modalManager.open('contentEditor')}
                      className="mt-2 text-blue-600 hover:text-blue-800"
                      data-testid="add-chapter-btn"
                    >
                      Add your first chapter
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {course.chapters
                    .sort((a, b) => a.order - b.order)
                    .map((chapter) => (
                      <div key={chapter._id} className="border rounded-lg">
                        <button
                          onClick={() => toggleChapter(chapter._id)}
                          className="w-full px-4 py-3 text-left flex items-center justify-between hover:bg-gray-50"
                          data-testid="chapter-item"
                        >
                          <div className="flex items-center space-x-3">
                            <span className="text-lg font-medium text-gray-900">
                              {chapter.order}. {chapter.title}
                            </span>
                            {!chapter.isPublished && canManageCourse() && (
                              <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded">
                                Draft
                              </span>
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm text-gray-500">
                              {chapter.sections.length} sections
                            </span>
                            <span className={`transform transition-transform ${
                              expandedChapters.includes(chapter._id) ? 'rotate-180' : ''
                            }`}>
                              ▼
                            </span>
                          </div>
                        </button>

                        {expandedChapters.includes(chapter._id) && (
                          <div className="px-4 pb-3 border-t bg-gray-50">
                            {chapter.description && (
                              <p className="text-sm text-gray-600 mb-3 pt-3">{chapter.description}</p>
                            )}

                            {chapter.sections.length === 0 ? (
                              <div className="py-4 text-center text-gray-500 text-sm">
                                No sections in this chapter yet.
                              </div>
                            ) : (
                              <div className="space-y-2">
                                {chapter.sections
                                  .sort((a, b) => a.order - b.order)
                                  .map((section) => (
                                    <div key={section._id} className="bg-white rounded border">
                                      <button
                                        onClick={() => toggleSection(section._id)}
                                        className="w-full px-3 py-2 text-left flex items-center justify-between hover:bg-gray-50"
                                        data-testid="section-item"
                                      >
                                        <div className="flex items-center space-x-2">
                                          <span className="text-sm font-medium text-gray-800">
                                            {chapter.order}.{section.order} {section.title}
                                          </span>
                                          {!section.isPublished && canManageCourse() && (
                                            <span className="px-1 py-0.5 text-xs bg-yellow-100 text-yellow-800 rounded">
                                              Draft
                                            </span>
                                          )}
                                        </div>
                                        <div className="flex items-center space-x-2">
                                          <span className="text-xs text-gray-500">
                                            {section.content.length} items
                                          </span>
                                          <span className={`transform transition-transform text-xs ${
                                            expandedSections.includes(section._id) ? 'rotate-180' : ''
                                          }`}>
                                            ▼
                                          </span>
                                        </div>
                                      </button>

                                      {expandedSections.includes(section._id) && (
                                        <div className="px-3 pb-2 border-t bg-gray-50">
                                          {section.description && (
                                            <p className="text-xs text-gray-600 mb-2 pt-2">{section.description}</p>
                                          )}

                                          {section.content.length === 0 ? (
                                            <div className="py-2 text-center text-gray-500 text-xs">
                                              No content in this section yet.
                                            </div>
                                          ) : (
                                            <div className="space-y-1">
                                              {section.content
                                                .sort((a, b) => a.order - b.order)
                                                .map((content) => (
                                                  <div
                                                    key={content._id}
                                                    className={`flex items-center justify-between py-1 ${
                                                      content.type === 'exercise' && user?.role === 'student'
                                                        ? 'cursor-pointer hover:bg-gray-50 rounded px-2 -mx-2'
                                                        : ''
                                                    }`}
                                                    onClick={() => handleContentClick(content)}
                                                    data-testid={`content-${content.type}-${content._id}`}
                                                  >
                                                    <div className="flex items-center space-x-2">
                                                      <span className="text-xs">
                                                        {content.type === 'text' && '📄'}
                                                        {content.type === 'video' && '🎥'}
                                                        {content.type === 'exercise' && '💻'}
                                                        {content.type === 'quiz' && '❓'}
                                                        {content.type === 'file' && '📎'}
                                                      </span>
                                                      <span className={`text-xs ${
                                                        content.type === 'exercise' && user?.role === 'student'
                                                          ? 'text-indigo-600 hover:text-indigo-800 font-medium'
                                                          : 'text-gray-700'
                                                      }`}>
                                                        {content.title || `${content.type} content`}
                                                      </span>
                                                      {content.type === 'exercise' && user?.role === 'student' && (
                                                        <span className="text-xs text-indigo-500">→</span>
                                                      )}
                                                      {!content.isPublished && canManageCourse() && (
                                                        <span className="px-1 py-0.5 text-xs bg-yellow-100 text-yellow-800 rounded">
                                                          Draft
                                                        </span>
                                                      )}
                                                    </div>
                                                  </div>
                                                ))}
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}

          {/* Resources Tab */}
          {activeTab === 'resources' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Course Resources</h3>

              {course.resources.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-gray-500">No resources added yet.</div>
                </div>
              ) : (
                <div className="space-y-3">
                  {course.resources.map((resource) => (
                    <div key={resource._id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">
                          {resource.type === 'file' && '📎'}
                          {resource.type === 'link' && '🔗'}
                          {resource.type === 'reference' && '📚'}
                        </span>
                        <div>
                          <div className="font-medium text-gray-900">{resource.name}</div>
                          {resource.description && (
                            <div className="text-sm text-gray-600">{resource.description}</div>
                          )}
                          <div className="text-xs text-gray-500">
                            {resource.type} • {new Date(resource.uploadedAt).toLocaleDateString()}
                            {resource.size && ` • ${Math.round(resource.size / 1024)} KB`}
                          </div>
                        </div>
                      </div>
                      <a
                        href={resource.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                      >
                        Open
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Analytics Tab */}
          {activeTab === 'analytics' && canManageCourse() && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Course Analytics</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{course.stats.activeStudents}</div>
                  <div className="text-sm text-blue-600">Active Students</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{course.stats.completedStudents}</div>
                  <div className="text-sm text-green-600">Completed Students</div>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600">{course.stats.averageProgress}%</div>
                  <div className="text-sm text-yellow-600">Average Progress</div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">{course.stats.totalViews}</div>
                  <div className="text-sm text-purple-600">Total Views</div>
                </div>
              </div>

              {course.stats.averageRating && (
                <div className="bg-white border rounded-lg p-4">
                  <div className="text-lg font-medium text-gray-900 mb-2">Course Rating</div>
                  <div className="flex items-center space-x-2">
                    <div className="text-2xl font-bold text-yellow-600">
                      {course.stats.averageRating.toFixed(1)}
                    </div>
                    <div className="text-yellow-400">
                      {'★'.repeat(Math.round(course.stats.averageRating))}
                      {'☆'.repeat(5 - Math.round(course.stats.averageRating))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Progress Tab */}
          {activeTab === 'progress' && user?.role === 'student' && hasAccess && progressData && (
            <div className="space-y-6">
              <ProgressTracker
                courseId={courseId}
                courseTitle={course.title}
                chapters={progressData.chapters}
                overallProgress={progressData.overallProgress}
                timeSpent={progressData.timeSpent}
                estimatedTimeRemaining={progressData.estimatedTimeRemaining}
                onItemClick={async (itemId, itemType) => {
                  // Handle item click - mark progress and navigate

                  if (user?._id) {
                    try {
                      // Mark progress based on item type
                      if (itemType === 'exercise') {
                        await StatisticsApi.markExerciseComplete(user._id, courseId, itemId);
                        // Open exercise submission interface
                        setActiveTab('content');
                      } else {
                        // For other content types, mark section as completed
                        await StatisticsApi.markSectionComplete(user._id, courseId, itemId);
                      }

                      // Refresh progress data to reflect changes
                      progressResource.refresh();
                    } catch (error) {
                      console.error('Error updating progress:', error);
                    }
                  }
                }}
                showTimeEstimates={true}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CourseDetail;
