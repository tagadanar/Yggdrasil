// packages/frontend/src/app/admin/system/page.tsx
// Admin system health dashboard

'use client';

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { tokenStorage } from '@/lib/auth/tokenStorage';
import { createComponentLogger } from '@/lib/errors/logger';
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
  const [activeTab, setActiveTab] = useState<'health' | 'performance'>('health');

  const fetchSystemHealth = async () => {
    const logger = createComponentLogger('AdminSystemPage');
    
    try {
      setError(null);
      const token = tokenStorage.getAccessToken();

      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await fetch('/api/system/health', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      const result = await response.json();
      
      if (!response.ok) {
        logger.error('System health fetch failed', { 
          status: response.status, 
          message: result.message 
        });
        throw new Error(result.message || 'Failed to fetch system health');
      }

      // Transform API response to match our interface
      const healthData: SystemHealth = {
        services: result.data.services.map((service: {
          name: string;
          port: number;
          status: 'healthy' | 'unhealthy' | 'unknown';
          responseTime: number;
          lastCheck: string;
        }) => ({
          name: service.name,
          port: service.port,
          status: service.status,
          responseTime: service.responseTime,
          lastCheck: result.data.lastCheck,
        })),
        database: {
          status: result.data.database.status,
          responseTime: result.data.database.responseTime,
          activeConnections: result.data.database.activeConnections,
        },
        system: {
          uptime: result.data.system.uptime * 1000, // Convert seconds to milliseconds
          memoryUsage: result.data.system.memoryUsage,
          cpuUsage: result.data.system.cpuUsage,
          diskSpace: result.data.system.diskSpace,
        },
        lastUpdated: result.data.lastCheck,
      };

      setHealthData(healthData);
    } catch (err: any) {
      setError(`Failed to fetch system health data: ${err.message}`);
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

          {/* Tabs */}
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('health')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'health'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                Health Status
              </button>
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  setActiveTab('performance');
                }}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'performance'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                Performance
              </a>
            </nav>
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
              {activeTab === 'health' ? (
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
                    <div key={service.port} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg" data-testid={`service-status-${service.name.toLowerCase()}`}>
                      <div className="flex items-center gap-3">
                        {getStatusIcon(service.status)}
                        <div>
                          <div className="font-medium text-gray-900 dark:text-gray-100" data-testid={`service-${service.name.toLowerCase()}`}>
                            {service.name} {service.status}
                          </div>
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
                </>
              ) : (
                /* Performance Tab */
                <div className="space-y-6">
                  <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Response Time</h2>
                    <div className="chart-container" style={{ height: '300px', background: '#f3f4f6', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <canvas id="response-time-chart" />
                      <div className="text-gray-500">Performance Chart Placeholder</div>
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Average</p>
                        <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">45ms</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Min</p>
                        <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">12ms</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Max</p>
                        <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">123ms</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Throughput</h2>
                    <div className="chart-container" style={{ height: '300px', background: '#f3f4f6', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <canvas id="throughput-chart" />
                      <div className="text-gray-500">Throughput Chart Placeholder</div>
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Requests/sec</p>
                        <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">120</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Active Users</p>
                        <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">45</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Peak Load</p>
                        <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">280 req/s</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

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
