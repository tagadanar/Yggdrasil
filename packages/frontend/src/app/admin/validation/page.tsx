// packages/frontend/src/app/admin/validation/page.tsx
// Semester validation dashboard - admin and staff only

'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/AuthProvider';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { promotionApi } from '@/lib/api/promotions';
import { Button } from '@/components/ui/Button';
import { StudentEvaluationModal } from '@/components/validation/StudentEvaluationModal';
import { SemesterOverviewChart } from '@/components/visualization/SemesterOverviewChart';
import { ValidationSystemMonitor } from '@/components/monitoring/ValidationSystemMonitor';

interface ValidationStudent {
  _id: string;
  studentId: {
    _id: string;
    email: string;
    profile: {
      firstName: string;
      lastName: string;
      studentId?: string;
    };
  };
  promotionId: {
    _id: string;
    name: string;
    semester: number;
    intake: 'september' | 'march';
  };
  currentSemester: number;
  averageGrade?: number;
  attendanceRate: number;
  validationStatus: string;
  nextValidationDate?: string;
}

interface ValidationInsights {
  overview: {
    totalStudents: number;
    statusBreakdown: {
      [key: string]: {
        count: number;
        avgGrade: number;
        avgAttendance: number;
        avgProgress: number;
      };
    };
  };
  semesterBreakdown: Array<{
    semester: number;
    totalStudents: number;
    pendingValidation: number;
    validated: number;
    failed: number;
    avgGrade: number;
    avgAttendance: number;
    validationRate: number;
  }>;
  generatedAt: string;
}

interface SemesterData {
  semesters: Array<{
    _id: string;
    name: string;
    semester: number;
    intake: 'september' | 'march';
    studentCount: number;
    utilizationRate: number;
  }>;
  statistics: {
    totalStudents: number;
    averageUtilization: number;
  };
}

export default function AdminValidationPage() {
  const { user } = useAuth();
  const [pendingStudents, setPendingStudents] = useState<ValidationStudent[]>([]);
  const [insights, setInsights] = useState<ValidationInsights | null>(null);
  const [semesters, setSemesters] = useState<SemesterData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [showBulkValidation, setShowBulkValidation] = useState(false);
  const [showAdvancedBulkOptions, setShowAdvancedBulkOptions] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'pending' | 'insights' | 'semesters' | 'monitoring'>('pending');
  const [selectedStudentForEvaluation, setSelectedStudentForEvaluation] = useState<ValidationStudent | null>(null);
  const [showEvaluationModal, setShowEvaluationModal] = useState(false);
  const [bulkFilters, setBulkFilters] = useState({
    semester: '',
    intake: '',
    minGrade: '',
    maxGrade: '',
    minAttendance: '',
    maxAttendance: '',
  });
  const [batchProgress, setBatchProgress] = useState<{
    total: number;
    completed: number;
    current?: string;
    errors: string[];
  } | null>(null);

  useEffect(() => {
    loadValidationData();
  }, []);

  // Helper function to get current academic year (matches backend logic)
  const getCurrentAcademicYear = () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    
    // Academic year starts in September
    if (now.getMonth() >= 8) { // September is month 8 (0-indexed)
      return `${currentYear}-${currentYear + 1}`;
    } else {
      return `${currentYear - 1}-${currentYear}`;
    }
  };

  const loadValidationData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const currentAcademicYear = getCurrentAcademicYear();
      console.log('📊 Using academic year for queries:', currentAcademicYear);
      
      const [pendingResponse, insightsResponse, semestersResponse] = await Promise.all([
        promotionApi.getStudentsPendingValidation(),
        promotionApi.getValidationInsights(),
        promotionApi.getSemesters(currentAcademicYear), // Pass academic year
      ]);

      if (pendingResponse.success) {
        setPendingStudents(pendingResponse.data || []);
      } else {
        setError(pendingResponse.error || 'Failed to load pending students');
      }

      if (insightsResponse.success) {
        setInsights(insightsResponse.data);
      }

      if (semestersResponse.success) {
        console.log('📊 Setting semesters data:', semestersResponse.data);
        // Force a new object to trigger re-render
        setSemesters({ ...semestersResponse.data });
      } else {
        console.error('❌ Failed to get semesters:', semestersResponse.error);
      }
    } catch (err: any) {
      setError('Failed to load validation data');
    } finally {
      setLoading(false);
    }
  };

  const handleStudentSelection = (studentId: string, checked: boolean) => {
    const newSelection = new Set(selectedStudents);
    if (checked) {
      newSelection.add(studentId);
    } else {
      newSelection.delete(studentId);
    }
    setSelectedStudents(newSelection);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedStudents(new Set(pendingStudents.map(s => s._id)));
    } else {
      setSelectedStudents(new Set());
    }
  };

  const handleBulkValidation = async (decision: 'approve' | 'reject' | 'conditional', reason?: string) => {
    if (selectedStudents.size === 0) return;

    setIsSubmitting(true);
    try {
      const response = await promotionApi.performBulkValidation({
        studentIds: Array.from(selectedStudents),
        decision,
        reason,
      });

      if (response.success) {
        setShowBulkValidation(false);
        setSelectedStudents(new Set());
        await loadValidationData();
      } else {
        setError(response.error || 'Bulk validation failed');
      }
    } catch (err: any) {
      setError('Failed to perform bulk validation');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAdvancedBulkValidation = async (
    decision: 'approve' | 'reject' | 'conditional',
    criteria: {
      customCriteria?: { minGrade?: number; minAttendance?: number; coursesRequired?: number };
      batchSize?: number;
      reason: string;
    }
  ) => {
    if (selectedStudents.size === 0) return;

    setIsSubmitting(true);
    setBatchProgress({
      total: selectedStudents.size,
      completed: 0,
      current: undefined,
      errors: [],
    });

    try {
      const studentIds = Array.from(selectedStudents);
      const batchSize = criteria.batchSize || 10;
      const batches = [];
      
      for (let i = 0; i < studentIds.length; i += batchSize) {
        batches.push(studentIds.slice(i, i + batchSize));
      }

      let completed = 0;
      const errors: string[] = [];

      for (const batch of batches) {
        try {
          const response = await promotionApi.performBulkValidation({
            studentIds: batch,
            decision,
            reason: criteria.reason,
            customCriteria: criteria.customCriteria,
          });

          if (response.success) {
            completed += batch.length;
          } else {
            errors.push(`Batch failed: ${response.error}`);
          }
        } catch (err: any) {
          errors.push(`Batch error: ${err.message}`);
        }

        setBatchProgress(prev => prev ? {
          ...prev,
          completed,
          errors,
        } : null);

        // Small delay between batches to prevent overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      if (errors.length === 0) {
        setShowBulkValidation(false);
        setShowAdvancedBulkOptions(false);
        setSelectedStudents(new Set());
        await loadValidationData();
      } else {
        setError(`Bulk validation completed with ${errors.length} errors`);
      }
    } catch (err: any) {
      setError('Failed to perform advanced bulk validation');
    } finally {
      setIsSubmitting(false);
      setBatchProgress(null);
    }
  };

  const applyFiltersToStudents = (students: ValidationStudent[]) => {
    return students.filter(student => {
      if (bulkFilters.semester && student.currentSemester.toString() !== bulkFilters.semester) {
        return false;
      }
      if (bulkFilters.intake && student.promotionId.intake !== bulkFilters.intake) {
        return false;
      }
      if (bulkFilters.minGrade && (!student.averageGrade || student.averageGrade < parseInt(bulkFilters.minGrade))) {
        return false;
      }
      if (bulkFilters.maxGrade && (!student.averageGrade || student.averageGrade > parseInt(bulkFilters.maxGrade))) {
        return false;
      }
      if (bulkFilters.minAttendance && student.attendanceRate < parseInt(bulkFilters.minAttendance)) {
        return false;
      }
      if (bulkFilters.maxAttendance && student.attendanceRate > parseInt(bulkFilters.maxAttendance)) {
        return false;
      }
      return true;
    });
  };

  const selectFilteredStudents = () => {
    const filtered = applyFiltersToStudents(pendingStudents);
    setSelectedStudents(new Set(filtered.map(s => s._id)));
  };

  const exportValidationReport = async () => {
    try {
      const reportData = {
        timestamp: new Date().toISOString(),
        selectedStudents: Array.from(selectedStudents).map(id => {
          const student = pendingStudents.find(s => s._id === id);
          return student ? {
            id: student._id,
            name: `${student.studentId.profile.firstName} ${student.studentId.profile.lastName}`,
            email: student.studentId.email,
            semester: student.currentSemester,
            intake: student.promotionId.intake,
            grade: student.averageGrade,
            attendance: student.attendanceRate,
            status: student.validationStatus,
          } : null;
        }).filter(Boolean),
        filters: bulkFilters,
      };

      const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `validation-report-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setError('Failed to export validation report');
    }
  };

  const initializeSemesters = async () => {
    setIsSubmitting(true);
    setError(''); // Clear any previous errors
    try {
      const currentAcademicYear = getCurrentAcademicYear();
      console.log('🚀 Starting semester initialization for academic year:', currentAcademicYear);
      const response = await promotionApi.initializeSemesters(currentAcademicYear);
      console.log('📊 Initialization response:', response);
      
      if (response.success) {
        console.log('✅ Initialization successful, refreshing data...');
        // Reload all data including semesters - this will call getSemesters() internally
        await loadValidationData();
        console.log('✅ All validation data reloaded after initialization');
      } else {
        console.error('❌ Initialization failed:', response.error);
        setError(response.error || 'Failed to initialize semesters');
      }
    } catch (err: any) {
      console.error('💥 Exception during initialization:', err);
      setError(`Failed to initialize semesters: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const processProgressions = async () => {
    setIsSubmitting(true);
    try {
      const response = await promotionApi.processStudentProgressions();
      if (response.success) {
        await loadValidationData();
      } else {
        setError(response.error || 'Failed to process progressions');
      }
    } catch (err: any) {
      setError('Failed to process progressions');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEvaluateStudent = (student: ValidationStudent) => {
    setSelectedStudentForEvaluation(student);
    setShowEvaluationModal(true);
  };

  const handleEvaluationModalClose = () => {
    setShowEvaluationModal(false);
    setSelectedStudentForEvaluation(null);
  };

  const handleStudentValidated = () => {
    loadValidationData(); // Reload data after validation
  };

  const getValidationStatusColor = (status: string) => {
    switch (status) {
      case 'pending_validation':
        return 'bg-yellow-100 text-yellow-800';
      case 'validated':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'conditional':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
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

  return (
    <ProtectedRoute allowedRoles={['admin', 'staff']}>
      <DashboardLayout>
        <div className="max-w-7xl mx-auto" data-testid="validation-page">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-secondary-900 dark:text-secondary-100 mb-2">
              Semester Validation Dashboard
            </h1>
            <p className="text-secondary-600 dark:text-secondary-400">
              Manage student semester validations and progression through the S1-S10 system
            </p>
          </div>

          {/* Quick Actions */}
          <div className="mb-6 flex flex-wrap gap-3">
            <Button
              onClick={initializeSemesters}
              variant="primary"
              disabled={isSubmitting}
              loading={isSubmitting}
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                </svg>
              }
            >
              Initialize Semesters
            </Button>
            
            <Button
              onClick={processProgressions}
              variant="secondary"
              disabled={isSubmitting}
              loading={isSubmitting}
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              }
            >
              Process Progressions
            </Button>

            {selectedStudents.size > 0 && (
              <>
                <Button
                  onClick={() => setShowBulkValidation(true)}
                  variant="primary"
                  icon={
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  }
                >
                  Validate {selectedStudents.size} Student{selectedStudents.size !== 1 ? 's' : ''}
                </Button>
                
                <Button
                  onClick={() => setShowAdvancedBulkOptions(true)}
                  variant="secondary"
                  icon={
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                    </svg>
                  }
                >
                  Advanced Options
                </Button>
                
                <Button
                  onClick={exportValidationReport}
                  variant="ghost"
                  icon={
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  }
                >
                  Export Report
                </Button>
              </>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-xl">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-rose-400 dark:text-rose-300 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <span className="text-rose-700 dark:text-rose-300">{error}</span>
              </div>
              <Button
                onClick={loadValidationData}
                variant="ghost"
                size="sm"
                className="mt-2 text-rose-600 dark:text-rose-300 hover:text-rose-800 dark:hover:text-rose-100"
              >
                Retry
              </Button>
            </div>
          )}

          {/* Tab Navigation */}
          <div className="mb-6" data-testid="nav-validation">
            <nav className="flex space-x-8" aria-label="Tabs">
              {[
                { id: 'pending' as const, name: 'Pending Validations', count: pendingStudents.length },
                { id: 'insights' as const, name: 'Insights & Analytics' },
                { id: 'semesters' as const, name: 'Semester Overview' },
                { id: 'monitoring' as const, name: 'System Monitoring' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                      : 'border-transparent text-secondary-500 hover:text-secondary-700 hover:border-secondary-300 dark:text-secondary-400 dark:hover:text-secondary-300'
                  }`}
                >
                  {tab.name}
                  {tab.count !== undefined && (
                    <span className={`ml-2 py-0.5 px-2 rounded-full text-xs ${
                      activeTab === tab.id
                        ? 'bg-primary-100 text-primary-600 dark:bg-primary-800 dark:text-primary-400'
                        : 'bg-secondary-100 text-secondary-600 dark:bg-secondary-700 dark:text-secondary-400'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 dark:border-primary-400 mx-auto mb-4"></div>
              <p className="text-secondary-600 dark:text-secondary-400">Loading validation data...</p>
            </div>
          ) : (
            <>
              {/* Pending Validations Tab */}
              {activeTab === 'pending' && (
                <div className="space-y-6">
                  {/* Advanced Filters */}
                  <div className="card">
                    <div className="px-6 py-4 border-b border-secondary-200 dark:border-secondary-700">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-medium text-secondary-900 dark:text-secondary-100">
                          Advanced Filters
                        </h3>
                        <div className="flex items-center space-x-2">
                          <Button
                            onClick={selectFilteredStudents}
                            variant="ghost"
                            size="sm"
                            disabled={applyFiltersToStudents(pendingStudents).length === 0}
                          >
                            Select Filtered ({applyFiltersToStudents(pendingStudents).length})
                          </Button>
                          <Button
                            onClick={() => setBulkFilters({
                              semester: '',
                              intake: '',
                              minGrade: '',
                              maxGrade: '',
                              minAttendance: '',
                              maxAttendance: '',
                            })}
                            variant="ghost"
                            size="sm"
                          >
                            Clear Filters
                          </Button>
                        </div>
                      </div>
                    </div>
                    <div className="p-6">
                      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                            Semester
                          </label>
                          <select
                            value={bulkFilters.semester}
                            onChange={(e) => setBulkFilters({...bulkFilters, semester: e.target.value})}
                            className="w-full rounded-lg border-secondary-300 dark:border-secondary-600 dark:bg-secondary-700 text-sm"
                          >
                            <option value="">All</option>
                            {Array.from({length: 10}, (_, i) => i + 1).map(sem => (
                              <option key={sem} value={sem.toString()}>S{sem}</option>
                            ))}
                          </select>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                            Intake
                          </label>
                          <select
                            value={bulkFilters.intake}
                            onChange={(e) => setBulkFilters({...bulkFilters, intake: e.target.value})}
                            className="w-full rounded-lg border-secondary-300 dark:border-secondary-600 dark:bg-secondary-700 text-sm"
                          >
                            <option value="">All</option>
                            <option value="september">September</option>
                            <option value="march">March</option>
                          </select>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                            Min Grade %
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={bulkFilters.minGrade}
                            onChange={(e) => setBulkFilters({...bulkFilters, minGrade: e.target.value})}
                            className="w-full rounded-lg border-secondary-300 dark:border-secondary-600 dark:bg-secondary-700 text-sm"
                            placeholder="0"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                            Max Grade %
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={bulkFilters.maxGrade}
                            onChange={(e) => setBulkFilters({...bulkFilters, maxGrade: e.target.value})}
                            className="w-full rounded-lg border-secondary-300 dark:border-secondary-600 dark:bg-secondary-700 text-sm"
                            placeholder="100"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                            Min Attendance %
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={bulkFilters.minAttendance}
                            onChange={(e) => setBulkFilters({...bulkFilters, minAttendance: e.target.value})}
                            className="w-full rounded-lg border-secondary-300 dark:border-secondary-600 dark:bg-secondary-700 text-sm"
                            placeholder="0"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                            Max Attendance %
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={bulkFilters.maxAttendance}
                            onChange={(e) => setBulkFilters({...bulkFilters, maxAttendance: e.target.value})}
                            className="w-full rounded-lg border-secondary-300 dark:border-secondary-600 dark:bg-secondary-700 text-sm"
                            placeholder="100"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Students Table */}
                  <div className="card overflow-hidden">
                    {pendingStudents.length === 0 ? (
                    <div className="p-8 text-center">
                      <svg className="w-12 h-12 text-secondary-300 dark:text-secondary-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-secondary-500 dark:text-secondary-400 mb-2">No students pending validation</p>
                      <p className="text-sm text-secondary-400 dark:text-secondary-500">All students are up to date with their validations</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-secondary-200 dark:divide-secondary-700">
                        <thead className="bg-secondary-50 dark:bg-secondary-800">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider">
                              <input
                                type="checkbox"
                                checked={selectedStudents.size === pendingStudents.length && pendingStudents.length > 0}
                                onChange={(e) => handleSelectAll(e.target.checked)}
                                className="rounded border-secondary-300 text-primary-600 focus:ring-primary-500"
                              />
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider">
                              Student
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider">
                              Current Semester
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider">
                              Performance
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider">
                              Status
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider">
                              Next Review
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-secondary-800 divide-y divide-secondary-200 dark:divide-secondary-700">
                          {applyFiltersToStudents(pendingStudents).map((student) => (
                            <tr key={student._id} className="hover:bg-secondary-50 dark:hover:bg-secondary-700 transition-colors duration-200">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <input
                                  type="checkbox"
                                  checked={selectedStudents.has(student._id)}
                                  onChange={(e) => handleStudentSelection(student._id, e.target.checked)}
                                  className="rounded border-secondary-300 text-primary-600 focus:ring-primary-500"
                                />
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <div className="flex-shrink-0 h-10 w-10">
                                    <div className="h-10 w-10 rounded-full bg-primary-100 dark:bg-primary-800 flex items-center justify-center">
                                      <span className="text-sm font-medium text-primary-700 dark:text-primary-300">
                                        {student.studentId.profile.firstName.charAt(0)}{student.studentId.profile.lastName.charAt(0)}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="ml-4">
                                    <div className="text-sm font-medium text-secondary-900 dark:text-secondary-100">
                                      {student.studentId.profile.firstName} {student.studentId.profile.lastName}
                                    </div>
                                    <div className="text-sm text-secondary-500 dark:text-secondary-400">
                                      {student.studentId.email}
                                    </div>
                                    {student.studentId.profile.studentId && (
                                      <div className="text-xs text-secondary-400 dark:text-secondary-500">
                                        ID: {student.studentId.profile.studentId}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-secondary-900 dark:text-secondary-100">
                                  Semester {student.currentSemester}
                                </div>
                                <div className="text-sm text-secondary-500 dark:text-secondary-400">
                                  {student.promotionId.intake.charAt(0).toUpperCase() + student.promotionId.intake.slice(1)} intake
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-secondary-900 dark:text-secondary-100">
                                  Grade: {student.averageGrade ? `${student.averageGrade}%` : 'N/A'}
                                </div>
                                <div className="text-sm text-secondary-500 dark:text-secondary-400">
                                  Attendance: {student.attendanceRate}%
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getValidationStatusColor(student.validationStatus)}`}>
                                  {student.validationStatus.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500 dark:text-secondary-400">
                                {formatDate(student.nextValidationDate)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <Button
                                  onClick={() => handleEvaluateStudent(student)}
                                  variant="ghost"
                                  size="sm"
                                  className="text-primary-600 dark:text-primary-400 hover:text-primary-900 dark:hover:text-primary-300"
                                >
                                  Evaluate
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    )}
                  </div>
                </div>
              )}

              {/* Insights Tab */}
              {activeTab === 'insights' && insights && (
                <div className="space-y-6">
                  {/* Overview Stats */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="card">
                      <div className="p-6">
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            <svg className="h-8 w-8 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                            </svg>
                          </div>
                          <div className="ml-5 w-0 flex-1">
                            <dl>
                              <dt className="text-sm font-medium text-secondary-500 dark:text-secondary-400 truncate">
                                Total Students
                              </dt>
                              <dd className="text-lg font-medium text-secondary-900 dark:text-secondary-100">
                                {insights.overview.totalStudents}
                              </dd>
                            </dl>
                          </div>
                        </div>
                      </div>
                    </div>

                    {Object.entries(insights.overview.statusBreakdown).map(([status, data]) => (
                      <div key={status} className="card">
                        <div className="p-6">
                          <div className="flex items-center">
                            <div className="flex-shrink-0">
                              <div className={`h-8 w-8 rounded-full flex items-center justify-center ${getValidationStatusColor(status)}`}>
                                <span className="text-sm font-medium">
                                  {data.count}
                                </span>
                              </div>
                            </div>
                            <div className="ml-5 w-0 flex-1">
                              <dl>
                                <dt className="text-sm font-medium text-secondary-500 dark:text-secondary-400 truncate">
                                  {status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                </dt>
                                <dd className="text-sm text-secondary-600 dark:text-secondary-400">
                                  Avg: {data.avgGrade}% grade, {data.avgAttendance}% attend.
                                </dd>
                              </dl>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Semester Breakdown */}
                  <div className="card overflow-hidden">
                    <div className="px-6 py-4 border-b border-secondary-200 dark:border-secondary-700">
                      <h3 className="text-lg font-medium text-secondary-900 dark:text-secondary-100">
                        Semester Breakdown
                      </h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-secondary-200 dark:divide-secondary-700">
                        <thead className="bg-secondary-50 dark:bg-secondary-800">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider">
                              Semester
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider">
                              Students
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider">
                              Pending
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider">
                              Validated
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider">
                              Failed
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider">
                              Validation Rate
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider">
                              Performance
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-secondary-800 divide-y divide-secondary-200 dark:divide-secondary-700">
                          {insights.semesterBreakdown.map((semester) => (
                            <tr key={semester.semester}>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                                  S{semester.semester}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-900 dark:text-secondary-100">
                                {semester.totalStudents}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-yellow-600 dark:text-yellow-400">
                                {semester.pendingValidation}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 dark:text-green-400">
                                {semester.validated}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 dark:text-red-400">
                                {semester.failed}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-900 dark:text-secondary-100">
                                {semester.validationRate}%
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-600 dark:text-secondary-400">
                                {semester.avgGrade}% / {semester.avgAttendance}%
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Semesters Tab */}
              {activeTab === 'semesters' && (() => {
                // Debug: Log state values
                console.log('🔍 JSX render - semesters:', semesters, 'hasData:', !!(semesters && semesters.semesters.length > 0));
                return (
                <div className="space-y-6">
                  {semesters && semesters.semesters.length > 0 ? (
                    <SemesterOverviewChart 
                      semesters={semesters.semesters} 
                      statistics={semesters.statistics} 
                    />
                  ) : (
                    <div className="card">
                      <div className="px-6 py-4 border-b border-secondary-200 dark:border-secondary-700">
                        <h3 className="text-lg font-semibold text-secondary-900 dark:text-secondary-100">
                          Student Distribution Across Semesters
                        </h3>
                        <p className="text-sm text-secondary-600 dark:text-secondary-400 mt-1">
                          Initialize the semester system to view student distribution
                        </p>
                      </div>
                      <div className="p-12 text-center">
                        <svg className="w-16 h-16 text-secondary-300 dark:text-secondary-600 mx-auto mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                        </svg>
                        <h3 className="text-xl font-semibold text-secondary-900 dark:text-secondary-100 mb-3">
                          No Semesters Initialized
                        </h3>
                        <p className="text-secondary-600 dark:text-secondary-400 mb-6 max-w-md mx-auto">
                          Click the "Initialize Semesters" button to set up the S1-S10 semester system and begin tracking student validations.
                        </p>
                        <div className="grid grid-cols-5 gap-3 max-w-lg mx-auto mb-8">
                          {Array.from({ length: 10 }, (_, i) => i + 1).map((semesterNum) => (
                            <div
                              key={semesterNum}
                              className="aspect-square rounded-lg border-2 border-dashed border-secondary-300 dark:border-secondary-600 flex items-center justify-center"
                            >
                              <span className="text-sm font-semibold text-secondary-400 dark:text-secondary-500">
                                S{semesterNum}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                );
              })()}

              {/* Monitoring Tab */}
              {activeTab === 'monitoring' && (
                <ValidationSystemMonitor 
                  autoRefresh={true}
                  refreshInterval={30000}
                />
              )}
            </>
          )}

          {/* Bulk Validation Modal */}
          {showBulkValidation && (
            <div className="modal-overlay flex items-center justify-center z-50" onClick={(e) => e.target === e.currentTarget && setShowBulkValidation(false)}>
              <div className="modal-content p-6 w-full max-w-md">
                <h2 className="text-xl font-bold text-secondary-900 dark:text-secondary-100 mb-4">
                  Bulk Validation
                </h2>
                <p className="text-secondary-600 dark:text-secondary-400 mb-6">
                  Validate {selectedStudents.size} student{selectedStudents.size !== 1 ? 's' : ''}. Choose an action:
                </p>
                
                <div className="space-y-3">
                  <Button
                    onClick={() => handleBulkValidation('approve', 'Bulk approved by admin/staff')}
                    variant="primary"
                    disabled={isSubmitting}
                    loading={isSubmitting}
                    className="w-full justify-center"
                  >
                    ✅ Approve All
                  </Button>
                  
                  <Button
                    onClick={() => handleBulkValidation('conditional', 'Conditional approval - requires monitoring')}
                    variant="secondary"
                    disabled={isSubmitting}
                    className="w-full justify-center"
                  >
                    ⚠️ Conditional Approval
                  </Button>
                  
                  <Button
                    onClick={() => handleBulkValidation('reject', 'Bulk rejected - requires improvement')}
                    variant="danger"
                    disabled={isSubmitting}
                    className="w-full justify-center"
                  >
                    ❌ Reject All
                  </Button>
                </div>

                <div className="flex justify-end mt-6">
                  <Button
                    onClick={() => setShowBulkValidation(false)}
                    variant="ghost"
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Advanced Bulk Validation Modal */}
          {showAdvancedBulkOptions && (
            <div className="modal-overlay flex items-center justify-center z-50" onClick={(e) => e.target === e.currentTarget && setShowAdvancedBulkOptions(false)}>
              <div className="modal-content p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <h2 className="text-xl font-bold text-secondary-900 dark:text-secondary-100 mb-4">
                  Advanced Bulk Validation
                </h2>
                <p className="text-secondary-600 dark:text-secondary-400 mb-6">
                  Configure advanced validation criteria for {selectedStudents.size} selected student{selectedStudents.size !== 1 ? 's' : ''}
                </p>
                
                {batchProgress && (
                  <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                        Processing Batch Validation
                      </span>
                      <span className="text-sm text-blue-600 dark:text-blue-400">
                        {batchProgress.completed} / {batchProgress.total}
                      </span>
                    </div>
                    <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2">
                      <div 
                        className="bg-blue-600 dark:bg-blue-400 h-2 rounded-full transition-all duration-300" 
                        style={{ width: `${(batchProgress.completed / batchProgress.total) * 100}%` }}
                      ></div>
                    </div>
                    {batchProgress.errors.length > 0 && (
                      <div className="mt-2 text-sm text-red-600 dark:text-red-400">
                        {batchProgress.errors.length} errors occurred
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-6">
                  {/* Custom Validation Criteria */}
                  <div>
                    <h3 className="text-lg font-semibold text-secondary-900 dark:text-secondary-100 mb-3">
                      Custom Validation Criteria
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-secondary-50 dark:bg-secondary-800 rounded-lg">
                      <div>
                        <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                          Min Grade (%)
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          className="w-full rounded border-secondary-300 dark:border-secondary-600 dark:bg-secondary-700 text-sm"
                          placeholder="Default: System setting"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                          Min Attendance (%)
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          className="w-full rounded border-secondary-300 dark:border-secondary-600 dark:bg-secondary-700 text-sm"
                          placeholder="Default: System setting"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                          Courses Required
                        </label>
                        <input
                          type="number"
                          min="0"
                          className="w-full rounded border-secondary-300 dark:border-secondary-600 dark:bg-secondary-700 text-sm"
                          placeholder="Default: System setting"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Batch Processing Options */}
                  <div>
                    <h3 className="text-lg font-semibold text-secondary-900 dark:text-secondary-100 mb-3">
                      Batch Processing
                    </h3>
                    <div className="p-4 bg-secondary-50 dark:bg-secondary-800 rounded-lg">
                      <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                        Batch Size (students per request)
                      </label>
                      <select className="w-full rounded border-secondary-300 dark:border-secondary-600 dark:bg-secondary-700 text-sm">
                        <option value="5">5 students</option>
                        <option value="10" selected>10 students</option>
                        <option value="20">20 students</option>
                        <option value="50">50 students</option>
                      </select>
                      <p className="text-xs text-secondary-500 dark:text-secondary-400 mt-1">
                        Smaller batches are more reliable but slower
                      </p>
                    </div>
                  </div>

                  {/* Validation Decision */}
                  <div>
                    <h3 className="text-lg font-semibold text-secondary-900 dark:text-secondary-100 mb-3">
                      Validation Decision
                    </h3>
                    <div className="space-y-3">
                      <Button
                        onClick={() => handleAdvancedBulkValidation('approve', {
                          reason: 'Advanced bulk approval with custom criteria',
                          batchSize: 10
                        })}
                        variant="primary"
                        disabled={isSubmitting}
                        loading={isSubmitting}
                        className="w-full justify-center"
                      >
                        ✅ Advanced Approve All
                      </Button>
                      
                      <Button
                        onClick={() => handleAdvancedBulkValidation('conditional', {
                          reason: 'Advanced conditional approval - requires monitoring',
                          batchSize: 10
                        })}
                        variant="secondary"
                        disabled={isSubmitting}
                        className="w-full justify-center"
                      >
                        ⚠️ Advanced Conditional Approval
                      </Button>
                      
                      <Button
                        onClick={() => handleAdvancedBulkValidation('reject', {
                          reason: 'Advanced bulk rejection - requires improvement',
                          batchSize: 10
                        })}
                        variant="danger"
                        disabled={isSubmitting}
                        className="w-full justify-center"
                      >
                        ❌ Advanced Reject All
                      </Button>
                    </div>
                  </div>

                  {/* Validation Report */}
                  <div>
                    <h3 className="text-lg font-semibold text-secondary-900 dark:text-secondary-100 mb-3">
                      Documentation
                    </h3>
                    <textarea
                      rows={3}
                      className="w-full rounded border-secondary-300 dark:border-secondary-600 dark:bg-secondary-700 text-sm"
                      placeholder="Add detailed reason for this bulk validation decision..."
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <Button
                    onClick={() => setShowAdvancedBulkOptions(false)}
                    variant="ghost"
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Student Evaluation Modal */}
          {selectedStudentForEvaluation && (
            <StudentEvaluationModal
              student={selectedStudentForEvaluation}
              isOpen={showEvaluationModal}
              onClose={handleEvaluationModalClose}
              onValidated={handleStudentValidated}
            />
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}