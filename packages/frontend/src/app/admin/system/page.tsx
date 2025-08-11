// packages/frontend/src/app/admin/system/page.tsx
// Admin system health dashboard

'use client';

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import {
  CpuChipIcon,
  ServerIcon,
  CircleStackIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';

interface ServiceStatus {
  name: string;
  port: number;
  status: 'healthy' | 'unhealthy' | 'unknown';
  responseTime: number;
  lastCheck: string;
}

interface SystemHealth {
  services: ServiceStatus[];
  database: {
    status: 'connected' | 'disconnected' | 'unknown';
    responseTime: number;
    activeConnections: number;
  };
  system: {
    uptime: number;
    memoryUsage: number;
    cpuUsage: number;
    diskSpace: number;
  };
  lastUpdated: string;
}

export default function AdminSystemPage() {
  console.log('🚀 AdminSystemPage mounting');
  const [healthData, setHealthData] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchSystemHealth = async () => {
    try {
      setError(null);

      // For now, simulate system health data since we don't have real health APIs
      // In a real implementation, this would call actual health endpoints
      const mockData: SystemHealth = {
        services: [
          { name: 'Auth', port: 3001, status: 'healthy', responseTime: 23, lastCheck: new Date().toISOString() },
          { name: 'User', port: 3002, status: 'healthy', responseTime: 67, lastCheck: new Date().toISOString() },
          { name: 'Course', port: 3004, status: 'healthy', responseTime: 89, lastCheck: new Date().toISOString() },
          { name: 'News', port: 3003, status: 'healthy', responseTime: 34, lastCheck: new Date().toISOString() },
          { name: 'Planning', port: 3005, status: 'healthy', responseTime: 56, lastCheck: new Date().toISOString() },
          { name: 'Statistics', port: 3006, status: 'healthy', responseTime: 78, lastCheck: new Date().toISOString() },
        ],
        database: {
          status: 'connected',
          responseTime: 12,
          activeConnections: 7,
        },
        system: {
          uptime: Date.now() - (Math.random() * 24 * 60 * 60 * 1000), // Random uptime up to 24h
          memoryUsage: 65.4,
          cpuUsage: 23.7,
          diskSpace: 78.2,
        },
        lastUpdated: new Date().toISOString(),
      };

      setHealthData(mockData);
    } catch (err) {
      setError('Failed to fetch system health data');
      console.error('System health fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSystemHealth();

    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(fetchSystemHealth, 30000); // Refresh every 30 seconds
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  const formatUptime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    return `${minutes}m ${seconds % 60}s`;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'connected':
        return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
      case 'unhealthy':
      case 'disconnected':
        return <XCircleIcon className="w-5 h-5 text-red-500" />;
      default:
        return <ExclamationTriangleIcon className="w-5 h-5 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'connected':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'unhealthy':
      case 'disconnected':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
  };

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
                <ServerIcon className="w-8 h-8 text-blue-600" />
                System Dashboard
              </h1>
              <p className="mt-1 text-gray-600 dark:text-gray-400">
                Monitor platform services, database, and system performance
              </p>
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="rounded border-gray-300"
                />
                Auto-refresh (30s)
              </label>
              <button
                onClick={fetchSystemHealth}
                disabled={loading}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>

          {loading && !healthData ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
              {error}
            </div>
          ) : healthData ? (
            <>
              {/* System Overview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">System Uptime</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                        {formatUptime(healthData.system.uptime)}
                      </p>
                    </div>
                    <ClockIcon className="w-8 h-8 text-blue-500" />
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Memory Usage</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                        {healthData.system.memoryUsage.toFixed(1)}%
                      </p>
                    </div>
                    <CpuChipIcon className="w-8 h-8 text-green-500" />
                  </div>
                  <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(healthData.system.memoryUsage, 100)}%` }}
                    ></div>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">CPU Usage</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                        {healthData.system.cpuUsage.toFixed(1)}%
                      </p>
                    </div>
                    <CpuChipIcon className="w-8 h-8 text-yellow-500" />
                  </div>
                  <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-yellow-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(healthData.system.cpuUsage, 100)}%` }}
                    ></div>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Disk Space</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                        {healthData.system.diskSpace.toFixed(1)}%
                      </p>
                    </div>
                    <CircleStackIcon className="w-8 h-8 text-purple-500" />
                  </div>
                  <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(healthData.system.diskSpace, 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Database Status */}
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <CircleStackIcon className="w-5 h-5" />
                    Database Status
                  </h2>
                  <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(healthData.database.status)}`}>
                    {getStatusIcon(healthData.database.status)}
                    {healthData.database.status.charAt(0).toUpperCase() + healthData.database.status.slice(1)}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Response Time</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{healthData.database.responseTime}ms</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Active Connections</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{healthData.database.activeConnections}</p>
                  </div>
                </div>
              </div>

              {/* Services Status */}
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                  <ServerIcon className="w-5 h-5" />
                  Service Status
                </h2>
                <div className="grid gap-4">
                  {healthData.services.map((service) => (
                    <div key={service.port} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(service.status)}
                        <div>
                          <p className="font-medium text-gray-900 dark:text-gray-100">
                            {service.name}: {service.status}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Port {service.port}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {service.responseTime}ms
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {new Date(service.lastCheck).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div className="text-center text-sm text-gray-500 dark:text-gray-400">
                Last updated: {new Date(healthData.lastUpdated).toLocaleString()}
              </div>
            </>
          ) : null}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
