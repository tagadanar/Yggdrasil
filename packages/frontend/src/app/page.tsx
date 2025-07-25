'use client';

import { useAuth } from '@/lib/auth/AuthProvider';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { AnimatedLink } from '@/components/ui/AnimatedLink';
import { motion } from 'framer-motion';
import { 
  AcademicCapIcon, 
  ChartBarIcon, 
  Cog6ToothIcon, 
  QuestionMarkCircleIcon,
  LockClosedIcon,
  UsersIcon,
  CubeIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';

export default function HomePage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Yggdrasil Platform...</p>
        </div>
      </div>
    );
  }

  // Redirect unauthenticated users to login
  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/auth/login');
    }
  }, [user, isLoading, router]);

  // For authenticated users, render the full dashboard
  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Welcome Section */}
        <motion.div 
          className="card text-center"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-4xl font-bold text-gray-900 mb-4 flex items-center justify-center gap-3">
            <AcademicCapIcon className="w-12 h-12 text-primary-600" />
            Welcome to Yggdrasil Educational Platform
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            A modern educational platform for IT schools built with clean architecture,
            TDD principles, and comprehensive role-based access control.
          </p>
        </motion.div>

        {/* User Info Section */}
        <motion.div 
          className="card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h2 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
            <UsersIcon className="w-8 h-8 text-primary-600" />
            Your Authentication Information
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">Profile Details</h3>
              <dl className="space-y-2">
                <div className="flex justify-between">
                  <dt className="text-gray-500">Name:</dt>
                  <dd className="font-medium">{user.profile?.firstName} {user.profile?.lastName}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Email:</dt>
                  <dd className="font-medium">{user.email}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Role:</dt>
                  <dd className="font-medium capitalize">{user.role}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">User ID:</dt>
                  <dd className="font-mono text-sm">{user._id}</dd>
                </div>
              </dl>
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">Session Information</h3>
              <dl className="space-y-2">
                <div className="flex justify-between">
                  <dt className="text-gray-500">Account Status:</dt>
                  <dd className="font-medium">
                    <span className={user.isActive ? 'text-green-600' : 'text-red-600'}>
                      {user.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Language:</dt>
                  <dd className="font-medium uppercase">{user.preferences?.language || 'EN'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Created:</dt>
                  <dd className="font-medium">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Last Updated:</dt>
                  <dd className="font-medium">
                    {new Date(user.updatedAt).toLocaleDateString()}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </div>

        {/* Platform Features */}
        <motion.div 
          className="card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
            <CubeIcon className="w-8 h-8 text-primary-600" />
            Platform Features
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            <motion.div 
              className="text-center p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg shadow-sm"
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
            >
              <LockClosedIcon className="w-12 h-12 text-blue-600 mx-auto mb-3" />
              <h3 className="font-semibold mb-2">JWT Authentication</h3>
              <p className="text-sm text-gray-600">
                Secure authentication with access and refresh tokens
              </p>
            </motion.div>
            <motion.div 
              className="text-center p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-lg shadow-sm"
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
            >
              <UsersIcon className="w-12 h-12 text-green-600 mx-auto mb-3" />
              <h3 className="font-semibold mb-2">Role-Based Access</h3>
              <p className="text-sm text-gray-600">
                Admin, Staff, Teacher, and Student roles with permissions
              </p>
            </motion.div>
            <motion.div 
              className="text-center p-6 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg shadow-sm"
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
            >
              <CubeIcon className="w-12 h-12 text-purple-600 mx-auto mb-3" />
              <h3 className="font-semibold mb-2">Clean Architecture</h3>
              <p className="text-sm text-gray-600">
                Monorepo structure with TypeScript and TDD practices
              </p>
            </motion.div>
          </div>
        </motion.div>

        {/* Quick Navigation */}
        <motion.div 
          className="card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h2 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
            <SparklesIcon className="w-8 h-8 text-primary-600" />
            Quick Navigation
          </h2>
          <div className="grid md:grid-cols-4 gap-4">
            <AnimatedLink 
              href="/dashboard" 
              variant="card"
              icon={<ChartBarIcon className="w-8 h-8 text-primary-600" />}
              className="text-center"
            >
              <span className="font-medium text-gray-900">Dashboard</span>
            </AnimatedLink>
            <AnimatedLink 
              href="/courses" 
              variant="card"
              icon={<AcademicCapIcon className="w-8 h-8 text-green-600" />}
              className="text-center"
            >
              <span className="font-medium text-gray-900">Courses</span>
            </AnimatedLink>
            <AnimatedLink 
              href="/profile" 
              variant="card"
              icon={<Cog6ToothIcon className="w-8 h-8 text-blue-600" />}
              className="text-center"
            >
              <span className="font-medium text-gray-900">Settings</span>
            </AnimatedLink>
            <AnimatedLink 
              href="/statistics" 
              variant="card"
              icon={<ChartBarIcon className="w-8 h-8 text-purple-600" />}
              className="text-center"
            >
              <span className="font-medium text-gray-900">Statistics</span>
            </AnimatedLink>
          </div>
        </motion.div>
      </div>
    </DashboardLayout>
  );
}