// packages/frontend/src/components/student/ProgressionTracker.tsx
// Student progression tracking component showing semester path and validation status

'use client';

import React, { useState, useEffect } from 'react';
import { promotionApi } from '@/lib/api/promotions';

interface ValidationHistoryItem {
  date: string;
  status: 'validated' | 'failed' | 'pending_validation' | 'not_required';
  reason?: string;
  validatorId: string;
  semester?: number;
}

interface StudentProgressData {
  currentSemester: number;
  validationStatus: 'pending_validation' | 'validated' | 'failed' | 'not_required';
  averageGrade?: number;
  attendanceRate: number;
  nextValidationDate?: string;
  validationCriteria?: {
    minGrade: number;
    minAttendance: number;
    coursesRequired: number;
  };
  coursesCompleted: number;
  validationHistory?: ValidationHistoryItem[];
  promotion: {
    name: string;
    semester: number;
    intake: 'september' | 'march';
  };
}

interface ProgressionTrackerProps {
  className?: string;
}

export function ProgressionTracker({ className = '' }: ProgressionTrackerProps) {
  const [progressData, setProgressData] = useState<StudentProgressData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProgressData();
  }, []);

  const loadProgressData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await promotionApi.getMyValidationStatus();
      if (response.success && response.data) {
        // The new endpoint provides comprehensive validation data
        const data = response.data;
        setProgressData({
          currentSemester: data.currentSemester || 1,
          validationStatus: data.validationStatus || 'not_required',
          averageGrade: data.averageGrade,
          attendanceRate: data.attendanceRate || 100,
          nextValidationDate: data.nextValidationDate,
          validationCriteria: data.validationCriteria,
          coursesCompleted: data.coursesCompleted || 0,
          validationHistory: data.validationHistory || [],
          promotion: {
            name: data.promotion?.name || 'Unknown Promotion',
            semester: data.promotion?.semester || data.currentSemester || 1,
            intake: data.promotion?.intake || 'september',
          },
        });
      } else {
        setError(response.error || 'Failed to load progression data');
      }
    } catch (err: any) {
      setError('Failed to load progression data');
    } finally {
      setLoading(false);
    }
  };

  const getValidationStatusIcon = (status: string) => {
    switch (status) {
      case 'validated':
        return (
          <div className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        );
      case 'pending_validation':
        return (
          <div className="w-6 h-6 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
            <svg className="w-4 h-4 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
      case 'failed':
        return (
          <div className="w-6 h-6 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <svg className="w-4 h-4 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-900/30 flex items-center justify-center">
            <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
    }
  };

  const getValidationStatusColor = (status: string) => {
    switch (status) {
      case 'validated':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300';
      case 'pending_validation':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300';
      case 'failed':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300';
    }
  };

  const getSemesterColor = (semester: number, isCurrent: boolean, isPast: boolean) => {
    if (isCurrent) {
      return 'bg-blue-500 text-white';
    } else if (isPast) {
      return 'bg-green-500 text-white';
    } else {
      return 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400';
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const calculateRequirementStatus = (actual: number, required: number) => {
    const percentage = required > 0 ? (actual / required) * 100 : 0;
    if (percentage >= 100) return { status: 'complete', color: 'text-green-600 dark:text-green-400' };
    if (percentage >= 80) return { status: 'good', color: 'text-yellow-600 dark:text-yellow-400' };
    return { status: 'needs-improvement', color: 'text-red-600 dark:text-red-400' };
  };

  if (loading) {
    return (
      <div className={`card ${className}`}>
        <div className="p-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 dark:border-primary-400 mx-auto mb-4"></div>
          <p className="text-secondary-600 dark:text-secondary-400">Loading progression data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`card ${className}`}>
        <div className="p-6 text-center">
          <svg className="w-12 h-12 text-red-400 dark:text-red-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <p className="text-red-700 dark:text-red-300 mb-4">{error}</p>
          <button
            onClick={loadProgressData}
            className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!progressData) {
    return (
      <div className={`card ${className}`}>
        <div className="p-6 text-center">
          <p className="text-secondary-600 dark:text-secondary-400">No progression data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Current Status Card */}
      <div className="card">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-secondary-900 dark:text-secondary-100">
              Your Academic Progress
            </h2>
            {getValidationStatusIcon(progressData.validationStatus)}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="text-sm font-medium text-secondary-500 dark:text-secondary-400">Current Semester</div>
              <div className="text-2xl font-bold text-secondary-900 dark:text-secondary-100">
                S{progressData.currentSemester}
              </div>
              <div className="text-sm text-secondary-600 dark:text-secondary-400">
                {progressData.promotion.intake.charAt(0).toUpperCase() + progressData.promotion.intake.slice(1)} intake
              </div>
            </div>
            
            <div>
              <div className="text-sm font-medium text-secondary-500 dark:text-secondary-400">Validation Status</div>
              <span className={`inline-flex px-2 py-1 text-sm font-semibold rounded-full ${getValidationStatusColor(progressData.validationStatus)}`}>
                {progressData.validationStatus.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </span>
              {progressData.nextValidationDate && (
                <div className="text-sm text-secondary-600 dark:text-secondary-400 mt-1">
                  Next review: {formatDate(progressData.nextValidationDate)}
                </div>
              )}
            </div>
            
            <div>
              <div className="text-sm font-medium text-secondary-500 dark:text-secondary-400">Overall Performance</div>
              <div className="text-lg font-semibold text-secondary-900 dark:text-secondary-100">
                Grade: {progressData.averageGrade ? `${progressData.averageGrade}%` : 'N/A'}
              </div>
              <div className="text-sm text-secondary-600 dark:text-secondary-400">
                Attendance: {progressData.attendanceRate}%
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Semester Progression Path */}
      <div className="card">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-secondary-900 dark:text-secondary-100 mb-4">
            Semester Progression Path
          </h3>
          
          {/* Semester Visual Timeline */}
          <div className="flex flex-wrap gap-2 mb-6">
            {Array.from({ length: 10 }, (_, i) => i + 1).map((semester) => {
              const isCurrent = semester === progressData.currentSemester;
              const isPast = semester < progressData.currentSemester;
              
              return (
                <div
                  key={semester}
                  className={`flex items-center justify-center w-12 h-12 rounded-full text-sm font-bold transition-all duration-200 ${getSemesterColor(semester, isCurrent, isPast)}`}
                >
                  S{semester}
                </div>
              );
            })}
          </div>
          
          <div className="flex items-center space-x-4 text-sm">
            <div className="flex items-center">
              <div className="w-4 h-4 bg-green-500 rounded-full mr-2"></div>
              <span className="text-secondary-600 dark:text-secondary-400">Completed</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-blue-500 rounded-full mr-2"></div>
              <span className="text-secondary-600 dark:text-secondary-400">Current</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-gray-200 dark:bg-gray-700 rounded-full mr-2"></div>
              <span className="text-secondary-600 dark:text-secondary-400">Future</span>
            </div>
          </div>
        </div>
      </div>

      {/* Validation Requirements */}
      {progressData.validationCriteria && (
        <div className="card">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-secondary-900 dark:text-secondary-100 mb-4">
              Validation Requirements
            </h3>
            
            <div className="space-y-4">
              {/* Grade Requirement */}
              <div className="flex items-center justify-between p-3 bg-secondary-50 dark:bg-secondary-700 rounded-lg">
                <div className="flex items-center">
                  <div className="mr-3">
                    <svg className="w-5 h-5 text-secondary-600 dark:text-secondary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <div>
                    <div className="font-medium text-secondary-900 dark:text-secondary-100">Minimum Grade</div>
                    <div className="text-sm text-secondary-600 dark:text-secondary-400">
                      Current: {progressData.averageGrade || 0}% • Required: {progressData.validationCriteria.minGrade}%
                    </div>
                  </div>
                </div>
                <div className={`text-sm font-medium ${calculateRequirementStatus(progressData.averageGrade || 0, progressData.validationCriteria.minGrade).color}`}>
                  {(progressData.averageGrade || 0) >= progressData.validationCriteria.minGrade ? '✓' : '✗'}
                </div>
              </div>

              {/* Attendance Requirement */}
              <div className="flex items-center justify-between p-3 bg-secondary-50 dark:bg-secondary-700 rounded-lg">
                <div className="flex items-center">
                  <div className="mr-3">
                    <svg className="w-5 h-5 text-secondary-600 dark:text-secondary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <div className="font-medium text-secondary-900 dark:text-secondary-100">Minimum Attendance</div>
                    <div className="text-sm text-secondary-600 dark:text-secondary-400">
                      Current: {progressData.attendanceRate}% • Required: {progressData.validationCriteria.minAttendance}%
                    </div>
                  </div>
                </div>
                <div className={`text-sm font-medium ${calculateRequirementStatus(progressData.attendanceRate, progressData.validationCriteria.minAttendance).color}`}>
                  {progressData.attendanceRate >= progressData.validationCriteria.minAttendance ? '✓' : '✗'}
                </div>
              </div>

              {/* Course Completion Requirement */}
              <div className="flex items-center justify-between p-3 bg-secondary-50 dark:bg-secondary-700 rounded-lg">
                <div className="flex items-center">
                  <div className="mr-3">
                    <svg className="w-5 h-5 text-secondary-600 dark:text-secondary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                  <div>
                    <div className="font-medium text-secondary-900 dark:text-secondary-100">Course Completion</div>
                    <div className="text-sm text-secondary-600 dark:text-secondary-400">
                      Completed: {progressData.coursesCompleted} • Required: {progressData.validationCriteria.coursesRequired}
                    </div>
                  </div>
                </div>
                <div className={`text-sm font-medium ${calculateRequirementStatus(progressData.coursesCompleted, progressData.validationCriteria.coursesRequired).color}`}>
                  {progressData.coursesCompleted >= progressData.validationCriteria.coursesRequired ? '✓' : '✗'}
                </div>
              </div>
            </div>

            {/* Overall Status Message */}
            <div className="mt-4 p-4 border rounded-lg">
              {progressData.validationStatus === 'validated' && (
                <div className="flex items-center text-green-700 dark:text-green-300">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="font-medium">Congratulations! You have been validated for progression to semester {progressData.currentSemester + 1}.</span>
                </div>
              )}
              
              {progressData.validationStatus === 'pending_validation' && (
                <div className="flex items-center text-yellow-700 dark:text-yellow-300">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="font-medium">Your semester validation is pending review by staff. Please wait for the validation decision.</span>
                </div>
              )}
              
              {progressData.validationStatus === 'failed' && (
                <div className="flex items-center text-red-700 dark:text-red-300">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <span className="font-medium">Your validation was not successful. Please improve your performance and await re-evaluation.</span>
                </div>
              )}
              
              {progressData.validationStatus === 'not_required' && (
                <div className="flex items-center text-blue-700 dark:text-blue-300">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="font-medium">Continue working hard! Validation will be required at the end of this semester.</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Validation History */}
      {progressData.validationHistory && progressData.validationHistory.length > 0 && (
        <div className="card">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-secondary-900 dark:text-secondary-100 mb-4">
              Validation History
            </h3>
            <p className="text-sm text-secondary-600 dark:text-secondary-400 mb-4">
              Your recent semester validation decisions and progress
            </p>
            
            <div className="space-y-3">
              {progressData.validationHistory.map((historyItem, index) => (
                <div
                  key={index}
                  className="flex items-start justify-between p-4 bg-secondary-50 dark:bg-secondary-700 rounded-lg border border-secondary-200 dark:border-secondary-600"
                >
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 mt-1">
                      {getValidationStatusIcon(historyItem.status)}
                    </div>
                    <div className="flex-grow">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getValidationStatusColor(historyItem.status)}`}>
                          {historyItem.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </span>
                        {historyItem.semester && (
                          <span className="text-sm font-medium text-secondary-600 dark:text-secondary-400">
                            → S{historyItem.semester}
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-secondary-900 dark:text-secondary-100 mb-1">
                        {formatDate(historyItem.date)}
                      </div>
                      {historyItem.reason && (
                        <div className="text-sm text-secondary-600 dark:text-secondary-400">
                          {historyItem.reason}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-secondary-500 dark:text-secondary-400">
                    #{index + 1}
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="text-sm">
                  <p className="text-blue-700 dark:text-blue-300 font-medium mb-1">
                    About Validation History
                  </p>
                  <p className="text-blue-600 dark:text-blue-400">
                    This shows your last {progressData.validationHistory.length} validation decisions. 
                    Each entry includes the date, outcome, and reason for the decision.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}