'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  Home,
  Users,
  BookOpen,
  Calendar,
  MessageSquare,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  User,
  GraduationCap,
  Shield,
  Briefcase,
} from 'lucide-react';
import { clsx } from 'clsx';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: string[];
}

const navigation: NavItem[] = [
  {
    name: 'Tableau de bord',
    href: '/dashboard',
    icon: Home,
    roles: ['admin', 'staff', 'teacher', 'student'],
  },
  {
    name: 'Utilisateurs',
    href: '/users',
    icon: Users,
    roles: ['admin', 'staff'],
  },
  {
    name: 'Cours',
    href: '/courses',
    icon: BookOpen,
    roles: ['admin', 'staff', 'teacher', 'student'],
  },
  {
    name: 'Planning',
    href: '/planning',
    icon: Calendar,
    roles: ['admin', 'staff', 'teacher', 'student'],
  },
  {
    name: 'Actualités',
    href: '/news',
    icon: MessageSquare,
    roles: ['admin', 'staff', 'teacher', 'student'],
  },
  {
    name: 'Statistiques',
    href: '/statistics',
    icon: BarChart3,
    roles: ['admin', 'staff', 'teacher'],
  },
  {
    name: 'Paramètres',
    href: '/settings',
    icon: Settings,
    roles: ['admin', 'staff', 'teacher', 'student'],
  },
];

const getRoleIcon = (role: string) => {
  switch (role) {
    case 'admin':
      return Shield;
    case 'staff':
      return Briefcase;
    case 'teacher':
      return GraduationCap;
    case 'student':
      return User;
    default:
      return User;
  }
};

const getRoleLabel = (role: string) => {
  switch (role) {
    case 'admin':
      return 'Administrateur';
    case 'staff':
      return 'Personnel';
    case 'teacher':
      return 'Enseignant';
    case 'student':
      return 'Étudiant';
    default:
      return 'Utilisateur';
  }
};

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  const filteredNavigation = navigation.filter((item) =>
    user ? item.roles.includes(user.role) : false
  );

  const handleLogout = () => {
    logout();
    onClose();
  };

  if (!user) return null;

  const RoleIcon = getRoleIcon(user.role);

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={clsx(
          'fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 lg:z-auto',
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">101</span>
              </div>
              <span className="font-semibold text-gray-900">School Platform</span>
            </div>
            <button
              onClick={onClose}
              className="lg:hidden p-1 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* User info */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                {user.profile?.profilePhoto ? (
                  <img
                    src={user.profile.profilePhoto}
                    alt="Photo de profil"
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <RoleIcon className="w-5 h-5 text-gray-500" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user.profile?.firstName} {user.profile?.lastName}
                </p>
                <p className="text-xs text-gray-500 flex items-center">
                  <RoleIcon className="w-3 h-3 mr-1" />
                  {getRoleLabel(user.role)}
                </p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
            {filteredNavigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={onClose}
                  className={clsx(
                    'group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors',
                    isActive
                      ? 'bg-primary-100 text-primary-900 border-r-2 border-primary-600'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  )}
                >
                  <item.icon
                    className={clsx(
                      'mr-3 flex-shrink-0 h-5 w-5',
                      isActive ? 'text-primary-600' : 'text-gray-400 group-hover:text-gray-500'
                    )}
                  />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200">
            <button
              onClick={handleLogout}
              className="group flex w-full items-center px-2 py-2 text-sm font-medium text-gray-600 rounded-md hover:bg-gray-50 hover:text-gray-900 transition-colors"
            >
              <LogOut className="mr-3 flex-shrink-0 h-5 w-5 text-gray-400 group-hover:text-gray-500" />
              Déconnexion
            </button>
          </div>
        </div>
      </div>
    </>
  );
}