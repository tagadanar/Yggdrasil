// packages/frontend/src/components/attendance/AttendanceReport.tsx
// Comprehensive attendance reporting and analytics component

'use client';

import React, { useState, useEffect } from 'react';
import { progressApi } from '@/lib/api/progress';
import { useAuth } from '@/lib/auth/AuthProvider';
import { 
  ChartBarIcon, 
  CalendarDaysIcon, 
  UserGroupIcon,
  DocumentArrowDownIcon,
  FunnelIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  TrendingUpIcon,
  TrendingDownIcon
} from '@heroicons/react/24/outline';

interface AttendanceStats {
  totalEvents: number;
  totalStudents: number;
  overallAttendanceRate: number;
  presentCount: number;
  absentCount: number;
  averageAttendancePerEvent: number;
  attendanceTrend: 'increasing' | 'decreasing' | 'stable';
}

interface StudentAttendanceData {
  studentId: string;
  studentName: string;
  email: string;
  totalEvents: number;
  eventsAttended: number;
  attendanceRate: number;
  status: 'excellent' | 'good' | 'poor' | 'critical';
  recentTrend: 'improving' | 'declining' | 'stable';
}

interface EventAttendanceData {
  eventId: string;
  eventTitle: string;
  eventDate: string;
  totalStudents: number;
  presentStudents: number;
  attendanceRate: number;
  absentStudents: StudentAttendanceData[];
}

interface AttendanceReportProps {
  promotionId?: string;
  dateRange?: {
    startDate: string;
    endDate: string;
  };
  showStudentDetails?: boolean;
}

export const AttendanceReport: React.FC<AttendanceReportProps> = ({
  promotionId,
  dateRange,
  showStudentDetails = true
}) => {
  const { user } = useAuth();
  const [stats, setStats] = useState<AttendanceStats | null>(null);
  const [studentData, setStudentData] = useState<StudentAttendanceData[]>([]);
  const [eventData, setEventData] = useState<EventAttendanceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'students' | 'events'>('overview');
  const [filters, setFilters] = useState({
    attendanceThreshold: 75,
    showOnlyAtRisk: false,
    sortBy: 'attendanceRate' as 'attendanceRate' | 'name' | 'eventsAttended'
  });

  useEffect(() => {
    if (promotionId) {
      loadAttendanceData();
    }
  }, [promotionId, dateRange, filters.attendanceThreshold]);

  const loadAttendanceData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load overall promotion statistics
      const statsResponse = await progressApi.getPromotionStatistics(promotionId!);
      
      if (statsResponse.success) {
        const rawStats = statsResponse.data;
        
        // Transform to our interface
        const transformedStats: AttendanceStats = {
          totalEvents: rawStats.totalEvents || 0,
          totalStudents: rawStats.totalStudents || 0,
          overallAttendanceRate: rawStats.averageAttendance || 0,
          presentCount: Math.round((rawStats.averageAttendance || 0) * (rawStats.totalStudents || 0) / 100),
          absentCount: Math.round((100 - (rawStats.averageAttendance || 0)) * (rawStats.totalStudents || 0) / 100),
          averageAttendancePerEvent: rawStats.averageAttendance || 0,
          attendanceTrend: rawStats.attendanceTrend || 'stable'
        };
        
        setStats(transformedStats);
      }

      // Load detailed student attendance data
      const progressResponse = await progressApi.getPromotionProgress(promotionId!);
      
      if (progressResponse.success && progressResponse.data) {
        const studentAttendance: StudentAttendanceData[] = progressResponse.data.map((student: any) => ({
          studentId: student.studentId,
          studentName: student.studentName || 'Unknown Student',
          email: student.email || '',
          totalEvents: stats?.totalEvents || 0,
          eventsAttended: Math.round((student.attendanceRate || 0) * (stats?.totalEvents || 0) / 100),
          attendanceRate: student.attendanceRate || 0,
          status: getAttendanceStatus(student.attendanceRate || 0),
          recentTrend: student.attendanceTrend || 'stable'
        }));

        setStudentData(studentAttendance);
      }

      // TODO: Load event-specific data when API is available
      // const eventsResponse = await progressApi.getPromotionEvents(promotionId!);

    } catch (error: any) {
      console.error('Failed to load attendance data:', error);
      setError('Failed to load attendance data');
    } finally {
      setLoading(false);
    }
  };

  const getAttendanceStatus = (rate: number): 'excellent' | 'good' | 'poor' | 'critical' => {
    if (rate >= 90) return 'excellent';
    if (rate >= 75) return 'good';
    if (rate >= 50) return 'poor';
    return 'critical';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent': return 'text-green-600 bg-green-100';
      case 'good': return 'text-blue-600 bg-blue-100';
      case 'poor': return 'text-yellow-600 bg-yellow-100';
      case 'critical': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving': return <TrendingUpIcon className="h-4 w-4 text-green-500" />;
      case 'declining': return <TrendingDownIcon className="h-4 w-4 text-red-500" />;
      default: return <ClockIcon className="h-4 w-4 text-gray-500" />;
    }
  };

  const exportReport = () => {
    // TODO: Implement CSV/PDF export
    console.log('Export report functionality - to be implemented');
  };

  const filteredStudents = studentData
    .filter(student => {
      if (filters.showOnlyAtRisk) {
        return student.attendanceRate < filters.attendanceThreshold;
      }
      return true;
    })
    .sort((a, b) => {
      switch (filters.sortBy) {
        case 'name': return a.studentName.localeCompare(b.studentName);
        case 'eventsAttended': return b.eventsAttended - a.eventsAttended;
        default: return b.attendanceRate - a.attendanceRate;
      }
    });

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <ClockIcon className="h-8 w-8 animate-spin text-indigo-600" />
        <span className="ml-2">Loading attendance report...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mr-2" />
          <div className="text-red-800 font-medium">Error loading report</div>
        </div>
        <div className="text-red-600 mt-1">{error}</div>
        <button
          onClick={loadAttendanceData}
          className="mt-2 text-red-600 underline hover:text-red-800"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <ChartBarIcon className="h-6 w-6 text-indigo-600 mr-3" />
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Attendance Report</h2>
            <p className="text-gray-600">
              {dateRange 
                ? `${dateRange.startDate} - ${dateRange.endDate}`
                : 'All time data'
              }
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={exportReport}
            className="flex items-center px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
          >
            <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
            Export
          </button>
          <button
            onClick={loadAttendanceData}
            className="flex items-center px-3 py-2 text-sm bg-indigo-100 text-indigo-700 rounded-md hover:bg-indigo-200 transition-colors"
          >
            <ClockIcon className="h-4 w-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* Overview Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-center">
              <UserGroupIcon className="h-8 w-8 text-blue-600" />
              <div className="ml-3">
                <div className="text-2xl font-bold text-gray-900">{stats.totalStudents}</div>
                <div className="text-sm text-gray-600">Total Students</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-center">
              <CalendarDaysIcon className="h-8 w-8 text-purple-600" />
              <div className="ml-3">
                <div className="text-2xl font-bold text-gray-900">{stats.totalEvents}</div>
                <div className="text-sm text-gray-600">Total Events</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <CheckCircleIcon className="h-8 w-8 text-green-600" />
                <div className="ml-3">
                  <div className="text-2xl font-bold text-gray-900">
                    {stats.overallAttendanceRate.toFixed(1)}%
                  </div>
                  <div className="text-sm text-gray-600">Attendance Rate</div>
                </div>
              </div>
              {getTrendIcon(stats.attendanceTrend)}
            </div>
          </div>
          
          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-center">
              <div className="flex space-x-4 w-full">
                <div className="flex items-center">
                  <CheckCircleIcon className="h-6 w-6 text-green-600" />
                  <div className="ml-2">
                    <div className="text-lg font-bold text-green-600">{stats.presentCount}</div>
                    <div className="text-xs text-gray-600">Present</div>
                  </div>
                </div>
                <div className="flex items-center">
                  <XCircleIcon className="h-6 w-6 text-red-600" />
                  <div className="ml-2">
                    <div className="text-lg font-bold text-red-600">{stats.absentCount}</div>
                    <div className="text-xs text-gray-600">Absent</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
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
            Overview
          </button>
          <button
            onClick={() => setActiveTab('students')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'students'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Students ({studentData.length})
          </button>
          <button
            onClick={() => setActiveTab('events')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'events'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Events ({eventData.length})
          </button>
        </div>

        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Attendance distribution chart placeholder */}
              <div className="bg-gray-50 rounded-lg p-8 text-center">
                <ChartBarIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Attendance Distribution</h3>
                <p className="text-gray-600">Visual charts will be implemented here</p>
                <div className="mt-4 text-sm text-gray-500">
                  Chart showing attendance rates over time, by student, and by event
                </div>
              </div>

              {/* At-risk students summary */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center">
                  <ExclamationTriangleIcon className="h-5 w-5 text-red-600 mr-2" />
                  <h4 className="font-medium text-red-900">Students At Risk</h4>
                </div>
                <div className="mt-2">
                  <div className="text-sm text-red-800">
                    {filteredStudents.filter(s => s.status === 'critical' || s.status === 'poor').length} students
                    have attendance below {filters.attendanceThreshold}%
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'students' && (
            <div className="space-y-4">
              {/* Filters */}
              <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                <div className="flex items-center space-x-4">
                  <label className="flex items-center text-sm">
                    <input
                      type="checkbox"
                      checked={filters.showOnlyAtRisk}
                      onChange={(e) => setFilters(prev => ({ ...prev, showOnlyAtRisk: e.target.checked }))}
                      className="mr-2"
                    />
                    Show only at-risk students
                  </label>
                  <select
                    value={filters.attendanceThreshold}
                    onChange={(e) => setFilters(prev => ({ ...prev, attendanceThreshold: parseInt(e.target.value) }))}
                    className="text-sm border border-gray-300 rounded px-2 py-1"
                  >
                    <option value={90}>90% threshold</option>
                    <option value={75}>75% threshold</option>
                    <option value={50}>50% threshold</option>
                  </select>
                </div>
                <select
                  value={filters.sortBy}
                  onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value as any }))}
                  className="text-sm border border-gray-300 rounded px-2 py-1"
                >
                  <option value="attendanceRate">Sort by Attendance Rate</option>
                  <option value="name">Sort by Name</option>
                  <option value="eventsAttended">Sort by Events Attended</option>
                </select>
              </div>

              {/* Student list */}
              <div className="space-y-2">
                {filteredStudents.map((student) => (
                  <div key={student.studentId} className="flex items-center justify-between p-3 bg-white border rounded-lg hover:bg-gray-50">
                    <div className="flex items-center space-x-3">
                      <div>
                        <div className="font-medium text-gray-900">{student.studentName}</div>
                        <div className="text-sm text-gray-600">{student.email}</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <div className="text-sm font-medium">
                          {student.eventsAttended}/{student.totalEvents} events
                        </div>
                        <div className="text-xs text-gray-600">
                          {student.attendanceRate.toFixed(1)}% attendance
                        </div>
                      </div>
                      
                      <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(student.status)}`}>
                        {student.status}
                      </span>
                      
                      {getTrendIcon(student.recentTrend)}
                    </div>
                  </div>
                ))}
              </div>

              {filteredStudents.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No students match the current filters
                </div>
              )}
            </div>
          )}

          {activeTab === 'events' && (
            <div className="text-center py-8 text-gray-500">
              <CalendarDaysIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <div className="font-medium mb-2">Event Details Coming Soon</div>
              <div className="text-sm">Detailed event attendance analysis will be available here</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};