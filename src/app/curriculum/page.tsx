'use client';

import React from 'react';
import { CurriculumGraph } from '@/components/curriculum/CurriculumGraph';
import AuthenticatedLayout from '../AuthenticatedLayout';

export default function CurriculumPage() {
  return (
    <div className="max-w-full mx-auto">
      <h1 className="text-3xl font-bold text-white mb-6">Curriculum Graph</h1>
      <p className="text-gray-300 mb-8">
        Explore the complete curriculum and your learning path. Click on nodes to see details, 
        and complete courses to unlock new ones.
      </p>
      
      <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden">
        <CurriculumGraph />
      </div>
    </div>
  );
}