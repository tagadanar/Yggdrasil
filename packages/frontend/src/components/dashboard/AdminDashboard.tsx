// packages/frontend/src/components/dashboard/AdminDashboard.tsx
// Administrative analytics dashboard with platform-wide metrics

'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/AuthProvider';
import { StatisticsApi } from '@/lib/api/statistics';
import {
  UserGroupIcon,
  AcademicCapIcon,
  ChartBarIcon,
  ServerIcon,
  ArrowTrendingUpIcon,
  ClockIcon,
  DocumentDuplicateIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline';

interface PlatformStats {
  totalUsers: number;
  activeUsers: number;
  totalCourses: number;
  totalEnrollments: number;
  totalSubmissions: number;
  platformEngagement: number;
}

interface UserBreakdown {
  students: number;
  teachers: number;
  staff: number;
  admins: number;
}

interface PopularCourse {
  courseId: string;
  title: string;
  enrollments: number;
}

interface TopPerformingCourse {
  courseId: string;
  title: string;
  averageScore: number;
  completionRate: number;
}

interface ServiceHealth {
  name: string;
  status: 'healthy' | 'warning' | 'error';
}

interface SystemHealth {
  database: 'healthy' | 'warning' | 'error';
  services: ServiceHealth[];
}

export const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const [platformStats, setPlatformStats] = useState<PlatformStats | null>(null);
  const [userBreakdown, setUserBreakdown] = useState<UserBreakdown | null>(null);
  const [popularCourses, setPopularCourses] = useState<PopularCourse[]>([]);
  const [topPerformingCourses, setTopPerformingCourses] = useState<TopPerformingCourse[]>([]);
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await StatisticsApi.getAdminDashboard();
      
      if (response.success && response.data) {
        const dashboardData = response.data;
        setPlatformStats(dashboardData.platformStats);
        setUserBreakdown(dashboardData.userBreakdown);
        setPopularCourses(dashboardData.courseMetrics.mostPopularCourses);
        setTopPerformingCourses(dashboardData.courseMetrics.topPerformingCourses);
        setSystemHealth(dashboardData.systemHealth);
      } else {
        setError(response.error || 'Failed to load dashboard data');
      }
    } catch (err) {
      console.error('Error loading admin dashboard:', err);
      setError('An unexpected error occurred while loading the dashboard');
    } finally {
      setLoading(false);
    }
  };

  const getUserTypeColor = (type: string) => {
    switch (type) {
      case 'students': return 'bg-blue-500';
      case 'teachers': return 'bg-green-500';
      case 'staff': return 'bg-yellow-500';
      case 'admins': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  const getHealthStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'warning':
        return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />;
      case 'error':
        return <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />;
      default:
        return null;
    }
  };

  const calculateUserPercentage = (count: number, total: number) => {
    return total > 0 ? Math.round((count / total) * 100) : 0;
  };

  const handleExport = (format: string) => {
    // In a real implementation, this would trigger data export
    console.log(`Exporting data as ${format}`);
    setExportMenuOpen(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading platform analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
        <div className="flex items-center">
          <ExclamationTriangleIcon className="h-6 w-6 text-red-600 dark:text-red-400 mr-3" />
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

  if (!platformStats || !userBreakdown) {
    return null;
  }

  const totalUsers = platformStats.totalUsers;

  return (
    <div className="space-y-6" data-testid="admin-dashboard">
      {/* Header with Export Button */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Platform Analytics</h1>
        <div className="relative">
          <button
            onClick={() => setExportMenuOpen(!exportMenuOpen)}
            className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            data-testid="export-analytics"
          >
            <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
            Export Analytics
          </button>
          {exportMenuOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg z-10 border border-gray-200 dark:border-gray-700" data-testid="export-menu">
              <button
                onClick={() => handleExport('csv')}
                className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                data-testid="export-csv"
              >
                Export as CSV
              </button>
              <button
                onClick={() => handleExport('pdf')}
                className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                data-testid="export-pdf"
              >
                Export as PDF
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Platform Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Users</p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-100" data-testid="total-users">
                {platformStats.totalUsers}
              </p>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {platformStats.activeUsers} active (last 30 days)
              </p>
            </div>
            <UserGroupIcon className="h-12 w-12 text-indigo-600 dark:text-indigo-400" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Courses</p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-100" data-testid="total-courses">
                {platformStats.totalCourses}
              </p>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Across all instructors
              </p>
            </div>
            <AcademicCapIcon className="h-12 w-12 text-green-600 dark:text-green-400" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Platform Engagement</p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-100" data-testid="platform-engagement">
                {platformStats.platformEngagement}%
              </p>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Active user rate
              </p>
            </div>
            <ArrowTrendingUpIcon className="h-12 w-12 text-blue-600 dark:text-blue-400" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Enrollments</p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-100" data-testid="total-enrollments">
                {platformStats.totalEnrollments}
              </p>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Student-course connections
              </p>
            </div>
            <DocumentDuplicateIcon className="h-12 w-12 text-purple-600 dark:text-purple-400" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Submissions</p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-100">
                {platformStats.totalSubmissions}
              </p>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Exercise submissions
              </p>
            </div>
            <CheckCircleIcon className="h-12 w-12 text-orange-600 dark:text-orange-400" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Avg Enrollments/Course</p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-100">
                {platformStats.totalCourses > 0 ? Math.round(platformStats.totalEnrollments / platformStats.totalCourses) : 0}
              </p>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Students per course
              </p>
            </div>
            <ChartBarIcon className="h-12 w-12 text-teal-600 dark:text-teal-400" />
          </div>
        </div>
      </div>

      {/* User Breakdown */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">User Distribution</h2>
        <div className="space-y-4" data-testid="user-breakdown-chart">
          {Object.entries(userBreakdown).map(([type, count]) => {
            const percentage = calculateUserPercentage(count, totalUsers);
            return (
              <div key={type}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">
                    {type}
                  </span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {count} ({percentage}%)
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${getUserTypeColor(type)}`}
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Course Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Popular Courses */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Most Popular Courses</h2>
          </div>
          <div className="p-6" data-testid="popular-courses-list">
            {popularCourses.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center">No course data available</p>
            ) : (
              <div className="space-y-4">
                {popularCourses.map((course, index) => (
                  <div key={course.courseId} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <span className="text-lg font-bold text-gray-400 dark:text-gray-600 mr-3">
                        {index + 1}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {course.title}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {course.enrollments} enrollments
                        </p>
                      </div>
                    </div>
                    <button
                      className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300"
                      data-testid="drill-down-link"
                    >
                      View
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Top Performing Courses */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Top Performing Courses</h2>
          </div>
          <div className="p-6" data-testid="top-performing-courses">
            {topPerformingCourses.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center">No course data available</p>
            ) : (
              <div className="space-y-4">
                {topPerformingCourses.map((course, index) => (
                  <div key={course.courseId} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <span className="text-lg font-bold text-gray-400 dark:text-gray-600 mr-3">
                        {index + 1}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {course.title}
                        </p>
                        <div className="flex items-center space-x-4 mt-1">
                          <span className="text-xs text-gray-500 dark:text-gray-400" data-testid="completion-rate">
                            {course.completionRate}% completion
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {course.averageScore}% avg score
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* System Health */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">System Health</h2>
        </div>
        <div className="p-6" data-testid="system-health">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <div className="flex items-center">
                <ServerIcon className="h-5 w-5 text-gray-600 dark:text-gray-400 mr-2" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Database</span>
              </div>
              <div className="flex items-center">
                {getHealthStatusIcon(systemHealth?.database || 'unknown')}
                <span className="ml-1 text-sm text-gray-600 dark:text-gray-400">
                  {systemHealth?.database || 'unknown'}
                </span>
              </div>
            </div>
            {systemHealth?.services.map((service) => (
              <div key={service.name} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <div className="flex items-center">
                  <ServerIcon className="h-5 w-5 text-gray-600 dark:text-gray-400 mr-2" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {service.name}
                  </span>
                </div>
                <div className="flex items-center">
                  {getHealthStatusIcon(service.status)}
                  <span className="ml-1 text-sm text-gray-600 dark:text-gray-400" data-testid="service-status">
                    {service.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};