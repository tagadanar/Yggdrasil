// packages/frontend/src/components/monitoring/ValidationSystemMonitor.tsx
// Real-time monitoring dashboard for semester validation system

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { promotionApi } from '@/lib/api/promotions';

interface SystemHealth {
  overall: 'healthy' | 'warning' | 'critical';
  services: {
    database: 'online' | 'offline' | 'degraded';
    validationEngine: 'online' | 'offline' | 'degraded';
    semesterManagement: 'online' | 'offline' | 'degraded';
  };
  metrics: {
    activeValidations: number;
    pendingValidations: number;
    validationRate: number;
    averageProcessingTime: number;
    systemUtilization: number;
    errorRate: number;
  };
  recentEvents: Array<{
    timestamp: string;
    type: 'validation' | 'progression' | 'error' | 'system';
    message: string;
    severity: 'info' | 'warning' | 'error';
  }>;
  performance: {
    responseTime: number;
    throughput: number;
    queueLength: number;
  };
}

interface ValidationSystemMonitorProps {
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export function ValidationSystemMonitor({ 
  autoRefresh = true, 
  refreshInterval = 30000 
}: ValidationSystemMonitorProps) {
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadSystemHealth();

    if (autoRefresh) {
      intervalRef.current = setInterval(loadSystemHealth, refreshInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [autoRefresh, refreshInterval]);

  const loadSystemHealth = async () => {
    try {
      // Simulate system health data (would come from actual monitoring endpoints)
      const healthData: SystemHealth = {
        overall: 'healthy',
        services: {
          database: 'online',
          validationEngine: 'online',
          semesterManagement: 'online',
        },
        metrics: {
          activeValidations: Math.floor(Math.random() * 50) + 10,
          pendingValidations: Math.floor(Math.random() * 100) + 20,
          validationRate: Math.floor(Math.random() * 30) + 70,
          averageProcessingTime: Math.floor(Math.random() * 500) + 200,
          systemUtilization: Math.floor(Math.random() * 30) + 50,
          errorRate: Math.random() * 2,
        },
        recentEvents: [
          {
            timestamp: new Date(Date.now() - 300000).toISOString(),
            type: 'validation',
            message: 'Bulk validation completed for 15 students',
            severity: 'info',
          },
          {
            timestamp: new Date(Date.now() - 600000).toISOString(),
            type: 'progression',
            message: '8 students progressed to next semester',
            severity: 'info',
          },
          {
            timestamp: new Date(Date.now() - 900000).toISOString(),
            type: 'system',
            message: 'Semester S5 capacity reached 85%',
            severity: 'warning',
          },
        ],
        performance: {
          responseTime: Math.floor(Math.random() * 100) + 50,
          throughput: Math.floor(Math.random() * 10) + 15,
          queueLength: Math.floor(Math.random() * 5),
        },
      };

      setSystemHealth(healthData);
      setLastUpdated(new Date());
      setError(null);
    } catch (err: any) {
      setError('Failed to load system health data');
    } finally {
      setLoading(false);
    }
  };

  const getHealthColor = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'online':
        return 'text-green-600 dark:text-green-400';
      case 'warning':
      case 'degraded':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'critical':
      case 'offline':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-secondary-600 dark:text-secondary-400';
    }
  };

  const getHealthIcon = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'online':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'warning':
      case 'degraded':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        );
      case 'critical':
      case 'offline':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return null;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="card">
        <div className="p-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 dark:border-primary-400 mx-auto mb-4"></div>
          <p className="text-secondary-600 dark:text-secondary-400">Loading system health...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <div className="p-6 text-center">
          <svg className="w-12 h-12 text-red-400 dark:text-red-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <p className="text-red-700 dark:text-red-300 mb-4">{error}</p>
          <button
            onClick={loadSystemHealth}
            className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!systemHealth) return null;

  return (
    <div className="space-y-6">
      {/* System Status Overview */}
      <div className="card">
        <div className="px-6 py-4 border-b border-secondary-200 dark:border-secondary-700">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-secondary-900 dark:text-secondary-100">
              System Health Overview
            </h3>
            <div className="flex items-center space-x-4">
              {lastUpdated && (
                <span className="text-sm text-secondary-500 dark:text-secondary-400">
                  Last updated: {formatTimestamp(lastUpdated.toISOString())}
                </span>
              )}
              <div className={`flex items-center space-x-2 ${getHealthColor(systemHealth.overall)}`}>
                {getHealthIcon(systemHealth.overall)}
                <span className="font-medium capitalize">{systemHealth.overall}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Object.entries(systemHealth.services).map(([service, status]) => (
              <div key={service} className="flex items-center justify-between p-4 bg-secondary-50 dark:bg-secondary-800 rounded-lg">
                <div>
                  <div className="font-medium text-secondary-900 dark:text-secondary-100 capitalize">
                    {service.replace(/([A-Z])/g, ' $1').trim()}
                  </div>
                  <div className={`text-sm ${getHealthColor(status)} flex items-center space-x-1`}>
                    {getHealthIcon(status)}
                    <span className="capitalize">{status}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="card">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-secondary-500 dark:text-secondary-400">
                  Active Validations
                </div>
                <div className="text-2xl font-bold text-secondary-900 dark:text-secondary-100">
                  {systemHealth.metrics.activeValidations}
                </div>
              </div>
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-secondary-500 dark:text-secondary-400">
                  Pending Validations
                </div>
                <div className="text-2xl font-bold text-secondary-900 dark:text-secondary-100">
                  {systemHealth.metrics.pendingValidations}
                </div>
              </div>
              <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-secondary-500 dark:text-secondary-400">
                  Validation Rate
                </div>
                <div className="text-2xl font-bold text-secondary-900 dark:text-secondary-100">
                  {systemHealth.metrics.validationRate}%
                </div>
              </div>
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-secondary-500 dark:text-secondary-400">
                  Avg. Processing Time
                </div>
                <div className="text-2xl font-bold text-secondary-900 dark:text-secondary-100">
                  {systemHealth.metrics.averageProcessingTime}ms
                </div>
              </div>
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-secondary-500 dark:text-secondary-400">
                  System Utilization
                </div>
                <div className="text-2xl font-bold text-secondary-900 dark:text-secondary-100">
                  {systemHealth.metrics.systemUtilization}%
                </div>
              </div>
              <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-secondary-500 dark:text-secondary-400">
                  Error Rate
                </div>
                <div className="text-2xl font-bold text-secondary-900 dark:text-secondary-100">
                  {systemHealth.metrics.errorRate.toFixed(2)}%
                </div>
              </div>
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                systemHealth.metrics.errorRate > 5 
                  ? 'bg-red-100 dark:bg-red-900/30' 
                  : 'bg-green-100 dark:bg-green-900/30'
              }`}>
                <svg className={`w-6 h-6 ${
                  systemHealth.metrics.errorRate > 5 
                    ? 'text-red-600 dark:text-red-400' 
                    : 'text-green-600 dark:text-green-400'
                }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="card">
        <div className="px-6 py-4 border-b border-secondary-200 dark:border-secondary-700">
          <h3 className="text-lg font-semibold text-secondary-900 dark:text-secondary-100">
            Performance Metrics
          </h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-secondary-900 dark:text-secondary-100">
                {systemHealth.performance.responseTime}ms
              </div>
              <div className="text-sm text-secondary-500 dark:text-secondary-400">
                Response Time
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-secondary-900 dark:text-secondary-100">
                {systemHealth.performance.throughput}/min
              </div>
              <div className="text-sm text-secondary-500 dark:text-secondary-400">
                Throughput
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-secondary-900 dark:text-secondary-100">
                {systemHealth.performance.queueLength}
              </div>
              <div className="text-sm text-secondary-500 dark:text-secondary-400">
                Queue Length
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Events */}
      <div className="card">
        <div className="px-6 py-4 border-b border-secondary-200 dark:border-secondary-700">
          <h3 className="text-lg font-semibold text-secondary-900 dark:text-secondary-100">
            Recent System Events
          </h3>
        </div>
        <div className="p-6">
          <div className="space-y-3">
            {systemHealth.recentEvents.map((event, index) => (
              <div key={index} className="flex items-center space-x-3 p-3 bg-secondary-50 dark:bg-secondary-800 rounded-lg">
                <div className={`w-2 h-2 rounded-full ${
                  event.severity === 'error' ? 'bg-red-500' :
                  event.severity === 'warning' ? 'bg-yellow-500' : 'bg-green-500'
                }`}></div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-secondary-900 dark:text-secondary-100">
                    {event.message}
                  </div>
                  <div className="text-xs text-secondary-500 dark:text-secondary-400">
                    {formatTimestamp(event.timestamp)} • {event.type}
                  </div>
                </div>
                <div className={`px-2 py-1 rounded text-xs font-medium ${
                  event.severity === 'error' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' :
                  event.severity === 'warning' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' :
                  'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                }`}>
                  {event.severity}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}