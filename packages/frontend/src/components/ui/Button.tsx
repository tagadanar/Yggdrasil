// packages/frontend/src/components/ui/Button.tsx
// Beautiful button component library with multiple variants

'use client';

import React, { forwardRef } from 'react';
import { cn } from '@/lib/utils/cn';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  'data-testid'?: string;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      loading = false,
      icon,
      iconPosition = 'left',
      fullWidth = false,
      disabled,
      children,
      'data-testid': testId,
      ...props
    },
    ref,
  ) => {
    const baseStyles = [
      'inline-flex items-center justify-center font-medium',
      'focus:outline-none focus:ring-2 focus:ring-offset-2',
      'disabled:opacity-50 disabled:cursor-not-allowed',
      'select-none',
      'rounded-lg',
    ];

    const variantStyles = {
      primary: ['bg-primary-600 text-white', 'hover:bg-primary-700', 'focus:ring-primary-500'],
      secondary: [
        'bg-white dark:bg-secondary-800',
        'text-secondary-700 dark:text-secondary-200',
        'border border-secondary-200 dark:border-secondary-600',
        'hover:bg-secondary-50 dark:hover:bg-secondary-700',
        'focus:ring-secondary-500',
      ],
      ghost: [
        'text-secondary-700 dark:text-secondary-200',
        'hover:bg-secondary-100 dark:hover:bg-secondary-800',
        'focus:ring-secondary-500',
      ],
      danger: ['bg-rose-600 text-white', 'hover:bg-rose-700', 'focus:ring-rose-500'],
    };

    const sizeStyles = {
      sm: ['px-3 py-1.5 text-sm', 'h-8'],
      md: ['px-4 py-2 text-sm', 'h-10'],
      lg: ['px-6 py-3 text-base', 'h-12'],
    };

    const fullWidthStyles = fullWidth ? 'w-full' : '';

    const LoadingSpinner = () => (
      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    );

    return (
      <button
        className={cn(
          baseStyles,
          variantStyles[variant],
          sizeStyles[size],
          fullWidthStyles,
          className,
        )}
        disabled={disabled || loading}
        data-testid={testId}
        ref={ref}
        {...props}
      >
        {loading && (
          <span className="mr-2">
            <LoadingSpinner />
          </span>
        )}

        {icon && iconPosition === 'left' && !loading && (
          <span className={cn('flex-shrink-0', children ? 'mr-2' : '')}>{icon}</span>
        )}

        {children && <span className={loading ? 'opacity-70' : ''}>{children}</span>}

        {icon && iconPosition === 'right' && !loading && (
          <span className={cn('flex-shrink-0', children ? 'ml-2' : '')}>{icon}</span>
        )}
      </button>
    );
  },
);

Button.displayName = 'Button';

export { Button };
