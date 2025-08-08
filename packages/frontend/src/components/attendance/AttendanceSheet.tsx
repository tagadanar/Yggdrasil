// packages/frontend/src/components/attendance/AttendanceSheet.tsx
// Teacher interface for marking event attendance

'use client';

import React, { useState, useEffect } from 'react';
import { progressApi, AttendanceRecord } from '@/lib/api/progress';
import { useAuth } from '@/lib/auth/AuthProvider';
import { CheckCircleIcon, XCircleIcon, ClockIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleSolid } from '@heroicons/react/24/solid';

interface Student {
  _id: string;
  email: string;
  profile: {
    firstName: string;
    lastName: string;
    studentId?: string;
  };
}

interface EventWithStudents {
  _id: string;
  title: string;
  startDate: string;
  endDate: string;
  promotionIds: string[];
  students: Student[];
}

interface AttendanceStatus {
  studentId: string;
  attended: boolean;
  notes?: string;
}

interface AttendanceSheetProps {
  eventId: string;
  promotionId: string;
  onAttendanceMarked?: () => void;
}

export const AttendanceSheet: React.FC<AttendanceSheetProps> = ({
  eventId,
  promotionId,
  onAttendanceMarked
}) => {
  const { user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<AttendanceStatus[]>([]);
  const [existingAttendance, setExistingAttendance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState<{ [studentId: string]: string }>({});
  const [bulkAction, setBulkAction] = useState<'all-present' | 'all-absent' | null>(null);

  useEffect(() => {
    loadAttendanceData();
  }, [eventId, promotionId]);

  const loadAttendanceData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load existing attendance data
      const attendanceResponse = await progressApi.getEventAttendance(eventId);
      
      if (attendanceResponse.success && attendanceResponse.data) {
        const existingData = attendanceResponse.data;
        setExistingAttendance(existingData);
        
        // Extract students from attendance data or load from promotion
        const studentsFromAttendance = existingData.map((record: any) => ({
          _id: record.studentId._id || record.studentId,
          email: record.studentId.email || '',
          profile: record.studentId.profile || { firstName: 'Unknown', lastName: 'Student' }
        }));
        
        setStudents(studentsFromAttendance);
        
        // Set current attendance status
        const currentAttendance = existingData.map((record: any) => ({
          studentId: record.studentId._id || record.studentId,
          attended: record.attended,
          notes: record.notes || ''
        }));
        
        setAttendance(currentAttendance);
        
        // Set notes
        const notesMap: { [key: string]: string } = {};
        existingData.forEach((record: any) => {
          if (record.notes) {
            notesMap[record.studentId._id || record.studentId] = record.notes;
          }
        });
        setNotes(notesMap);
      }
    } catch (error: any) {
      console.error('Failed to load attendance data:', error);
      setError('Failed to load attendance data');
    } finally {
      setLoading(false);
    }
  };

  const toggleAttendance = (studentId: string) => {
    setAttendance(prev => {
      const existing = prev.find(a => a.studentId === studentId);
      if (existing) {
        return prev.map(a => 
          a.studentId === studentId ? { ...a, attended: !a.attended } : a
        );
      } else {
        return [...prev, { studentId, attended: true }];
      }
    });
  };

  const updateNotes = (studentId: string, note: string) => {
    setNotes(prev => ({ ...prev, [studentId]: note }));
  };

  const handleBulkAction = (action: 'all-present' | 'all-absent') => {
    const newAttendance = students.map(student => ({
      studentId: student._id,
      attended: action === 'all-present',
      notes: notes[student._id] || ''
    }));
    setAttendance(newAttendance);
    setBulkAction(action);
  };

  const saveAttendance = async () => {
    try {
      setSaving(true);
      setError(null);

      const attendanceRecords: AttendanceRecord[] = attendance.map(a => ({
        studentId: a.studentId,
        attended: a.attended,
        notes: notes[a.studentId] || undefined
      }));

      const response = await progressApi.bulkMarkAttendance(
        eventId,
        promotionId,
        attendanceRecords
      );

      if (response.success) {
        console.log('Attendance saved successfully');
        onAttendanceMarked?.();
        // Reload to get updated data
        await loadAttendanceData();
      } else {
        throw new Error(response.error || 'Failed to save attendance');
      }
    } catch (error: any) {
      console.error('Failed to save attendance:', error);
      setError(error.message || 'Failed to save attendance');
    } finally {
      setSaving(false);
    }
  };

  const getAttendanceStatus = (studentId: string) => {
    const status = attendance.find(a => a.studentId === studentId);
    return status?.attended || false;
  };

  const getPresentCount = () => {
    return attendance.filter(a => a.attended).length;
  };

  const getAbsentCount = () => {
    return attendance.filter(a => !a.attended).length;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <ClockIcon className="h-8 w-8 animate-spin text-indigo-600" />
        <span className="ml-2">Loading attendance...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="text-red-800 font-medium">Error</div>
        <div className="text-red-600">{error}</div>
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
      {/* Header with stats */}
      <div className="bg-white rounded-lg border p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <UserGroupIcon className="h-6 w-6 text-indigo-600 mr-3" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Event Attendance</h2>
              <p className="text-gray-600">{students.length} students total</p>
            </div>
          </div>
          <div className="flex items-center space-x-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{getPresentCount()}</div>
              <div className="text-sm text-gray-600">Present</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{getAbsentCount()}</div>
              <div className="text-sm text-gray-600">Absent</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">
                {students.length - attendance.length}
              </div>
              <div className="text-sm text-gray-600">Not marked</div>
            </div>
          </div>
        </div>
      </div>

      {/* Bulk actions */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">Bulk actions:</span>
          <div className="flex space-x-2">
            <button
              onClick={() => handleBulkAction('all-present')}
              className="px-3 py-1 bg-green-100 text-green-800 rounded-md hover:bg-green-200 transition-colors text-sm"
            >
              Mark All Present
            </button>
            <button
              onClick={() => handleBulkAction('all-absent')}
              className="px-3 py-1 bg-red-100 text-red-800 rounded-md hover:bg-red-200 transition-colors text-sm"
            >
              Mark All Absent
            </button>
          </div>
        </div>
      </div>

      {/* Student list */}
      <div className="bg-white rounded-lg border">
        <div className="max-h-96 overflow-y-auto">
          {students.map((student, index) => {
            const isPresent = getAttendanceStatus(student._id);
            return (
              <div
                key={student._id}
                className={`flex items-center justify-between p-4 border-b last:border-b-0 hover:bg-gray-50 ${
                  isPresent ? 'bg-green-50' : ''
                }`}
              >
                <div className="flex items-center flex-1">
                  <div className="flex-shrink-0 mr-4">
                    <div className="text-sm font-medium text-gray-500">
                      #{index + 1}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">
                      {student.profile.firstName} {student.profile.lastName}
                    </div>
                    <div className="text-sm text-gray-600">
                      {student.email}
                      {student.profile.studentId && (
                        <span className="ml-2">• ID: {student.profile.studentId}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  {/* Notes input */}
                  <input
                    type="text"
                    placeholder="Optional notes..."
                    value={notes[student._id] || ''}
                    onChange={(e) => updateNotes(student._id, e.target.value)}
                    className="w-32 px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />

                  {/* Attendance toggle */}
                  <button
                    onClick={() => toggleAttendance(student._id)}
                    className={`flex items-center px-4 py-2 rounded-md font-medium transition-colors ${
                      isPresent
                        ? 'bg-green-100 text-green-800 hover:bg-green-200'
                        : 'bg-red-100 text-red-800 hover:bg-red-200'
                    }`}
                  >
                    {isPresent ? (
                      <>
                        <CheckCircleSolid className="h-4 w-4 mr-1" />
                        Present
                      </>
                    ) : (
                      <>
                        <XCircleIcon className="h-4 w-4 mr-1" />
                        Absent
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Save button */}
      <div className="flex justify-end">
        <button
          onClick={saveAttendance}
          disabled={saving || attendance.length === 0}
          className={`px-6 py-3 rounded-md font-medium transition-colors ${
            saving || attendance.length === 0
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-indigo-600 text-white hover:bg-indigo-700'
          }`}
        >
          {saving ? (
            <>
              <ClockIcon className="h-4 w-4 animate-spin inline mr-2" />
              Saving...
            </>
          ) : (
            `Save Attendance (${attendance.length} students)`
          )}
        </button>
      </div>
    </div>
  );
};