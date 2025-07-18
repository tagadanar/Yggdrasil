// packages/frontend/src/components/layout/DashboardLayout.tsx
// Dashboard layout with sidebar navigation and user info

'use client';

import { useAuth } from '@/lib/auth/AuthProvider';
import { useState } from 'react';
import Link from 'next/link';
import { Sidebar } from '@/components/navigation/Sidebar';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { Button } from '@/components/ui/Button';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, logout } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-gradient-to-r from-rose-100 to-rose-200 text-rose-800 dark:from-rose-900/30 dark:to-rose-800/30 dark:text-rose-300';
      case 'staff':
        return 'bg-gradient-to-r from-amber-100 to-amber-200 text-amber-800 dark:from-amber-900/30 dark:to-amber-800/30 dark:text-amber-300';
      case 'teacher':
        return 'bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 dark:from-blue-900/30 dark:to-blue-800/30 dark:text-blue-300';
      case 'student':
        return 'bg-gradient-to-r from-emerald-100 to-emerald-200 text-emerald-800 dark:from-emerald-900/30 dark:to-emerald-800/30 dark:text-emerald-300';
      default:
        return 'bg-gradient-to-r from-secondary-100 to-secondary-200 text-secondary-800 dark:from-secondary-700/30 dark:to-secondary-600/30 dark:text-secondary-300';
    }
  };

  return (
    <div className="min-h-screen bg-secondary-50 dark:bg-secondary-950 flex transition-colors duration-300">
      {/* Sidebar */}
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col md:ml-64">
        {/* Top Navigation */}
        <nav className="bg-white/80 dark:bg-secondary-800/80 backdrop-blur-md shadow-soft dark:shadow-dark-soft border-b border-secondary-200 dark:border-secondary-700 sticky top-0 z-10 transition-all duration-300">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              {/* Mobile menu button */}
              <div className="flex items-center md:hidden">
                <button
                  onClick={() => setIsSidebarOpen(true)}
                  data-testid="mobile-menu-toggle"
                  className="p-2 rounded-xl text-secondary-400 hover:text-secondary-500 hover:bg-secondary-100 dark:hover:bg-secondary-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500 transition-all duration-200 transform hover:scale-105"
                >
                  <span className="sr-only">Open sidebar</span>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              </div>

              {/* Desktop logo */}
              <div className="hidden md:flex items-center">
                <Link href="/news" className="flex items-center group">
                  <div className="relative mr-3">
                    <img 
                      src="/logo101.png" 
                      alt="Yggdrasil Logo" 
                      className="w-8 h-8 transition-transform duration-200 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-primary-500 opacity-0 group-hover:opacity-10 rounded-full transition-opacity duration-200"></div>
                  </div>
                  <span className="text-lg font-bold text-secondary-900 dark:text-secondary-100 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors duration-200">
                    Yggdrasil
                  </span>
                </Link>
              </div>

              {/* Right side navigation */}
              <div className="flex items-center space-x-3">
                {/* Theme Toggle */}
                <ThemeToggle size="md" />

                {/* User Info */}
                <Link 
                  href="/profile" 
                  data-testid="profile-link"
                  className="flex items-center space-x-3 hover:bg-secondary-50 dark:hover:bg-secondary-700 rounded-xl px-3 py-2 transition-all duration-200 hover:shadow-sm transform hover:scale-[1.02] group"
                >
                  <div className="text-right">
                    <p className="text-sm font-semibold text-secondary-900 dark:text-secondary-100 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors duration-200">
                      {user?.profile?.firstName || 'Unknown'} {user?.profile?.lastName || 'User'}
                    </p>
                    <p className="text-xs text-secondary-600 dark:text-secondary-400">{user?.email}</p>
                  </div>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold capitalize shadow-sm transition-all duration-200 ${getRoleColor(user?.role || '')}`}>
                    {user?.role}
                  </span>
                </Link>

                {/* Logout Button */}
                <Button
                  onClick={handleLogout}
                  variant="ghost"
                  size="sm"
                  className="font-medium"
                  icon={
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                  }
                  iconPosition="right"
                >
                  Logout
                </Button>
              </div>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto bg-secondary-50 dark:bg-secondary-950 transition-colors duration-300 scrollbar-thin">
          <div className="py-8 px-4 sm:px-6 lg:px-8 animate-fade-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}