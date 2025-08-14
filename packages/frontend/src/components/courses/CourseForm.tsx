// packages/frontend/src/components/courses/CourseForm.tsx
// Course creation and editing form component

'use client';

import React, { useState, useEffect } from 'react';
import { courseApi } from '@/lib/api/courses';
import { Course } from '@yggdrasil/shared-utilities';
import { useForm } from '@/hooks/useForm';
import { useApi } from '@/hooks/useApi';

interface CourseFormProps {
  course?: Course | null;
  onSave: (course: Course) => void;
  onCancel: () => void;
}

// Form data interface for type safety
interface CourseFormData {
  title: string;
  description: string;
  category: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  tags: string[];
  prerequisites: string[];
  estimatedDuration: number;
  settings: {
    isPublic: boolean;
    maxStudents?: number;
    startDate: string;
    endDate: string;
    allowLateSubmissions: boolean;
    enableDiscussions: boolean;
    enableCollaboration: boolean;
  };
}

export const CourseForm: React.FC<CourseFormProps> = ({
  course,
  onSave,
  onCancel
}) => {
  // Separate state for UI-only elements
  const [tagInput, setTagInput] = useState('');
  const [prerequisiteInput, setPrerequisiteInput] = useState('');
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);

  const isEditing = !!course;

  // Enhanced form management with useForm hook
  const form = useForm<CourseFormData>({
    title: '',
    description: '',
    category: '',
    level: 'beginner',
    tags: [],
    prerequisites: [],
    estimatedDuration: 60,
    settings: {
      isPublic: true,
      maxStudents: undefined,
      startDate: '',
      endDate: '',
      allowLateSubmissions: true,
      enableDiscussions: true,
      enableCollaboration: false
    }
  }, {
    component: 'CourseForm',
    onSubmit: async (data) => {
      // Convert date strings to datetime strings for API validation
      const processedFormData = {
        ...data,
        settings: {
          ...data.settings,
          startDate: data.settings.startDate 
            ? new Date(data.settings.startDate + 'T00:00:00').toISOString()
            : undefined,
          endDate: data.settings.endDate 
            ? new Date(data.settings.endDate + 'T23:59:59').toISOString()
            : undefined,
        }
      };

      let response;
      if (isEditing && course) {
        response = await courseApi.updateCourse(course._id, processedFormData);
      } else {
        response = await courseApi.createCourse(processedFormData);
      }

      if (response.success) {
        onSave(response.data);
      } else {
        throw new Error(response.error || 'Failed to save course');
      }
    },
    onSuccess: (data) => {
      // Additional success handling if needed
    }
  });

  // Populate form when course data is available
  useEffect(() => {
    if (course) {
      form.setData({
        title: course.title,
        description: course.description,
        category: course.category,
        level: course.level,
        tags: course.tags || [],
        prerequisites: course.prerequisites || [],
        estimatedDuration: course.estimatedDuration || 60,
        settings: {
          isPublic: course.settings.isPublic ?? true,
          maxStudents: course.settings.maxStudents,
          startDate: course.settings.startDate ? course.settings.startDate.split('T')[0] || '' : '',
          endDate: course.settings.endDate ? course.settings.endDate.split('T')[0] || '' : '',
          allowLateSubmissions: course.settings.allowLateSubmissions ?? true,
          enableDiscussions: course.settings.enableDiscussions ?? true,
          enableCollaboration: course.settings.enableCollaboration ?? false
        }
      });
    }
  }, [course, form.setData]);

  // Enhanced tag management with form integration
  const addTag = () => {
    if (tagInput.trim() && !form.data.tags.includes(tagInput.trim())) {
      form.setValue('tags', [...form.data.tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    form.setValue('tags', form.data.tags.filter(tag => tag !== tagToRemove));
  };

  // Enhanced prerequisite management with form integration
  const addPrerequisite = () => {
    if (prerequisiteInput.trim() && !form.data.prerequisites.includes(prerequisiteInput.trim())) {
      form.setValue('prerequisites', [...form.data.prerequisites, prerequisiteInput.trim()]);
      setPrerequisiteInput('');
    }
  };

  const removePrerequisite = (prerequisiteToRemove: string) => {
    form.setValue('prerequisites', form.data.prerequisites.filter(prereq => prereq !== prerequisiteToRemove));
  };

  // Settings handler for nested form fields
  const handleSettingsChange = (field: keyof CourseFormData['settings'], value: any) => {
    form.setValue('settings', {
      ...form.data.settings,
      [field]: value
    });
  };

  return (
    <div className="max-w-4xl mx-auto bg-white p-6 rounded-lg border">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          {isEditing ? 'Edit Course' : 'Create New Course'}
        </h2>
        <p className="text-gray-600 mt-1">
          {isEditing ? 'Update your course information' : 'Fill in the details to create your course'}
        </p>
      </div>

      {/* Enhanced error display */}
      {Object.keys(form.errors).length > 0 && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          <h4 className="font-medium mb-2">Please fix the following errors:</h4>
          <ul className="text-sm space-y-1">
            {Object.entries(form.errors).map(([field, error]) => (
              <li key={field}>
                <span className="capitalize">{field.replace(/([A-Z])/g, ' $1')}:</span> {error}
              </li>
            ))}
          </ul>
        </div>
      )}

      <form onSubmit={form.handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              Course Title *
            </label>
            <input
              type="text"
              id="title"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter course title"
              data-testid="course-title-input"
              {...form.register('title')}
            />
          </div>

          <div className="md:col-span-2">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Course Description *
            </label>
            <textarea
              id="description"
              required
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Describe what students will learn in this course"
              data-testid="course-description"
              {...form.register('description')}
            />
          </div>

          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
              Category *
            </label>
            <select
              id="category"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              data-testid="course-category"
              {...form.register('category')}
            >
              <option value="">Select a category</option>
              <option value="programming">Programming</option>
              <option value="mathematics">Mathematics</option>
              <option value="science">Science</option>
              <option value="administration">Administration</option>
              <option value="business">Business</option>
              <option value="design">Design</option>
              <option value="language">Language</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label htmlFor="level" className="block text-sm font-medium text-gray-700 mb-1">
              Difficulty Level *
            </label>
            <select
              id="level"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              data-testid="course-level"
              {...form.register('level')}
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>

          <div>
            <label htmlFor="estimatedDuration" className="block text-sm font-medium text-gray-700 mb-1">
              Estimated Duration (minutes)
            </label>
            <input
              type="number"
              id="estimatedDuration"
              min="1"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="60"
              data-testid="course-duration"
              {...form.register('estimatedDuration')}
            />
          </div>
        </div>

        {/* Tags */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tags
          </label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Add a tag"
              data-testid="course-tags"
            />
            <button
              type="button"
              onClick={addTag}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              Add
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {form.data.tags.map((tag, index) => (
              <span
                key={index}
                className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm flex items-center gap-1"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="text-blue-600 hover:text-blue-800"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Prerequisites */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Prerequisites
          </label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={prerequisiteInput}
              onChange={(e) => setPrerequisiteInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addPrerequisite())}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Add a prerequisite"
            />
            <button
              type="button"
              onClick={addPrerequisite}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              Add
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {form.data.prerequisites.map((prereq, index) => (
              <span
                key={index}
                className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-sm flex items-center gap-1"
              >
                {prereq}
                <button
                  type="button"
                  onClick={() => removePrerequisite(prereq)}
                  className="text-gray-600 hover:text-gray-800"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Advanced Settings */}
        <div>
          <button
            type="button"
            onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
            className="flex items-center text-blue-600 hover:text-blue-800 font-medium"
            data-testid="advanced-settings"
          >
            Advanced Settings
            <span className={`ml-1 transform transition-transform ${showAdvancedSettings ? 'rotate-180' : ''}`}>
              ▼
            </span>
          </button>

          {showAdvancedSettings && (
            <div className="mt-4 p-4 bg-gray-50 rounded-md space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      name="settings.isPublic"
                      checked={form.data.settings.isPublic}
                      onChange={(e) => handleSettingsChange('isPublic', e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Public course</span>
                  </label>
                </div>


                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      name="settings.enableDiscussions"
                      checked={form.data.settings.enableDiscussions}
                      onChange={(e) => handleSettingsChange('enableDiscussions', e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Enable discussions</span>
                  </label>
                </div>

                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      name="settings.allowLateSubmissions"
                      checked={form.data.settings.allowLateSubmissions}
                      onChange={(e) => handleSettingsChange('allowLateSubmissions', e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Allow late submissions</span>
                  </label>
                </div>

                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      name="settings.enableCollaboration"
                      checked={form.data.settings.enableCollaboration}
                      onChange={(e) => handleSettingsChange('enableCollaboration', e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Enable collaboration</span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="maxStudents" className="block text-sm font-medium text-gray-700 mb-1">
                    Max Students
                  </label>
                  <input
                    type="number"
                    id="maxStudents"
                    min="1"
                    value={form.data.settings.maxStudents || ''}
                    onChange={(e) => handleSettingsChange('maxStudents', e.target.value ? parseInt(e.target.value) : undefined)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Unlimited"
                    data-testid="max-students"
                  />
                </div>

                <div>
                  <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    id="startDate"
                    value={form.data.settings.startDate}
                    onChange={(e) => handleSettingsChange('startDate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    id="endDate"
                    value={form.data.settings.endDate}
                    onChange={(e) => handleSettingsChange('endDate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Form Actions */}
        <div className="flex justify-end space-x-4 pt-6 border-t">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={form.isSubmitting}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            data-testid="submit-course"
          >
            {form.isSubmitting ? 'Saving...' : (isEditing ? 'Update Course' : 'Create Course')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CourseForm;