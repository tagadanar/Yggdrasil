// packages/frontend/src/components/dashboard/StatCard.tsx
// Reusable statistics card component for dashboards

'use client';

import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
    label: string;
  };
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'indigo' | 'teal';
  testId?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  color = 'blue',
  testId
}) => {
  const getColorClasses = (color: string) => {
    const colorMap = {
      blue: 'text-blue-600 dark:text-blue-400',
      green: 'text-green-600 dark:text-green-400',
      purple: 'text-purple-600 dark:text-purple-400',
      orange: 'text-orange-600 dark:text-orange-400',
      red: 'text-red-600 dark:text-red-400',
      indigo: 'text-indigo-600 dark:text-indigo-400',
      teal: 'text-teal-600 dark:text-teal-400'
    };
    return colorMap[color as keyof typeof colorMap] || colorMap.blue;
  };

  const getTrendClasses = (isPositive: boolean) => {
    return isPositive 
      ? 'text-green-600 dark:text-green-400' 
      : 'text-red-600 dark:text-red-400';
  };

  return (
    <div 
      className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 transition-shadow hover:shadow-md"
      data-testid={testId}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
            {title}
          </p>
          <p 
            className="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-100"
            data-testid={testId ? `${testId}-value` : undefined}
          >
            {value}
          </p>
          {subtitle && (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {subtitle}
            </p>
          )}
          {trend && (
            <div className="mt-2 flex items-center">
              <span className={`text-sm font-medium ${getTrendClasses(trend.isPositive)}`}>
                {trend.isPositive ? '+' : ''}{trend.value}%
              </span>
              <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                {trend.label}
              </span>
            </div>
          )}
        </div>
        {icon && (
          <div className={`h-12 w-12 ${getColorClasses(color)}`}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
};