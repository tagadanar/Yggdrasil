'use client';

import React from 'react';
import { CurriculumEditor } from '@/components/curriculum/CurriculumEditor';
import { useAuth } from '@/contexts/AuthContext';
import { redirect } from 'next/navigation';

export default function CurriculumEditPage() {
  const { user } = useAuth();
  
  // Only admin can access this page
  if (user?.role !== 'admin') {
    redirect('/dashboard');
    return null;
  }
  
  return (
    <div className="max-w-full mx-auto">
      <h1 className="text-3xl font-bold text-white mb-6">Edit Curriculum</h1>
      <p className="text-gray-300 mb-8">
        Customize the curriculum structure, add or remove courses, and define prerequisites.
      </p>
      
      <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden">
        <CurriculumEditor />
      </div>
    </div>
  );
}