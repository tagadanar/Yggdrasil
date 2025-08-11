// packages/frontend/src/app/courses/[courseId]/grading/page.tsx
// Assignment grading interface with submission management

'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthProvider';
import { courseApi } from '@/lib/api/courses';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import {
  PencilSquareIcon,
  EyeIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  FunnelIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';

interface Submission {
  _id: string;
  studentId: {
    _id: string;
    name: string;
    email: string;
  };
  exerciseId: {
    _id: string;
    title: string;
    type: 'multiple_choice' | 'essay' | 'code' | 'file_upload';
  };
  submittedAt: string;
  content: string;
  files?: string[];
  status: 'pending' | 'graded' | 'returned';
  grade?: number;
  feedback?: string;
  maxScore: number;
}

export default function GradingPage() {
  const { user } = useAuth();
  const params = useParams();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [filteredSubmissions, setFilteredSubmissions] = useState<Submission[]>([]);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);
  const [grading, setGrading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  // Grading form state
  const [score, setScore] = useState('');
  const [feedback, setFeedback] = useState('');

  const courseId = params['courseId'] as string;

  useEffect(() => {
    const loadSubmissions = async () => {
      try {
        setLoading(true);

        // Mock submissions data for testing
        const mockSubmissions: Submission[] = [
          {
            _id: '1',
            studentId: { _id: 's1', name: 'Alice Johnson', email: 'alice@example.com' },
            exerciseId: { _id: 'e1', title: 'Essay on Data Structures', type: 'essay' },
            submittedAt: '2025-01-07T10:30:00Z',
            content: 'Data structures are fundamental components of computer programming...',
            status: 'pending',
            maxScore: 100,
          },
          {
            _id: '2',
            studentId: { _id: 's2', name: 'Bob Smith', email: 'bob@example.com' },
            exerciseId: { _id: 'e2', title: 'Algorithm Implementation', type: 'code' },
            submittedAt: '2025-01-06T14:15:00Z',
            content: 'function quicksort(arr) { /* implementation */ }',
            status: 'graded',
            grade: 85,
            feedback: 'Good implementation, but could be optimized.',
            maxScore: 100,
          },
          {
            _id: '3',
            studentId: { _id: 's3', name: 'Carol Davis', email: 'carol@example.com' },
            exerciseId: { _id: 'e1', title: 'Essay on Data Structures', type: 'essay' },
            submittedAt: '2025-01-05T16:45:00Z',
            content: 'In computer science, data structures play a crucial role...',
            status: 'pending',
            maxScore: 100,
          },
        ];

        setSubmissions(mockSubmissions);
        setFilteredSubmissions(mockSubmissions);
      } catch (err) {
        console.error('Error loading submissions:', err);
        setMessage({ type: 'error', text: 'Failed to load submissions' });
      } finally {
        setLoading(false);
      }
    };

    if (courseId) {
      loadSubmissions();
    }
  }, [courseId]);

  useEffect(() => {
    // Apply filters
    let filtered = submissions;

    if (statusFilter !== 'all') {
      filtered = filtered.filter(sub => sub.status === statusFilter);
    }

    if (searchTerm) {
      filtered = filtered.filter(sub =>
        sub.studentId.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sub.studentId.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sub.exerciseId.title.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    }

    setFilteredSubmissions(filtered);
  }, [submissions, statusFilter, searchTerm]);

  const isInstructor = user && (
    user.role === 'admin' ||
    user.role === 'staff' ||
    user.role === 'teacher'
  );

  const openGradingModal = (submission: Submission) => {
    setSelectedSubmission(submission);
    setScore(submission.grade?.toString() || '');
    setFeedback(submission.feedback || '');
  };

  const handleSaveGrade = async () => {
    if (!selectedSubmission) return;

    try {
      setGrading(true);

      const gradeValue = parseInt(score);
      if (isNaN(gradeValue) || gradeValue < 0 || gradeValue > selectedSubmission.maxScore) {
        setMessage({ type: 'error', text: `Score must be between 0 and ${selectedSubmission.maxScore}` });
        return;
      }

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Update submission in local state
      const updatedSubmissions = submissions.map(sub =>
        sub._id === selectedSubmission._id
          ? { ...sub, grade: gradeValue, feedback: feedback, status: 'graded' as const }
          : sub,
      );

      setSubmissions(updatedSubmissions);
      setMessage({ type: 'success', text: 'Grade saved' });
      setSelectedSubmission(null);
      setScore('');
      setFeedback('');
    } catch (err) {
      console.error('Error saving grade:', err);
      setMessage({ type: 'error', text: 'Failed to save grade' });
    } finally {
      setGrading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'graded': return <CheckCircleIcon className="w-5 h-5 text-green-600" />;
      case 'returned': return <DocumentTextIcon className="w-5 h-5 text-blue-600" />;
      case 'pending': return <ClockIcon className="w-5 h-5 text-yellow-600" />;
      default: return <XCircleIcon className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'graded': return 'bg-green-100 text-green-800';
      case 'returned': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-gray-600">Loading submissions...</div>
        </div>
      </div>
    );
  }

  if (!isInstructor) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 text-xl mb-4">Access denied</div>
        <p className="text-gray-600">You don't have permission to grade assignments.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Assignment Grading</h1>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <FunnelIcon className="w-5 h-5 text-gray-400" />
            <span className="text-sm text-gray-600">
              {filteredSubmissions.length} of {submissions.length} submissions
            </span>
          </div>
        </div>
      </div>

      {/* Message Display */}
      {message && (
        <div className={`p-4 rounded-md ${
          message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
        }`}>
          <div className="flex">
            {message.type === 'success' ? (
              <CheckCircleIcon className="w-5 h-5 mr-2" />
            ) : (
              <XCircleIcon className="w-5 h-5 mr-2" />
            )}
            {message.text}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search students or assignments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="sm:w-48">
            <select
              name="status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Submissions</option>
              <option value="pending">Pending Review</option>
              <option value="graded">Graded</option>
              <option value="returned">Returned</option>
            </select>
          </div>
        </div>
      </div>

      {/* Submissions List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {filteredSubmissions.length === 0 ? (
          <div className="text-center py-12">
            <DocumentTextIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <div className="text-gray-600">No submissions found</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Student
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Assignment
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Submitted
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Grade
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredSubmissions.map((submission) => (
                  <tr key={submission._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {submission.studentId.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {submission.studentId.email}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {submission.exerciseId.title}
                      </div>
                      <div className="text-sm text-gray-500 capitalize">
                        {submission.exerciseId.type.replace('_', ' ')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(submission.submittedAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getStatusIcon(submission.status)}
                        <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(submission.status)}`}>
                          {submission.status}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {submission.grade !== undefined ? (
                        `${submission.grade}/${submission.maxScore}`
                      ) : (
                        <span className="text-gray-400">Not graded</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <Button
                          onClick={() => openGradingModal(submission)}
                          variant="secondary"
                          size="sm"
                          icon={submission.status === 'pending' ? <PencilSquareIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                        >
                          {submission.status === 'pending' ? 'Grade' : 'Review'}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Grading Modal */}
      <Modal
        isOpen={selectedSubmission !== null}
        onClose={() => setSelectedSubmission(null)}
        title="Submission Details"
        size="lg"
      >
        {selectedSubmission && (
          <div className="space-y-6">
            {/* Student & Assignment Info */}
            <div className="border-b pb-4">
              <h3 className="text-lg font-medium text-gray-900">
                {selectedSubmission.exerciseId.title}
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Student: {selectedSubmission.studentId.name} ({selectedSubmission.studentId.email})
              </p>
              <p className="text-sm text-gray-600">
                Submitted: {new Date(selectedSubmission.submittedAt).toLocaleString()}
              </p>
              <p className="text-sm text-gray-600">
                Max Score: {selectedSubmission.maxScore} points
              </p>
            </div>

            {/* Submission Content */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-2">Submission Content</h4>
              <div className="bg-gray-50 p-4 rounded-md">
                <pre className="whitespace-pre-wrap text-sm text-gray-700">
                  {selectedSubmission.content}
                </pre>
              </div>
            </div>

            {/* Grading Form */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="score" className="block text-sm font-medium text-gray-700 mb-1">
                  Score (out of {selectedSubmission.maxScore})
                </label>
                <input
                  type="number"
                  id="score"
                  name="score"
                  min="0"
                  max={selectedSubmission.maxScore}
                  value={score}
                  onChange={(e) => setScore(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Enter score"
                />
              </div>

              <div className="md:col-span-1">
                <label htmlFor="feedback" className="block text-sm font-medium text-gray-700 mb-1">
                  Feedback
                </label>
                <textarea
                  id="feedback"
                  name="feedback"
                  rows={3}
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Provide feedback to the student..."
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button
                onClick={() => setSelectedSubmission(null)}
                variant="secondary"
                disabled={grading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveGrade}
                variant="primary"
                disabled={grading}
              >
                {grading ? 'Saving...' : 'Save Grade'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
