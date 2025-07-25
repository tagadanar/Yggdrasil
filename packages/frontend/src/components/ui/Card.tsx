'use client';

import React from 'react';
import { cn } from '@/lib/utils/cn';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'elevated' | 'outlined' | 'glass';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
}

export function Card({ 
  children, 
  className, 
  variant = 'default',
  padding = 'md',
  hover = false
}: CardProps) {
  const baseStyles = [
    'rounded-xl transition-all duration-200',
  ];

  const variantStyles = {
    default: [
      'bg-white dark:bg-secondary-800',
      'border border-secondary-200 dark:border-secondary-700',
      'shadow-sm',
    ],
    elevated: [
      'bg-white dark:bg-secondary-800',
      'border border-secondary-200 dark:border-secondary-700',
      'shadow-lg',
    ],
    outlined: [
      'bg-transparent',
      'border-2 border-secondary-200 dark:border-secondary-700',
    ],
    glass: [
      'backdrop-blur-md bg-white/80 dark:bg-secondary-800/80',
      'border border-white/20 dark:border-white/10',
      'shadow-lg',
    ],
  };

  const paddingStyles = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  const hoverStyles = hover ? [
    'hover:shadow-md dark:hover:shadow-dark-medium',
    'hover:border-secondary-300 dark:hover:border-secondary-600',
  ] : [];

  return (
    <div
      className={cn(
        baseStyles,
        variantStyles[variant],
        paddingStyles[padding],
        hoverStyles,
        className
      )}
    >
      {children}
    </div>
  );
}