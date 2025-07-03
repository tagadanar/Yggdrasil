'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export default function HomePage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [hasRedirected, setHasRedirected] = useState(false);

  useEffect(() => {
    if (!isLoading && !hasRedirected) {
      setHasRedirected(true);
      
      // Check if there's a stored redirect path
      const redirectPath = sessionStorage.getItem('redirectAfterLogin');
      
      if (isAuthenticated) {
        if (redirectPath) {
          sessionStorage.removeItem('redirectAfterLogin');
          router.push(redirectPath);
        } else {
          router.push('/dashboard');
        }
      } else {
        router.push('/login');
      }
    }
  }, [isAuthenticated, isLoading, router, hasRedirected]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100">
      <div className="text-center">
        <div className="mb-4">
          <div className="mx-auto h-16 w-16 bg-primary-600 rounded-2xl flex items-center justify-center">
            <span className="text-white font-bold text-2xl">101</span>
          </div>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">101 School Platform</h1>
        <p className="text-gray-600 mb-6">Plateforme éducative moderne</p>
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-sm text-gray-500">Chargement...</p>
      </div>
    </div>
  );
}