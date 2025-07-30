// packages/frontend/src/components/dashboard/StudentDashboard.tsx
// Comprehensive student learning dashboard with progress tracking

'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/AuthProvider';
import { courseApi } from '@/lib/api/courses';
import { StatisticsApi } from '@/lib/api/statistics';
import { ProgressTracker } from '../progress/ProgressTracker';
import {
  BookOpenIcon,
  ClockIcon,
  TrophyIcon,
  FireIcon,
  ChartBarIcon,
  CalendarIcon,
  StarIcon,
  PlayIcon
} from '@heroicons/react/24/outline';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/solid';

interface CourseProgress {
  courseId: string;
  courseTitle: string;
  progress: number;
  timeSpent: number;
  lastAccessed: Date;
  enrollmentStatus: 'active' | 'completed' | 'dropped';
  instructor: string;
  estimatedCompletion: Date;
}

interface LearningStats {
  totalCourses: number;
  activeCourses: number;
  completedCourses: number;
  totalTimeSpent: number; // minutes
  averageProgress: number;
  weeklyGoal: number; // minutes
  weeklyProgress: number; // minutes
  currentStreak: number; // days
  totalExercises: number;
  completedExercises: number;
  averageScore: number;
}

interface RecentActivity {
  id: string;
  type: 'exercise' | 'section' | 'course_complete' | 'assignment';
  courseTitle: string;
  activityTitle: string;
  completedAt: Date;
  score?: number;
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  iconName: string;
  unlockedAt: Date;
  category: 'progress' | 'streak' | 'score' | 'completion';
}

export const StudentDashboard: React.FC = () => {
  const { user } = useAuth();
  const [courseProgress, setCourseProgress] = useState<CourseProgress[]>([]);
  const [learningStats, setLearningStats] = useState<LearningStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  const loadDashboardData = async () => {
    if (!user || !user._id) return;

    try {
      setLoading(true);
      setError(null);

      // Progressive loading: Load critical stats first for faster perceived performance
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Dashboard request timed out')), 15000)
      );
      
      const response = await Promise.race([
        StatisticsApi.getStudentDashboard(user._id),
        timeoutPromise
      ]) as any;
      
      if (response.success && response.data) {
        const dashboardData = response.data;
        
        // Set basic stats immediately for faster UI feedback
        setLearningStats(dashboardData.learningStats);
        setLoading(false); // Show basic data immediately
        
        // Process heavy data transformations asynchronously to avoid blocking UI
        setTimeout(() => {
          // Transform API data to match component interfaces (non-blocking)
          const transformedCourseProgress: CourseProgress[] = dashboardData.courseProgress.map((course: any) => ({
            courseId: course.courseId,
            courseTitle: course.courseTitle,
            progress: course.progress,
            timeSpent: course.timeSpent,
            lastAccessed: new Date(course.lastAccessed),
            enrollmentStatus: course.enrollmentStatus,
            instructor: course.instructor,
            estimatedCompletion: new Date(course.estimatedCompletion)
          }));

          const transformedRecentActivity: RecentActivity[] = dashboardData.recentActivity.map((activity: any) => ({
            id: activity.id,
            type: activity.type,
            courseTitle: activity.courseTitle,
            activityTitle: activity.activityTitle,
            completedAt: new Date(activity.completedAt),
            score: activity.score
          }));

          const transformedAchievements: Achievement[] = dashboardData.achievements.map((achievement: any) => ({
            id: achievement.id,
            title: achievement.title,
            description: achievement.description,
            iconName: achievement.iconName,
            unlockedAt: new Date(achievement.unlockedAt),
            category: achievement.category
          }));

          // Set processed data (after basic stats are already shown)
          setCourseProgress(transformedCourseProgress);
          setRecentActivity(transformedRecentActivity);
          setAchievements(transformedAchievements);
        }, 0);
      } else {
        throw new Error(response.error || 'Failed to load dashboard data');
      }

    } catch (err: any) {
      console.error('Dashboard load error:', err);
      
      // Set fallback empty state data so dashboard still renders
      const fallbackStats: LearningStats = {
        totalCourses: 0,
        activeCourses: 0,
        completedCourses: 0,
        totalTimeSpent: 0,
        averageProgress: 0,
        weeklyGoal: 120, // 2 hours default
        weeklyProgress: 0,
        currentStreak: 0,
        totalExercises: 0,
        completedExercises: 0,
        averageScore: 0,
      };
      
      setLearningStats(fallbackStats);
      setCourseProgress([]);
      setRecentActivity([]);
      setAchievements([]);
      
      // Show error but don't prevent dashboard from rendering
      setError(err.message || 'Failed to load dashboard data');
      setLoading(false);
    }
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'exercise':
        return <BookOpenIcon className="h-4 w-4" />;
      case 'section':
        return <PlayIcon className="h-4 w-4" />;
      case 'course_complete':
        return <TrophyIcon className="h-4 w-4" />;
      case 'assignment':
        return <BookOpenIcon className="h-4 w-4" />;
      default:
        return <BookOpenIcon className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12" data-testid="student-dashboard">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        <span className="ml-3 text-gray-600">Loading your dashboard...</span>
      </div>
    );
  }

  // Note: We no longer block dashboard rendering on error - we show fallback data instead
  // The error is displayed as a small notice at the top of the dashboard

  return (
    <div className="max-w-7xl mx-auto space-y-6" data-testid="student-dashboard">
      {/* Error Notice (if any) */}
      {error && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 mr-2" />
            <div className="text-sm text-yellow-800">
              Some dashboard data may be unavailable: {error}
              <button
                onClick={loadDashboardData}
                className="ml-2 text-yellow-600 hover:text-yellow-800 underline"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg text-white p-6">
        <h1 className="text-3xl font-bold mb-2">
          Welcome back, {user?.profile?.firstName || user?.email?.split('@')[0]}!
        </h1>
        <p className="text-indigo-100">
          Continue your learning journey and track your progress
        </p>
      </div>

      {/* Quick Stats */}
      {learningStats ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg border p-6" data-testid="course-stats">
            <div className="flex items-center">
              <BookOpenIcon className="h-8 w-8 text-indigo-600 mr-3" />
              <div>
                <div className="text-2xl font-bold text-gray-900">{learningStats.activeCourses}</div>
                <div className="text-sm text-gray-600">Active Courses</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border p-6" data-testid="time-stats">
            <div className="flex items-center">
              <ClockIcon className="h-8 w-8 text-green-600 mr-3" />
              <div>
                <div className="text-2xl font-bold text-gray-900">{formatTime(learningStats.totalTimeSpent)}</div>
                <div className="text-sm text-gray-600">Time Spent Learning</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border p-6" data-testid="progress-stats">
            <div className="flex items-center">
              <TrophyIcon className="h-8 w-8 text-yellow-600 mr-3" />
              <div>
                <div className="text-2xl font-bold text-gray-900">{learningStats.completedCourses}</div>
                <div className="text-sm text-gray-600">Courses Completed</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border p-6" data-testid="streak-stats">
            <div className="flex items-center">
              <FireIcon className="h-8 w-8 text-red-600 mr-3" />
              <div>
                <div className="text-2xl font-bold text-gray-900">{learningStats.currentStreak}</div>
                <div className="text-sm text-gray-600">Day Streak</div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Empty state placeholders */}
          <div className="bg-white rounded-lg border p-6">
            <div className="flex items-center">
              <BookOpenIcon className="h-8 w-8 text-gray-300 mr-3" />
              <div>
                <div className="text-2xl font-bold text-gray-900">0</div>
                <div className="text-sm text-gray-600">Active Courses</div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg border p-6">
            <div className="flex items-center">
              <ClockIcon className="h-8 w-8 text-gray-300 mr-3" />
              <div>
                <div className="text-2xl font-bold text-gray-900">0m</div>
                <div className="text-sm text-gray-600">Time Spent Learning</div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg border p-6">
            <div className="flex items-center">
              <TrophyIcon className="h-8 w-8 text-gray-300 mr-3" />
              <div>
                <div className="text-2xl font-bold text-gray-900">0</div>
                <div className="text-sm text-gray-600">Courses Completed</div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg border p-6">
            <div className="flex items-center">
              <FireIcon className="h-8 w-8 text-gray-300 mr-3" />
              <div>
                <div className="text-2xl font-bold text-gray-900">0</div>
                <div className="text-sm text-gray-600">Day Streak</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Progress Overview and Weekly Goal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weekly Progress */}
        {learningStats && (
          <div className="bg-white rounded-lg border p-6" data-testid="weekly-progress">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Weekly Goal</h3>
            <div className="mb-4">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>Study Time</span>
                <span>{formatTime(learningStats.weeklyProgress)} / {formatTime(learningStats.weeklyGoal)}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3" data-testid="progress-bar">
                <div 
                  className="bg-indigo-600 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min((learningStats.weeklyProgress / learningStats.weeklyGoal) * 100, 100)}%` }}
                />
              </div>
            </div>
            <div className="text-sm text-gray-600">
              {learningStats.weeklyProgress >= learningStats.weeklyGoal ? (
                <span className="text-green-600 font-medium">🎉 Goal achieved this week!</span>
              ) : (
                <span>
                  {formatTime(learningStats.weeklyGoal - learningStats.weeklyProgress)} remaining this week
                </span>
              )}
            </div>
          </div>
        )}

        {/* Exercise Progress */}
        {learningStats && (
          <div className="bg-white rounded-lg border p-6" data-testid="exercise-progress">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Exercise Progress</h3>
            <div className="mb-4">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>Completed</span>
                <span>{learningStats.completedExercises} / {learningStats.totalExercises}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3" data-testid="progress-bar">
                <div 
                  className="bg-green-600 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${(learningStats.completedExercises / learningStats.totalExercises) * 100}%` }}
                />
              </div>
            </div>
            <div className="text-sm text-gray-600">
              Average Score: <span className="font-medium text-green-600">{learningStats.averageScore}%</span>
            </div>
          </div>
        )}

        {/* Recent Achievements */}
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Achievements</h3>
          <div className="space-y-3">
            {achievements.slice(0, 2).map((achievement) => (
              <div key={achievement.id} className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  {achievement.iconName === 'trophy' && <TrophyIcon className="h-6 w-6 text-yellow-500" />}
                  {achievement.iconName === 'fire' && <FireIcon className="h-6 w-6 text-red-500" />}
                  {achievement.iconName === 'star' && <StarIcon className="h-6 w-6 text-blue-500" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900">{achievement.title}</div>
                  <div className="text-xs text-gray-500">{achievement.description}</div>
                </div>
              </div>
            ))}
            {achievements.length === 0 && (
              <div className="text-sm text-gray-500 text-center py-4">
                Complete exercises to unlock achievements!
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Course Progress */}
      <div className="bg-white rounded-lg border">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Your Courses</h2>
        </div>
        <div className="p-6">
          {courseProgress.length === 0 ? (
            <div className="text-center py-12" data-testid="courses-empty-state">
              <BookOpenIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <div className="text-gray-500">No courses enrolled yet</div>
              <div className="text-sm text-gray-400 mt-2">Start learning by enrolling in courses!</div>
              <button
                className="mt-4 bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700"
                onClick={() => window.location.href = '/courses'}
              >
                Browse Courses
              </button>
            </div>
          ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {courseProgress.map((course) => (
              <div key={course.courseId} className="border rounded-lg p-4" data-testid="course-card">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-900">{course.courseTitle}</h3>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    course.enrollmentStatus === 'completed' 
                      ? 'bg-green-100 text-green-800'
                      : course.enrollmentStatus === 'active'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {course.enrollmentStatus}
                  </span>
                </div>
                
                <div className="mb-3">
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>Progress</span>
                    <span>{course.progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${course.progress}%` }}
                    />
                  </div>
                </div>

                <div className="text-sm text-gray-600 space-y-1">
                  <div>Instructor: {course.instructor}</div>
                  <div>Time spent: {formatTime(course.timeSpent)}</div>
                  <div>Last accessed: {formatDate(course.lastAccessed)}</div>
                  {course.enrollmentStatus === 'active' && (
                    <div>Est. completion: {formatDate(course.estimatedCompletion)}</div>
                  )}
                </div>

                <button
                  className="mt-3 w-full bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 text-sm"
                  onClick={() => window.location.href = `/courses/${course.courseId}`}
                >
                  {course.enrollmentStatus === 'completed' ? 'Review Course' : 'Continue Learning'}
                </button>
              </div>
            ))}
          </div>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg border">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Recent Activity</h2>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-center space-x-4 p-3 hover:bg-gray-50 rounded-lg">
                <div className="flex-shrink-0 text-gray-600">
                  {getActivityIcon(activity.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900">{activity.activityTitle}</div>
                  <div className="text-sm text-gray-600">{activity.courseTitle}</div>
                </div>
                <div className="flex-shrink-0 text-right">
                  {activity.score && (
                    <div className="text-sm font-medium text-green-600">{activity.score}%</div>
                  )}
                  <div className="text-xs text-gray-500">{formatDate(activity.completedAt)}</div>
                </div>
              </div>
            ))}
            {recentActivity.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <BookOpenIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <div>No recent activity</div>
                <div className="text-sm">Start learning to see your progress here!</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;