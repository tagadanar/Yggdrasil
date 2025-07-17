// packages/frontend/src/components/progress/ProgressTracker.tsx
// Reusable progress tracking component for courses and learning content

'use client';

import React from 'react';
import { 
  CheckCircleIcon, 
  ClockIcon, 
  BookOpenIcon,
  PlayIcon,
  AcademicCapIcon 
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleIconSolid } from '@heroicons/react/24/solid';

interface ProgressItem {
  id: string;
  title: string;
  type: 'text' | 'video' | 'exercise' | 'quiz' | 'file';
  isCompleted: boolean;
  isOptional?: boolean;
  estimatedMinutes?: number;
}

interface ProgressSection {
  id: string;
  title: string;
  items: ProgressItem[];
  isCompleted: boolean;
}

interface ProgressChapter {
  id: string;
  title: string;
  sections: ProgressSection[];
  isCompleted: boolean;
}

interface ProgressTrackerProps {
  courseId: string;
  courseTitle: string;
  chapters: ProgressChapter[];
  overallProgress: number; // 0-100
  timeSpent?: number; // minutes
  estimatedTimeRemaining?: number; // minutes
  onItemClick?: (itemId: string, itemType: string) => void;
  compact?: boolean;
  showTimeEstimates?: boolean;
}

export const ProgressTracker: React.FC<ProgressTrackerProps> = ({
  courseId,
  courseTitle,
  chapters,
  overallProgress,
  timeSpent = 0,
  estimatedTimeRemaining,
  onItemClick,
  compact = false,
  showTimeEstimates = true
}) => {
  const getTypeIcon = (type: string, isCompleted: boolean) => {
    const iconClass = `h-4 w-4 ${isCompleted ? 'text-green-600' : 'text-gray-400'}`;
    
    switch (type) {
      case 'text':
        return <BookOpenIcon className={iconClass} />;
      case 'video':
        return <PlayIcon className={iconClass} />;
      case 'exercise':
        return <AcademicCapIcon className={iconClass} />;
      case 'quiz':
        return <AcademicCapIcon className={iconClass} />;
      case 'file':
        return <BookOpenIcon className={iconClass} />;
      default:
        return <BookOpenIcon className={iconClass} />;
    }
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const getTotalItems = () => {
    return chapters.reduce((total, chapter) => 
      total + chapter.sections.reduce((sectionTotal, section) => 
        sectionTotal + section.items.length, 0), 0);
  };

  const getCompletedItems = () => {
    return chapters.reduce((total, chapter) => 
      total + chapter.sections.reduce((sectionTotal, section) => 
        sectionTotal + section.items.filter(item => item.isCompleted).length, 0), 0);
  };

  const totalItems = getTotalItems();
  const completedItems = getCompletedItems();

  if (compact) {
    return (
      <div className="bg-white rounded-lg border p-4" data-testid="progress-tracker-compact">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900">{courseTitle}</h3>
          <span className="text-sm text-gray-600">
            {completedItems}/{totalItems} completed
          </span>
        </div>
        
        {/* Progress Bar */}
        <div className="mb-3">
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>Progress</span>
            <span>{Math.round(overallProgress)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
        </div>

        {showTimeEstimates && (timeSpent > 0 || estimatedTimeRemaining) && (
          <div className="flex justify-between text-xs text-gray-500">
            {timeSpent > 0 && (
              <span className="flex items-center">
                <ClockIcon className="h-3 w-3 mr-1" />
                {formatTime(timeSpent)} spent
              </span>
            )}
            {estimatedTimeRemaining && (
              <span>{formatTime(estimatedTimeRemaining)} remaining</span>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border" data-testid="progress-tracker">
      {/* Header */}
      <div className="p-6 border-b">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">{courseTitle}</h2>
          <span className="text-sm text-gray-600">
            {completedItems} of {totalItems} items completed
          </span>
        </div>
        
        {/* Overall Progress */}
        <div className="mb-4">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Overall Progress</span>
            <span>{Math.round(overallProgress)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className="bg-indigo-600 h-3 rounded-full transition-all duration-300"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
        </div>

        {/* Time Statistics */}
        {showTimeEstimates && (
          <div className="flex space-x-6 text-sm text-gray-600">
            {timeSpent > 0 && (
              <div className="flex items-center">
                <ClockIcon className="h-4 w-4 mr-1" />
                <span>{formatTime(timeSpent)} spent</span>
              </div>
            )}
            {estimatedTimeRemaining && (
              <div className="flex items-center">
                <ClockIcon className="h-4 w-4 mr-1" />
                <span>{formatTime(estimatedTimeRemaining)} remaining</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Chapters and Content */}
      <div className="p-6">
        <div className="space-y-4">
          {chapters.map((chapter) => (
            <div key={chapter.id} className="border rounded-lg">
              {/* Chapter Header */}
              <div className="p-4 bg-gray-50 border-b">
                <div className="flex items-center space-x-3">
                  {chapter.isCompleted ? (
                    <CheckCircleIconSolid className="h-5 w-5 text-green-600" />
                  ) : (
                    <div className="h-5 w-5 border-2 border-gray-300 rounded-full" />
                  )}
                  <span className="font-medium text-gray-900">{chapter.title}</span>
                  <span className="text-sm text-gray-500">
                    ({chapter.sections.filter(s => s.isCompleted).length}/{chapter.sections.length} sections)
                  </span>
                </div>
              </div>

              {/* Sections */}
              <div className="p-4 space-y-3">
                {chapter.sections.map((section) => (
                  <div key={section.id} className="ml-4">
                    <div className="flex items-center space-x-3 mb-2">
                      {section.isCompleted ? (
                        <CheckCircleIconSolid className="h-4 w-4 text-green-600" />
                      ) : (
                        <div className="h-4 w-4 border-2 border-gray-300 rounded-full" />
                      )}
                      <span className="font-medium text-gray-800 text-sm">{section.title}</span>
                      <span className="text-xs text-gray-500">
                        ({section.items.filter(item => item.isCompleted).length}/{section.items.length} items)
                      </span>
                    </div>

                    {/* Section Items */}
                    <div className="ml-6 space-y-1">
                      {section.items.map((item) => (
                        <div
                          key={item.id}
                          className={`flex items-center space-x-3 py-1 px-2 rounded cursor-pointer hover:bg-gray-50 ${
                            item.isCompleted ? 'text-gray-700' : 'text-gray-600'
                          }`}
                          onClick={() => onItemClick?.(item.id, item.type)}
                          data-testid={`progress-item-${item.id}`}
                        >
                          {item.isCompleted ? (
                            <CheckCircleIconSolid className="h-3 w-3 text-green-600 flex-shrink-0" />
                          ) : (
                            <div className="h-3 w-3 border border-gray-300 rounded-full flex-shrink-0" />
                          )}
                          
                          {getTypeIcon(item.type, item.isCompleted)}
                          
                          <span className="text-xs flex-1">{item.title}</span>
                          
                          {item.isOptional && (
                            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                              Optional
                            </span>
                          )}
                          
                          {item.estimatedMinutes && showTimeEstimates && (
                            <span className="text-xs text-gray-400">
                              {item.estimatedMinutes}m
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProgressTracker;