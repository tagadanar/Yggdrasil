// packages/frontend/src/components/planning/EventDetailsModal.tsx
// Modal for viewing and editing event details

'use client';

import React, { useState } from 'react';
import { XMarkIcon, PencilIcon, TrashIcon, LinkIcon } from '@heroicons/react/24/outline';

interface Event {
  _id: string;
  title: string;
  description?: string;
  location?: string;
  type: 'class' | 'exam' | 'meeting' | 'event';
  startDate: string;
  endDate: string;
  linkedCourse?: {
    _id: string;
    title: string;
  };
  isRecurring: boolean;
  color?: string;
  attendeeCount?: number;
}

interface Course {
  _id: string;
  title: string;
  category: string;
  status: string;
}

interface EventDetailsModalProps {
  isOpen: boolean;
  event: Event;
  onClose: () => void;
  onUpdate: (eventId: string, updateData: any) => void;
  onDelete: (eventId: string) => void;
  canModify: boolean;
  courses: Course[];
}

export const EventDetailsModal: React.FC<EventDetailsModalProps> = ({
  isOpen,
  event,
  onClose,
  onUpdate,
  onDelete,
  canModify,
  courses
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    title: event.title,
    description: event.description || '',
    location: event.location || '',
    type: event.type,
    startDate: event.startDate ? new Date(event.startDate).toISOString().slice(0, 16) : '',
    endDate: event.endDate ? new Date(event.endDate).toISOString().slice(0, 16) : '',
    linkedCourse: event.linkedCourse?._id || '',
    isPublic: true,
    color: event.color || '#3b82f6'
  });

  const [showCourseLink, setShowCourseLink] = useState(!!event.linkedCourse);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const updateData: any = {
      title: formData.title,
      description: formData.description || undefined,
      location: formData.location || undefined,
      type: formData.type,
      startDate: formData.startDate,
      endDate: formData.endDate,
      isPublic: formData.isPublic,
      color: formData.color
    };

    if (showCourseLink && formData.linkedCourse) {
      updateData.linkedCourse = formData.linkedCourse;
    } else if (!showCourseLink) {
      updateData.linkedCourse = null;
    }

    onUpdate(event._id, updateData);
    setIsEditing(false);
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this event?')) {
      onDelete(event._id);
    }
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'class':
        return 'bg-blue-100 text-blue-800';
      case 'exam':
        return 'bg-red-100 text-red-800';
      case 'meeting':
        return 'bg-green-100 text-green-800';
      case 'event':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            {isEditing ? 'Edit Event' : 'Event Details'}
          </h3>
          <div className="flex items-center space-x-2">
            {canModify && !isEditing && (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  className="p-2 text-gray-400 hover:text-gray-600"
                  data-testid="edit-event-button"
                >
                  <PencilIcon className="h-5 w-5" />
                </button>
                <button
                  onClick={handleDelete}
                  className="p-2 text-gray-400 hover:text-red-600"
                  data-testid="delete-event-button"
                >
                  <TrashIcon className="h-5 w-5" />
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        {isEditing ? (
          /* Edit Form */
          <form onSubmit={handleSubmit} className="space-y-4">
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

            <div className="flex justify-end space-x-3 pt-4 border-t">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md"
                data-testid="save-event-button"
              >
                Save Changes
              </button>
            </div>
          </form>
        ) : (
          /* View Mode */
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2" data-testid="event-detail-title">
                {event.title}
              </h2>
              <span className={`inline-block px-3 py-1 text-sm rounded-full ${getEventTypeColor(event.type)}`}>
                {event.type.charAt(0).toUpperCase() + event.type.slice(1)}
              </span>
            </div>

            {event.description && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-1">Description</h4>
                <p className="text-sm text-gray-600">{event.description}</p>
              </div>
            )}

            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-1">Date & Time</h4>
              <p className="text-sm text-gray-600">
                <strong>Start:</strong> {formatDateTime(event.startDate)}
              </p>
              <p className="text-sm text-gray-600">
                <strong>End:</strong> {formatDateTime(event.endDate)}
              </p>
            </div>

            {event.location && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-1">Location</h4>
                <p className="text-sm text-gray-600">📍 {event.location}</p>
              </div>
            )}

            {event.linkedCourse && (
              <div data-testid="linked-course-info">
                <h4 className="text-sm font-medium text-gray-700 mb-1">Linked Course</h4>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-blue-600" data-testid="linked-course-name">
                    📚 {event.linkedCourse.title}
                  </span>
                  <button
                    onClick={() => {
                      // Navigate to course page
                      window.location.href = `/courses/${event.linkedCourse!._id}`;
                    }}
                    className="text-xs text-indigo-600 hover:text-indigo-800 underline"
                    data-testid="view-course-button"
                  >
                    View Course
                  </button>
                </div>
              </div>
            )}

            {event.isRecurring && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-1">Recurring Event</h4>
                <p className="text-sm text-gray-600">🔄 This is a recurring event</p>
              </div>
            )}

            <div className="flex justify-end space-x-3 pt-4 border-t">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};