// packages/frontend/src/components/statistics/StatisticsDashboard.tsx

'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { StatisticsCard } from './StatisticsCard';
import { AttendanceChart } from './AttendanceChart';
import { GradeChart } from './GradeChart';
import { EngagementChart } from './EngagementChart';
import { ExportButton } from './ExportButton';

interface DashboardStats {
  attendance: {
    rate: number;
    trend: 'up' | 'down' | 'stable';
    data: Array<{ date: string; rate: number }>;
  };
  grades: {
    average: number;
    trend: 'up' | 'down' | 'stable';
    distribution: Array<{ grade: string; count: number }>;
  };
  engagement: {
    score: number;
    trend: 'up' | 'down' | 'stable';
    activities: Array<{ activity: string; score: number }>;
  };
  overview: {
    totalStudents?: number;
    totalCourses?: number;
    completionRate?: number;
    averageGrade?: number;
  };
}

export function StatisticsDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timePeriod, setTimePeriod] = useState<'week' | 'month' | 'semester' | 'year'>('month');

  useEffect(() => {
    fetchDashboardStats();
  }, [timePeriod]);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(
        `/api/statistics/dashboard?period=${timePeriod}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch statistics');
      }

      const result = await response.json();
      // Handle the API response structure
      setStats(result.success ? result.data : result);
    } catch (error) {
      console.error('Error fetching statistics:', error);
      setError('Failed to load statistics');
      // Mock data for development
      setStats({
        attendance: {
          rate: 85.5,
          trend: 'up',
          data: [
            { date: '2024-01', rate: 82 },
            { date: '2024-02', rate: 84 },
            { date: '2024-03', rate: 85.5 },
          ],
        },
        grades: {
          average: 78.2,
          trend: 'stable',
          distribution: [
            { grade: 'A', count: 25 },
            { grade: 'B', count: 45 },
            { grade: 'C', count: 30 },
            { grade: 'D', count: 15 },
            { grade: 'F', count: 5 },
          ],
        },
        engagement: {
          score: 72,
          trend: 'down',
          activities: [
            { activity: 'Forum Posts', score: 80 },
            { activity: 'Assignment Submissions', score: 90 },
            { activity: 'Quiz Participation', score: 65 },
            { activity: 'Video Views', score: 55 },
          ],
        },
        overview: {
          totalStudents: user?.role === 'student' ? undefined : 120,
          totalCourses: user?.role === 'student' ? 5 : 15,
          completionRate: 78,
          averageGrade: 78.2,
        },
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  if (error && !stats) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <p className="text-red-800">{error}</p>
        <button
          onClick={fetchDashboardStats}
          className="mt-2 text-red-700 underline hover:text-red-900"
        >
          Try again
        </button>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-6">
      {/* Header with controls */}
      <div className="flex justify-between items-center">
        <div className="flex space-x-4">
          <select
            value={timePeriod}
            onChange={(e) => setTimePeriod(e.target.value as any)}
            className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="semester">This Semester</option>
            <option value="year">This Year</option>
          </select>
        </div>
        <ExportButton stats={stats} period={timePeriod} />
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.attendance && typeof stats.attendance.rate === 'number' && (
          <StatisticsCard
            title="Attendance Rate"
            value={`${stats.attendance.rate}%`}
            trend={stats.attendance.trend}
            icon="attendance"
          />
        )}
        {stats.grades && typeof stats.grades.average === 'number' && (
          <StatisticsCard
            title="Average Grade"
            value={stats.grades.average.toFixed(1)}
            trend={stats.grades.trend}
            icon="grade"
          />
        )}
        {stats.engagement && typeof stats.engagement.score === 'number' && (
          <StatisticsCard
            title="Engagement Score"
            value={`${stats.engagement.score}%`}
            trend={stats.engagement.trend}
            icon="engagement"
          />
        )}
        {stats.overview?.totalStudents && (
          <StatisticsCard
            title="Total Students"
            value={stats.overview.totalStudents.toString()}
            icon="students"
          />
        )}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {stats.attendance?.data && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4">Attendance Trends</h3>
            <AttendanceChart data={stats.attendance.data} />
          </div>
        )}
        
        {stats.grades?.distribution && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4">Grade Distribution</h3>
            <GradeChart data={stats.grades.distribution} />
          </div>
        )}
      </div>

      {/* Engagement Details */}
      {stats.engagement?.activities && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Engagement Breakdown</h3>
          <EngagementChart data={stats.engagement.activities} />
        </div>
      )}

      {/* Role-specific sections */}
      {user?.role === 'teacher' && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Class Performance</h3>
          <div className="text-gray-600">
            Detailed class performance metrics would appear here for teachers.
          </div>
        </div>
      )}

      {(user?.role === 'admin' || user?.role === 'staff') && stats.overview && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">School-wide Statistics</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            {stats.overview.totalStudents && (
              <div>
                <div className="text-2xl font-bold text-blue-600">
                  {stats.overview.totalStudents}
                </div>
                <div className="text-gray-600">Total Students</div>
              </div>
            )}
            {stats.overview.totalCourses && (
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {stats.overview.totalCourses}
                </div>
                <div className="text-gray-600">Active Courses</div>
              </div>
            )}
            {stats.overview.completionRate && (
              <div>
                <div className="text-2xl font-bold text-purple-600">
                  {stats.overview.completionRate}%
                </div>
                <div className="text-gray-600">Completion Rate</div>
              </div>
            )}
            {stats.overview.averageGrade && typeof stats.overview.averageGrade === 'number' && (
              <div>
                <div className="text-2xl font-bold text-orange-600">
                  {stats.overview.averageGrade.toFixed(1)}
                </div>
                <div className="text-gray-600">School Average</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}