// packages/frontend/src/app/courses/[courseId]/manage/page.tsx
// Student promotion and course management

'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthProvider';
import { courseApi } from '@/lib/api/courses';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import {
  UserGroupIcon,
  MagnifyingGlassIcon,
  EyeIcon,
  EnvelopeIcon,
  CheckIcon,
  XMarkIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

interface PromotionStudent {
  _id: string;
  name: string;
  email: string;
  promotionId: string;
  promotionName: string;
  startedAt: string;
  progress: number;
  completion: number;
  lastActivity: string;
  status: 'active' | 'inactive' | 'completed' | 'not_started';
  grade?: number;
}

export default function CourseManagePage() {
  const { user } = useAuth();
  const params = useParams();
  const [students, setStudents] = useState<PromotionStudent[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<PromotionStudent[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<PromotionStudent | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [showBulkMessageModal, setShowBulkMessageModal] = useState(false);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  const [bulkMessage, setBulkMessage] = useState('');

  const courseId = params['courseId'] as string;

  useEffect(() => {
    const loadPromotionStudents = async () => {
      try {
        setLoading(true);

        // Mock promotion students data for testing
        const mockStudents: PromotionStudent[] = [
          {
            _id: 's1',
            name: 'Alice Johnson',
            email: 'alice.johnson@example.com',
            promotionId: 'promo-2025-1',
            promotionName: 'Web Development 2025',
            startedAt: '2025-01-01T00:00:00Z',
            progress: 85,
            completion: 78,
            lastActivity: '2025-01-08T14:30:00Z',
            status: 'active',
            grade: 92,
          },
          {
            _id: 's2',
            name: 'Bob Smith',
            email: 'bob.smith@example.com',
            promotionId: 'promo-2025-1',
            promotionName: 'Web Development 2025',
            startedAt: '2025-01-02T00:00:00Z',
            progress: 45,
            completion: 38,
            lastActivity: '2025-01-06T10:15:00Z',
            status: 'active',
            grade: 76,
          },
          {
            _id: 's3',
            name: 'Carol Davis',
            email: 'carol.davis@example.com',
            promotionId: 'promo-2024-4',
            promotionName: 'Web Development Q4 2024',
            startedAt: '2024-12-15T00:00:00Z',
            progress: 100,
            completion: 100,
            lastActivity: '2025-01-07T16:45:00Z',
            status: 'completed',
            grade: 95,
          },
          {
            _id: 's4',
            name: 'David Wilson',
            email: 'david.wilson@example.com',
            promotionId: 'promo-2025-1',
            promotionName: 'Web Development 2025',
            startedAt: '2025-01-03T00:00:00Z',
            progress: 25,
            completion: 20,
            lastActivity: '2024-12-28T08:22:00Z',
            status: 'inactive',
            grade: 62,
          },
          {
            _id: 's5',
            name: 'Eve Brown',
            email: 'eve.brown@example.com',
            promotionId: 'promo-2025-1',
            promotionName: 'Web Development 2025',
            startedAt: '2025-01-04T00:00:00Z',
            progress: 67,
            completion: 61,
            lastActivity: '2025-01-08T11:20:00Z',
            status: 'active',
            grade: 88,
          },
        ];

        setStudents(mockStudents);
        setFilteredStudents(mockStudents);
      } catch (err) {
        console.error('Error loading promotion students:', err);
        setMessage({ type: 'error', text: 'Failed to load promotion students' });
      } finally {
        setLoading(false);
      }
    };

    if (courseId) {
      loadPromotionStudents();
    }
  }, [courseId]);

  useEffect(() => {
    // Apply search filter
    if (searchTerm.trim()) {
      const filtered = students.filter(student =>
        student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.email.toLowerCase().includes(searchTerm.toLowerCase()),
      );
      setFilteredStudents(filtered);
    } else {
      setFilteredStudents(students);
    }
  }, [students, searchTerm]);

  const isInstructor = user && (
    user.role === 'admin' ||
    user.role === 'staff' ||
    user.role === 'teacher'
  );

  const handleViewDetails = (student: PromotionStudent) => {
    setSelectedStudent(student);
    setShowProgressModal(true);
  };

  const handleStudentSelection = (studentId: string) => {
    setSelectedStudents(prev => {
      if (prev.includes(studentId)) {
        return prev.filter(id => id !== studentId);
      } else {
        return [...prev, studentId];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedStudents.length === filteredStudents.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(filteredStudents.map(s => s._id));
    }
  };

  const handleSendBulkMessage = () => {
    if (selectedStudents.length === 0) {
      setMessage({ type: 'error', text: 'Please select at least one student' });
      return;
    }
    setShowBulkMessageModal(true);
  };

  const sendMessage = async () => {
    try {
      // Simulate sending message
      await new Promise(resolve => setTimeout(resolve, 1000));

      setMessage({
        type: 'success',
        text: `Message sent to ${selectedStudents.length} student${selectedStudents.length > 1 ? 's' : ''}`,
      });
      setSelectedStudents([]);
      setBulkMessage('');
      setShowBulkMessageModal(false);
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to send message' });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'active': return 'bg-blue-100 text-blue-800';
      case 'inactive': return 'bg-yellow-100 text-yellow-800';
      case 'dropped': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return 'bg-green-500';
    if (progress >= 60) return 'bg-blue-500';
    if (progress >= 40) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-gray-600">Loading promotion students...</div>
        </div>
      </div>
    );
  }

  if (!isInstructor) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 text-xl mb-4">Access denied</div>
        <p className="text-gray-600">You don't have permission to manage course students.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <UserGroupIcon className="w-8 h-8 text-indigo-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Course Students</h1>
            <p className="text-sm text-gray-600">Manage promotion students and track their progress</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {selectedStudents.length > 0 && (
            <Button
              onClick={handleSendBulkMessage}
              variant="secondary"
              icon={<EnvelopeIcon className="w-4 h-4" />}
            >
              Message Selected ({selectedStudents.length})
            </Button>
          )}
        </div>
      </div>

      {/* Message Display */}
      {message && (
        <div className={`p-4 rounded-md ${
          message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
        }`}>
          <div className="flex">
            {message.type === 'success' ? (
              <CheckIcon className="w-5 h-5 mr-2" />
            ) : (
              <ExclamationTriangleIcon className="w-5 h-5 mr-2" />
            )}
            {message.text}
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search students by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="text-sm text-gray-600">
            {filteredStudents.length} of {students.length} students
          </div>
        </div>
      </div>

      {/* Students Section */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Promotion Students</h2>
          <div className="flex items-center space-x-4">
            <label className="flex items-center text-sm">
              <input
                type="checkbox"
                checked={selectedStudents.length === filteredStudents.length && filteredStudents.length > 0}
                onChange={handleSelectAll}
                className="mr-2 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              Select All
            </label>
          </div>
        </div>

        {filteredStudents.length === 0 ? (
          <div className="text-center py-12">
            <UserGroupIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <div className="text-gray-600">
              {searchTerm ? 'No students found matching your search' : 'No students in this promotion yet'}
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <input
                      type="checkbox"
                      checked={selectedStudents.length === filteredStudents.length && filteredStudents.length > 0}
                      onChange={handleSelectAll}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Student
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Progress
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Grade
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Activity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredStudents.map((student) => (
                  <tr key={student._id} data-testid={`student-row-${student._id}`} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedStudents.includes(student._id)}
                        onChange={() => handleStudentSelection(student._id)}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{student.name}</div>
                      <div className="text-sm text-gray-500">{student.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="text-sm text-gray-900 mr-2">{student.progress}%</div>
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${getProgressColor(student.progress)}`}
                            style={{width: `${student.progress}%`}}
                          ></div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {student.grade ? `${student.grade}%` : 'Not graded'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(student.status)}`}>
                        {student.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(student.lastActivity).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <Button
                        onClick={() => handleViewDetails(student)}
                        variant="secondary"
                        size="sm"
                        icon={<EyeIcon className="w-4 h-4" />}
                      >
                        View Details
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Student Progress Modal */}
      <Modal
        isOpen={showProgressModal}
        onClose={() => setShowProgressModal(false)}
        title="Student Progress"
        size="lg"
      >
        {selectedStudent && (
          <div className="space-y-6">
            {/* Student Info */}
            <div className="border-b pb-4">
              <h3 className="text-lg font-medium text-gray-900">{selectedStudent.name}</h3>
              <p className="text-sm text-gray-600">{selectedStudent.email}</p>
              <p className="text-sm text-gray-600">
                Started: {new Date(selectedStudent.startedAt).toLocaleDateString()}
              </p>
            </div>

            {/* Progress Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-center">
                  <ChartBarIcon className="w-8 w-8 text-blue-600" />
                  <div className="ml-3">
                    <div className="text-2xl font-bold text-blue-900">{selectedStudent.progress}%</div>
                    <div className="text-sm text-blue-600">Progress</div>
                  </div>
                </div>
              </div>

              <div className="bg-green-50 rounded-lg p-4">
                <div className="flex items-center">
                  <CheckIcon className="w-8 w-8 text-green-600" />
                  <div className="ml-3">
                    <div className="text-2xl font-bold text-green-900">{selectedStudent.completion}%</div>
                    <div className="text-sm text-green-600">Completion</div>
                  </div>
                </div>
              </div>

              <div className="bg-purple-50 rounded-lg p-4">
                <div className="flex items-center">
                  <UserGroupIcon className="w-8 w-8 text-purple-600" />
                  <div className="ml-3">
                    <div className="text-2xl font-bold text-purple-900">{selectedStudent.grade || 'N/A'}</div>
                    <div className="text-sm text-purple-600">Current Grade</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Activity Info */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-2">Activity Summary</h4>
              <div className="bg-gray-50 p-4 rounded-md">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Status:</span>
                    <span className={`ml-2 px-2 py-1 text-xs rounded-full ${getStatusColor(selectedStudent.status)}`}>
                      {selectedStudent.status}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Last Activity:</span>
                    <span className="ml-2 text-gray-900">
                      {new Date(selectedStudent.lastActivity).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button
                onClick={() => setShowProgressModal(false)}
                variant="secondary"
                aria-label="Close"
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Bulk Message Modal */}
      <Modal
        isOpen={showBulkMessageModal}
        onClose={() => setShowBulkMessageModal(false)}
        title={`Send Message to ${selectedStudents.length} Student${selectedStudents.length > 1 ? 's' : ''}`}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Message</label>
            <textarea
              rows={4}
              value={bulkMessage}
              onChange={(e) => setBulkMessage(e.target.value)}
              placeholder="Enter your message to students..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex justify-end space-x-3">
            <Button
              onClick={() => setShowBulkMessageModal(false)}
              variant="secondary"
            >
              Cancel
            </Button>
            <Button
              onClick={sendMessage}
              variant="primary"
              disabled={!bulkMessage.trim()}
            >
              Send Message
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
