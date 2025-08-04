// packages/frontend/src/components/planning/ExportCalendarModal.tsx
// Modal for exporting calendar data

'use client';

import React, { useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface ExportCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (exportData: any) => void;
}

export const ExportCalendarModal: React.FC<ExportCalendarModalProps> = ({
  isOpen,
  onClose,
  onExport
}) => {
  const [formData, setFormData] = useState({
    format: 'ical' as 'ical' | 'csv',
    range: 'month' as 'week' | 'month' | 'semester' | 'year' | 'custom',
    startDate: '',
    endDate: '',
    eventType: '',
    includePrivate: false
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    let startDate = '';
    let endDate = '';
    const today = new Date();

    // Calculate date range based on selected range
    switch (formData.range) {
      case 'week':
        startDate = today.toISOString();
        const weekEnd = new Date(today);
        weekEnd.setDate(today.getDate() + 7);
        endDate = weekEnd.toISOString();
        break;
      case 'month':
        startDate = today.toISOString();
        const monthEnd = new Date(today);
        monthEnd.setMonth(today.getMonth() + 1);
        endDate = monthEnd.toISOString();
        break;
      case 'semester':
        startDate = today.toISOString();
        const semesterEnd = new Date(today);
        semesterEnd.setMonth(today.getMonth() + 6);
        endDate = semesterEnd.toISOString();
        break;
      case 'year':
        startDate = today.toISOString();
        const yearEnd = new Date(today);
        yearEnd.setFullYear(today.getFullYear() + 1);
        endDate = yearEnd.toISOString();
        break;
      case 'custom':
        startDate = new Date(formData.startDate).toISOString();
        endDate = new Date(formData.endDate).toISOString();
        break;
    }

    const exportData = {
      format: formData.format,
      startDate,
      endDate,
      eventType: formData.eventType || undefined,
      includePrivate: formData.includePrivate
    };

    onExport(exportData);
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50" data-testid="export-calendar-modal">
      <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 max-w-md shadow-lg rounded-md bg-white">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Export Calendar</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            data-testid="modal-close"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Export Format */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Export Format
            </label>
            <select
              value={formData.format}
              onChange={(e) => handleInputChange('format', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              data-testid="export-format"
            >
              <option value="ical">iCal (.ics)</option>
              <option value="csv">CSV (.csv)</option>
            </select>
          </div>

          {/* Date Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date Range
            </label>
            <select
              value={formData.range}
              onChange={(e) => handleInputChange('range', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              data-testid="export-range"
            >
              <option value="week">Next Week</option>
              <option value="month">Next Month</option>
              <option value="semester">Next Semester (6 months)</option>
              <option value="year">Next Year</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          {/* Custom Date Range */}
          {formData.range === 'custom' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  required
                  value={formData.startDate}
                  onChange={(e) => handleInputChange('startDate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  data-testid="export-start-date"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  required
                  value={formData.endDate}
                  onChange={(e) => handleInputChange('endDate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  data-testid="export-end-date"
                />
              </div>
            </div>
          )}

          {/* Event Type Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Event Type (Optional)
            </label>
            <select
              value={formData.eventType}
              onChange={(e) => handleInputChange('eventType', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              data-testid="export-event-type"
            >
              <option value="">All Event Types</option>
              <option value="class">Classes Only</option>
              <option value="exam">Exams Only</option>
              <option value="meeting">Meetings Only</option>
              <option value="event">Events Only</option>
            </select>
          </div>

          {/* Include Private Events */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="include-private"
              checked={formData.includePrivate}
              onChange={(e) => handleInputChange('includePrivate', e.target.checked)}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              data-testid="export-include-private"
            />
            <label htmlFor="include-private" className="ml-2 text-sm text-gray-700">
              Include private events
            </label>
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
              data-testid="export-close"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md"
              data-testid="download-export-button"
            >
              Download Export
            </button>
          </div>
        </form>

        {/* Export Info */}
        <div className="mt-4 p-3 bg-gray-50 rounded-md">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Export Information</h4>
          <ul className="text-xs text-gray-600 space-y-1">
            <li>• iCal format is compatible with most calendar applications</li>
            <li>• CSV format can be imported into spreadsheet applications</li>
            <li>• Large date ranges may take longer to export</li>
            <li>• Private events are only included if you have permission</li>
          </ul>
        </div>
      </div>
    </div>
  );
};