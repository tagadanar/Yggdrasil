'use client';

import { useAuth } from '@/lib/auth/AuthProvider';
import { useRouter } from 'next/navigation';
import { useEffect, Suspense } from 'react';

// Loading component
function LoadingScreen({ message }: { message: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">{message}</p>
      </div>
    </div>
  );
}

// Dashboard content component
function DashboardContent({ user }: { user: any }) {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Welcome to Yggdrasil Educational Platform
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Hello, {user.profile?.firstName} {user.profile?.lastName}!
        </p>
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-semibold mb-4">Your Dashboard</h2>
          <p>This is your main dashboard. The platform is working correctly!</p>
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded">
            <p className="text-green-800 text-sm">
              ✅ Frontend routing is working properly
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  // Handle loading state
  if (isLoading) {
    return <LoadingScreen message="Loading Yggdrasil Platform..." />;
  }

  // Handle unauthenticated users
  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/auth/login');
    }
  }, [user, isLoading, router]);

  // Show redirect message for unauthenticated users
  if (!user) {
    return <LoadingScreen message="Redirecting to login..." />;
  }

  // For authenticated users, render the dashboard content
  return (
    <Suspense fallback={<LoadingScreen message="Loading dashboard..." />}>
      <DashboardContent user={user} />
    </Suspense>
  );
}