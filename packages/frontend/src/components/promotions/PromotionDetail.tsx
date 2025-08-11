// packages/frontend/src/components/promotions/PromotionDetail.tsx
// Detailed view of a promotion with management capabilities

'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/AuthProvider';
import { promotionApi, getSemesterName, getSemesterColor, getStatusColor } from '@/lib/api/promotions';
import { PromotionWithDetails } from '@yggdrasil/shared-utilities';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import {
  ArrowLeftIcon,
  PencilIcon,
  UserGroupIcon,
  CalendarDaysIcon,
  AcademicCapIcon,
  ClockIcon,
  MapPinIcon,
  PlusIcon,
  XMarkIcon,
  EyeIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';
import { PromotionProgressModal } from './PromotionProgressModal';

interface PromotionDetailProps {
  promotionId: string;
  onEdit?: (promotion: PromotionWithDetails) => void;
  onBack: () => void;
}

export const PromotionDetail: React.FC<PromotionDetailProps> = ({
  promotionId,
  onEdit,
  onBack,
}) => {
  const { user } = useAuth();
  const [promotion, setPromotion] = useState<PromotionWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'students' | 'events' | 'calendar'>('overview');
  const [showProgressModal, setShowProgressModal] = useState(false);

  useEffect(() => {
    loadPromotion();
  }, [promotionId]);

  const loadPromotion = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await promotionApi.getPromotion(promotionId);

      if (response.success && response.data) {
        setPromotion(response.data);
      } else {
        setError(response.error || 'Failed to load promotion');
      }
    } catch (err) {
      setError('Failed to load promotion');
      console.error('Failed to load promotion:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveStudent = async (studentId: string) => {
    if (!promotion) return;

    if (!confirm('Are you sure you want to remove this student from the promotion?')) {
      return;
    }

    try {
      const response = await promotionApi.removeStudentFromPromotion(promotion._id, studentId);

      if (response.success) {
        // Reload promotion to get updated data
        await loadPromotion();
      } else {
        setError(response.error || 'Failed to remove student');
      }
    } catch (err) {
      setError('Failed to remove student');
      console.error('Failed to remove student:', err);
    }
  };

  const handleUnlinkEvent = async (eventId: string) => {
    if (!promotion) return;

    if (!confirm('Are you sure you want to unlink this event from the promotion?')) {
      return;
    }

    try {
      const response = await promotionApi.unlinkEventFromPromotion(promotion._id, eventId);

      if (response.success) {
        // Reload promotion to get updated data
        await loadPromotion();
      } else {
        setError(response.error || 'Failed to unlink event');
      }
    } catch (err) {
      setError('Failed to unlink event');
      console.error('Failed to unlink event:', err);
    }
  };

  const formatDateTime = (dateString: string | Date): string => {
    return new Date(dateString).toLocaleString();
  };

  const getEventTypeColor = (type: string): string => {
    switch (type) {
      case 'class':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200';
      case 'exam':
        return 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200';
      case 'meeting':
        return 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200';
      case 'academic':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !promotion) {
    return (
      <div className="text-center py-12">
        <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">Error</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {error || 'Promotion not found'}
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Button onClick={onBack} variant="secondary" icon={<ArrowLeftIcon className="w-5 h-5" />}>
            Go Back
          </Button>
          <Button onClick={loadPromotion} variant="primary">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  const canManage = user && (user.role === 'admin' || user.role === 'staff');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Button
            onClick={onBack}
            variant="secondary"
            icon={<ArrowLeftIcon className="w-5 h-5" />}
          >
            Back
          </Button>
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {promotion.name}
              </h1>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSemesterColor(promotion.semester)}`}>
                {getSemesterName(promotion.semester, promotion.intake)}
              </span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(promotion.status)}`}>
                {promotion.status.charAt(0).toUpperCase() + promotion.status.slice(1)}
              </span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Academic Year {promotion.academicYear} • {promotion.students?.length || 0} students • {promotion.events?.length || 0} events
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={() => setShowProgressModal(true)}
            variant="secondary"
            icon={<ChartBarIcon className="w-5 h-5" />}
            data-testid="view-progress"
          >
            View Progress
          </Button>
          {canManage && onEdit && (
            <Button
              onClick={() => onEdit(promotion)}
              variant="primary"
              icon={<PencilIcon className="w-5 h-5" />}
            >
              Edit Promotion
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', label: 'Overview', icon: InformationCircleIcon },
            { id: 'students', label: 'Students', icon: UserGroupIcon, count: promotion.students?.length },
            { id: 'events', label: 'Events', icon: CalendarDaysIcon, count: promotion.events?.length },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300'
                }`}
              >
                <Icon className="w-5 h-5" />
                {tab.label}
                {tab.count !== undefined && (
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    activeTab === tab.id
                      ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400'
                      : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="grid gap-6">
            {/* Basic Information */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Basic Information</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Semester</dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                    {getSemesterName(promotion.semester, promotion.intake)}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Academic Year</dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">{promotion.academicYear}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Status</dt>
                  <dd className="mt-1">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(promotion.status)}`}>
                      {promotion.status.charAt(0).toUpperCase() + promotion.status.slice(1)}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Start Date</dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                    {formatDateTime(promotion.startDate)}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">End Date</dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                    {formatDateTime(promotion.endDate)}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Created</dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                    {formatDateTime(promotion.createdAt)}
                  </dd>
                </div>
              </div>
            </div>

            {/* Additional Information */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Additional Information</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {promotion.metadata.department && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Department</dt>
                    <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">{promotion.metadata.department}</dd>
                  </div>
                )}
                {promotion.metadata.level && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Level</dt>
                    <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">{promotion.metadata.level}</dd>
                  </div>
                )}
                {promotion.metadata.maxStudents && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Maximum Students</dt>
                    <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">{promotion.metadata.maxStudents}</dd>
                  </div>
                )}
              </div>
              {promotion.metadata.description && (
                <div className="mt-4">
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Description</dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">{promotion.metadata.description}</dd>
                </div>
              )}
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <UserGroupIcon className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Total Students</p>
                    <p className="text-2xl font-semibold text-blue-900 dark:text-blue-100">
                      {promotion.students?.length || 0}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <CalendarDaysIcon className="h-8 w-8 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-green-600 dark:text-green-400">Total Events</p>
                    <p className="text-2xl font-semibold text-green-900 dark:text-green-100">
                      {promotion.events?.length || 0}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <AcademicCapIcon className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-purple-600 dark:text-purple-400">Linked Courses</p>
                    <p className="text-2xl font-semibold text-purple-900 dark:text-purple-100">
                      {new Set(promotion.events?.map(e => e.linkedCourse).filter(Boolean)).size || 0}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Students Tab */}
        {activeTab === 'students' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Students ({promotion.students?.length || 0})
              </h2>
              {canManage && (
                <Button
                  variant="primary"
                  icon={<PlusIcon className="w-5 h-5" />}
                  size="sm"
                >
                  Add Students
                </Button>
              )}
            </div>
            <div className="p-6">
              {!promotion.students || promotion.students.length === 0 ? (
                <div className="text-center py-8">
                  <UserGroupIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No students assigned</h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Add students to this promotion to get started.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {promotion.students.map((student) => (
                    <div
                      key={student._id}
                      className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0">
                          <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center">
                            <span className="text-sm font-medium text-white">
                              {student.profile.firstName[0]}{student.profile.lastName[0]}
                            </span>
                          </div>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {student.profile.firstName} {student.profile.lastName}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{student.email}</p>
                          {student.profile.studentId && (
                            <p className="text-xs text-gray-400 dark:text-gray-500">
                              Student ID: {student.profile.studentId}
                            </p>
                          )}
                        </div>
                      </div>
                      {canManage && (
                        <div className="flex items-center space-x-2">
                          <Button
                            onClick={() => handleRemoveStudent(student._id)}
                            variant="danger"
                            size="sm"
                            icon={<XMarkIcon className="w-4 h-4" />}
                          >
                            Remove
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Events Tab */}
        {activeTab === 'events' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Events ({promotion.events?.length || 0})
              </h2>
              {canManage && (
                <Button
                  variant="primary"
                  icon={<PlusIcon className="w-5 h-5" />}
                  size="sm"
                >
                  Link Events
                </Button>
              )}
            </div>
            <div className="p-6">
              {!promotion.events || promotion.events.length === 0 ? (
                <div className="text-center py-8">
                  <CalendarDaysIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No events linked</h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Link events to this promotion to create the student calendar.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {promotion.events.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()).map((event) => (
                    <div
                      key={event._id}
                      className="flex items-start justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                            {event.title}
                          </h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getEventTypeColor(event.type)}`}>
                            {event.type}
                          </span>
                          {event.linkedCourse && (
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200">
                              Course Linked
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                          <div className="flex items-center gap-1">
                            <ClockIcon className="h-4 w-4" />
                            {formatDateTime(event.startDate)} - {formatDateTime(event.endDate)}
                          </div>
                          {event.teacherId && (
                            <div className="flex items-center gap-1">
                              <AcademicCapIcon className="h-4 w-4" />
                              Teacher Assigned
                            </div>
                          )}
                        </div>
                      </div>
                      {canManage && (
                        <div className="flex items-center space-x-2 ml-4">
                          <Button
                            variant="secondary"
                            size="sm"
                            icon={<EyeIcon className="w-4 h-4" />}
                          >
                            View
                          </Button>
                          <Button
                            onClick={() => handleUnlinkEvent(event._id)}
                            variant="danger"
                            size="sm"
                            icon={<XMarkIcon className="w-4 h-4" />}
                          >
                            Unlink
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Progress Modal */}
      {promotion && (
        <PromotionProgressModal
          promotionId={promotion._id}
          promotionName={promotion.name}
          isOpen={showProgressModal}
          onClose={() => setShowProgressModal(false)}
        />
      )}
    </div>
  );
};
