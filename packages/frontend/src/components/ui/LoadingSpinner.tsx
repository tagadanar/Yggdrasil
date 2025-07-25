'use client';

import { twMerge } from 'tailwind-merge';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  text?: string;
  className?: string;
}

export function LoadingSpinner({ size = 'md', text, className }: LoadingSpinnerProps) {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8', 
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  };

  const textSizes = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg', 
    xl: 'text-xl'
  };

  return (
    <div
      className={twMerge('flex flex-col items-center justify-center gap-3', className)}
    >
      <div
        className={twMerge('border-4 border-gray-200 border-t-primary-600 rounded-full animate-spin', sizes[size])}
      />
      {text && (
        <p
          className={twMerge('text-gray-600', textSizes[size])}
        >
          {text}
        </p>
      )}
    </div>
  );
}