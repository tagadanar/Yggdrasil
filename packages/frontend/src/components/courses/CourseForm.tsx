'use client';

import React, { useState, useEffect } from 'react';
import { Course, CreateCourseData, UpdateCourseData, CourseLevel, CourseCategory, CourseVisibility, CourseSchedule } from '@/types/course';

interface CourseFormProps {
  course?: Course;
  onSubmit: (data: CreateCourseData | UpdateCourseData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

const COURSE_LEVELS: CourseLevel[] = ['beginner', 'intermediate', 'advanced', 'expert'];
const COURSE_CATEGORIES: CourseCategory[] = [
  'programming', 'web-development', 'mobile-development', 'data-science',
  'artificial-intelligence', 'cybersecurity', 'cloud-computing', 'devops',
  'database', 'design', 'project-management', 'soft-skills', 'other'
];
const VISIBILITY_OPTIONS: CourseVisibility[] = ['public', 'private', 'restricted'];

export default function CourseForm({ course, onSubmit, onCancel, isLoading = false }: CourseFormProps) {
  const [formData, setFormData] = useState({
    title: course?.title || '',
    description: course?.description || '',
    code: course?.code || '',
    credits: course?.credits || 3,
    level: course?.level || 'beginner' as CourseLevel,
    category: course?.category || 'programming' as CourseCategory,
    visibility: course?.visibility || 'public' as CourseVisibility,
    capacity: course?.capacity || 30,
    startDate: course?.startDate ? new Date(course.startDate).toISOString().split('T')[0] : '',
    endDate: course?.endDate ? new Date(course.endDate).toISOString().split('T')[0] : '',
    weeks: course?.duration?.weeks || 12,
    hoursPerWeek: course?.duration?.hoursPerWeek || 3,
    prerequisites: course?.prerequisites?.join(', ') || '',
    tags: course?.tags?.join(', ') || '',
  });

  const [schedule, setSchedule] = useState<CourseSchedule[]>(
    course?.schedule || []
  );

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'credits' || name === 'capacity' || name === 'weeks' || name === 'hoursPerWeek' 
        ? parseInt(value) || 0 
        : value
    }));
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const addScheduleSlot = () => {
    setSchedule(prev => [...prev, {
      dayOfWeek: 1,
      startTime: '09:00',
      endTime: '11:00',
      location: '',
      type: 'lecture'
    }]);
  };

  const removeScheduleSlot = (index: number) => {
    setSchedule(prev => prev.filter((_, i) => i !== index));
  };

  const updateScheduleSlot = (index: number, field: keyof CourseSchedule, value: any) => {
    setSchedule(prev => prev.map((slot, i) => 
      i === index ? { ...slot, [field]: value } : slot
    ));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) newErrors.title = 'Course title is required';
    if (!formData.description.trim()) newErrors.description = 'Course description is required';
    if (!formData.code.trim()) newErrors.code = 'Course code is required';
    if (formData.credits < 1) newErrors.credits = 'Credits must be at least 1';
    if (formData.capacity < 1) newErrors.capacity = 'Capacity must be at least 1';
    if (!formData.startDate) newErrors.startDate = 'Start date is required';
    if (!formData.endDate) newErrors.endDate = 'End date is required';
    if (formData.weeks < 1) newErrors.weeks = 'Duration must be at least 1 week';
    if (formData.hoursPerWeek < 1) newErrors.hoursPerWeek = 'Hours per week must be at least 1';

    if (formData.startDate && formData.endDate && new Date(formData.startDate) >= new Date(formData.endDate)) {
      newErrors.endDate = 'End date must be after start date';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    const courseData = {
      title: formData.title.trim(),
      description: formData.description.trim(),
      code: formData.code.trim(),
      credits: formData.credits,
      level: formData.level,
      category: formData.category,
      visibility: formData.visibility,
      capacity: formData.capacity,
      startDate: new Date(formData.startDate),
      endDate: new Date(formData.endDate),
      duration: {
        weeks: formData.weeks,
        hoursPerWeek: formData.hoursPerWeek,
        totalHours: formData.weeks * formData.hoursPerWeek
      },
      schedule,
      prerequisites: formData.prerequisites ? formData.prerequisites.split(',').map(p => p.trim()).filter(Boolean) : [],
      tags: formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
    };

    try {
      await onSubmit(courseData);
    } catch (error) {
      console.error('Error submitting course:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg shadow-md">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Basic Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Basic Information</h3>
          
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              Course Title *
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.title ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter course title"
            />
            {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title}</p>}
          </div>

          <div>
            <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-1">
              Course Code *
            </label>
            <input
              type="text"
              id="code"
              name="code"
              value={formData.code}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.code ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="e.g., CS101"
            />
            {errors.code && <p className="text-red-500 text-sm mt-1">{errors.code}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="credits" className="block text-sm font-medium text-gray-700 mb-1">
                Credits *
              </label>
              <input
                type="number"
                id="credits"
                name="credits"
                value={formData.credits}
                onChange={handleInputChange}
                min="1"
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.credits ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.credits && <p className="text-red-500 text-sm mt-1">{errors.credits}</p>}
            </div>

            <div>
              <label htmlFor="capacity" className="block text-sm font-medium text-gray-700 mb-1">
                Capacity *
              </label>
              <input
                type="number"
                id="capacity"
                name="capacity"
                value={formData.capacity}
                onChange={handleInputChange}
                min="1"
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.capacity ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.capacity && <p className="text-red-500 text-sm mt-1">{errors.capacity}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="level" className="block text-sm font-medium text-gray-700 mb-1">
                Level
              </label>
              <select
                id="level"
                name="level"
                value={formData.level}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {COURSE_LEVELS.map(level => (
                  <option key={level} value={level}>
                    {level.charAt(0).toUpperCase() + level.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <select
                id="category"
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {COURSE_CATEGORIES.map(category => (
                  <option key={category} value={category}>
                    {category.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="visibility" className="block text-sm font-medium text-gray-700 mb-1">
              Visibility
            </label>
            <select
              id="visibility"
              name="visibility"
              value={formData.visibility}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {VISIBILITY_OPTIONS.map(option => (
                <option key={option} value={option}>
                  {option.charAt(0).toUpperCase() + option.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Course Details */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Course Details</h3>
          
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description *
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={4}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.description ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Describe the course content and objectives"
            />
            {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">
                Start Date *
              </label>
              <input
                type="date"
                id="startDate"
                name="startDate"
                value={formData.startDate}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.startDate ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.startDate && <p className="text-red-500 text-sm mt-1">{errors.startDate}</p>}
            </div>

            <div>
              <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">
                End Date *
              </label>
              <input
                type="date"
                id="endDate"
                name="endDate"
                value={formData.endDate}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.endDate ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.endDate && <p className="text-red-500 text-sm mt-1">{errors.endDate}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="weeks" className="block text-sm font-medium text-gray-700 mb-1">
                Duration (weeks) *
              </label>
              <input
                type="number"
                id="weeks"
                name="weeks"
                value={formData.weeks}
                onChange={handleInputChange}
                min="1"
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.weeks ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.weeks && <p className="text-red-500 text-sm mt-1">{errors.weeks}</p>}
            </div>

            <div>
              <label htmlFor="hoursPerWeek" className="block text-sm font-medium text-gray-700 mb-1">
                Hours per Week *
              </label>
              <input
                type="number"
                id="hoursPerWeek"
                name="hoursPerWeek"
                value={formData.hoursPerWeek}
                onChange={handleInputChange}
                min="1"
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.hoursPerWeek ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.hoursPerWeek && <p className="text-red-500 text-sm mt-1">{errors.hoursPerWeek}</p>}
            </div>
          </div>

          <div>
            <label htmlFor="prerequisites" className="block text-sm font-medium text-gray-700 mb-1">
              Prerequisites
            </label>
            <input
              type="text"
              id="prerequisites"
              name="prerequisites"
              value={formData.prerequisites}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Separate multiple prerequisites with commas"
            />
          </div>

          <div>
            <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-1">
              Tags
            </label>
            <input
              type="text"
              id="tags"
              name="tags"
              value={formData.tags}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Separate multiple tags with commas"
            />
          </div>
        </div>
      </div>

      {/* Schedule Section */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900">Schedule</h3>
          <button
            type="button"
            onClick={addScheduleSlot}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Add Schedule
          </button>
        </div>

        {schedule.map((slot, index) => (
          <div key={index} className="p-4 border border-gray-200 rounded-md space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="font-medium text-gray-900">Schedule {index + 1}</h4>
              <button
                type="button"
                onClick={() => removeScheduleSlot(index)}
                className="text-red-600 hover:text-red-800"
              >
                Remove
              </button>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Day</label>
                <select
                  value={slot.dayOfWeek}
                  onChange={(e) => updateScheduleSlot(index, 'dayOfWeek', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={0}>Sunday</option>
                  <option value={1}>Monday</option>
                  <option value={2}>Tuesday</option>
                  <option value={3}>Wednesday</option>
                  <option value={4}>Thursday</option>
                  <option value={5}>Friday</option>
                  <option value={6}>Saturday</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                <input
                  type="time"
                  value={slot.startTime}
                  onChange={(e) => updateScheduleSlot(index, 'startTime', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                <input
                  type="time"
                  value={slot.endTime}
                  onChange={(e) => updateScheduleSlot(index, 'endTime', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={slot.type}
                  onChange={(e) => updateScheduleSlot(index, 'type', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="lecture">Lecture</option>
                  <option value="practical">Practical</option>
                  <option value="exam">Exam</option>
                  <option value="project">Project</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
              <input
                type="text"
                value={slot.location || ''}
                onChange={(e) => updateScheduleSlot(index, 'location', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Room number or location"
              />
            </div>
          </div>
        ))}
      </div>

      {/* Form Actions */}
      <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isLoading}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          disabled={isLoading}
        >
          {isLoading ? 'Saving...' : course ? 'Update Course' : 'Create Course'}
        </button>
      </div>
    </form>
  );
}