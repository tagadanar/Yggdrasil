// packages/frontend/src/components/dashboard/LoadingState.tsx
// Reusable loading state components for dashboards

'use client';

import React from 'react';
import {
  ChartBarIcon,
  UserGroupIcon,
  BookOpenIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

interface LoadingStateProps {
  type?: 'dashboard' | 'chart' | 'table' | 'card' | 'minimal';
  message?: string;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
  testId?: string;
}

interface SkeletonProps {
  height?: string;
  width?: string;
  className?: string;
  rounded?: boolean;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  height = 'h-4',
  width = 'w-full',
  className = '',
  rounded = false
}) => {
  return (
    <div
      className={`bg-gray-200 dark:bg-gray-700 animate-pulse ${height} ${width} ${
        rounded ? 'rounded-full' : 'rounded'
      } ${className}`}
    />
  );
};

export const LoadingState: React.FC<LoadingStateProps> = ({
  type = 'dashboard',
  message,
  showIcon = true,
  size = 'md',
  testId
}) => {
  const getLoadingIcon = () => {
    switch (type) {
      case 'chart':
        return <ChartBarIcon className="h-8 w-8" />;
      case 'table':
        return <UserGroupIcon className="h-8 w-8" />;
      case 'card':
        return <BookOpenIcon className="h-8 w-8" />;
      default:
        return <ClockIcon className="h-8 w-8" />;
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'min-h-[200px]';
      case 'lg':
        return 'min-h-[600px]';
      default:
        return 'min-h-[400px]';
    }
  };

  const getDefaultMessage = () => {
    switch (type) {
      case 'chart':
        return 'Loading chart data...';
      case 'table':
        return 'Loading table data...';
      case 'card':
        return 'Loading statistics...';
      default:
        return 'Loading dashboard...';
    }
  };

  if (type === 'minimal') {
    return (
      <div className="flex items-center justify-center py-4" data-testid={testId}>
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
        {message && (
          <span className="ml-3 text-sm text-gray-600 dark:text-gray-400">{message}</span>
        )}
      </div>
    );
  }

  return (
    <div 
      className={`flex flex-col items-center justify-center ${getSizeClasses()} p-6`}
      data-testid={testId}
    >
      <div className="text-center">
        {showIcon && (
          <div className="flex justify-center mb-4">
            <div className="text-gray-400 dark:text-gray-600 animate-pulse">
              {getLoadingIcon()}
            </div>
          </div>
        )}
        
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
        
        <p className="text-gray-600 dark:text-gray-400 text-lg font-medium">
          {message || getDefaultMessage()}
        </p>
        
        <div className="mt-2 flex items-center justify-center space-x-1">
          <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce"></div>
          <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
          <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
        </div>
      </div>
    </div>
  );
};

// Skeleton loading components for specific dashboard elements
export const StatCardSkeleton: React.FC = () => (
  <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
    <div className="flex items-center justify-between">
      <div className="flex-1">
        <Skeleton height="h-4" width="w-24" className="mb-2" />
        <Skeleton height="h-8" width="w-16" className="mb-1" />
        <Skeleton height="h-3" width="w-20" />
      </div>
      <Skeleton height="h-12" width="w-12" rounded />
    </div>
  </div>
);

export const TableSkeleton: React.FC<{ rows?: number; columns?: number }> = ({
  rows = 5,
  columns = 4
}) => (
  <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
    <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
      <Skeleton height="h-6" width="w-32" />
    </div>
    <div className="overflow-x-auto">
      <table className="min-w-full">
        <thead className="bg-gray-50 dark:bg-gray-900">
          <tr>
            {Array.from({ length: columns }).map((_, i) => (
              <th key={i} className="px-6 py-3">
                <Skeleton height="h-4" width="w-20" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <tr key={rowIndex}>
              {Array.from({ length: columns }).map((_, colIndex) => (
                <td key={colIndex} className="px-6 py-4">
                  <Skeleton height="h-4" width={colIndex === 0 ? 'w-32' : 'w-16'} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

export const ChartSkeleton: React.FC<{ height?: string }> = ({ height = 'h-64' }) => (
  <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
    <div className="flex justify-between items-center mb-4">
      <Skeleton height="h-6" width="w-32" />
      <Skeleton height="h-8" width="w-24" />
    </div>
    <div className={`${height} flex items-end justify-between space-x-2`}>
      {Array.from({ length: 7 }).map((_, i) => (
        <Skeleton
          key={i}
          height={`h-${Math.floor(Math.random() * 6) + 8}`}
          width="w-8"
          className="flex-shrink-0"
        />
      ))}
    </div>
  </div>
);

export const DashboardSkeleton: React.FC = () => (
  <div className="space-y-6">
    {/* Header */}
    <div className="flex justify-between items-center">
      <Skeleton height="h-8" width="w-48" />
      <Skeleton height="h-10" width="w-32" />
    </div>
    
    {/* Stat Cards */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <StatCardSkeleton key={i} />
      ))}
    </div>
    
    {/* Main Content */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <TableSkeleton />
      <ChartSkeleton />
    </div>
  </div>
);