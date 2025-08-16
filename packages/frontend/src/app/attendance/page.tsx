// packages/frontend/src/app/attendance/page.tsx
// Attendance management page - role-based interface

'use client';

import React from 'react';
import { useAuth } from '@/lib/auth/AuthProvider';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { AdminAttendanceDashboard } from '@/components/attendance/AdminAttendanceDashboard';
import { StudentAttendance } from '@/components/attendance/StudentAttendance';
import { AttendanceSheet } from '@/components/attendance/AttendanceSheet';
import { AttendanceReport } from '@/components/attendance/AttendanceReport';
import { CalendarDaysIcon, ExclamationTriangleIcon, ClockIcon } from '@heroicons/react/24/outline';

export default function AttendancePage() {
  const { user } = useAuth();

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center">
              <CalendarDaysIcon className="h-8 w-8 text-indigo-600 mr-3" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Attendance Management</h1>
                <p className="text-gray-600">
                  {user?.role === 'admin' && 'Monitor and manage attendance across all promotions'}
                  {user?.role === 'teacher' && 'Track and mark attendance for your classes'}
                  {user?.role === 'student' && 'View your attendance records and statistics'}
                </p>
              </div>
            </div>
          </div>

          {/* Role-based Content */}
          {user?.role === 'admin' && <AdminAttendanceDashboard />}

          {user?.role === 'teacher' && (
            <div className="space-y-8">
              {/* Quick Actions */}
              <div className="bg-white rounded-lg border p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button className="flex items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-indigo-300 hover:bg-indigo-50 transition-colors">
                    <CalendarDaysIcon className="h-6 w-6 text-gray-400 mr-2" />
                    <span className="text-gray-600">Mark Attendance for Recent Event</span>
                  </button>
                  <button className="flex items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-indigo-300 hover:bg-indigo-50 transition-colors">
                    <CalendarDaysIcon className="h-6 w-6 text-gray-400 mr-2" />
                    <span className="text-gray-600">Generate Attendance Report</span>
                  </button>
                </div>
              </div>

              {/* Attendance Reports */}
              <div className="bg-white rounded-lg border">
                <div className="p-6 border-b">
                  <h2 className="text-xl font-semibold text-gray-900">Attendance Analytics</h2>
                </div>
                <div className="p-6">
                  <div className="text-center py-8 text-gray-500">
                    <CalendarDaysIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">Attendance Reports</h3>
                    <p>Select a promotion to view detailed attendance reports and analytics.</p>
                    <button className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors">
                      Select Promotion
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {user?.role === 'student' && (
            <div className="bg-white rounded-lg border">
              <StudentAttendance showSummary={true} />
            </div>
          )}

          {/* Fallback for other roles */}
          {user?.role && !['admin', 'teacher', 'student'].includes(user.role) && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
              <ExclamationTriangleIcon className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
              <h2 className="text-lg font-semibold text-yellow-800 mb-2">Access Not Available</h2>
              <p className="text-yellow-700">
                Attendance management is not available for your role: {user.role}
              </p>
            </div>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
