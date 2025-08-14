// packages/frontend/src/components/validation/StudentEvaluationModal.tsx
// Modal component for evaluating individual students

'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { promotionApi } from '@/lib/api/promotions';

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
}

interface EvaluationResult {
  studentId: string;
  currentSemester: number;
  canProgress: boolean;
  criteria: {
    gradeCheck: {
      passed: boolean;
      required: number;
      actual: number;
      difference: number;
    };
    attendanceCheck: {
      passed: boolean;
      required: number;
      actual: number;
      difference: number;
    };
    completionCheck: {
      passed: boolean;
      required: number;
      actual: number;
      difference: number;
    };
  };
  overallScore: number;
  recommendation: 'approve' | 'conditional' | 'reject' | 'retake';
  reason: string;
  suggestedActions?: string[];
}

interface ValidationCriteria {
  minGrade: number;
  minAttendance: number;
  coursesRequired: number;
}

interface StudentEvaluationModalProps {
  student: ValidationStudent;
  isOpen: boolean;
  onClose: () => void;
  onValidated: () => void;
}

export function StudentEvaluationModal({ student, isOpen, onClose, onValidated }: StudentEvaluationModalProps) {
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customCriteria, setCustomCriteria] = useState<ValidationCriteria>({
    minGrade: 60,
    minAttendance: 70,
    coursesRequired: 1,
  });
  const [validationDecision, setValidationDecision] = useState<'approve' | 'reject' | 'conditional'>('approve');
  const [validationReason, setValidationReason] = useState('');
  const [validationNotes, setValidationNotes] = useState('');

  useEffect(() => {
    if (isOpen && student) {
      evaluateStudent();
    }
  }, [isOpen, student]);

  const evaluateStudent = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await promotionApi.evaluateStudent(student.studentId._id, customCriteria);
      if (response.success) {
        setEvaluation(response.data);
        setValidationDecision(response.data.recommendation === 'retake' ? 'reject' : response.data.recommendation);
        setValidationReason(response.data.reason);
      } else {
        setError(response.error || 'Failed to evaluate student');
      }
    } catch (err: any) {
      setError('Failed to evaluate student');
    } finally {
      setLoading(false);
    }
  };

  const handleReEvaluate = async () => {
    await evaluateStudent();
  };

  const handleValidation = async () => {
    if (!evaluation) return;
    
    setSubmitting(true);
    setError(null);
    
    try {
      const response = await promotionApi.performBulkValidation({
        studentIds: [student.studentId._id], // Use the actual student ID, not the progress document ID
        decision: validationDecision,
        reason: validationReason,
        notes: validationNotes,
        customCriteria,
      });
      
      if (response.success) {
        onValidated();
        onClose();
      } else {
        setError(response.error || 'Failed to validate student');
      }
    } catch (err: any) {
      setError('Failed to validate student');
    } finally {
      setSubmitting(false);
    }
  };

  const getCriteriaColor = (passed: boolean) => {
    return passed ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
  };

  const getRecommendationColor = (recommendation: string) => {
    switch (recommendation) {
      case 'approve':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300';
      case 'conditional':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300';
      case 'reject':
      case 'retake':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay flex items-center justify-center z-50" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-2xl font-bold text-secondary-900 dark:text-secondary-100">
              Student Validation
            </h2>
            <p className="text-secondary-600 dark:text-secondary-400 mt-1">
              {student.studentId.profile.firstName} {student.studentId.profile.lastName} • Semester {student.currentSemester}
            </p>
          </div>
          <Button onClick={onClose} variant="ghost" size="sm">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </Button>
        </div>

        {/* Student Info */}
        <div className="card mb-6">
          <div className="p-4">
            <h3 className="text-lg font-semibold text-secondary-900 dark:text-secondary-100 mb-3">
              Student Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="text-sm font-medium text-secondary-500 dark:text-secondary-400">Name</div>
                <div className="text-secondary-900 dark:text-secondary-100">
                  {student.studentId.profile.firstName} {student.studentId.profile.lastName}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-secondary-500 dark:text-secondary-400">Email</div>
                <div className="text-secondary-900 dark:text-secondary-100">{student.studentId.email}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-secondary-500 dark:text-secondary-400">Student ID</div>
                <div className="text-secondary-900 dark:text-secondary-100">
                  {student.studentId.profile.studentId || 'N/A'}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-secondary-500 dark:text-secondary-400">Current Semester</div>
                <div className="text-secondary-900 dark:text-secondary-100">S{student.currentSemester}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-secondary-500 dark:text-secondary-400">Intake</div>
                <div className="text-secondary-900 dark:text-secondary-100">
                  {student.promotionId.intake.charAt(0).toUpperCase() + student.promotionId.intake.slice(1)}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-secondary-500 dark:text-secondary-400">Current Performance</div>
                <div className="text-secondary-900 dark:text-secondary-100">
                  Grade: {student.averageGrade ? `${student.averageGrade}%` : 'N/A'} • 
                  Attendance: {student.attendanceRate}%
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Validation Criteria */}
        <div className="card mb-6">
          <div className="p-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-semibold text-secondary-900 dark:text-secondary-100">
                Validation Criteria
              </h3>
              <Button onClick={handleReEvaluate} variant="secondary" size="sm" disabled={loading}>
                Re-evaluate
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                  Minimum Grade (%)
                </label>
                <input
                  type="number"
                  value={customCriteria.minGrade}
                  onChange={(e) => setCustomCriteria(prev => ({ ...prev, minGrade: parseInt(e.target.value) || 0 }))}
                  className="input"
                  min="0"
                  max="100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                  Minimum Attendance (%)
                </label>
                <input
                  type="number"
                  value={customCriteria.minAttendance}
                  onChange={(e) => setCustomCriteria(prev => ({ ...prev, minAttendance: parseInt(e.target.value) || 0 }))}
                  className="input"
                  min="0"
                  max="100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                  Courses Required
                </label>
                <input
                  type="number"
                  value={customCriteria.coursesRequired}
                  onChange={(e) => setCustomCriteria(prev => ({ ...prev, coursesRequired: parseInt(e.target.value) || 0 }))}
                  className="input"
                  min="0"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Evaluation Results */}
        {loading ? (
          <div className="card">
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 dark:border-primary-400 mx-auto mb-4"></div>
              <p className="text-secondary-600 dark:text-secondary-400">Evaluating student...</p>
            </div>
          </div>
        ) : evaluation ? (
          <div className="space-y-6">
            {/* Overall Result */}
            <div className="card">
              <div className="p-4">
                <h3 className="text-lg font-semibold text-secondary-900 dark:text-secondary-100 mb-3">
                  Evaluation Result
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <div className="text-sm font-medium text-secondary-500 dark:text-secondary-400">Overall Score</div>
                    <div className="text-2xl font-bold text-secondary-900 dark:text-secondary-100">
                      {evaluation.overallScore}/100
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-secondary-500 dark:text-secondary-400">Can Progress</div>
                    <div className={`text-lg font-semibold ${evaluation.canProgress ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {evaluation.canProgress ? 'Yes' : 'No'}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-secondary-500 dark:text-secondary-400">Recommendation</div>
                    <span className={`inline-flex px-2 py-1 text-sm font-semibold rounded-full ${getRecommendationColor(evaluation.recommendation)}`}>
                      {evaluation.recommendation.charAt(0).toUpperCase() + evaluation.recommendation.slice(1)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Detailed Criteria */}
            <div className="card">
              <div className="p-4">
                <h3 className="text-lg font-semibold text-secondary-900 dark:text-secondary-100 mb-3">
                  Criteria Breakdown
                </h3>
                <div className="space-y-4">
                  {/* Grade Check */}
                  <div className="flex items-center justify-between p-3 bg-secondary-50 dark:bg-secondary-700 rounded-lg">
                    <div className="flex items-center">
                      <div className={`w-3 h-3 rounded-full mr-3 ${evaluation.criteria.gradeCheck.passed ? 'bg-green-500' : 'bg-red-500'}`}></div>
                      <div>
                        <div className="font-medium text-secondary-900 dark:text-secondary-100">Grade Requirement</div>
                        <div className="text-sm text-secondary-600 dark:text-secondary-400">
                          Required: {evaluation.criteria.gradeCheck.required}% • 
                          Actual: {evaluation.criteria.gradeCheck.actual}%
                        </div>
                      </div>
                    </div>
                    <div className={`text-sm font-medium ${getCriteriaColor(evaluation.criteria.gradeCheck.passed)}`}>
                      {evaluation.criteria.gradeCheck.passed ? 'PASS' : 'FAIL'}
                      <div className="text-xs">
                        ({evaluation.criteria.gradeCheck.difference > 0 ? '+' : ''}{evaluation.criteria.gradeCheck.difference}%)
                      </div>
                    </div>
                  </div>

                  {/* Attendance Check */}
                  <div className="flex items-center justify-between p-3 bg-secondary-50 dark:bg-secondary-700 rounded-lg">
                    <div className="flex items-center">
                      <div className={`w-3 h-3 rounded-full mr-3 ${evaluation.criteria.attendanceCheck.passed ? 'bg-green-500' : 'bg-red-500'}`}></div>
                      <div>
                        <div className="font-medium text-secondary-900 dark:text-secondary-100">Attendance Requirement</div>
                        <div className="text-sm text-secondary-600 dark:text-secondary-400">
                          Required: {evaluation.criteria.attendanceCheck.required}% • 
                          Actual: {evaluation.criteria.attendanceCheck.actual}%
                        </div>
                      </div>
                    </div>
                    <div className={`text-sm font-medium ${getCriteriaColor(evaluation.criteria.attendanceCheck.passed)}`}>
                      {evaluation.criteria.attendanceCheck.passed ? 'PASS' : 'FAIL'}
                      <div className="text-xs">
                        ({evaluation.criteria.attendanceCheck.difference > 0 ? '+' : ''}{evaluation.criteria.attendanceCheck.difference}%)
                      </div>
                    </div>
                  </div>

                  {/* Completion Check */}
                  <div className="flex items-center justify-between p-3 bg-secondary-50 dark:bg-secondary-700 rounded-lg">
                    <div className="flex items-center">
                      <div className={`w-3 h-3 rounded-full mr-3 ${evaluation.criteria.completionCheck.passed ? 'bg-green-500' : 'bg-red-500'}`}></div>
                      <div>
                        <div className="font-medium text-secondary-900 dark:text-secondary-100">Course Completion</div>
                        <div className="text-sm text-secondary-600 dark:text-secondary-400">
                          Required: {evaluation.criteria.completionCheck.required} courses • 
                          Actual: {evaluation.criteria.completionCheck.actual} courses
                        </div>
                      </div>
                    </div>
                    <div className={`text-sm font-medium ${getCriteriaColor(evaluation.criteria.completionCheck.passed)}`}>
                      {evaluation.criteria.completionCheck.passed ? 'PASS' : 'FAIL'}
                      <div className="text-xs">
                        ({evaluation.criteria.completionCheck.difference > 0 ? '+' : ''}{evaluation.criteria.completionCheck.difference})
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Validation Decision */}
            <div className="card">
              <div className="p-4">
                <h3 className="text-lg font-semibold text-secondary-900 dark:text-secondary-100 mb-3">
                  Validation Decision
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
                      Decision
                    </label>
                    <div className="flex space-x-4">
                      {(['approve', 'conditional', 'reject'] as const).map((decision) => (
                        <label key={decision} className="flex items-center">
                          <input
                            type="radio"
                            name="validationDecision"
                            value={decision}
                            checked={validationDecision === decision}
                            onChange={(e) => setValidationDecision(e.target.value as any)}
                            className="sr-only"
                          />
                          <div className={`flex items-center px-4 py-2 rounded-lg border-2 cursor-pointer transition-colors ${
                            validationDecision === decision
                              ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                              : 'border-secondary-300 dark:border-secondary-600 hover:border-secondary-400 dark:hover:border-secondary-500'
                          }`}>
                            <span className="capitalize font-medium">{decision}</span>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                      Reason
                    </label>
                    <input
                      type="text"
                      value={validationReason}
                      onChange={(e) => setValidationReason(e.target.value)}
                      className="input"
                      placeholder="Enter validation reason..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                      Additional Notes (Optional)
                    </label>
                    <textarea
                      value={validationNotes}
                      onChange={(e) => setValidationNotes(e.target.value)}
                      className="input"
                      rows={3}
                      placeholder="Add any additional notes or comments..."
                    />
                  </div>

                  {/* Suggested Actions */}
                  {evaluation.suggestedActions && evaluation.suggestedActions.length > 0 && (
                    <div>
                      <div className="text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
                        Suggested Actions
                      </div>
                      <ul className="list-disc list-inside space-y-1 text-sm text-secondary-600 dark:text-secondary-400">
                        {evaluation.suggestedActions.map((action, index) => (
                          <li key={index}>{action}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* System Reason */}
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <div className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-1">
                      System Evaluation
                    </div>
                    <div className="text-sm text-blue-700 dark:text-blue-400">
                      {evaluation.reason}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : error ? (
          <div className="card">
            <div className="p-6 text-center">
              <svg className="w-12 h-12 text-red-400 dark:text-red-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <p className="text-red-700 dark:text-red-300 mb-4">{error}</p>
              <Button onClick={evaluateStudent} variant="secondary">
                Try Again
              </Button>
            </div>
          </div>
        ) : null}

        {/* Actions */}
        <div className="flex justify-end space-x-3 mt-6 pt-6 border-t border-secondary-200 dark:border-secondary-700">
          <Button
            onClick={onClose}
            variant="secondary"
            disabled={submitting}
          >
            Cancel
          </Button>
          {evaluation && (
            <Button
              onClick={handleValidation}
              variant="primary"
              disabled={submitting || !validationReason.trim()}
              loading={submitting}
            >
              {submitting ? 'Validating...' : 'Apply Validation'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}