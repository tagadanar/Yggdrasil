// packages/frontend/src/components/planning/EventFilters.tsx
// Filter controls for calendar events

'use client';

import React from 'react';

interface Course {
  _id: string;
  title: string;
  category: string;
  status: string;
}

interface EventFiltersProps {
  filters: {
    type: string;
    course: string;
    location: string;
  };
  onFiltersChange: (filters: { type: string; course: string; location: string }) => void;
  courses: Course[];
}

export const EventFilters: React.FC<EventFiltersProps> = ({
  filters,
  onFiltersChange,
  courses
}) => {
  const handleFilterChange = (field: string, value: string) => {
    onFiltersChange({
      ...filters,
      [field]: value
    });
  };

  const clearFilters = () => {
    onFiltersChange({
      type: '',
      course: '',
      location: ''
    });
  };

  return (
    <div className="bg-white rounded-lg shadow p-4" data-testid="event-filters">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">Filter Events</h3>
        <button
          onClick={clearFilters}
          className="text-sm text-indigo-600 hover:text-indigo-800"
        >
          Clear All
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Event Type Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Event Type
          </label>
          <select
            value={filters.type}
            onChange={(e) => handleFilterChange('type', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            data-testid="filter-type"
          >
            <option value="">All Types</option>
            <option value="class">Class</option>
            <option value="exam">Exam</option>
            <option value="meeting">Meeting</option>
            <option value="event">Event</option>
          </select>
        </div>

        {/* Course Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Course
          </label>
          <select
            value={filters.course}
            onChange={(e) => handleFilterChange('course', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            data-testid="filter-course"
          >
            <option value="">All Courses</option>
            {courses.map((course) => (
              <option key={course._id} value={course._id}>
                {course.title}
              </option>
            ))}
          </select>
        </div>

        {/* Location Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Location
          </label>
          <input
            type="text"
            value={filters.location}
            onChange={(e) => handleFilterChange('location', e.target.value)}
            placeholder="Filter by location..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            data-testid="filter-location"
          />
        </div>
      </div>

      {/* Active Filters Display */}
      {(filters.type || filters.course || filters.location) && (
        <div className="mt-4 pt-4 border-t">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Active Filters:</h4>
          <div className="flex flex-wrap gap-2">
            {filters.type && (
              <span className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                Type: {filters.type}
                <button
                  onClick={() => handleFilterChange('type', '')}
                  className="ml-1 text-blue-600 hover:text-blue-800"
                >
                  ✕
                </button>
              </span>
            )}
            {filters.course && (
              <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-800 text-sm rounded-full">
                Course: {courses.find(c => c._id === filters.course)?.title || 'Unknown'}
                <button
                  onClick={() => handleFilterChange('course', '')}
                  className="ml-1 text-green-600 hover:text-green-800"
                >
                  ✕
                </button>
              </span>
            )}
            {filters.location && (
              <span className="inline-flex items-center px-2 py-1 bg-purple-100 text-purple-800 text-sm rounded-full">
                Location: {filters.location}
                <button
                  onClick={() => handleFilterChange('location', '')}
                  className="ml-1 text-purple-600 hover:text-purple-800"
                >
                  ✕
                </button>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};