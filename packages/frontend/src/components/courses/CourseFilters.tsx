'use client';

import React, { useState } from 'react';
import { CourseSearchFilters, CourseLevel, CourseCategory, CourseStatus } from '../../types/course';

interface CourseFiltersProps {
  filters: CourseSearchFilters;
  onFilterChange: (filters: Partial<CourseSearchFilters>) => void;
  onClearFilters: () => void;
}

const COURSE_CATEGORIES: CourseCategory[] = [
  'programming',
  'web-development', 
  'mobile-development',
  'data-science',
  'artificial-intelligence',
  'cybersecurity',
  'cloud-computing',
  'devops',
  'database',
  'design',
  'project-management',
  'soft-skills',
  'other'
];

const COURSE_LEVELS: CourseLevel[] = [
  'beginner',
  'intermediate', 
  'advanced',
  'expert'
];

const COURSE_STATUSES: CourseStatus[] = [
  'draft',
  'published',
  'archived',
  'cancelled'
];

const CourseFilters: React.FC<CourseFiltersProps> = ({
  filters,
  onFilterChange,
  onClearFilters
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // This would trigger a search, but for now we'll just update the query filter
    onFilterChange({ q: searchQuery });
  };

  const activeFilterCount = Object.values(filters).filter(value => 
    value !== undefined && value !== null && value !== ''
  ).length;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      {/* Search Bar */}
      <form onSubmit={handleSearchSubmit} className="mb-4">
        <div className="relative">
          <input
            type="text"
            placeholder="Search courses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <button
            type="submit"
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
          >
            <span className="sr-only">Search</span>
            <svg className="h-5 w-5 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </button>
        </div>
      </form>

      {/* Filter Toggle */}
      <div className="flex justify-between items-center mb-4">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center text-sm font-medium text-gray-700 hover:text-gray-900"
        >
          <svg 
            className={`w-4 h-4 mr-2 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
          Advanced Filters
          {activeFilterCount > 0 && (
            <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              {activeFilterCount}
            </span>
          )}
        </button>

        {activeFilterCount > 0 && (
          <button
            onClick={onClearFilters}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            Clear All
          </button>
        )}
      </div>

      {/* Expanded Filters */}
      {isExpanded && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Category Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category
            </label>
            <select
              value={filters.category || ''}
              onChange={(e) => onFilterChange({ 
                category: e.target.value as CourseCategory || undefined 
              })}
              className="w-full border border-gray-300 rounded-md py-2 px-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Categories</option>
              {COURSE_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category.charAt(0).toUpperCase() + category.slice(1).replace('-', ' ')}
                </option>
              ))}
            </select>
          </div>

          {/* Level Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Level
            </label>
            <select
              value={filters.level || ''}
              onChange={(e) => onFilterChange({ 
                level: e.target.value as CourseLevel || undefined 
              })}
              className="w-full border border-gray-300 rounded-md py-2 px-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Levels</option>
              {COURSE_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {level.charAt(0).toUpperCase() + level.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              value={filters.status || ''}
              onChange={(e) => onFilterChange({ 
                status: e.target.value as CourseStatus || undefined 
              })}
              className="w-full border border-gray-300 rounded-md py-2 px-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Statuses</option>
              {COURSE_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* Credits Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Credits
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="Min"
                value={filters.minCredits || ''}
                onChange={(e) => onFilterChange({ 
                  minCredits: e.target.value ? parseInt(e.target.value) : undefined 
                })}
                className="w-full border border-gray-300 rounded-md py-2 px-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                min="0"
                max="20"
              />
              <input
                type="number"
                placeholder="Max"
                value={filters.maxCredits || ''}
                onChange={(e) => onFilterChange({ 
                  maxCredits: e.target.value ? parseInt(e.target.value) : undefined 
                })}
                className="w-full border border-gray-300 rounded-md py-2 px-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                min="0"
                max="20"
              />
            </div>
          </div>

          {/* Available Spots Filter */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="hasAvailableSpots"
              checked={filters.hasAvailableSpots || false}
              onChange={(e) => onFilterChange({ 
                hasAvailableSpots: e.target.checked || undefined 
              })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="hasAvailableSpots" className="ml-2 block text-sm text-gray-700">
              Available spots only
            </label>
          </div>

          {/* Active Only Filter */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="isActive"
              checked={filters.isActive || false}
              onChange={(e) => onFilterChange({ 
                isActive: e.target.checked || undefined 
              })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="isActive" className="ml-2 block text-sm text-gray-700">
              Active courses only
            </label>
          </div>

          {/* Sort By */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sort By
            </label>
            <select
              value={filters.sortBy || 'title'}
              onChange={(e) => onFilterChange({ 
                sortBy: e.target.value as any
              })}
              className="w-full border border-gray-300 rounded-md py-2 px-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="title">Title</option>
              <option value="createdAt">Date Created</option>
              <option value="startDate">Start Date</option>
              <option value="popularity">Popularity</option>
            </select>
          </div>

          {/* Sort Order */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sort Order
            </label>
            <select
              value={filters.sortOrder || 'asc'}
              onChange={(e) => onFilterChange({ 
                sortOrder: e.target.value as 'asc' | 'desc'
              })}
              className="w-full border border-gray-300 rounded-md py-2 px-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="asc">Ascending</option>
              <option value="desc">Descending</option>
            </select>
          </div>
        </div>
      )}

      {/* Active Filters Display */}
      {activeFilterCount > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex flex-wrap gap-2">
            {filters.category && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                Category: {filters.category.replace('-', ' ')}
                <button
                  onClick={() => onFilterChange({ category: undefined })}
                  className="ml-2 inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-blue-200"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            )}
            
            {filters.level && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                Level: {filters.level}
                <button
                  onClick={() => onFilterChange({ level: undefined })}
                  className="ml-2 inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-green-200"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            )}
            
            {filters.status && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                Status: {filters.status}
                <button
                  onClick={() => onFilterChange({ status: undefined })}
                  className="ml-2 inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-yellow-200"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            )}
            
            {(filters.minCredits || filters.maxCredits) && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                Credits: {filters.minCredits || 0}-{filters.maxCredits || '∞'}
                <button
                  onClick={() => onFilterChange({ minCredits: undefined, maxCredits: undefined })}
                  className="ml-2 inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-purple-200"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            )}
            
            {filters.hasAvailableSpots && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-orange-100 text-orange-800">
                Available spots
                <button
                  onClick={() => onFilterChange({ hasAvailableSpots: undefined })}
                  className="ml-2 inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-orange-200"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            )}
            
            {filters.isActive && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                Active only
                <button
                  onClick={() => onFilterChange({ isActive: undefined })}
                  className="ml-2 inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-gray-200"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CourseFilters;