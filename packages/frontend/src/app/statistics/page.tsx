// packages/frontend/src/app/statistics/page.tsx
// Statistics page - under construction

'use client';

import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { UnderConstruction } from '@/components/ui/UnderConstruction';

export default function StatisticsPage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <UnderConstruction
          title="Statistics & Analytics"
          description="The statistics and analytics dashboard is currently under development. This will include performance metrics, progress tracking, and data visualization."
          expectedCompletion="Phase 3 - Expected completion in 4-6 weeks"
        />
      </DashboardLayout>
    </ProtectedRoute>
  );
}