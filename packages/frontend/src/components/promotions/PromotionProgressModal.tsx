// packages/frontend/src/components/promotions/PromotionProgressModal.tsx
// Modal for viewing promotion progress statistics and student progress

'use client';

import React, { useState, useEffect } from 'react';
import {
  XMarkIcon,
  ArrowPathIcon,
  ChartBarIcon,
  UserIcon,
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { tokenStorage } from '@/lib/auth/tokenStorage';

interface PromotionProgressModalProps {
  promotionId: string;
  promotionName: string;
  isOpen: boolean;
  onClose: () => void;
}

interface PromotionStatistics {
  totalStudents: number;
  averageProgress: number;
  averageAttendance: number;
  completedStudents: number;
  atRiskStudents: number;
}

interface StudentProgress {
  student: {
    _id: string;
    profile: {
      firstName: string;
      lastName: string;
    };
  };
  overallProgress: number;
  courseProgress: number;
  attendanceProgress: number;
}

export const PromotionProgressModal: React.FC<PromotionProgressModalProps> = ({
  promotionId,
  promotionName,
  isOpen,
  onClose,
}) => {
  const [statistics, setStatistics] = useState<PromotionStatistics | null>(null);
  const [studentProgress, setStudentProgress] = useState<StudentProgress[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && promotionId) {
      loadProgressData();
    }
  }, [isOpen, promotionId]);

  const loadProgressData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Get token using proper token storage
      const token = tokenStorage.getAccessToken();

      // Load statistics using Next.js API proxy to avoid CORS issues
      const statsResponse = await fetch(`/api/progress/promotions/${promotionId}/statistics`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!statsResponse.ok) {
        throw new Error('Failed to load promotion statistics');
      }

      const statsData = await statsResponse.json();
      // Handle case where no statistics exist yet (default to 0s)
      const stats = statsData.data || {
        totalStudents: 0,
        averageProgress: 0,
        averageAttendance: 0,
        completedStudents: 0,
        atRiskStudents: 0,
      };
      setStatistics(stats);

      // Load student progress using Next.js API proxy
      const progressResponse = await fetch(`/api/progress/promotions/${promotionId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!progressResponse.ok) {
        throw new Error('Failed to load student progress');
      }

      const progressData = await progressResponse.json();
      setStudentProgress(progressData.data || []);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load progress data');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    loadProgressData();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Progress Statistics
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {promotionName}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleRefresh}
                  variant="secondary"
                  size="sm"
                  icon={<ArrowPathIcon className="w-4 h-4" />}
                  data-testid="refresh-statistics"
                >
                  Refresh
                </Button>
                <Button
                  onClick={onClose}
                  variant="secondary"
                  size="sm"
                  icon={<XMarkIcon className="w-4 h-4" />}
                >
                  Close
                </Button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-6" data-testid="promotion-statistics">
            {loading && (
              <div className="flex justify-center py-12">
                <LoadingSpinner size="lg" />
              </div>
            )}

            {error && (
              <div className="bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <p className="text-red-800 dark:text-red-200">{error}</p>
                <Button
                  onClick={handleRefresh}
                  variant="secondary"
                  size="sm"
                  className="mt-2"
                >
                  Try Again
                </Button>
              </div>
            )}

            {!loading && !error && statistics && (
              <div className="space-y-6">
                {/* Statistics Summary */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                    <div className="flex items-center">
                      <ChartBarIcon className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                      <div className="ml-3">
                        <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Average Progress</p>
                        <p className="text-2xl font-bold text-blue-900 dark:text-blue-100" data-testid="average-progress">
                          {Math.round(statistics.averageProgress)}%
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                    <div className="flex items-center">
                      <UserIcon className="w-8 h-8 text-green-600 dark:text-green-400" />
                      <div className="ml-3">
                        <p className="text-sm font-medium text-green-600 dark:text-green-400">Total Students</p>
                        <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                          {statistics.totalStudents}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
                    <div className="flex items-center">
                      <ChartBarIcon className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                      <div className="ml-3">
                        <p className="text-sm font-medium text-purple-600 dark:text-purple-400">Completed</p>
                        <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                          {statistics.completedStudents}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4">
                    <div className="flex items-center">
                      <UserIcon className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
                      <div className="ml-3">
                        <p className="text-sm font-medium text-yellow-600 dark:text-yellow-400">At Risk</p>
                        <p className="text-2xl font-bold text-yellow-900 dark:text-yellow-100">
                          {statistics.atRiskStudents}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Student Progress Table */}
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      Individual Student Progress
                    </h4>
                  </div>

                  <div className="overflow-x-auto" data-testid="student-progress-table">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Student
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Overall Progress
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Course Progress
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Attendance
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {studentProgress.map((progress) => (
                          <tr key={progress.student._id} data-testid={`student-progress-${progress.student._id}`}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                {progress.student.profile.firstName} {progress.student.profile.lastName}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900 dark:text-gray-100" data-testid="progress-value">
                                {Math.round(progress.overallProgress)}%
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900 dark:text-gray-100">
                                {Math.round(progress.courseProgress)}%
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900 dark:text-gray-100">
                                {Math.round(progress.attendanceProgress)}%
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {studentProgress.length === 0 && !loading && (
                      <div className="text-center py-12">
                        <UserIcon className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No students found</h3>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                          This promotion doesn't have any enrolled students yet.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
