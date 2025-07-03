// packages/frontend/src/app/planning/page.tsx

'use client';

import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { CalendarView } from '@/components/planning/CalendarView';

export default function PlanningPage() {
  return (
    <ProtectedRoute requiredRoles={['admin', 'staff', 'teacher', 'student']}>
      <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-8">
            Planning & Calendar
          </h1>
          <CalendarView />
      </div>
    </ProtectedRoute>
  );
}