// packages/frontend/src/lib/utils/cn.ts
// Utility function for merging class names

import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Alternative approach without additional dependencies
export function cnBasic(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}