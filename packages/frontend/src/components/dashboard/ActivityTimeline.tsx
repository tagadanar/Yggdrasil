// packages/frontend/src/components/dashboard/ActivityTimeline.tsx
// Reusable activity timeline component for dashboards

'use client';

import React from 'react';
import {
  CheckCircleIcon,
  BookOpenIcon,
  DocumentTextIcon,
  UserIcon,
  ClockIcon,
  TrophyIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline';

interface ActivityItem {
  id: string;
  type: 'exercise' | 'section' | 'course_complete' | 'assignment' | 'achievement' | 'promotion_join' | 'submission';
  title: string;
  description?: string;
  timestamp: Date;
  user?: {
    name: string;
    avatar?: string;
  };
  metadata?: {
    score?: number;
    course?: string;
    status?: 'completed' | 'pending' | 'graded';
  };
}

interface ActivityTimelineProps {
  activities: ActivityItem[];
  maxItems?: number;
  showEmpty?: boolean;
  testId?: string;
}

export const ActivityTimeline: React.FC<ActivityTimelineProps> = ({
  activities,
  maxItems = 10,
  showEmpty = true,
  testId
}) => {
  const displayActivities = activities.slice(0, maxItems);

  const getActivityIcon = (type: string) => {
    const iconClasses = "h-5 w-5";
    
    switch (type) {
      case 'exercise':
        return <DocumentTextIcon className={`${iconClasses} text-blue-600 dark:text-blue-400`} />;
      case 'section':
        return <BookOpenIcon className={`${iconClasses} text-green-600 dark:text-green-400`} />;
      case 'course_complete':
        return <TrophyIcon className={`${iconClasses} text-yellow-600 dark:text-yellow-400`} />;
      case 'assignment':
        return <DocumentTextIcon className={`${iconClasses} text-purple-600 dark:text-purple-400`} />;
      case 'achievement':
        return <TrophyIcon className={`${iconClasses} text-orange-600 dark:text-orange-400`} />;
      case 'promotion_join':
        return <UserIcon className={`${iconClasses} text-indigo-600 dark:text-indigo-400`} />;
      case 'submission':
        return <ExclamationCircleIcon className={`${iconClasses} text-red-600 dark:text-red-400`} />;
      default:
        return <ClockIcon className={`${iconClasses} text-gray-600 dark:text-gray-400`} />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'exercise':
        return 'bg-blue-100 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
      case 'section':
        return 'bg-green-100 dark:bg-green-900/20 border-green-200 dark:border-green-800';
      case 'course_complete':
        return 'bg-yellow-100 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800';
      case 'assignment':
        return 'bg-purple-100 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800';
      case 'achievement':
        return 'bg-orange-100 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800';
      case 'promotion_join':
        return 'bg-indigo-100 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800';
      case 'submission':
        return 'bg-red-100 dark:bg-red-900/20 border-red-200 dark:border-red-800';
      default:
        return 'bg-gray-100 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800';
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const diffMinutes = Math.floor(diff / (1000 * 60));
    const diffHours = Math.floor(diff / (1000 * 60 * 60));
    const diffDays = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return timestamp.toLocaleDateString();
  };

  const getStatusBadge = (status?: string, score?: number) => {
    if (score !== undefined) {
      const scoreColor = score >= 90 ? 'green' : score >= 70 ? 'yellow' : 'red';
      return (
        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium
          ${scoreColor === 'green' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-200' : ''}
          ${scoreColor === 'yellow' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200' : ''}
          ${scoreColor === 'red' ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-200' : ''}
        `}>
          {score}%
        </span>
      );
    }

    if (status) {
      const statusColors = {
        completed: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-200',
        pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200',
        graded: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-200'
      };

      return (
        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium
          ${statusColors[status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-200'}
        `}>
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
      );
    }

    return null;
  };

  if (displayActivities.length === 0) {
    if (!showEmpty) return null;
    
    return (
      <div className="text-center py-8" data-testid={testId}>
        <ClockIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">No Recent Activity</h3>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Recent activities will appear here once available.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3" data-testid={testId}>
      {displayActivities.map((activity, index) => (
        <div
          key={activity.id}
          className={`relative flex items-start space-x-3 p-3 rounded-lg border ${getActivityColor(activity.type)}`}
          data-testid={`${testId}-item`}
        >
          <div className="flex-shrink-0">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white dark:bg-gray-800 border-2 border-current">
              {getActivityIcon(activity.type)}
            </div>
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {activity.title}
              </p>
              <div className="flex items-center space-x-2">
                {getStatusBadge(activity.metadata?.status, activity.metadata?.score)}
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {formatTimestamp(activity.timestamp)}
                </span>
              </div>
            </div>
            
            {activity.description && (
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                {activity.description}
              </p>
            )}
            
            {activity.metadata?.course && (
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">
                Course: {activity.metadata.course}
              </p>
            )}
            
            {activity.user && (
              <div className="mt-2 flex items-center space-x-2">
                {activity.user.avatar ? (
                  <img
                    src={activity.user.avatar}
                    alt={activity.user.name}
                    className="w-5 h-5 rounded-full"
                  />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                      {activity.user.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <span className="text-xs text-gray-500 dark:text-gray-500">
                  {activity.user.name}
                </span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};