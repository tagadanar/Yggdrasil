'use client';

import React from 'react';
import NextLink from 'next/link';
import { cn } from '@/lib/utils/cn';

interface LinkProps {
  href: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
  variant?: 'default' | 'card' | 'nav' | 'button';
  className?: string;
  external?: boolean;
}

export function Link({ 
  href, 
  children, 
  icon, 
  variant = 'default', 
  className,
  external = false,
  ...props 
}: LinkProps) {
  const baseStyles = [
    'transition-all duration-200',
    'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
  ];

  const variantStyles = {
    default: [
      'inline-flex items-center gap-2',
      'text-primary-600 dark:text-primary-400',
      'hover:text-primary-700 dark:hover:text-primary-300',
      'hover:underline',
    ],
    card: [
      'block p-6 rounded-xl',
      'bg-white dark:bg-secondary-800',
      'border border-secondary-200 dark:border-secondary-700',
      'shadow-sm hover:shadow-md',
      'hover:border-secondary-300 dark:hover:border-secondary-600',
      'text-secondary-900 dark:text-secondary-100',
    ],
    nav: [
      'flex items-center gap-3 px-4 py-3 rounded-lg',
      'text-secondary-700 dark:text-secondary-200',
      'hover:bg-secondary-100 dark:hover:bg-secondary-700',
      'hover:text-secondary-900 dark:hover:text-secondary-50',
    ],
    button: [
      'inline-flex items-center justify-center gap-2',
      'px-4 py-2 rounded-lg',
      'bg-primary-600 hover:bg-primary-700',
      'text-white font-medium',
      'shadow-sm hover:shadow-md',
    ],
  };

  const content = (
    <>
      {icon && (
        <span className="flex-shrink-0">
          {icon}
        </span>
      )}
      <span>{children}</span>
    </>
  );

  const linkProps = {
    className: cn(baseStyles, variantStyles[variant], className),
    ...props,
  };

  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" {...linkProps}>
        {content}
      </a>
    );
  }

  return (
    <NextLink href={href} {...linkProps}>
      {content}
    </NextLink>
  );
}