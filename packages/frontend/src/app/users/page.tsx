'use client';

import ProtectedRoute from '@/components/auth/ProtectedRoute';
import UserManagement from '@/components/users/UserManagement';

export default function UsersPage() {
  return (
    <ProtectedRoute requiredRoles={['admin', 'staff']}>
      <UserManagement />
    </ProtectedRoute>
  );
}