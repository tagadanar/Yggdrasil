'use client';

import React from 'react';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { Navbar } from '@/components/ui/Navbar';

interface AuthenticatedLayoutProps {
  children: React.ReactNode;
}

export default function AuthenticatedLayout({ children }: AuthenticatedLayoutProps) {
  return (
    <AuthGuard>
      <div className="min-h-screen flex flex-col bg-gray-900">
        <Navbar />
        <main className="flex-1 p-4">
          {children}
        </main>
        <footer className="bg-gray-800 py-4 text-center text-gray-400 text-sm">
          <p>101 IT School - Learn Computer Science by Doing | &copy; {new Date().getFullYear()}</p>
        </footer>
      </div>
    </AuthGuard>
  );
}