// packages/frontend/src/components/courses/CourseForm.tsx
// Course creation and editing form component

'use client';

import React, { useState, useEffect } from 'react';
import { courseApi } from '@/lib/api/courses';

interface Course {
  _id: string;
  title: string;
  description: string;
  slug: string;
  category: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  status: 'draft' | 'published' | 'archived';
  instructor: {
    _id: string;
    name: string;
    email: string;
  };
  tags: string[];
  prerequisites: string[];
  estimatedDuration: number;
  settings: {
    isPublic: boolean;
    allowEnrollment: boolean;
    requiresApproval: boolean;
    maxStudents?: number;
    startDate?: string;
    endDate?: string;
    allowLateSubmissions: boolean;
    enableDiscussions: boolean;
    enableCollaboration: boolean;
  };
  stats: {
    enrolledStudents: number;
    completedStudents: number;
    averageProgress: number;
    averageRating?: number;
    totalViews: number;
  };
}

interface CourseFormProps {
  course?: Course | null;
  onSave: (course: Course) => void;
  onCancel: () => void;
}

export const CourseForm: React.FC<CourseFormProps> = ({
  course,
  onSave,
  onCancel
}) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    level: 'beginner' as 'beginner' | 'intermediate' | 'advanced',
    tags: [] as string[],
    prerequisites: [] as string[],
    estimatedDuration: 60, // Default 1 hour
    settings: {
      isPublic: true,
      allowEnrollment: true,
      requiresApproval: false,
      maxStudents: undefined as number | undefined,
      startDate: '',
      endDate: '',
      allowLateSubmissions: true,
      enableDiscussions: true,
      enableCollaboration: false
    }
  });

  const [tagInput, setTagInput] = useState('');
  const [prerequisiteInput, setPrerequisiteInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);

  const isEditing = !!course;

  useEffect(() => {
    if (course) {
      setFormData({
        title: course.title,
        description: course.description,
        category: course.category,
        level: course.level,
        tags: course.tags || [],
        prerequisites: course.prerequisites || [],
        estimatedDuration: course.estimatedDuration || 60,
        settings: {
          isPublic: course.settings.isPublic ?? true,
          allowEnrollment: course.settings.allowEnrollment ?? true,
          requiresApproval: course.settings.requiresApproval ?? false,
          maxStudents: course.settings.maxStudents,
          startDate: course.settings.startDate ? course.settings.startDate.split('T')[0] || '' : '',
          endDate: course.settings.endDate ? course.settings.endDate.split('T')[0] || '' : '',
          allowLateSubmissions: course.settings.allowLateSubmissions ?? true,
          enableDiscussions: course.settings.enableDiscussions ?? true,
          enableCollaboration: course.settings.enableCollaboration ?? false
        }
      });
    }
  }, [course]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (name.startsWith('settings.')) {
      const settingName = name.replace('settings.', '');
      setFormData(prev => ({
        ...prev,
        settings: {
          ...prev.settings,
          [settingName]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : 
                       type === 'number' ? (value ? parseInt(value) : undefined) : value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'number' ? parseInt(value) : value
      }));
    }
  };

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }));
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const addPrerequisite = () => {
    if (prerequisiteInput.trim() && !formData.prerequisites.includes(prerequisiteInput.trim())) {
      setFormData(prev => ({
        ...prev,
        prerequisites: [...prev.prerequisites, prerequisiteInput.trim()]
      }));
      setPrerequisiteInput('');
    }
  };

  const removePrerequisite = (prerequisiteToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      prerequisites: prev.prerequisites.filter(prereq => prereq !== prerequisiteToRemove)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      let response;
      
      if (isEditing && course) {
        response = await courseApi.updateCourse(course._id, formData);
      } else {
        response = await courseApi.createCourse(formData);
      }

      if (response.success) {
        onSave(response.data);
      } else {
        setError(response.error || 'Failed to save course');
      }
    } catch (err: any) {
      console.error('Error saving course:', err);
      setError(err.response?.data?.error || 'Failed to save course');
    } finally {
      setLoading(false);
    }
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

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              Course Title *
            </label>
            <input
              type="text"
              name="title"
              id="title"
              required
              value={formData.title}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter course title"
              data-testid="course-title"
            />
          </div>

          <div className="md:col-span-2">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Course Description *
            </label>
            <textarea
              name="description"
              id="description"
              required
              rows={4}
              value={formData.description}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Describe what students will learn in this course"
              data-testid="course-description"
            />
          </div>

          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
              Category *
            </label>
            <select
              name="category"
              id="category"
              required
              value={formData.category}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              data-testid="course-category"
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
              name="level"
              id="level"
              required
              value={formData.level}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              data-testid="course-level"
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
              name="estimatedDuration"
              id="estimatedDuration"
              min="1"
              value={formData.estimatedDuration}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="60"
              data-testid="course-duration"
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
            {formData.tags.map((tag, index) => (
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
            {formData.prerequisites.map((prereq, index) => (
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
                      checked={formData.settings.isPublic}
                      onChange={handleInputChange}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Public course</span>
                  </label>
                </div>

                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      name="settings.allowEnrollment"
                      checked={formData.settings.allowEnrollment}
                      onChange={handleInputChange}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Allow enrollment</span>
                  </label>
                </div>

                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      name="settings.requiresApproval"
                      checked={formData.settings.requiresApproval}
                      onChange={handleInputChange}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      data-testid="require-approval"
                    />
                    <span className="ml-2 text-sm text-gray-700">Require enrollment approval</span>
                  </label>
                </div>

                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      name="settings.enableDiscussions"
                      checked={formData.settings.enableDiscussions}
                      onChange={handleInputChange}
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
                      checked={formData.settings.allowLateSubmissions}
                      onChange={handleInputChange}
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
                      checked={formData.settings.enableCollaboration}
                      onChange={handleInputChange}
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
                    name="settings.maxStudents"
                    id="maxStudents"
                    min="1"
                    value={formData.settings.maxStudents || ''}
                    onChange={handleInputChange}
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
                    name="settings.startDate"
                    id="startDate"
                    value={formData.settings.startDate}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    name="settings.endDate"
                    id="endDate"
                    value={formData.settings.endDate}
                    onChange={handleInputChange}
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
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            data-testid="submit-course"
          >
            {loading ? 'Saving...' : (isEditing ? 'Update Course' : 'Create Course')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CourseForm;