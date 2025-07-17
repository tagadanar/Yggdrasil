// packages/frontend/src/components/planning/EventCreateModal.tsx
// Modal for creating new events

'use client';

import React, { useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface Course {
  _id: string;
  title: string;
  category: string;
  status: string;
}

interface EventCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (eventData: any) => void;
  courses: Course[];
}

export const EventCreateModal: React.FC<EventCreateModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  courses
}) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    type: 'class' as 'class' | 'exam' | 'meeting' | 'event',
    startDate: '',
    endDate: '',
    linkedCourse: '',
    isRecurring: false,
    recurrence: {
      pattern: 'weekly' as 'daily' | 'weekly' | 'monthly' | 'yearly',
      interval: 1,
      endDate: '',
      days: [] as number[]
    },
    isPublic: true,
    color: '#3b82f6'
  });

  const [showRecurrence, setShowRecurrence] = useState(false);
  const [showCourseLink, setShowCourseLink] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Convert datetime-local format to ISO string for API
    const convertToISO = (dateTimeLocal: string) => {
      if (!dateTimeLocal) return '';
      return new Date(dateTimeLocal).toISOString();
    };
    
    const eventData: any = {
      title: formData.title,
      description: formData.description || undefined,
      location: formData.location || undefined,
      type: formData.type,
      startDate: convertToISO(formData.startDate),
      endDate: convertToISO(formData.endDate),
      isPublic: formData.isPublic,
      color: formData.color
    };

    if (showCourseLink && formData.linkedCourse) {
      eventData.linkedCourse = formData.linkedCourse;
    }

    if (showRecurrence) {
      eventData.recurrence = {
        pattern: formData.recurrence.pattern,
        interval: formData.recurrence.interval,
        endDate: formData.recurrence.endDate ? convertToISO(formData.recurrence.endDate) : undefined,
        days: formData.recurrence.days.length > 0 ? formData.recurrence.days : undefined
      };
    }

    console.log('Submitting event data:', eventData); // Debug log
    onSubmit(eventData);
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleRecurrenceChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      recurrence: { ...prev.recurrence, [field]: value }
    }));
  };

  const toggleRecurrenceDay = (day: number) => {
    const currentDays = formData.recurrence.days;
    const newDays = currentDays.includes(day)
      ? currentDays.filter(d => d !== day)
      : [...currentDays, day];
    
    handleRecurrenceChange('days', newDays);
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Create New Event</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Basic Information */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Event Title *
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              data-testid="event-title"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              data-testid="event-description"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Location
            </label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => handleInputChange('location', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              data-testid="event-location"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Event Type *
            </label>
            <select
              required
              value={formData.type}
              onChange={(e) => handleInputChange('type', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              data-testid="event-type"
            >
              <option value="class">Class</option>
              <option value="exam">Exam</option>
              <option value="meeting">Meeting</option>
              <option value="event">Event</option>
            </select>
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date & Time *
              </label>
              <input
                type="datetime-local"
                required
                value={formData.startDate}
                onChange={(e) => handleInputChange('startDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                data-testid="event-start-date"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date & Time *
              </label>
              <input
                type="datetime-local"
                required
                value={formData.endDate}
                onChange={(e) => handleInputChange('endDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                data-testid="event-end-date"
              />
            </div>
          </div>

          {/* Course Linking */}
          <div className="border-t pt-4">
            <div className="flex items-center mb-2">
              <input
                type="checkbox"
                id="link-course"
                checked={showCourseLink}
                onChange={(e) => setShowCourseLink(e.target.checked)}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                data-testid="link-course-toggle"
              />
              <label htmlFor="link-course" className="ml-2 text-sm font-medium text-gray-700">
                Link to Course
              </label>
            </div>

            {showCourseLink && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Course
                </label>
                <select
                  value={formData.linkedCourse}
                  onChange={(e) => handleInputChange('linkedCourse', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  data-testid="linked-course-select"
                >
                  <option value="">Select a course...</option>
                  {courses.map((course) => (
                    <option key={course._id} value={course._id}>
                      {course.title}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Recurring Events */}
          <div className="border-t pt-4">
            <div className="flex items-center mb-2">
              <input
                type="checkbox"
                id="recurring"
                checked={showRecurrence}
                onChange={(e) => setShowRecurrence(e.target.checked)}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                data-testid="recurring-toggle"
              />
              <label htmlFor="recurring" className="ml-2 text-sm font-medium text-gray-700">
                Recurring Event
              </label>
            </div>

            {showRecurrence && (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Repeat Pattern
                  </label>
                  <select
                    value={formData.recurrence.pattern}
                    onChange={(e) => handleRecurrenceChange('pattern', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    data-testid="recurrence-pattern"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>

                {formData.recurrence.pattern === 'weekly' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Days of Week
                    </label>
                    <div className="flex space-x-2">
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
                        <button
                          key={day}
                          type="button"
                          onClick={() => toggleRecurrenceDay(index)}
                          className={`px-3 py-1 text-sm rounded ${
                            formData.recurrence.days.includes(index)
                              ? 'bg-indigo-600 text-white'
                              : 'bg-gray-200 text-gray-700'
                          }`}
                          data-testid={`recurrence-day-${day.toLowerCase()}`}
                        >
                          {day}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={formData.recurrence.endDate}
                    onChange={(e) => handleRecurrenceChange('endDate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    data-testid="recurrence-end-date"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md"
              data-testid="submit-event-button"
            >
              Create Event
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};