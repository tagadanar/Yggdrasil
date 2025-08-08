// packages/frontend/src/components/attendance/AdminAttendanceDashboard.tsx
// Comprehensive admin dashboard for attendance management and oversight

'use client';

import React, { useState, useEffect } from 'react';
import { progressApi } from '@/lib/api/progress';
import { useAuth } from '@/lib/auth/AuthProvider';
import { AttendanceReport } from './AttendanceReport';
import { AttendanceSheet } from './AttendanceSheet';
import { 
  ChartBarIcon, 
  CalendarDaysIcon, 
  UserGroupIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  AdjustmentsHorizontalIcon,
  BellIcon,
  DocumentArrowDownIcon,
  EyeIcon,
  PlusIcon,
  FunnelIcon
} from '@heroicons/react/24/outline';

interface Promotion {
  _id: string;
  name: string;
  semester: number;
  academicYear: string;
  studentIds: string[];
  status: string;
}

interface AttendanceAlert {
  type: 'low_attendance' | 'consecutive_absences' | 'trend_declining';
  studentId: string;
  studentName: string;
  promotionId: string;
  promotionName: string;
  severity: 'high' | 'medium' | 'low';
  details: string;
  createdAt: string;
}

interface QuickStats {
  totalStudents: number;
  totalEvents: number;
  overallAttendanceRate: number;
  atRiskStudents: number;
  recentEvents: number;
}

export const AdminAttendanceDashboard: React.FC = () => {
  const { user } = useAuth();
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [selectedPromotion, setSelectedPromotion] = useState<string | null>(null);
  const [quickStats, setQuickStats] = useState<QuickStats | null>(null);
  const [alerts, setAlerts] = useState<AttendanceAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'reports' | 'alerts' | 'manage'>('overview');
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  useEffect(() => {
    if (selectedPromotion) {
      loadPromotionStats();
    }
  }, [selectedPromotion, dateRange]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load promotions (you might have a different API for this)
      // For now, we'll simulate this data
      const mockPromotions: Promotion[] = [
        {
          _id: 'promo1',
          name: 'Computer Science - Year 1',
          semester: 1,
          academicYear: '2024-2025',
          studentIds: ['student1', 'student2'],
          status: 'active'
        },
        {
          _id: 'promo2',
          name: 'Software Engineering - Year 2',
          semester: 3,
          academicYear: '2024-2025',
          studentIds: ['student3', 'student4'],
          status: 'active'
        }
      ];

      setPromotions(mockPromotions);
      
      if (mockPromotions.length > 0) {
        setSelectedPromotion(mockPromotions[0]._id);
      }

      // Generate mock alerts
      const mockAlerts: AttendanceAlert[] = [
        {
          type: 'low_attendance',
          studentId: 'student1',
          studentName: 'John Doe',
          promotionId: 'promo1',
          promotionName: 'Computer Science - Year 1',
          severity: 'high',
          details: 'Attendance rate below 60% (current: 45%)',
          createdAt: new Date().toISOString()
        },
        {
          type: 'consecutive_absences',
          studentId: 'student2',
          studentName: 'Jane Smith',
          promotionId: 'promo1',
          promotionName: 'Computer Science - Year 1',
          severity: 'medium',
          details: '3 consecutive absences detected',
          createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
        }
      ];

      setAlerts(mockAlerts);

    } catch (error: any) {
      console.error('Failed to load dashboard data:', error);
      setError('Failed to load attendance dashboard');
    } finally {
      setLoading(false);
    }
  };

  const loadPromotionStats = async () => {
    if (!selectedPromotion) return;

    try {
      const response = await progressApi.getPromotionStatistics(selectedPromotion);
      
      if (response.success) {
        const stats: QuickStats = {
          totalStudents: response.data.totalStudents || 0,
          totalEvents: response.data.totalEvents || 0,
          overallAttendanceRate: response.data.averageAttendance || 0,
          atRiskStudents: response.data.atRiskStudents || 0,
          recentEvents: response.data.recentEvents || 0
        };
        
        setQuickStats(stats);
      }
    } catch (error) {
      console.error('Failed to load promotion statistics:', error);
    }
  };

  const getAlertColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'border-red-200 bg-red-50 text-red-700';
      case 'medium': return 'border-yellow-200 bg-yellow-50 text-yellow-700';
      default: return 'border-blue-200 bg-blue-50 text-blue-700';
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'low_attendance': return <ExclamationTriangleIcon className="h-5 w-5" />;
      case 'consecutive_absences': return <XCircleIcon className="h-5 w-5" />;
      case 'trend_declining': return <ChartBarIcon className="h-5 w-5" />;
      default: return <BellIcon className="h-5 w-5" />;
    }
  };

  const exportData = () => {
    // TODO: Implement export functionality
    console.log('Export attendance data for promotion:', selectedPromotion);
  };

  const dismissAlert = (alertId: string) => {
    setAlerts(prev => prev.filter(alert => `${alert.studentId}-${alert.type}` !== alertId));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <ClockIcon className="h-8 w-8 animate-spin text-indigo-600" />
        <span className="ml-2">Loading attendance dashboard...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mr-2" />
          <div className="text-red-800 font-medium">Dashboard Error</div>
        </div>
        <div className="text-red-600 mt-1">{error}</div>
        <button
          onClick={loadDashboardData}
          className="mt-2 text-red-600 underline hover:text-red-800"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <UserGroupIcon className="h-6 w-6 text-indigo-600 mr-3" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Attendance Dashboard</h1>
            <p className="text-gray-600">Monitor and manage student attendance across all promotions</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <select
            value={selectedPromotion || ''}
            onChange={(e) => setSelectedPromotion(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Select Promotion</option>
            {promotions.map((promo) => (
              <option key={promo._id} value={promo._id}>
                {promo.name} - {promo.academicYear}
              </option>
            ))}
          </select>
          <button
            onClick={exportData}
            className="flex items-center px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
          >
            <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
            Export
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      {quickStats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-center">
              <UserGroupIcon className="h-8 w-8 text-blue-600" />
              <div className="ml-3">
                <div className="text-2xl font-bold text-gray-900">{quickStats.totalStudents}</div>
                <div className="text-sm text-gray-600">Total Students</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-center">
              <CalendarDaysIcon className="h-8 w-8 text-purple-600" />
              <div className="ml-3">
                <div className="text-2xl font-bold text-gray-900">{quickStats.totalEvents}</div>
                <div className="text-sm text-gray-600">Total Events</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-center">
              <CheckCircleIcon className="h-8 w-8 text-green-600" />
              <div className="ml-3">
                <div className="text-2xl font-bold text-gray-900">
                  {quickStats.overallAttendanceRate.toFixed(1)}%
                </div>
                <div className="text-sm text-gray-600">Overall Attendance</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-center">
              <ExclamationTriangleIcon className="h-8 w-8 text-red-600" />
              <div className="ml-3">
                <div className="text-2xl font-bold text-gray-900">{quickStats.atRiskStudents}</div>
                <div className="text-sm text-gray-600">At Risk Students</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-center">
              <ClockIcon className="h-8 w-8 text-gray-600" />
              <div className="ml-3">
                <div className="text-2xl font-bold text-gray-900">{quickStats.recentEvents}</div>
                <div className="text-sm text-gray-600">Recent Events</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Alerts Section */}
      {alerts.length > 0 && (
        <div className="bg-white rounded-lg border">
          <div className="border-b p-4">
            <div className="flex items-center">
              <BellIcon className="h-5 w-5 text-red-500 mr-2" />
              <h3 className="text-lg font-medium text-gray-900">Active Alerts ({alerts.length})</h3>
            </div>
          </div>
          <div className="p-4 space-y-3">
            {alerts.slice(0, 5).map((alert) => (
              <div
                key={`${alert.studentId}-${alert.type}`}
                className={`border rounded-lg p-3 ${getAlertColor(alert.severity)}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 mt-1">
                      {getAlertIcon(alert.type)}
                    </div>
                    <div className="ml-3">
                      <div className="font-medium">{alert.studentName}</div>
                      <div className="text-sm opacity-90">{alert.promotionName}</div>
                      <div className="text-sm mt-1">{alert.details}</div>
                      <div className="text-xs opacity-75 mt-2">
                        {new Date(alert.createdAt).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => dismissAlert(`${alert.studentId}-${alert.type}`)}
                    className="text-current opacity-60 hover:opacity-100"
                  >
                    <XCircleIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Content Tabs */}
      <div className="bg-white rounded-lg border">
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'overview'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <ChartBarIcon className="h-4 w-4 inline mr-2" />
            Overview
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'reports'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <DocumentArrowDownIcon className="h-4 w-4 inline mr-2" />
            Reports
          </button>
          <button
            onClick={() => setActiveTab('alerts')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'alerts'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <BellIcon className="h-4 w-4 inline mr-2" />
            Alerts ({alerts.length})
          </button>
          <button
            onClick={() => setActiveTab('manage')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'manage'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <AdjustmentsHorizontalIcon className="h-4 w-4 inline mr-2" />
            Manage
          </button>
        </div>

        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="text-center py-8">
                <ChartBarIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Attendance Overview</h3>
                <p className="text-gray-600">
                  Comprehensive attendance analytics and trend visualization will be displayed here.
                </p>
                <div className="mt-4 text-sm text-gray-500">
                  Features: Time-series charts, distribution graphs, comparative analysis
                </div>
              </div>
            </div>
          )}

          {activeTab === 'reports' && selectedPromotion && (
            <AttendanceReport
              promotionId={selectedPromotion}
              dateRange={dateRange}
              showStudentDetails={true}
            />
          )}

          {activeTab === 'alerts' && (
            <div className="space-y-4">
              {alerts.length > 0 ? (
                alerts.map((alert) => (
                  <div
                    key={`${alert.studentId}-${alert.type}`}
                    className={`border rounded-lg p-4 ${getAlertColor(alert.severity)}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start">
                        <div className="flex-shrink-0 mt-1">
                          {getAlertIcon(alert.type)}
                        </div>
                        <div className="ml-3">
                          <div className="font-medium text-lg">{alert.studentName}</div>
                          <div className="text-sm opacity-90 mb-2">{alert.promotionName}</div>
                          <div className="mb-2">{alert.details}</div>
                          <div className="text-sm opacity-75">
                            Created: {new Date(alert.createdAt).toLocaleString()}
                          </div>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <button className="px-3 py-1 bg-white bg-opacity-50 rounded text-sm hover:bg-opacity-75">
                          View Student
                        </button>
                        <button
                          onClick={() => dismissAlert(`${alert.studentId}-${alert.type}`)}
                          className="px-3 py-1 bg-white bg-opacity-50 rounded text-sm hover:bg-opacity-75"
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <BellIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <div className="font-medium mb-2">No Active Alerts</div>
                  <div className="text-sm">All students are meeting attendance requirements.</div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'manage' && (
            <div className="space-y-6">
              <div className="text-center py-8">
                <AdjustmentsHorizontalIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Attendance Management Tools</h3>
                <p className="text-gray-600 mb-4">
                  Configure attendance policies, thresholds, and automated workflows.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-md mx-auto">
                  <button className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50">
                    <AdjustmentsHorizontalIcon className="h-5 w-5 mr-2" />
                    Settings
                  </button>
                  <button className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50">
                    <BellIcon className="h-5 w-5 mr-2" />
                    Alerts Config
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Event Management Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold">Manage Event Attendance</h3>
                <button
                  onClick={() => setSelectedEvent(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircleIcon className="h-6 w-6" />
                </button>
              </div>
              
              {selectedPromotion && (
                <AttendanceSheet
                  eventId={selectedEvent}
                  promotionId={selectedPromotion}
                  onAttendanceMarked={() => {
                    // Refresh data after attendance is marked
                    loadPromotionStats();
                  }}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};