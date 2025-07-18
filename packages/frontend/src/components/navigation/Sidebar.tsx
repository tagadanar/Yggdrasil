// packages/frontend/src/components/navigation/Sidebar.tsx
// Left sidebar navigation component with role-based menu items

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthProvider';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface MenuItem {
  id: string;
  name: string;
  href: string;
  icon: React.ReactNode;
  allowedRoles: string[];
}

const menuItems: MenuItem[] = [
  {
    id: 'news',
    name: 'News',
    href: '/news',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
      </svg>
    ),
    allowedRoles: ['admin', 'staff', 'teacher', 'student']
  },
  {
    id: 'users',
    name: 'Users',
    href: '/admin/users',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
      </svg>
    ),
    allowedRoles: ['admin']
  },
  {
    id: 'courses',
    name: 'Courses',
    href: '/courses',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
    allowedRoles: ['admin', 'staff', 'teacher', 'student']
  },
  {
    id: 'planning',
    name: 'Planning',
    href: '/planning',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    allowedRoles: ['admin', 'staff', 'teacher', 'student']
  },
  {
    id: 'statistics',
    name: 'Statistics',
    href: '/statistics',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    allowedRoles: ['admin', 'staff', 'teacher', 'student']
  }
];

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user } = useAuth();
  const pathname = usePathname();
  const [currentPath, setCurrentPath] = useState<string>('');

  // Update local path state when pathname changes
  useEffect(() => {
    if (pathname !== currentPath) {
      setCurrentPath(pathname);
    }
  }, [pathname, currentPath]);

  // Filter menu items based on user role
  const visibleMenuItems = menuItems.filter(item => 
    user?.role && item.allowedRoles.includes(user.role)
  );

  // Robust active route detection with both pathname and local state
  const isActiveRoute = (href: string) => {
    const activePath = currentPath || pathname;
    
    if (href === '/news') {
      return activePath === '/news' || activePath === '/';
    }
    return activePath.startsWith(href);
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm z-20 md:hidden animate-fade-in"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <aside
        data-testid="sidebar-nav"
        className={`
          fixed top-0 left-0 h-full w-64 bg-white/95 dark:bg-secondary-900/95 backdrop-blur-md shadow-strong dark:shadow-dark-medium border-r border-secondary-200 dark:border-secondary-700 transform transition-all duration-300 ease-in-out z-30
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          md:translate-x-0 md:static md:z-0
        `}
      >
        <div className="flex flex-col h-full">
          {/* Logo section */}
          <div className="flex items-center justify-between p-6 border-b border-secondary-200 dark:border-secondary-700 bg-gradient-to-r from-primary-50 to-primary-100 dark:from-primary-900/20 dark:to-primary-800/20">
            <Link href="/news" className="flex items-center group">
              <div className="relative mr-3">
                <img 
                  src="/logo101.png" 
                  alt="Yggdrasil Logo" 
                  className="w-8 h-8 transition-transform duration-200 group-hover:scale-110 animate-float"
                />
                <div className="absolute inset-0 bg-primary-500 opacity-0 group-hover:opacity-10 rounded-full transition-opacity duration-200"></div>
              </div>
              <span className="text-xl font-bold text-secondary-900 dark:text-secondary-100 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors duration-200">
                Yggdrasil
              </span>
            </Link>
            <button
              onClick={onClose}
              className="md:hidden p-2 rounded-xl hover:bg-white/50 dark:hover:bg-secondary-700/50 transition-all duration-200 transform hover:scale-110"
            >
              <svg className="w-5 h-5 text-secondary-600 dark:text-secondary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Navigation menu */}
          <nav className="flex-1 px-4 py-6 space-y-2 scrollbar-thin">
            {visibleMenuItems.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                data-testid={`nav-${item.id}`}
                className={`
                  ${isActiveRoute(item.href) 
                    ? 'nav-link-active' 
                    : 'nav-link-inactive'
                  }
                `}
                onClick={onClose}
              >
                <span className={`mr-3 transition-colors duration-200 ${isActiveRoute(item.href) ? 'text-white' : 'text-secondary-500 dark:text-secondary-400 group-hover:text-secondary-700 dark:group-hover:text-secondary-200'}`}>
                  {item.icon}
                </span>
                {item.name}
                {isActiveRoute(item.href) && (
                  <div className="ml-auto animate-pulse">
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                  </div>
                )}
              </Link>
            ))}
          </nav>

          {/* User info at bottom */}
          <div className="p-4 border-t border-secondary-200 dark:border-secondary-700 bg-gradient-to-r from-secondary-50 to-secondary-100 dark:from-secondary-800/50 dark:to-secondary-700/50">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-gradient-to-r from-primary-500 to-primary-600 dark:from-primary-400 dark:to-primary-500 rounded-full flex items-center justify-center shadow-lg shadow-primary-500/25 dark:shadow-primary-400/20 animate-float">
                  <span className="text-white font-bold text-sm">
                    {user?.profile?.firstName?.[0] || 'U'}
                  </span>
                </div>
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm font-semibold text-secondary-900 dark:text-secondary-100">
                  {user?.profile?.firstName || 'User'}
                </p>
                <p className="text-xs text-secondary-600 dark:text-secondary-400 capitalize font-medium">
                  {user?.role || 'Role'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}