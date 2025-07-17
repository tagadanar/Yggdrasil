// packages/frontend/src/components/planning/ConflictWarningModal.tsx
// Modal for displaying scheduling conflicts

'use client';

import React from 'react';
import { XMarkIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface Conflict {
  eventId: string;
  title: string;
  location: string;
  startDate: Date;
  endDate: Date;
}

interface ConflictWarningModalProps {
  isOpen: boolean;
  conflicts: Conflict[];
  onClose: () => void;
  onProceed: () => void;
}

export const ConflictWarningModal: React.FC<ConflictWarningModalProps> = ({
  isOpen,
  conflicts,
  onClose,
  onProceed
}) => {
  if (!isOpen) return null;

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 max-w-lg shadow-lg rounded-md bg-white">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <ExclamationTriangleIcon className="h-6 w-6 text-yellow-500" />
            <h3 className="text-lg font-semibold text-gray-900">Scheduling Conflict Detected</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Warning Message */}
        <div className="mb-4" data-testid="conflict-warning">
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
            <div className="flex">
              <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400 mt-0.5" />
              <div className="ml-3">
                <h4 className="text-sm font-medium text-yellow-800">
                  {conflicts.length === 1 ? 'Conflict Found' : `${conflicts.length} Conflicts Found`}
                </h4>
                <p className="text-sm text-yellow-700 mt-1">
                  The event you're trying to create conflicts with existing events. 
                  You can still proceed if needed.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Conflict Details */}
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Conflicting Events:</h4>
          <div className="space-y-3 max-h-60 overflow-y-auto">
            {conflicts.map((conflict, index) => (
              <div
                key={conflict.eventId || index}
                className="bg-gray-50 border border-gray-200 rounded-md p-3"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h5 className="font-medium text-gray-900 text-sm">{conflict.title}</h5>
                    <p className="text-xs text-gray-600 mt-1">
                      📍 {conflict.location}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      🕒 {formatDate(conflict.startDate)} {formatTime(conflict.startDate)} - {formatTime(conflict.endDate)}
                    </p>
                  </div>
                  <span className="inline-block px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">
                    Conflict
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Conflict Resolution Options */}
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">What would you like to do?</h4>
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
            <p className="text-sm text-blue-700">
              <strong>Proceed Anyway:</strong> Create the event despite the conflicts. 
              This may result in double-booking of resources.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 pt-4 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
          >
            Cancel
          </button>
          <button
            onClick={onProceed}
            className="px-4 py-2 text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700 rounded-md"
            data-testid="proceed-anyway-button"
          >
            Proceed Anyway
          </button>
        </div>

        {/* Additional Information */}
        <div className="mt-4 p-3 bg-gray-50 rounded-md">
          <h5 className="text-xs font-medium text-gray-700 mb-1">Tips to Avoid Conflicts:</h5>
          <ul className="text-xs text-gray-600 space-y-1">
            <li>• Check the calendar before scheduling events</li>
            <li>• Consider alternative time slots or locations</li>
            <li>• Contact involved parties to resolve scheduling issues</li>
            <li>• Use different rooms or resources when possible</li>
          </ul>
        </div>
      </div>
    </div>
  );
};