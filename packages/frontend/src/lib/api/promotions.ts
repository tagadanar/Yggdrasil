// packages/frontend/src/lib/api/promotions.ts
// API client functions for promotion management

import {
  Promotion,
  PromotionWithDetails,
  StudentPromotionView,
  CreatePromotionRequest,
  UpdatePromotionRequest,
  PromotionFilters,
  AddStudentsToPromotionRequest,
  LinkEventsToPromotionRequest,
} from '@yggdrasil/shared-utilities';

// Use frontend URL for API calls - Next.js will handle proxying to services
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

// Helper function for API calls
async function apiCall<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<{ success: boolean; data?: T; error?: string }> {
  try {
    // First try localStorage (for compatibility), then try to get token from cookies
    let token = localStorage.getItem('yggdrasil_access_token') || localStorage.getItem('access_token');

    // If no token in localStorage, try to get from cookies (for tests)
    if (!token && typeof document !== 'undefined') {
      const cookies = document.cookie.split(';');
      for (const cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        if (name === 'yggdrasil_access_token') {
          token = value;
          break;
        }
      }
    }

    // Create an AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const response = await fetch(`${API_BASE_URL}/api/promotions${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
        ...options.headers,
      },
      credentials: 'include',
      signal: controller.signal,
      ...options,
    });

    clearTimeout(timeoutId);

    const result = await response.json();

    if (!response.ok) {
      return { success: false, error: result.message || 'API request failed' };
    }

    return { success: true, data: result.data };
  } catch (error: any) {
    if (error.name === 'AbortError') {
      return { success: false, error: 'Request timeout - please try again' };
    }
    return { success: false, error: 'Network error' };
  }
}

// =============================================================================
// PROMOTION CRUD
// =============================================================================

export const promotionApi = {
  // Get all promotions with optional filters
  getPromotions: async (filters?: PromotionFilters): Promise<{ success: boolean; data?: Promotion[]; error?: string }> => {
    const queryParams = new URLSearchParams();
    if (filters?.semester) queryParams.append('semester', filters.semester.toString());
    if (filters?.intake) queryParams.append('intake', filters.intake);
    if (filters?.academicYear) queryParams.append('academicYear', filters.academicYear);
    if (filters?.status) queryParams.append('status', filters.status);
    if (filters?.department) queryParams.append('department', filters.department);

    const query = queryParams.toString();
    return apiCall<Promotion[]>(`${query ? `?${query}` : ''}`);
  },

  // Get promotion by ID with full details
  getPromotion: async (promotionId: string): Promise<{ success: boolean; data?: PromotionWithDetails; error?: string }> => {
    return apiCall<PromotionWithDetails>(`/${promotionId}`);
  },

  // Create new promotion (admin/staff only)
  createPromotion: async (data: CreatePromotionRequest): Promise<{ success: boolean; data?: Promotion; error?: string }> => {
    return apiCall<Promotion>('', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Update promotion (admin/staff only)
  updatePromotion: async (promotionId: string, data: UpdatePromotionRequest): Promise<{ success: boolean; data?: Promotion; error?: string }> => {
    return apiCall<Promotion>(`/${promotionId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // Delete promotion (admin only)
  deletePromotion: async (promotionId: string): Promise<{ success: boolean; error?: string }> => {
    return apiCall<null>(`/${promotionId}`, {
      method: 'DELETE',
    });
  },

  // =============================================================================
  // STUDENT MANAGEMENT
  // =============================================================================

  // Add students to promotion
  addStudentsToPromotion: async (promotionId: string, data: AddStudentsToPromotionRequest): Promise<{ success: boolean; data?: Promotion; error?: string }> => {
    return apiCall<Promotion>(`/${promotionId}/students`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Remove student from promotion
  removeStudentFromPromotion: async (promotionId: string, studentId: string): Promise<{ success: boolean; data?: Promotion; error?: string }> => {
    return apiCall<Promotion>(`/${promotionId}/students/${studentId}`, {
      method: 'DELETE',
    });
  },

  // =============================================================================
  // EVENT MANAGEMENT
  // =============================================================================

  // Link events to promotion
  linkEventsToPromotion: async (promotionId: string, data: LinkEventsToPromotionRequest): Promise<{ success: boolean; data?: Promotion; error?: string }> => {
    return apiCall<Promotion>(`/${promotionId}/events`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Unlink event from promotion
  unlinkEventFromPromotion: async (promotionId: string, eventId: string): Promise<{ success: boolean; data?: Promotion; error?: string }> => {
    return apiCall<Promotion>(`/${promotionId}/events/${eventId}`, {
      method: 'DELETE',
    });
  },

  // Get promotion calendar (events)
  getPromotionCalendar: async (promotionId: string): Promise<{ success: boolean; data?: any[]; error?: string }> => {
    return apiCall<any[]>(`/${promotionId}/calendar`);
  },

  // =============================================================================
  // STUDENT ACCESS
  // =============================================================================

  // Get student's own promotion (students only)
  getMyPromotion: async (): Promise<{ success: boolean; data?: StudentPromotionView; error?: string }> => {
    return apiCall<StudentPromotionView>('/my');
  },

  // Get teacher's assigned events
  getTeacherEvents: async (teacherId: string, timeframe: 'week' | 'month' | 'all' = 'week'): Promise<{ success: boolean; data?: any; error?: string }> => {
    const params = new URLSearchParams({ timeframe });
    return apiCall<any>(`/teacher/${teacherId}/events?${params.toString()}`);
  },

  // =============================================================================
  // PROGRESSION
  // =============================================================================

  // Progress student to next semester
  progressStudent: async (studentId: string, currentPromotionId: string): Promise<{ success: boolean; data?: Promotion; error?: string }> => {
    return apiCall<Promotion>('/progress', {
      method: 'POST',
      body: JSON.stringify({ studentId, currentPromotionId }),
    });
  },
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

// Generate semester name for display
export const getSemesterName = (semester: number, intake: 'september' | 'march'): string => {
  const intakeLabel = intake === 'september' ? 'Fall' : 'Spring';
  const year = Math.ceil(semester / 2);
  return `${intakeLabel} Year ${year} (Semester ${semester})`;
};

// Calculate academic year for a given semester and intake
export const getAcademicYear = (semester: number, intake: 'september' | 'march', baseYear?: number): string => {
  const currentYear = baseYear || new Date().getFullYear();

  if (intake === 'september') {
    // September intake starts in fall
    const startYear = currentYear + Math.floor((semester - 1) / 2);
    return `${startYear}-${startYear + 1}`;
  } else {
    // March intake starts in spring
    const startYear = currentYear - 1 + Math.ceil(semester / 2);
    return `${startYear}-${startYear + 1}`;
  }
};

// Validate semester progression
export const canProgressToSemester = (currentSemester: number, targetSemester: number): boolean => {
  return targetSemester === currentSemester + 1 && targetSemester <= 10;
};

// Get semester color for UI
export const getSemesterColor = (semester: number): string => {
  const colors = [
    'bg-blue-100 text-blue-800',      // Semester 1
    'bg-green-100 text-green-800',    // Semester 2
    'bg-yellow-100 text-yellow-800',  // Semester 3
    'bg-orange-100 text-orange-800',  // Semester 4
    'bg-red-100 text-red-800',        // Semester 5
    'bg-purple-100 text-purple-800',  // Semester 6
    'bg-indigo-100 text-indigo-800',  // Semester 7
    'bg-pink-100 text-pink-800',      // Semester 8
    'bg-teal-100 text-teal-800',      // Semester 9
    'bg-gray-100 text-gray-800',      // Semester 10
  ];
  return colors[semester - 1] || colors[9];
};

// Get status color for UI
export const getStatusColor = (status: string): string => {
  switch (status) {
    case 'active':
      return 'bg-green-100 text-green-800';
    case 'draft':
      return 'bg-yellow-100 text-yellow-800';
    case 'completed':
      return 'bg-blue-100 text-blue-800';
    case 'archived':
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};
