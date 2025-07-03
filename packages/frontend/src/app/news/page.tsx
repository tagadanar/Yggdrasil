// packages/frontend/src/app/news/page.tsx

'use client';

import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { NewsList } from '@/components/news/NewsList';

export default function NewsPage() {
  return (
    <ProtectedRoute requiredRoles={['admin', 'staff', 'teacher', 'student']}>
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          News & Announcements
        </h1>
        <NewsList />
      </div>
    </ProtectedRoute>
  );
}