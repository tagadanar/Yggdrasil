// packages/frontend/src/components/ui/Button.tsx
// Beautiful button component library with multiple variants

'use client';

import React, { forwardRef } from 'react';
import { cn } from '@/lib/utils/cn';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger' | 'success' | 'warning' | 'glass';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  rounded?: boolean;
  glow?: boolean;
  shimmer?: boolean;
  'data-testid'?: string;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({
    className,
    variant = 'primary',
    size = 'md',
    loading = false,
    icon,
    iconPosition = 'left',
    fullWidth = false,
    rounded = false,
    glow = false,
    shimmer = false,
    disabled,
    children,
    'data-testid': testId,
    ...props
  }, ref) => {
    const baseStyles = [
      // Base button styles
      'inline-flex items-center justify-center font-medium transition-all duration-200',
      'focus:outline-none focus:ring-2 focus:ring-offset-2',
      'disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none',
      'relative overflow-hidden',
      'select-none',
      // Smooth transform for interactions
      'transform-gpu',
      'active:scale-95',
    ];

    const variantStyles = {
      primary: [
        'bg-gradient-to-r from-primary-500 to-primary-600',
        'text-white shadow-lg shadow-primary-500/25',
        'hover:from-primary-600 hover:to-primary-700',
        'hover:shadow-xl hover:shadow-primary-500/30',
        'focus:ring-primary-500',
        'dark:from-primary-400 dark:to-primary-500',
        'dark:hover:from-primary-500 dark:hover:to-primary-600',
        'dark:shadow-primary-400/20',
        'dark:hover:shadow-primary-400/30',
      ],
      secondary: [
        'bg-white dark:bg-secondary-800',
        'text-secondary-700 dark:text-secondary-200',
        'border border-secondary-200 dark:border-secondary-600',
        'shadow-sm hover:shadow-md',
        'hover:bg-secondary-50 dark:hover:bg-secondary-700',
        'focus:ring-secondary-500',
        'hover:border-secondary-300 dark:hover:border-secondary-500',
      ],
      ghost: [
        'text-secondary-700 dark:text-secondary-200',
        'hover:bg-secondary-100 dark:hover:bg-secondary-800',
        'focus:ring-secondary-500',
        'hover:shadow-sm',
      ],
      outline: [
        'border-2 border-primary-500 dark:border-primary-400',
        'text-primary-600 dark:text-primary-400',
        'hover:bg-primary-50 dark:hover:bg-primary-900/20',
        'focus:ring-primary-500',
        'hover:shadow-lg hover:shadow-primary-500/20',
      ],
      danger: [
        'bg-gradient-to-r from-rose-500 to-rose-600',
        'text-white shadow-lg shadow-rose-500/25',
        'hover:from-rose-600 hover:to-rose-700',
        'hover:shadow-xl hover:shadow-rose-500/30',
        'focus:ring-rose-500',
        'dark:from-rose-400 dark:to-rose-500',
        'dark:hover:from-rose-500 dark:hover:to-rose-600',
      ],
      success: [
        'bg-gradient-to-r from-emerald-500 to-emerald-600',
        'text-white shadow-lg shadow-emerald-500/25',
        'hover:from-emerald-600 hover:to-emerald-700',
        'hover:shadow-xl hover:shadow-emerald-500/30',
        'focus:ring-emerald-500',
        'dark:from-emerald-400 dark:to-emerald-500',
        'dark:hover:from-emerald-500 dark:hover:to-emerald-600',
      ],
      warning: [
        'bg-gradient-to-r from-amber-500 to-amber-600',
        'text-white shadow-lg shadow-amber-500/25',
        'hover:from-amber-600 hover:to-amber-700',
        'hover:shadow-xl hover:shadow-amber-500/30',
        'focus:ring-amber-500',
        'dark:from-amber-400 dark:to-amber-500',
        'dark:hover:from-amber-500 dark:hover:to-amber-600',
      ],
      glass: [
        'bg-glass dark:bg-glass-dark',
        'backdrop-blur-md border border-white/20 dark:border-white/10',
        'text-secondary-700 dark:text-secondary-200',
        'hover:bg-white/20 dark:hover:bg-white/10',
        'focus:ring-white/30',
        'shadow-lg hover:shadow-xl',
      ],
    };

    const sizeStyles = {
      xs: ['px-2 py-1 text-xs', 'h-6 min-w-[1.5rem]'],
      sm: ['px-3 py-1.5 text-sm', 'h-8 min-w-[2rem]'],
      md: ['px-4 py-2 text-sm', 'h-10 min-w-[2.5rem]'],
      lg: ['px-6 py-3 text-base', 'h-12 min-w-[3rem]'],
      xl: ['px-8 py-4 text-lg', 'h-14 min-w-[3.5rem]'],
    };

    const roundedStyles = rounded ? 'rounded-full' : 'rounded-xl';
    const fullWidthStyles = fullWidth ? 'w-full' : '';
    const glowStyles = glow ? 'animate-glow' : '';

    const LoadingSpinner = () => (
      <svg
        className="animate-spin h-4 w-4"
        fill="none"
        viewBox="0 0 24 24"
      >
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

    const ShimmerOverlay = () => (
      <div className="absolute inset-0 -skew-x-12 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
    );

    return (
      <button
        className={cn(
          baseStyles,
          variantStyles[variant],
          sizeStyles[size],
          roundedStyles,
          fullWidthStyles,
          glowStyles,
          className
        )}
        disabled={disabled || loading}
        data-testid={testId}
        ref={ref}
        {...props}
      >
        {shimmer && <ShimmerOverlay />}
        
        {loading && (
          <span className="mr-2">
            <LoadingSpinner />
          </span>
        )}
        
        {icon && iconPosition === 'left' && !loading && (
          <span className={cn('flex-shrink-0', children ? 'mr-2' : '')}>{icon}</span>
        )}
        
        {children && (
          <span className={loading ? 'opacity-70' : ''}>{children}</span>
        )}
        
        {icon && iconPosition === 'right' && !loading && (
          <span className={cn('flex-shrink-0', children ? 'ml-2' : '')}>{icon}</span>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button };