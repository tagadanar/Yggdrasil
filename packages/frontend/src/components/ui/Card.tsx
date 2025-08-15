'use client';

import React from 'react';
import { cn } from '@/lib/utils/cn';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'outlined';
  padding?: 'sm' | 'md' | 'lg';
  hover?: boolean;
}

export function Card({
  children,
  className,
  variant = 'default',
  padding = 'md',
  hover = false,
}: CardProps) {
  const baseStyles = ['rounded-lg'];

  const variantStyles = {
    default: [
      'bg-white dark:bg-secondary-800',
      'border border-secondary-200 dark:border-secondary-700',
      'shadow-sm',
    ],
    outlined: [
      'bg-white dark:bg-secondary-800',
      'border border-secondary-200 dark:border-secondary-700',
    ],
  };

  const paddingStyles = {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  const hoverStyles = hover ? ['hover:shadow-md'] : [];

  return (
    <div
      className={cn(
        baseStyles,
        variantStyles[variant],
        paddingStyles[padding],
        hoverStyles,
        className,
      )}
    >
      {children}
    </div>
  );
}
