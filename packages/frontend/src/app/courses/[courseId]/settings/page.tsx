// packages/frontend/src/app/courses/[courseId]/settings/page.tsx
// Course settings and publishing workflow

'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthProvider';
import { courseApi } from '@/lib/api/courses';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  PlusIcon,
  TrashIcon,
  CloudArrowUpIcon,
} from '@heroicons/react/24/outline';

interface Course {
  _id: string;
  title: string;
  description: string;
  status: 'draft' | 'published' | 'archived';
  prerequisites: string[];
  settings: {
    isPublic: boolean;
    allowLateSubmissions: boolean;
    enableDiscussions: boolean;
    enableCollaboration: boolean;
  };
  instructor: {
    _id: string;
    name: string;
  };
}

export default function CourseSettingsPage() {
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  // Form state
  const [prerequisites, setPrerequisites] = useState<string[]>([]);
  const [newPrerequisite, setNewPrerequisite] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [allowLateSubmissions, setAllowLateSubmissions] = useState(true);
  const [enableDiscussions, setEnableDiscussions] = useState(true);
  const [enableCollaboration, setEnableCollaboration] = useState(false);

  const courseId = params['courseId'] as string;

  useEffect(() => {
    const loadCourse = async () => {
      try {
        setLoading(true);
        console.log('🔍 DEBUG: Loading course with ID:', courseId);
        const response = await courseApi.getCourseById(courseId);
        console.log('🔍 DEBUG: Raw API response:', response);
        if (response.success && response.data) {
          const courseData = response.data;
          console.log('🔍 DEBUG: Course data status:', courseData.status);
          console.log('🔍 DEBUG: Course instructor _id:', courseData.instructor?._id);
          console.log('🔍 DEBUG: Current user _id:', user?._id);
          console.log('🔍 DEBUG: User role:', user?.role);
          console.log('🔍 DEBUG: Course data full:', courseData);
          setCourse(courseData);

          // Populate form fields
          setPrerequisites(courseData.prerequisites || []);
          setIsPublic(courseData.settings.isPublic ?? true);
          setAllowLateSubmissions(courseData.settings.allowLateSubmissions ?? true);
          setEnableDiscussions(courseData.settings.enableDiscussions ?? true);
          setEnableCollaboration(courseData.settings.enableCollaboration ?? false);
        } else {
          console.error('🔍 DEBUG: API returned non-success response:', response);
          setMessage({ type: 'error', text: response.error || response.message || 'Failed to load course' });
        }
      } catch (err: any) {
        console.error('Error loading course:', err);
        setMessage({ type: 'error', text: 'Failed to load course settings' });
      } finally {
        setLoading(false);
      }
    };

    if (courseId) {
      loadCourse();
    }
  }, [courseId]);

  const isInstructor = user && course && (
    user.role === 'admin' ||
    user.role === 'staff' ||
    // Handle different ID formats from auth token and database
    course.instructor._id.toString() === user._id ||
    course.instructor._id === user._id
  );

  // Debug logging
  React.useEffect(() => {
    if (user && course) {
      console.log('🔍 DEBUG: isInstructor check:', {
        hasUser: !!user,
        hasCourse: !!course,
        userRole: user.role,
        isAdmin: user.role === 'admin',
        isStaff: user.role === 'staff',
        instructorId: course.instructor._id.toString(),
        userId: user._id,
        idsMatch: course.instructor._id.toString() === user._id,
        finalResult: isInstructor,
      });
    }
  }, [user, course, isInstructor]);

  const handleSaveSettings = async () => {
    if (!course || !isInstructor) return;

    try {
      setSaving(true);
      const settings = {
        isPublic,
        allowLateSubmissions,
        enableDiscussions,
        enableCollaboration,
      };

      const response = await courseApi.updateCourse(courseId, {
        prerequisites,
        settings,
      });

      if (response.success) {
        setMessage({ type: 'success', text: 'Settings saved successfully' });
        setCourse(prev => prev ? { ...prev, prerequisites, settings } : null);
      } else {
        setMessage({ type: 'error', text: 'Failed to save settings' });
      }
    } catch (err) {
      console.error('Error saving settings:', err);
      setMessage({ type: 'error', text: 'Failed to save settings' });
    } finally {
      setSaving(false);
    }
  };

  const handlePublishCourse = async () => {
    if (!course || !isInstructor) return;

    try {
      setSaving(true);
      const response = await courseApi.updateCourse(courseId, {
        status: 'published',
      });

      if (response.success) {
        setMessage({ type: 'success', text: 'Course published successfully' });
        setCourse(prev => prev ? { ...prev, status: 'published' } : null);
        setShowPublishDialog(false);
      } else {
        setMessage({ type: 'error', text: 'Failed to publish course' });
      }
    } catch (err) {
      console.error('Error publishing course:', err);
      setMessage({ type: 'error', text: 'Failed to publish course' });
    } finally {
      setSaving(false);
    }
  };

  const addPrerequisite = () => {
    if (newPrerequisite.trim() && !prerequisites.includes(newPrerequisite.trim())) {
      setPrerequisites([...prerequisites, newPrerequisite.trim()]);
      setNewPrerequisite('');
    }
  };

  const removePrerequisite = (index: number) => {
    setPrerequisites(prerequisites.filter((_, i) => i !== index));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-gray-600">Loading course settings...</div>
        </div>
      </div>
    );
  }

  if (!course || !isInstructor) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 text-xl mb-4">Access denied</div>
        <p className="text-gray-600">You don't have permission to modify this course.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Message Display */}
      {message && (
        <div className={`p-4 rounded-md ${
          message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
        }`}>
          <div className="flex">
            {message.type === 'success' ? (
              <CheckCircleIcon className="w-5 h-5 mr-2" />
            ) : (
              <ExclamationTriangleIcon className="w-5 h-5 mr-2" />
            )}
            {message.text}
          </div>
        </div>
      )}

      {/* Course Status */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Course Status</h2>
            <div className="mt-2 flex items-center space-x-4">
              <span className={`text-sm font-medium px-3 py-1 rounded-full ${
                course.status === 'published'
                  ? 'bg-green-100 text-green-800'
                  : course.status === 'draft'
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-gray-100 text-gray-800'
              }`}>
                Status: {course.status === 'draft' ? 'Draft' : course.status.charAt(0).toUpperCase() + course.status.slice(1)}
              </span>
            </div>
          </div>

          {course.status === 'draft' && (
            <Button
              onClick={() => setShowPublishDialog(true)}
              variant="primary"
              icon={<CloudArrowUpIcon className="w-5 h-5" />}
            >
              Publish Course
            </Button>
          )}
        </div>
      </div>

      {/* Prerequisites */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Prerequisites</h2>

        <div className="space-y-4">
          <div className="flex space-x-2">
            <input
              type="text"
              name="prerequisite"
              value={newPrerequisite}
              onChange={(e) => setNewPrerequisite(e.target.value)}
              placeholder="Enter prerequisite course or skill"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              onKeyPress={(e) => e.key === 'Enter' && addPrerequisite()}
            />
            <Button
              onClick={addPrerequisite}
              variant="secondary"
              icon={<PlusIcon className="w-4 h-4" />}
            >
              Add Prerequisite
            </Button>
          </div>

          {prerequisites.length > 0 && (
            <div className="space-y-2">
              {prerequisites.map((prereq, index) => (
                <div key={index} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-md">
                  <span className="text-sm text-gray-700">{prereq}</span>
                  <button
                    onClick={() => removePrerequisite(index)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Course Settings */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Course Settings</h2>

        <div className="space-y-4">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="isPublic"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <label htmlFor="isPublic" className="ml-2 text-sm text-gray-700">
              Make course publicly discoverable
            </label>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="allowLateSubmissions"
              checked={allowLateSubmissions}
              onChange={(e) => setAllowLateSubmissions(e.target.checked)}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <label htmlFor="allowLateSubmissions" className="ml-2 text-sm text-gray-700">
              Allow late submissions
            </label>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="enableDiscussions"
              checked={enableDiscussions}
              onChange={(e) => setEnableDiscussions(e.target.checked)}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <label htmlFor="enableDiscussions" className="ml-2 text-sm text-gray-700">
              Enable course discussions
            </label>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="enableCollaboration"
              checked={enableCollaboration}
              onChange={(e) => setEnableCollaboration(e.target.checked)}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <label htmlFor="enableCollaboration" className="ml-2 text-sm text-gray-700">
              Enable student collaboration
            </label>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSaveSettings}
          variant="primary"
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>

      {/* Publish Confirmation Dialog */}
      <Modal
        isOpen={showPublishDialog}
        onClose={() => setShowPublishDialog(false)}
        title="Publish Course"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Publish this course? Once published, students in assigned promotions will be able to access the course content.
            You can unpublish it later if needed.
          </p>

          <div className="flex justify-end space-x-3">
            <Button
              onClick={() => setShowPublishDialog(false)}
              variant="secondary"
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              onClick={handlePublishCourse}
              variant="primary"
              disabled={saving}
            >
              {saving ? 'Publishing...' : 'Confirm'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
