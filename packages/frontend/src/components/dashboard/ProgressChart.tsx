// packages/frontend/src/components/dashboard/ProgressChart.tsx
// Reusable progress visualization component

'use client';

import React from 'react';

interface ProgressBarProps {
  value: number;
  max?: number;
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'indigo';
  showPercentage?: boolean;
  size?: 'sm' | 'md' | 'lg';
  testId?: string;
}

interface ProgressDistributionProps {
  data: {
    label: string;
    value: number;
    color?: string;
  }[];
  testId?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max = 100,
  color = 'blue',
  showPercentage = true,
  size = 'md',
  testId
}) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  const getColorClasses = (color: string) => {
    const colorMap = {
      blue: 'bg-blue-600 dark:bg-blue-400',
      green: 'bg-green-600 dark:bg-green-400',
      purple: 'bg-purple-600 dark:bg-purple-400',
      orange: 'bg-orange-600 dark:bg-orange-400',
      red: 'bg-red-600 dark:bg-red-400',
      indigo: 'bg-indigo-600 dark:bg-indigo-400'
    };
    return colorMap[color as keyof typeof colorMap] || colorMap.blue;
  };

  const getSizeClasses = (size: string) => {
    const sizeMap = {
      sm: 'h-1',
      md: 'h-2',
      lg: 'h-3'
    };
    return sizeMap[size as keyof typeof sizeMap] || sizeMap.md;
  };

  const getTextColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-600 dark:text-green-400';
    if (percentage >= 50) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  return (
    <div className="w-full" data-testid={testId}>
      <div className="flex items-center justify-between mb-1">
        {showPercentage && (
          <span 
            className={`text-sm font-medium ${getTextColor(percentage)}`}
            data-testid={testId ? `${testId}-percentage` : undefined}
          >
            {Math.round(percentage)}%
          </span>
        )}
      </div>
      <div className={`w-full bg-gray-200 dark:bg-gray-700 rounded-full ${getSizeClasses(size)}`}>
        <div
          className={`${getSizeClasses(size)} rounded-full transition-all duration-300 ${getColorClasses(color)}`}
          style={{ width: `${percentage}%` }}
          role="progressbar"
          aria-valuenow={percentage}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
    </div>
  );
};

export const ProgressDistribution: React.FC<ProgressDistributionProps> = ({
  data,
  testId
}) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="space-y-4" data-testid={testId}>
      {data.map((item, index) => {
        const percentage = total > 0 ? (item.value / total) * 100 : 0;
        
        return (
          <div key={index} className="flex items-center justify-between">
            <div className="flex items-center flex-1">
              <div
                className="w-3 h-3 rounded-full mr-3"
                style={{ backgroundColor: item.color || '#3B82F6' }}
              />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {item.label}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {item.value}
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-500">
                ({Math.round(percentage)}%)
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

interface ProgressRingProps {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  showValue?: boolean;
  label?: string;
  testId?: string;
}

export const ProgressRing: React.FC<ProgressRingProps> = ({
  value,
  max = 100,
  size = 80,
  strokeWidth = 6,
  color = '#3B82F6',
  showValue = true,
  label,
  testId
}) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div 
      className="relative inline-flex items-center justify-center"
      data-testid={testId}
    >
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          className="text-gray-200 dark:text-gray-700"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeLinecap="round"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-300 ease-in-out"
        />
      </svg>
      {showValue && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
            {Math.round(percentage)}%
          </span>
          {label && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {label}
            </span>
          )}
        </div>
      )}
    </div>
  );
};