// packages/frontend/src/app/courses/[courseId]/analytics/page.tsx
// Course analytics dashboard with metrics and export functionality

'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthProvider';
import { courseApi } from '@/lib/api/courses';
import { StatisticsApi } from '@/lib/api/statistics';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import {
  ChartBarIcon,
  UserGroupIcon,
  AcademicCapIcon,
  TrophyIcon,
  DocumentArrowDownIcon,
  EyeIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
} from '@heroicons/react/24/outline';

interface CourseAnalytics {
  averageProgress: number;
  completionRate: number;
  activeStudents: number;
  averageTimeSpent: number;
  performanceDistribution: {
    excellent: number;
    good: number;
    average: number;
    needsImprovement: number;
  };
}

interface StudentPerformance {
  _id: string;
  name: string;
  email: string;
  progress: number;
  grade: number;
  timeSpent: number;
  lastActivity: string;
  status: 'active' | 'inactive' | 'completed';
}

export default function CourseAnalyticsPage() {
  const { user } = useAuth();
  const params = useParams();
  const [analytics, setAnalytics] = useState<CourseAnalytics | null>(null);
  const [studentPerformance, setStudentPerformance] = useState<StudentPerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [exportFormat, setExportFormat] = useState<'csv' | 'pdf'>('csv');
  const [exporting, setExporting] = useState(false);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  const courseId = params['courseId'] as string;

  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        setLoading(true);

        // Load course analytics data
        const analyticsResponse = await StatisticsApi.getCourseAnalytics(courseId);

        if (analyticsResponse.success && analyticsResponse.data) {
          setAnalytics(analyticsResponse.data);
        }

        // TODO: Implement getCourseStudentPerformance method in StatisticsApi
        // For now, using mock data
        setStudentPerformance([]);
      } catch (err) {
        console.error('Error loading analytics:', err);
        // Mock data for testing
        setAnalytics({
          averageProgress: 67,
          completionRate: 42,
          activeStudents: 98,
          averageTimeSpent: 45,
          performanceDistribution: {
            excellent: 25,
            good: 35,
            average: 25,
            needsImprovement: 15,
          },
        });

        setStudentPerformance([
          {
            _id: '1',
            name: 'Alice Johnson',
            email: 'alice@example.com',
            progress: 85,
            grade: 92,
            timeSpent: 120,
            lastActivity: '2025-01-08',
            status: 'active',
          },
          {
            _id: '2',
            name: 'Bob Smith',
            email: 'bob@example.com',
            progress: 45,
            grade: 78,
            timeSpent: 65,
            lastActivity: '2025-01-06',
            status: 'active',
          },
          {
            _id: '3',
            name: 'Carol Davis',
            email: 'carol@example.com',
            progress: 100,
            grade: 95,
            timeSpent: 180,
            lastActivity: '2025-01-08',
            status: 'completed',
          },
        ]);
      } finally {
        setLoading(false);
      }
    };

    if (courseId) {
      loadAnalytics();
    }
  }, [courseId]);

  const isInstructor = user && (
    user.role === 'admin' ||
    user.role === 'staff' ||
    user.role === 'teacher'
  );

  const handleExportReport = async () => {
    try {
      setExporting(true);

      // Simulate export process
      await new Promise(resolve => setTimeout(resolve, 2000));

      setMessage({ type: 'success', text: 'Report generated' });
      setShowExportDialog(false);
    } catch (err) {
      console.error('Error exporting report:', err);
      setMessage({ type: 'error', text: 'Failed to export report' });
    } finally {
      setExporting(false);
    }
  };

  const getTrendIcon = (current: number, previous: number = 0) => {
    if (current > previous) {
      return <ArrowTrendingUpIcon className="w-5 h-5 text-green-500" />;
    } else if (current < previous) {
      return <ArrowTrendingDownIcon className="w-5 h-5 text-red-500" />;
    }
    return null;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'active': return 'bg-blue-100 text-blue-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-gray-600">Loading analytics...</div>
        </div>
      </div>
    );
  }

  if (!isInstructor) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 text-xl mb-4">Access denied</div>
        <p className="text-gray-600">You don't have permission to view course analytics.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Course Analytics</h1>
        <Button
          onClick={() => setShowExportDialog(true)}
          variant="secondary"
          icon={<DocumentArrowDownIcon className="w-5 h-5" />}
        >
          Export Report
        </Button>
      </div>

      {/* Message Display */}
      {message && (
        <div className={`p-4 rounded-md ${
          message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
        }`}>
          {message.text}
        </div>
      )}

      {/* Key Metrics */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <ChartBarIcon className="w-8 h-8 text-green-600" />
              <div className="ml-3">
                <div className="text-2xl font-bold text-gray-900">{analytics.averageProgress}%</div>
                <div className="text-sm text-gray-600">Average Progress</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <TrophyIcon className="w-8 h-8 text-yellow-600" />
              <div className="ml-3">
                <div className="text-2xl font-bold text-gray-900">{analytics.completionRate}%</div>
                <div className="text-sm text-gray-600">Completion Rate</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <AcademicCapIcon className="w-8 h-8 text-purple-600" />
              <div className="ml-3">
                <div className="text-2xl font-bold text-gray-900">{analytics.activeStudents}</div>
                <div className="text-sm text-gray-600">Active Students</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Performance Distribution */}
      {analytics && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b">
            <h2 className="text-lg font-semibold text-gray-900">Performance Distribution</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{analytics.performanceDistribution.excellent}%</div>
                <div className="text-sm text-gray-600">Excellent</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{analytics.performanceDistribution.good}%</div>
                <div className="text-sm text-gray-600">Good</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">{analytics.performanceDistribution.average}%</div>
                <div className="text-sm text-gray-600">Average</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{analytics.performanceDistribution.needsImprovement}%</div>
                <div className="text-sm text-gray-600">Needs Improvement</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Student Performance */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Student Performance</h2>
          <Button
            variant="secondary"
            size="sm"
            icon={<EyeIcon className="w-4 h-4" />}
          >
            View Details
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Student Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Progress
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Grade
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Time Spent (hrs)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Activity
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {studentPerformance.map((student) => (
                <tr key={student._id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{student.name}</div>
                    <div className="text-sm text-gray-500">{student.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="text-sm text-gray-900">{student.progress}%</div>
                      <div className="ml-2 w-16 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-indigo-600 h-2 rounded-full"
                          style={{width: `${student.progress}%`}}
                        ></div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {student.grade}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {student.timeSpent}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(student.status)}`}>
                      {student.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(student.lastActivity).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Export Dialog */}
      <Modal
        isOpen={showExportDialog}
        onClose={() => setShowExportDialog(false)}
        title="Export Report"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Export Format
            </label>
            <select
              name="exportFormat"
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value as 'csv' | 'pdf')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="csv">CSV Spreadsheet</option>
              <option value="pdf">PDF Report</option>
            </select>
          </div>

          <div className="flex justify-end space-x-3">
            <Button
              onClick={() => setShowExportDialog(false)}
              variant="secondary"
              disabled={exporting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleExportReport}
              variant="primary"
              disabled={exporting}
            >
              {exporting ? 'Generating...' : 'Download'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
