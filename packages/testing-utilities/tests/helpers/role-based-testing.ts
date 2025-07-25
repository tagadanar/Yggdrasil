// packages/testing-utilities/tests/helpers/role-based-testing.ts
// Shared utilities for role-based testing across all features

export interface RolePermissions {
  role: 'admin' | 'staff' | 'teacher' | 'student';
  loginMethod: 'loginAsAdmin' | 'loginAsStaff' | 'loginAsTeacher' | 'loginAsStudent';
  
  // Feature permissions
  userManagement: {
    canAccess: boolean;
    canCreate: boolean;
    canEdit: boolean;
    canDelete: boolean;
  };
  
  newsManagement: {
    canCreate: boolean;
    canEdit: boolean;
    canDelete: boolean;
    canPublish: boolean;
  };
  
  courseManagement: {
    canCreate: boolean;
    canEdit: boolean;
    canDelete: boolean;
    canEnroll: boolean;
    canManageEnrollments: boolean;
  };
  
  planningManagement: {
    canCreateEvents: boolean;
    canEditEvents: boolean;
    canDeleteEvents: boolean;
    canViewAllEvents: boolean;
  };
  
  statistics: {
    canViewSystemStats: boolean;
    canViewUserStats: boolean;
    canExportData: boolean;
  };
}

export const ROLE_PERMISSIONS_MATRIX: RolePermissions[] = [
  {
    role: 'admin',
    loginMethod: 'loginAsAdmin',
    userManagement: {
      canAccess: true,
      canCreate: true,
      canEdit: true,
      canDelete: true
    },
    newsManagement: {
      canCreate: true,
      canEdit: true,
      canDelete: true,
      canPublish: true
    },
    courseManagement: {
      canCreate: true,
      canEdit: true,
      canDelete: true,
      canEnroll: false,
      canManageEnrollments: true
    },
    planningManagement: {
      canCreateEvents: true,
      canEditEvents: true,
      canDeleteEvents: true,
      canViewAllEvents: true
    },
    statistics: {
      canViewSystemStats: true,
      canViewUserStats: true,
      canExportData: true
    }
  },
  {
    role: 'staff',
    loginMethod: 'loginAsStaff',
    userManagement: {
      canAccess: false,
      canCreate: false,
      canEdit: false,
      canDelete: false
    },
    newsManagement: {
      canCreate: true,
      canEdit: true,
      canDelete: false,
      canPublish: true
    },
    courseManagement: {
      canCreate: false,
      canEdit: false,
      canDelete: false,
      canEnroll: false,
      canManageEnrollments: false
    },
    planningManagement: {
      canCreateEvents: true,
      canEditEvents: true,
      canDeleteEvents: false,
      canViewAllEvents: true
    },
    statistics: {
      canViewSystemStats: false,
      canViewUserStats: false,
      canExportData: false
    }
  },
  {
    role: 'teacher',
    loginMethod: 'loginAsTeacher',
    userManagement: {
      canAccess: false,
      canCreate: false,
      canEdit: false,
      canDelete: false
    },
    newsManagement: {
      canCreate: false,
      canEdit: false,
      canDelete: false,
      canPublish: false
    },
    courseManagement: {
      canCreate: false,
      canEdit: true, // Can edit own courses
      canDelete: false,
      canEnroll: false,
      canManageEnrollments: true // For own courses
    },
    planningManagement: {
      canCreateEvents: false, // Cannot create events in current implementation
      canEditEvents: false,
      canDeleteEvents: false,
      canViewAllEvents: false
    },
    statistics: {
      canViewSystemStats: false,
      canViewUserStats: true, // Can view student progress
      canExportData: true
    }
  },
  {
    role: 'student',
    loginMethod: 'loginAsStudent',
    userManagement: {
      canAccess: false,
      canCreate: false,
      canEdit: false,
      canDelete: false
    },
    newsManagement: {
      canCreate: false,
      canEdit: false,
      canDelete: false,
      canPublish: false
    },
    courseManagement: {
      canCreate: false,
      canEdit: false,
      canDelete: false,
      canEnroll: true,
      canManageEnrollments: false
    },
    planningManagement: {
      canCreateEvents: false,
      canEditEvents: false,
      canDeleteEvents: false,
      canViewAllEvents: false
    },
    statistics: {
      canViewSystemStats: false,
      canViewUserStats: false, // Can only view own stats
      canExportData: false
    }
  }
];

// Helper function to get permissions for a specific role
export function getPermissionsForRole(role: string): RolePermissions | undefined {
  return ROLE_PERMISSIONS_MATRIX.find(p => p.role === role);
}

// Test data generators
export function generateTestEvent(overrides: Partial<any> = {}) {
  const baseDate = new Date();
  baseDate.setDate(baseDate.getDate() + 7); // Next week
  
  return {
    title: `Test Event ${Date.now()}`,
    description: 'This is a test event description',
    location: 'Test Location',
    startDate: baseDate.toISOString(),
    endDate: new Date(baseDate.getTime() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours later
    type: 'meeting',
    ...overrides
  };
}

export function generateTestCourse(overrides: Partial<any> = {}) {
  return {
    title: `Test Course ${Date.now()}`,
    description: 'This is a test course description',
    category: 'technology',
    duration: '8 weeks',
    level: 'beginner',
    ...overrides
  };
}

export function generateTestArticle(overrides: Partial<any> = {}) {
  return {
    title: `Test Article ${Date.now()}`,
    content: 'This is test article content with some meaningful information.',
    category: 'announcement',
    isPublished: true,
    ...overrides
  };
}