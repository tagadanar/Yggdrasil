'use client';

import React, { forwardRef } from 'react';
import { cn } from '@/lib/utils/cn';

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  icon?: React.ReactNode;
  error?: string;
  helperText?: string;
  variant?: 'default' | 'filled' | 'outlined';
  inputSize?: 'sm' | 'md' | 'lg';
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ 
    label, 
    icon, 
    error, 
    helperText, 
    variant = 'default',
    inputSize = 'md',
    className, 
    ...props 
  }, ref) => {
    const baseStyles = [
      'block w-full rounded-xl transition-all duration-200',
      'focus:outline-none focus:ring-2 focus:ring-offset-2',
      'disabled:opacity-50 disabled:cursor-not-allowed',
    ];

    const variantStyles = {
      default: [
        'border border-secondary-200 dark:border-secondary-600',
        'bg-white dark:bg-secondary-800',
        'text-secondary-900 dark:text-secondary-100',
        'placeholder:text-secondary-400 dark:placeholder:text-secondary-500',
        'focus:border-primary-500 focus:ring-primary-500',
        'shadow-sm focus:shadow-md',
      ],
      filled: [
        'border-0',
        'bg-secondary-100 dark:bg-secondary-700',
        'text-secondary-900 dark:text-secondary-100',
        'placeholder:text-secondary-400 dark:placeholder:text-secondary-500',
        'focus:bg-white dark:focus:bg-secondary-800',
        'focus:ring-primary-500',
      ],
      outlined: [
        'border-2 border-secondary-200 dark:border-secondary-600',
        'bg-transparent',
        'text-secondary-900 dark:text-secondary-100',
        'placeholder:text-secondary-400 dark:placeholder:text-secondary-500',
        'focus:border-primary-500 focus:ring-primary-500',
      ],
    };

    const sizeStyles = {
      sm: ['px-3 py-2 text-sm', icon ? 'pl-10' : ''],
      md: ['px-4 py-3 text-base', icon ? 'pl-12' : ''],
      lg: ['px-5 py-4 text-lg', icon ? 'pl-14' : ''],
    };

    const errorStyles = error ? [
      'border-rose-300 dark:border-rose-600',
      'focus:border-rose-500 focus:ring-rose-500',
      'focus:shadow-rose-500/10',
    ] : [];

    return (
      <div className="form-group">
        {label && (
          <label className="form-label flex items-center gap-2">
            {icon && <span className="text-secondary-500">{icon}</span>}
            {label}
          </label>
        )}
        <div className="relative">
          <input
            ref={ref}
            className={cn(
              baseStyles,
              variantStyles[variant],
              sizeStyles[inputSize],
              errorStyles,
              className
            )}
            {...props}
          />
          {icon && !label && (
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary-400">
              {icon}
            </div>
          )}
        </div>
        {error && (
          <p className="form-error mt-1">
            {error}
          </p>
        )}
        {helperText && !error && (
          <p className="form-helper mt-1">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';