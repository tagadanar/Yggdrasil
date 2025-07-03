'use client';

import React, { ReactNode } from 'react';
import { clsx } from 'clsx';

interface DashboardCardProps {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  change?: {
    value: number;
    label: string;
    trend: 'up' | 'down' | 'neutral';
  };
  color?: 'primary' | 'success' | 'warning' | 'error';
  className?: string;
}

const colorClasses = {
  primary: {
    bg: 'bg-primary-50',
    icon: 'text-primary-600',
    trend: {
      up: 'text-primary-600',
      down: 'text-primary-600',
      neutral: 'text-gray-500',
    },
  },
  success: {
    bg: 'bg-green-50',
    icon: 'text-green-600',
    trend: {
      up: 'text-green-600',
      down: 'text-red-600',
      neutral: 'text-gray-500',
    },
  },
  warning: {
    bg: 'bg-yellow-50',
    icon: 'text-yellow-600',
    trend: {
      up: 'text-green-600',
      down: 'text-red-600',
      neutral: 'text-gray-500',
    },
  },
  error: {
    bg: 'bg-red-50',
    icon: 'text-red-600',
    trend: {
      up: 'text-green-600',
      down: 'text-red-600',
      neutral: 'text-gray-500',
    },
  },
};

export default function DashboardCard({
  title,
  value,
  icon: Icon,
  change,
  color = 'primary',
  className,
}: DashboardCardProps) {
  const colors = colorClasses[color];

  return (
    <div className={clsx('bg-white overflow-hidden shadow rounded-lg', className)}>
      <div className="p-5">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className={clsx('w-8 h-8 rounded-md flex items-center justify-center', colors.bg)}>
              <Icon className={clsx('w-5 h-5', colors.icon)} />
            </div>
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">{title}</dt>
              <dd className="flex items-baseline">
                <div className="text-2xl font-semibold text-gray-900">{value}</div>
                {change && (
                  <div className="ml-2 flex items-baseline text-sm font-semibold">
                    <span className={colors.trend[change.trend]}>
                      {change.trend === 'up' && '+'}
                      {change.value}%
                    </span>
                    <span className="ml-1 text-gray-500">{change.label}</span>
                  </div>
                )}
              </dd>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}