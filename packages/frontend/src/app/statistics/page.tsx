// packages/frontend/src/app/statistics/page.tsx

'use client';

import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { StatisticsDashboard } from '@/components/statistics/StatisticsDashboard';

export default function StatisticsPage() {
  return (
    <ProtectedRoute requiredRoles={['admin', 'staff', 'teacher', 'student']}>
      <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-8">
            Statistics Dashboard
          </h1>
          <StatisticsDashboard />
      </div>
    </ProtectedRoute>
  );
}