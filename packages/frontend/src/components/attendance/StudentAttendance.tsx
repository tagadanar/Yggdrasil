// packages/frontend/src/components/attendance/StudentAttendance.tsx
// Student view for their own attendance records and statistics

'use client';

import React, { useState, useEffect } from 'react';
import { progressApi } from '@/lib/api/progress';
import { useAuth } from '@/lib/auth/AuthProvider';
import { 
  CalendarDaysIcon, 
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  ChartBarIcon,
  InformationCircleIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleSolid, XCircleIcon as XCircleSolid } from '@heroicons/react/24/solid';

interface AttendanceRecord {
  _id: string;
  eventId: {
    _id: string;
    title: string;
    startDate: string;
    endDate: string;
    type: string;
  };
  attended: boolean;
  attendedAt?: string;
  notes?: string;
  markedBy?: {
    profile: {
      firstName: string;
      lastName: string;
    };
  };
}

interface AttendanceSummary {
  totalEvents: number;
  eventsAttended: number;
  attendanceRate: number;
  recentTrend: 'improving' | 'declining' | 'stable';
  consecutiveAbsences: number;
  longestStreak: number;
  currentStreak: number;
}

interface StudentAttendanceProps {
  promotionId?: string;
  showSummary?: boolean;
  maxRecords?: number;
}

export const StudentAttendance: React.FC<StudentAttendanceProps> = ({
  promotionId,
  showSummary = true,
  maxRecords = 50
}) => {
  const { user } = useAuth();
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [summary, setSummary] = useState<AttendanceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'present' | 'absent'>('all');
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);

  useEffect(() => {
    if (user?.id) {
      loadAttendanceData();
    }
  }, [user?.id, promotionId]);

  const loadAttendanceData = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setError(null);

      // Load student's attendance records
      const response = await progressApi.getStudentAttendance(user.id, promotionId);
      
      if (response.success && response.data) {
        const attendanceRecords = response.data.slice(0, maxRecords);
        setAttendance(attendanceRecords);

        // Calculate summary statistics
        const stats = calculateAttendanceStats(attendanceRecords);
        setSummary(stats);
      }
    } catch (error: any) {
      console.error('Failed to load attendance data:', error);
      setError('Failed to load your attendance data');
    } finally {
      setLoading(false);
    }
  };

  const calculateAttendanceStats = (records: AttendanceRecord[]): AttendanceSummary => {
    const total = records.length;
    const attended = records.filter(r => r.attended).length;
    const rate = total > 0 ? (attended / total) * 100 : 0;

    // Calculate streaks
    const { longestStreak, currentStreak } = calculateStreaks(records);
    
    // Calculate consecutive absences
    let consecutiveAbsences = 0;
    for (let i = records.length - 1; i >= 0; i--) {
      if (!records[i].attended) {
        consecutiveAbsences++;
      } else {
        break;
      }
    }

    // Calculate trend (simplified - compare first half vs second half)
    const firstHalf = records.slice(0, Math.floor(total / 2));
    const secondHalf = records.slice(Math.floor(total / 2));
    
    let trend: 'improving' | 'declining' | 'stable' = 'stable';
    if (firstHalf.length > 0 && secondHalf.length > 0) {
      const firstHalfRate = (firstHalf.filter(r => r.attended).length / firstHalf.length) * 100;
      const secondHalfRate = (secondHalf.filter(r => r.attended).length / secondHalf.length) * 100;
      
      if (secondHalfRate > firstHalfRate + 10) {
        trend = 'improving';
      } else if (secondHalfRate < firstHalfRate - 10) {
        trend = 'declining';
      }
    }

    return {
      totalEvents: total,
      eventsAttended: attended,
      attendanceRate: rate,
      recentTrend: trend,
      consecutiveAbsences,
      longestStreak,
      currentStreak
    };
  };

  const calculateStreaks = (records: AttendanceRecord[]) => {
    let longestStreak = 0;
    let currentStreak = 0;
    let tempStreak = 0;

    // Calculate from most recent backwards
    for (let i = records.length - 1; i >= 0; i--) {
      if (records[i].attended) {
        tempStreak++;
        if (i === records.length - 1 || records[i + 1]?.attended) {
          // Continue or start current streak
          if (i === records.length - 1) {
            currentStreak = tempStreak;
          }
        }
        longestStreak = Math.max(longestStreak, tempStreak);
      } else {
        tempStreak = 0;
        if (currentStreak === 0 && i === records.length - 1) {
          // Current streak is 0 if most recent is absent
          currentStreak = 0;
        }
      }
    }

    return { longestStreak, currentStreak };
  };

  const getAttendanceStatus = (rate: number) => {
    if (rate >= 90) return { status: 'excellent', color: 'text-green-600', bgColor: 'bg-green-100' };
    if (rate >= 75) return { status: 'good', color: 'text-blue-600', bgColor: 'bg-blue-100' };
    if (rate >= 50) return { status: 'needs improvement', color: 'text-yellow-600', bgColor: 'bg-yellow-100' };
    return { status: 'critical', color: 'text-red-600', bgColor: 'bg-red-100' };
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving': return <TrendingUpIcon className="h-4 w-4 text-green-500" />;
      case 'declining': return <TrendingDownIcon className="h-4 w-4 text-red-500" />;
      default: return <ClockIcon className="h-4 w-4 text-gray-500" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredAttendance = attendance.filter(record => {
    if (filter === 'present') return record.attended;
    if (filter === 'absent') return !record.attended;
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <ClockIcon className="h-8 w-8 animate-spin text-indigo-600" />
        <span className="ml-2">Loading your attendance...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mr-2" />
          <div className="text-red-800 font-medium">Error</div>
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
          <CalendarDaysIcon className="h-6 w-6 text-indigo-600 mr-3" />
          <div>
            <h2 className="text-xl font-semibold text-gray-900">My Attendance</h2>
            <p className="text-gray-600">Track your event attendance and progress</p>
          </div>
        </div>
        <button
          onClick={loadAttendanceData}
          className="flex items-center px-3 py-2 text-sm bg-indigo-100 text-indigo-700 rounded-md hover:bg-indigo-200 transition-colors"
        >
          <ClockIcon className="h-4 w-4 mr-2" />
          Refresh
        </button>
      </div>

      {/* Summary Cards */}
      {showSummary && summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <ChartBarIcon className="h-8 w-8 text-indigo-600" />
                <div className="ml-3">
                  <div className="text-2xl font-bold text-gray-900">
                    {summary.attendanceRate.toFixed(1)}%
                  </div>
                  <div className="text-sm text-gray-600">Attendance Rate</div>
                </div>
              </div>
              {getTrendIcon(summary.recentTrend)}
            </div>
            <div className="mt-2">
              <span className={`px-2 py-1 text-xs rounded-full ${getAttendanceStatus(summary.attendanceRate).bgColor} ${getAttendanceStatus(summary.attendanceRate).color}`}>
                {getAttendanceStatus(summary.attendanceRate).status}
              </span>
            </div>
          </div>

          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-center">
              <CheckCircleIcon className="h-8 w-8 text-green-600" />
              <div className="ml-3">
                <div className="text-2xl font-bold text-gray-900">
                  {summary.eventsAttended}/{summary.totalEvents}
                </div>
                <div className="text-sm text-gray-600">Events Attended</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-center">
              <TrendingUpIcon className="h-8 w-8 text-blue-600" />
              <div className="ml-3">
                <div className="text-2xl font-bold text-gray-900">{summary.longestStreak}</div>
                <div className="text-sm text-gray-600">Longest Streak</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-center">
              <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                summary.consecutiveAbsences > 0 ? 'bg-red-100' : 'bg-green-100'
              }`}>
                {summary.consecutiveAbsences > 0 ? (
                  <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
                ) : (
                  <CheckCircleIcon className="h-5 w-5 text-green-600" />
                )}
              </div>
              <div className="ml-3">
                <div className="text-2xl font-bold text-gray-900">{summary.consecutiveAbsences}</div>
                <div className="text-sm text-gray-600">Recent Absences</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Attendance Records */}
      <div className="bg-white rounded-lg border">
        {/* Filters */}
        <div className="border-b p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium text-gray-700">Filter:</span>
              <div className="flex space-x-2">
                <button
                  onClick={() => setFilter('all')}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    filter === 'all'
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  All ({attendance.length})
                </button>
                <button
                  onClick={() => setFilter('present')}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    filter === 'present'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Present ({attendance.filter(r => r.attended).length})
                </button>
                <button
                  onClick={() => setFilter('absent')}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    filter === 'absent'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Absent ({attendance.filter(r => !r.attended).length})
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Records List */}
        <div className="divide-y">
          {filteredAttendance.length > 0 ? (
            filteredAttendance.map((record) => (
              <div key={record._id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      {record.attended ? (
                        <CheckCircleSolid className="h-6 w-6 text-green-500" />
                      ) : (
                        <XCircleSolid className="h-6 w-6 text-red-500" />
                      )}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">
                        {record.eventId.title}
                      </div>
                      <div className="text-sm text-gray-600">
                        {formatDate(record.eventId.startDate)} • {formatTime(record.eventId.startDate)} - {formatTime(record.eventId.endDate)}
                      </div>
                      <div className="text-xs text-gray-500 capitalize">
                        {record.eventId.type}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <div className="text-right">
                      <div className={`text-sm font-medium ${
                        record.attended ? 'text-green-700' : 'text-red-700'
                      }`}>
                        {record.attended ? 'Present' : 'Absent'}
                      </div>
                      {record.attendedAt && (
                        <div className="text-xs text-gray-500">
                          Marked: {formatDate(record.attendedAt)}
                        </div>
                      )}
                    </div>
                    
                    {(record.notes || record.markedBy) && (
                      <button
                        onClick={() => setSelectedRecord(record)}
                        className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        <InformationCircleIcon className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-gray-500">
              <CalendarDaysIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <div className="font-medium mb-2">No attendance records found</div>
              <div className="text-sm">
                {filter === 'all' 
                  ? 'You don\'t have any event attendance records yet.'
                  : `No ${filter} attendance records found.`
                }
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Record Details Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Attendance Details</h3>
              <button
                onClick={() => setSelectedRecord(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircleIcon className="h-6 w-6" />
              </button>
            </div>
            
            <div className="space-y-3">
              <div>
                <div className="text-sm font-medium text-gray-700">Event</div>
                <div className="text-gray-900">{selectedRecord.eventId.title}</div>
              </div>
              
              <div>
                <div className="text-sm font-medium text-gray-700">Status</div>
                <div className={`font-medium ${selectedRecord.attended ? 'text-green-600' : 'text-red-600'}`}>
                  {selectedRecord.attended ? 'Present' : 'Absent'}
                </div>
              </div>
              
              {selectedRecord.notes && (
                <div>
                  <div className="text-sm font-medium text-gray-700">Notes</div>
                  <div className="text-gray-900">{selectedRecord.notes}</div>
                </div>
              )}
              
              {selectedRecord.markedBy && (
                <div>
                  <div className="text-sm font-medium text-gray-700">Marked by</div>
                  <div className="text-gray-900">
                    {selectedRecord.markedBy.profile.firstName} {selectedRecord.markedBy.profile.lastName}
                  </div>
                </div>
              )}
              
              {selectedRecord.attendedAt && (
                <div>
                  <div className="text-sm font-medium text-gray-700">Recorded on</div>
                  <div className="text-gray-900">
                    {formatDate(selectedRecord.attendedAt)} at {formatTime(selectedRecord.attendedAt)}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};