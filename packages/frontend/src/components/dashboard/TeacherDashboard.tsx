// packages/frontend/src/components/dashboard/TeacherDashboard.tsx
// Teacher analytics dashboard with course performance metrics

'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/AuthProvider';
import { StatisticsApi } from '@/lib/api/statistics';
import {
  BookOpenIcon,
  UserGroupIcon,
  ChartBarIcon,
  ClockIcon,
  DocumentCheckIcon,
  AcademicCapIcon,
  ArrowTrendingUpIcon,
  ExclamationCircleIcon,
  CalendarDaysIcon,
  BellIcon
} from '@heroicons/react/24/outline';
import { CheckCircleIcon } from '@heroicons/react/24/solid';

interface CourseStats {
  totalCourses: number;
  publishedCourses: number;
  draftCourses: number;
  totalStudents: number;
  activeStudents: number;
  averageProgress: number;
  totalSubmissions: number;
  pendingGrading: number;
}

interface CourseAnalytics {
  courseId: string;
  courseTitle: string;
  activeStudents: number;
  completedStudents: number;
  averageProgress: number;
  averageScore: number;
  lastActivity: Date;
}

interface RecentSubmission {
  submissionId: string;
  studentName: string;
  courseName: string;
  exerciseTitle: string;
  submittedAt: Date;
  needsGrading: boolean;
}

interface AttendanceStats {
  totalEvents: number;
  eventsWithAttendance: number;
  overallAttendanceRate: number;
  studentsAtRisk: number;
  recentEvents: number;
}

export const TeacherDashboard: React.FC = () => {
  const { user } = useAuth();
  const [courseStats, setCourseStats] = useState<CourseStats | null>(null);
  const [courseAnalytics, setCourseAnalytics] = useState<CourseAnalytics[]>([]);
  const [recentSubmissions, setRecentSubmissions] = useState<RecentSubmission[]>([]);
  const [attendanceStats, setAttendanceStats] = useState<AttendanceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState('30days');

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user, selectedTimeRange]);

  const loadDashboardData = async () => {
    if (!user || !user._id) return;

    try {
      setLoading(true);
      setError(null);

      const response = await StatisticsApi.getTeacherDashboard(user._id);
      
      if (response.success && response.data) {
        const dashboardData = response.data;
        setCourseStats(dashboardData.courseStats);
        setCourseAnalytics(dashboardData.courseAnalytics);
        setRecentSubmissions(dashboardData.recentSubmissions);
        
        // Mock attendance stats for now (would come from real API)
        const mockAttendanceStats: AttendanceStats = {
          totalEvents: 15,
          eventsWithAttendance: 12,
          overallAttendanceRate: 85.4,
          studentsAtRisk: 3,
          recentEvents: 5
        };
        setAttendanceStats(mockAttendanceStats);
      } else {
        setError(response.error || 'Failed to load dashboard data');
      }
    } catch (err) {
      console.error('Error loading teacher dashboard:', err);
      setError('An unexpected error occurred while loading the dashboard');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (date: Date | string) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return 'text-green-600';
    if (progress >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]" data-testid="loading-state">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6" data-testid="teacher-dashboard">
        <div className="flex items-center">
          <ExclamationCircleIcon className="h-6 w-6 text-red-600 dark:text-red-400 mr-3" />
          <div>
            <h3 className="text-lg font-medium text-red-800 dark:text-red-200">Error Loading Dashboard</h3>
            <p className="mt-1 text-red-700 dark:text-red-300">{error}</p>
            <button
              onClick={loadDashboardData}
              className="mt-3 text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 underline"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!courseStats || courseStats.totalCourses === 0) {
    return (
      <div className="text-center py-12" data-testid="teacher-dashboard">
        <BookOpenIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">No courses</h3>
        <p className="mt-2 text-gray-600 dark:text-gray-400">Create your first course to get started with teaching!</p>
        <div className="mt-4">
          <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
            Get started
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="teacher-dashboard">
      {/* Header with Time Range Filter */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Teaching Analytics</h1>
        <div className="flex items-center space-x-4">
          <select
            value={selectedTimeRange}
            onChange={(e) => setSelectedTimeRange(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            data-testid="date-range-filter"
          >
            <option value="7days">Last 7 days</option>
            <option value="30days" data-testid="last-30-days">Last 30 days</option>
            <option value="90days">Last 90 days</option>
            <option value="all">All time</option>
          </select>
          <span className="text-sm text-gray-500 dark:text-gray-400" data-testid="filtered-label">
            {selectedTimeRange === '7days' ? 'Last 7 days' : 
             selectedTimeRange === '30days' ? 'Last 30 days' :
             selectedTimeRange === '90days' ? 'Last 90 days' : 'All time'}
          </span>
        </div>
      </div>

      {/* Course Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6" data-testid="course-stats-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Courses</p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-100" data-testid="total-courses-stat">
                {courseStats.totalCourses}
              </p>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                <span data-testid="published-courses-stat">{courseStats.publishedCourses}</span> published
              </p>
            </div>
            <BookOpenIcon className="h-12 w-12 text-indigo-600 dark:text-indigo-400" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6" data-testid="student-stats-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Students</p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-100" data-testid="total-students-stat">
                {courseStats.totalStudents}
              </p>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                <span data-testid="active-students-stat">{courseStats.activeStudents}</span> active
              </p>
            </div>
            <UserGroupIcon className="h-12 w-12 text-green-600 dark:text-green-400" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6" data-testid="progress-stats-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Average Progress</p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-100">
                {courseStats.averageProgress}%
              </p>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Across all courses
              </p>
            </div>
            <ChartBarIcon className="h-12 w-12 text-blue-600 dark:text-blue-400" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6" data-testid="submission-stats-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Pending Grading</p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-100" data-testid="pending-grading-stat">
                {courseStats.pendingGrading}
              </p>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Of <span data-testid="total-submissions-stat">{courseStats.totalSubmissions}</span> total
              </p>
            </div>
            <DocumentCheckIcon className="h-12 w-12 text-orange-600 dark:text-orange-400" />
          </div>
        </div>
      </div>

      {/* Attendance Overview */}
      {attendanceStats && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Attendance Overview</h2>
              <button 
                className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300"
                onClick={() => window.location.href = '/attendance'}
              >
                Manage Attendance →
              </button>
            </div>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{attendanceStats.totalEvents}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Total Events</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {attendanceStats.eventsWithAttendance}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Attendance Marked</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {attendanceStats.overallAttendanceRate.toFixed(1)}%
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Average Attendance</div>
              </div>
              <div className="text-center">
                <div className={`text-2xl font-bold ${
                  attendanceStats.studentsAtRisk > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
                }`}>
                  {attendanceStats.studentsAtRisk}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Students at Risk</div>
              </div>
            </div>
            
            {attendanceStats.studentsAtRisk > 0 && (
              <div className="mt-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <div className="flex items-center">
                  <BellIcon className="h-5 w-5 text-red-600 dark:text-red-400 mr-2" />
                  <div className="text-sm text-red-800 dark:text-red-200">
                    <strong>{attendanceStats.studentsAtRisk}</strong> students have attendance below 75%. 
                    Consider reaching out for support.
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Course Analytics Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Course Performance</h2>
        </div>
        <div className="overflow-x-auto" data-testid="course-analytics-table">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Course
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Students
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Progress
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Avg Score
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Last Activity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {courseAnalytics.map((course) => (
                <tr key={course.courseId} data-testid="course-row">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {course.courseTitle}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-gray-100" data-testid="active-students">
                      {course.activeStudents}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {course.completedStudents} completed
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-1 mr-4">
                        <div className="flex items-center">
                          <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div
                              className="bg-indigo-600 dark:bg-indigo-400 h-2 rounded-full"
                              style={{ width: `${course.averageProgress}%` }}
                            ></div>
                          </div>
                          <span className={`ml-2 text-sm font-medium ${getProgressColor(course.averageProgress)}`} data-testid="average-progress">
                            {course.averageProgress}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className={`text-sm font-medium ${getProgressColor(course.averageScore)}`}>
                      {course.averageScore}%
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {formatDate(course.lastActivity)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300"
                      data-testid="view-course-analytics"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Submissions */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Recent Submissions</h2>
        </div>
        <div className="divide-y divide-gray-200 dark:divide-gray-700" data-testid="recent-submissions">
          {recentSubmissions.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
              No recent submissions
            </div>
          ) : (
            recentSubmissions.map((submission) => (
              <div key={submission.submissionId} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {submission.studentName}
                      </p>
                      {submission.needsGrading && (
                        <span className="ml-2 px-2 py-1 text-xs font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200 rounded-full">
                          Needs Grading
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {submission.exerciseTitle} • {submission.courseName}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                      {formatDate(submission.submittedAt)} at {formatTime(submission.submittedAt)}
                    </p>
                  </div>
                  <div className="ml-4">
                    <button className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300">
                      Review
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Last Updated Indicator */}
      <div className="text-center text-sm text-gray-500 dark:text-gray-400" data-testid="last-updated">
        Last updated: {new Date().toLocaleString()}
      </div>
    </div>
  );
};