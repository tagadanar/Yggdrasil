// packages/frontend/src/components/ui/ThemeToggle.tsx
// Beautiful theme toggle component with smooth animations

'use client';

import React, { useState } from 'react';
import { useTheme } from '@/lib/theme/ThemeProvider';
import { cn } from '@/lib/utils/cn';

interface ThemeToggleProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export function ThemeToggle({ className, size = 'md', showLabel = false }: ThemeToggleProps) {
  const { theme, actualTheme, setTheme, toggleTheme } = useTheme();
  const [showDropdown, setShowDropdown] = useState(false);

  const sizeStyles = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
  };

  const iconSizeStyles = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  const SunIcon = () => (
    <svg
      className={cn(iconSizeStyles[size], 'transition-all duration-300 rotate-0 scale-100')}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
      />
    </svg>
  );

  const MoonIcon = () => (
    <svg
      className={cn(iconSizeStyles[size], 'transition-all duration-300 rotate-0 scale-100')}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
      />
    </svg>
  );

  const SystemIcon = () => (
    <svg
      className={cn(iconSizeStyles[size], 'transition-all duration-300 rotate-0 scale-100')}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
      />
    </svg>
  );

  const getThemeIcon = () => {
    switch (theme) {
      case 'light':
        return <SunIcon />;
      case 'dark':
        return <MoonIcon />;
      case 'system':
        return <SystemIcon />;
      default:
        return <SunIcon />;
    }
  };

  const getThemeLabel = () => {
    switch (theme) {
      case 'light':
        return 'Light';
      case 'dark':
        return 'Dark';
      case 'system':
        return 'System';
      default:
        return 'Light';
    }
  };

  const ThemeOption = ({ 
    themeValue, 
    icon, 
    label, 
    isActive 
  }: { 
    themeValue: 'light' | 'dark' | 'system';
    icon: React.ReactNode;
    label: string;
    isActive: boolean;
  }) => (
    <button
      onClick={() => {
        setTheme(themeValue);
        setShowDropdown(false);
      }}
      className={cn(
        'flex items-center w-full px-3 py-2 text-sm font-medium transition-all duration-200',
        'hover:bg-secondary-100 dark:hover:bg-secondary-700',
        'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
        'dark:focus:ring-offset-secondary-800',
        isActive && 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
      )}
    >
      <span className="mr-2">{icon}</span>
      {label}
      {isActive && (
        <span className="ml-auto">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
        </span>
      )}
    </button>
  );

  // Simple toggle mode (just light/dark)
  const SimpleToggle = () => (
    <button
      onClick={toggleTheme}
      className={cn(
        'relative rounded-full transition-all duration-300',
        'bg-secondary-200 dark:bg-secondary-700',
        'hover:bg-secondary-300 dark:hover:bg-secondary-600',
        'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
        'dark:focus:ring-offset-secondary-800',
        'shadow-lg hover:shadow-xl',
        'transform hover:scale-105 active:scale-95',
        sizeStyles[size],
        className
      )}
      title={`Switch to ${actualTheme === 'light' ? 'dark' : 'light'} mode`}
    >
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className={cn(
            'transition-all duration-300',
            actualTheme === 'light' 
              ? 'text-amber-500 rotate-0 scale-100' 
              : 'text-secondary-400 rotate-180 scale-0'
          )}
        >
          <SunIcon />
        </div>
        <div
          className={cn(
            'absolute transition-all duration-300',
            actualTheme === 'dark' 
              ? 'text-blue-400 rotate-0 scale-100' 
              : 'text-secondary-400 rotate-180 scale-0'
          )}
        >
          <MoonIcon />
        </div>
      </div>
    </button>
  );

  // Dropdown mode (light/dark/system)
  const DropdownToggle = () => (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className={cn(
          'flex items-center space-x-2 rounded-lg px-3 py-2 transition-all duration-200',
          'bg-secondary-100 dark:bg-secondary-800',
          'hover:bg-secondary-200 dark:hover:bg-secondary-700',
          'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
          'dark:focus:ring-offset-secondary-800',
          'shadow-sm hover:shadow-md',
          'transform hover:scale-105 active:scale-95',
          className
        )}
      >
        {getThemeIcon()}
        {showLabel && (
          <span className="text-sm font-medium text-secondary-700 dark:text-secondary-200">
            {getThemeLabel()}
          </span>
        )}
        <svg
          className={cn(
            'w-4 h-4 transition-transform duration-200',
            showDropdown ? 'rotate-180' : 'rotate-0'
          )}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {showDropdown && (
        <div className="absolute top-full left-0 mt-2 w-48 rounded-xl shadow-lg bg-white dark:bg-secondary-800 ring-1 ring-black ring-opacity-5 z-50 animate-fade-in">
          <div className="py-1">
            <ThemeOption
              themeValue="light"
              icon={<SunIcon />}
              label="Light"
              isActive={theme === 'light'}
            />
            <ThemeOption
              themeValue="dark"
              icon={<MoonIcon />}
              label="Dark"
              isActive={theme === 'dark'}
            />
            <ThemeOption
              themeValue="system"
              icon={<SystemIcon />}
              label="System"
              isActive={theme === 'system'}
            />
          </div>
        </div>
      )}
    </div>
  );

  // Click outside to close dropdown
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showDropdown && !(event.target as Element).closest('.relative')) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDropdown]);

  return showLabel ? <DropdownToggle /> : <SimpleToggle />;
}