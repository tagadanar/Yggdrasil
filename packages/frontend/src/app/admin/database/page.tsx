// packages/frontend/src/app/admin/database/page.tsx
// Database state monitoring and management dashboard

'use client';

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Button } from '@/components/ui/Button';
import { tokenStorage } from '@/lib/auth/tokenStorage';
import { createComponentLogger } from '@/lib/errors/logger';
import {
  CircleStackIcon,
  DocumentDuplicateIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  CogIcon,
  TrashIcon,
  PlusIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';

interface DatabaseState {
  collections: {
    users: {
      count: number;
      byRole: Record<string, number>;
      active: number;
      inactive: number;
    };
    courses: {
      count: number;
      byCategory: Record<string, number>;
      published: number;
      draft: number;
    };
    promotions: {
      count: number;
      bySemester: Record<string, number>;
      byStatus: Record<string, number>;
    };
    events: {
      count: number;
      upcoming: number;
      past: number;
      byType: Record<string, number>;
    };
    news: {
      count: number;
      published: number;
      draft: number;
      byCategory: Record<string, number>;
    };
    progress: {
      totalRecords: number;
      averageProgress: number;
      studentsWithProgress: number;
    };
    attendance: {
      totalRecords: number;
      overallAttendanceRate: number;
      recentEvents: number;
    };
  };
  relationships: {
    orphanedRecords: Array<{ collection: string; count: number; ids: string[] }>;
    integrityIssues: any[];
  };
  performance: {
    connectionStats: {
      activeConnections: number;
      availableConnections: number;
      totalConnections: number;
    };
  };
  metadata: {
    lastUpdated: string;
    databaseSize: string;
    indexSize: string;
    uptime: number;
  };
}

export default function DatabasePage() {
  const [databaseState, setDatabaseState] = useState<DatabaseState | null>(null);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchDatabaseState = async () => {
    const logger = createComponentLogger('AdminDatabasePage');
    
    try {
      setError(null);
      const token = tokenStorage.getAccessToken();
      
      if (!token) {
        throw new Error('Authentication required');
      }
      
      const response = await fetch('/api/system/database/state', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || 'Failed to fetch database state');
      }

      setDatabaseState(result.data);
      setLastRefresh(new Date());
    } catch (err: any) {
      console.error('Failed to fetch database state:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const seedDatabase = async () => {
    const logger = createComponentLogger('AdminDatabasePage');
    
    try {
      setSeeding(true);
      setError(null);
      const token = tokenStorage.getAccessToken();
      
      if (!token) {
        throw new Error('Authentication required');
      }
      
      const response = await fetch('/api/system/database/seed', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || 'Failed to seed database');
      }

      // Refresh state after seeding
      await fetchDatabaseState();
      
      // Show success message
      alert(`Database seeded successfully!\n\nCreated:\n- ${result.data.statistics.totalUsers} users\n- ${result.data.statistics.totalCourses} courses\n- ${result.data.statistics.totalEvents} events\n- ${result.data.statistics.totalNews} news articles\n\nTime: ${result.data.statistics.executionTime}ms`);
      
    } catch (err: any) {
      console.error('Failed to seed database:', err);
      setError(err.message);
      alert(`Failed to seed database: ${err.message}`);
    } finally {
      setSeeding(false);
    }
  };

  const resetDatabase = async () => {
    if (!confirm('⚠️ WARNING: This will DELETE ALL existing data and create fresh demo data.\n\nThis action cannot be undone. Are you sure?')) {
      return;
    }

    const logger = createComponentLogger('AdminDatabasePage');
    
    try {
      setResetting(true);
      setError(null);
      const token = tokenStorage.getAccessToken();
      
      if (!token) {
        throw new Error('Authentication required');
      }
      
      const response = await fetch('/api/system/database/reset', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || 'Failed to reset database');
      }

      // Refresh state after reset
      await fetchDatabaseState();
      
      alert(`Database reset and seeded successfully!\n\nCreated:\n- ${result.data.statistics.totalUsers} users\n- ${result.data.statistics.totalCourses} courses\n- ${result.data.statistics.totalEvents} events\n- ${result.data.statistics.totalNews} news articles\n\nTime: ${result.data.statistics.executionTime}ms`);
      
    } catch (err: any) {
      console.error('Failed to reset database:', err);
      setError(err.message);
      alert(`Failed to reset database: ${err.message}`);
    } finally {
      setResetting(false);
    }
  };

  useEffect(() => {
    fetchDatabaseState();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchDatabaseState, 30000);
    return () => clearInterval(interval);
  }, []);

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const getTotalIssues = () => {
    if (!databaseState) return 0;
    return databaseState.relationships.orphanedRecords.length + databaseState.relationships.integrityIssues.length;
  };

  if (loading && !databaseState) {
    return (
      <ProtectedRoute allowedRoles={['admin']}>
        <DashboardLayout>
          <div className="flex justify-center items-center h-64">
            <LoadingSpinner size="lg" />
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
                <CircleStackIcon className="w-8 h-8 text-blue-600" />
                Database Manager
              </h1>
              <p className="mt-1 text-gray-600 dark:text-gray-400">
                Monitor database state, manage data integrity, and control development data
              </p>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Last updated: {lastRefresh.toLocaleTimeString()}
              </div>
              <Button
                onClick={fetchDatabaseState}
                disabled={loading}
                variant="secondary"
                icon={<ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />}
              >
                Refresh
              </Button>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
              <div className="flex items-center gap-2">
                <ExclamationTriangleIcon className="w-5 h-5" />
                {error}
              </div>
            </div>
          )}

          {databaseState && (
            <>
              {/* Quick Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Database Size</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                        {databaseState.metadata.databaseSize}
                      </p>
                    </div>
                    <CircleStackIcon className="w-8 h-8 text-blue-500" />
                  </div>
                  <div className="mt-2">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Index: {databaseState.metadata.indexSize}
                    </p>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Database Uptime</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                        {formatUptime(databaseState.metadata.uptime)}
                      </p>
                    </div>
                    <ClockIcon className="w-8 h-8 text-green-500" />
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Data Integrity</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                        {getTotalIssues() === 0 ? 'Healthy' : `${getTotalIssues()} Issues`}
                      </p>
                    </div>
                    {getTotalIssues() === 0 ? (
                      <CheckCircleIcon className="w-8 h-8 text-green-500" />
                    ) : (
                      <ExclamationTriangleIcon className="w-8 h-8 text-red-500" />
                    )}
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Connections</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                        {databaseState.performance.connectionStats.activeConnections}
                      </p>
                    </div>
                    <DocumentDuplicateIcon className="w-8 h-8 text-purple-500" />
                  </div>
                  <div className="mt-2">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Available: {databaseState.performance.connectionStats.availableConnections}
                    </p>
                  </div>
                </div>
              </div>

              {/* Data Management */}
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                  <CogIcon className="w-5 h-5" />
                  Database Management
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
                    <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Seed Development Data</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                      Add realistic demo data to the existing database (preserves current data)
                    </p>
                    <Button
                      onClick={seedDatabase}
                      disabled={seeding}
                      variant="primary"
                      icon={seeding ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : <PlusIcon className="w-4 h-4" />}
                    >
                      {seeding ? 'Seeding...' : 'Seed Database'}
                    </Button>
                  </div>

                  <div className="p-4 border border-red-200 dark:border-red-600 rounded-lg bg-red-50 dark:bg-red-900/10">
                    <h3 className="font-medium text-red-900 dark:text-red-100 mb-2">Reset & Seed Database</h3>
                    <p className="text-sm text-red-700 dark:text-red-300 mb-3">
                      ⚠️ Completely clears all data and creates fresh demo data (destructive)
                    </p>
                    <Button
                      onClick={resetDatabase}
                      disabled={resetting}
                      variant="danger"
                      icon={resetting ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : <TrashIcon className="w-4 h-4" />}
                    >
                      {resetting ? 'Resetting...' : 'Reset Database'}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Collection Statistics */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Users Collection */}
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                    <ChartBarIcon className="w-5 h-5" />
                    Users ({databaseState.collections.users.count})
                  </h3>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Active</span>
                      <span className="font-medium text-green-600">{databaseState.collections.users.active}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Inactive</span>
                      <span className="font-medium text-red-600">{databaseState.collections.users.inactive}</span>
                    </div>
                    
                    <div className="border-t border-gray-200 dark:border-gray-600 pt-3">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">By Role:</p>
                      {Object.entries(databaseState.collections.users.byRole).map(([role, count]) => (
                        <div key={role} className="flex justify-between items-center">
                          <span className="text-sm text-gray-600 dark:text-gray-400 capitalize">{role}</span>
                          <span className="font-medium">{count as number}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Courses Collection */}
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                    <ChartBarIcon className="w-5 h-5" />
                    Courses ({databaseState.collections.courses.count})
                  </h3>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Published</span>
                      <span className="font-medium text-green-600">{databaseState.collections.courses.published}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Draft</span>
                      <span className="font-medium text-yellow-600">{databaseState.collections.courses.draft}</span>
                    </div>
                    
                    <div className="border-t border-gray-200 dark:border-gray-600 pt-3">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">By Category:</p>
                      {Object.entries(databaseState.collections.courses.byCategory).slice(0, 5).map(([category, count]) => (
                        <div key={category} className="flex justify-between items-center">
                          <span className="text-sm text-gray-600 dark:text-gray-400">{category}</span>
                          <span className="font-medium">{count as number}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Promotions Collection */}
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                    <ChartBarIcon className="w-5 h-5" />
                    Promotions ({databaseState.collections.promotions.count})
                  </h3>
                  
                  <div className="space-y-3">
                    {Object.entries(databaseState.collections.promotions.byStatus).map(([status, count]) => (
                      <div key={status} className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 dark:text-gray-400 capitalize">{status}</span>
                        <span className="font-medium">{count as number}</span>
                      </div>
                    ))}
                    
                    <div className="border-t border-gray-200 dark:border-gray-600 pt-3">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">By Semester:</p>
                      <div className="grid grid-cols-5 gap-1 text-xs">
                        {Object.entries(databaseState.collections.promotions.bySemester).map(([semester, count]) => (
                          <div key={semester} className="text-center p-1 bg-blue-50 dark:bg-blue-900/20 rounded">
                            <div className="font-medium">{semester}</div>
                            <div className="text-gray-600 dark:text-gray-400">{count as number}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Progress & Analytics */}
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                    <ChartBarIcon className="w-5 h-5" />
                    Learning Analytics
                  </h3>
                  
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Student Progress Records</p>
                      <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                        {databaseState.collections.progress.totalRecords}
                      </p>
                    </div>
                    
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Average Progress</p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full"
                            style={{ width: `${databaseState.collections.progress.averageProgress}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium">{databaseState.collections.progress.averageProgress}%</span>
                      </div>
                    </div>
                    
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Attendance Records</p>
                      <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        {databaseState.collections.attendance.totalRecords}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {databaseState.collections.attendance.overallAttendanceRate}% overall rate
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Data Integrity Issues */}
              {getTotalIssues() > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-red-200 dark:border-red-700 p-6">
                  <h3 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-4 flex items-center gap-2">
                    <ExclamationTriangleIcon className="w-5 h-5" />
                    Data Integrity Issues ({getTotalIssues()})
                  </h3>
                  
                  <div className="space-y-4">
                    {databaseState.relationships.orphanedRecords.map((issue, index) => (
                      <div key={index} className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                        <p className="font-medium text-red-900 dark:text-red-100">
                          Orphaned Records in {issue.collection}
                        </p>
                        <p className="text-sm text-red-700 dark:text-red-300">
                          {issue.count} records with broken references
                        </p>
                      </div>
                    ))}
                    
                    {databaseState.relationships.integrityIssues.map((issue, index) => (
                      <div key={index} className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                        <p className="font-medium text-yellow-900 dark:text-yellow-100">
                          {issue.type.replace('_', ' ')} in {issue.collection}.{issue.field}
                        </p>
                        <p className="text-sm text-yellow-700 dark:text-yellow-300">
                          {issue.count} affected records
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}