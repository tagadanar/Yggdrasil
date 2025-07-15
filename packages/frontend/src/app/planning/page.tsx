// packages/frontend/src/app/planning/page.tsx
// Planning page - under construction

'use client';

import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { UnderConstruction } from '@/components/ui/UnderConstruction';

export default function PlanningPage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="max-w-6xl mx-auto py-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Academic Planning</h1>
            <p className="text-gray-600">
              Manage your academic schedule and planning
            </p>
          </div>
          
          <UnderConstruction
            title=""
            description="The academic planning and calendar system is currently under development. This will include schedule management, event planning, and calendar integration."
            expectedCompletion="Phase 3 - Expected completion in 4-6 weeks"
          />
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}