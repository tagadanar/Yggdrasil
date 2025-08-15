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
        return 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300';
      case 'staff':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300';
      case 'teacher':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'student':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300';
      default:
        return 'bg-secondary-100 text-secondary-800 dark:bg-secondary-700/30 dark:text-secondary-300';
    }
  };

  return (
    <div className="min-h-screen bg-secondary-50 dark:bg-secondary-950 flex">
      {/* Sidebar */}
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col md:ml-64">
        {/* Top Navigation */}
        <nav className="bg-white dark:bg-secondary-800 shadow-sm border-b border-secondary-200 dark:border-secondary-700 sticky top-0 z-10">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              {/* Mobile menu button */}
              <div className="flex items-center md:hidden">
                <button
                  onClick={() => setIsSidebarOpen(true)}
                  data-testid="mobile-menu-toggle"
                  className="p-2 rounded-lg text-secondary-400 hover:text-secondary-500 hover:bg-secondary-100 dark:hover:bg-secondary-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500"
                >
                  <span className="sr-only">Open sidebar</span>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  </svg>
                </button>
              </div>

              {/* Desktop logo */}
              <div className="hidden md:flex items-center">
                <Link href="/news" className="flex items-center">
                  <div className="mr-3">
                    <img src="/logo101.png" alt="Yggdrasil Logo" className="w-8 h-8" />
                  </div>
                  <span className="text-lg font-bold text-secondary-900 dark:text-secondary-100">
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
                  className="flex items-center space-x-3 hover:bg-secondary-50 dark:hover:bg-secondary-700 rounded-lg px-3 py-2"
                >
                  <div className="text-right">
                    <p className="text-sm font-semibold text-secondary-900 dark:text-secondary-100">
                      {user?.profile?.firstName || 'Unknown'} {user?.profile?.lastName || 'User'}
                    </p>
                    <p className="text-xs text-secondary-600 dark:text-secondary-400">
                      {user?.email}
                    </p>
                  </div>
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium capitalize ${getRoleColor(user?.role || '')}`}
                  >
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
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                      />
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
        <main className="flex-1 overflow-y-auto bg-secondary-50 dark:bg-secondary-950 scrollbar-thin">
          <div className="py-8 px-4 sm:px-6 lg:px-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
