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
import { tokenStorage } from '@/lib/auth/tokenStorage';
import { createComponentLogger } from '@/lib/errors/logger';

// Use frontend URL for API calls - Next.js will handle proxying to services
const API_BASE_URL = process.env['NEXT_PUBLIC_API_URL'] || 'http://localhost:3000';
const logger = createComponentLogger('PromotionAPI');

// Helper function for API calls
async function apiCall<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<{ success: boolean; data?: T; error?: string }> {
  try {
    // Use secure tokenStorage instead of direct localStorage access
    const token = tokenStorage.getAccessToken();

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
      logger.error('API request failed', { 
        endpoint, 
        status: response.status, 
        statusText: response.statusText 
      });
      return { success: false, error: result.message || 'API request failed' };
    }

    return { success: true, data: result.data };
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        logger.warn('API request timeout', { endpoint });
        return { success: false, error: 'Request timeout - please try again' };
      }
      logger.error('API network error', { endpoint, error: error.message });
    } else {
      logger.error('Unknown API error', { endpoint });
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

  // Get student's own validation status and progress (students only)
  getMyValidationStatus: async (): Promise<{ success: boolean; data?: any; error?: string }> => {
    return apiCall<any>('/my/validation-status');
  },

  // Get teacher's assigned events
  getTeacherEvents: async (teacherId: string, timeframe: 'week' | 'month' | 'all' = 'week'): Promise<{ success: boolean; data?: any; error?: string }> => {
    const params = new URLSearchParams({ timeframe });
    return apiCall<any>(`/teacher/${teacherId}/events?${params.toString()}`);
  },

  // Get students enrolled in a course through promotions (teacher/admin/staff)
  getCourseStudents: async (courseId: string): Promise<{ success: boolean; data?: any[]; error?: string }> => {
    return apiCall<any[]>(`/course/${courseId}/students`);
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

  // =============================================================================
  // SEMESTER VALIDATION SYSTEM
  // =============================================================================

  // Initialize semester system (admin only)
  initializeSemesters: async (academicYear?: string): Promise<{ success: boolean; data?: any; error?: string }> => {
    const params = academicYear ? `?academicYear=${academicYear}` : '';
    return apiCall<any>(`/semester/initialize${params}`, { method: 'POST' });
  },

  // Get all semesters with statistics
  getSemesters: async (academicYear?: string): Promise<{ success: boolean; data?: any; error?: string }> => {
    const params = academicYear ? `?academicYear=${academicYear}` : '';
    return apiCall<any>(`/semester/all${params}`);
  },

  // Get semester system health check
  getSemesterHealthCheck: async (): Promise<{ success: boolean; data?: any; error?: string }> => {
    return apiCall<any>('/semester/health');
  },

  // Get students pending validation
  getStudentsPendingValidation: async (promotionId?: string): Promise<{ success: boolean; data?: any[]; error?: string }> => {
    const params = promotionId ? `?promotionId=${promotionId}` : '';
    return apiCall<any[]>(`/validation/pending${params}`);
  },

  // Get validation statistics and insights
  getValidationInsights: async (semesterId?: string): Promise<{ success: boolean; data?: any; error?: string }> => {
    const params = semesterId ? `?semesterId=${semesterId}` : '';
    return apiCall<any>(`/validation/insights${params}`);
  },

  // Evaluate single student
  evaluateStudent: async (studentId: string, criteria?: any): Promise<{ success: boolean; data?: any; error?: string }> => {
    return apiCall<any>(`/validation/evaluate/${studentId}`, {
      method: 'POST',
      body: JSON.stringify({ criteria }),
    });
  },

  // Evaluate multiple students in batch
  evaluateStudentsBatch: async (studentIds: string[], criteria?: any): Promise<{ success: boolean; data?: any[]; error?: string }> => {
    return apiCall<any[]>('/validation/evaluate-batch', {
      method: 'POST',
      body: JSON.stringify({ studentIds, criteria }),
    });
  },

  // Perform bulk validation
  performBulkValidation: async (request: {
    studentIds: string[];
    decision: 'approve' | 'reject' | 'conditional';
    reason?: string;
    notes?: string;
    customCriteria?: any;
  }): Promise<{ success: boolean; data?: any; error?: string }> => {
    return apiCall<any>('/validation/bulk-validate', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  },

  // Flag students for validation
  flagStudentsForValidation: async (semesterIds?: string[]): Promise<{ success: boolean; data?: any; error?: string }> => {
    return apiCall<any>('/validation/flag-students', {
      method: 'POST',
      body: JSON.stringify({ semesterIds }),
    });
  },

  // Process validated students for progression
  processStudentProgressions: async (): Promise<{ success: boolean; data?: any; error?: string }> => {
    return apiCall<any>('/validation/process-progressions', { method: 'POST' });
  },

  // Assign new students to S1
  assignNewStudentsToS1: async (studentIds: string[], intake: 'september' | 'march' = 'september'): Promise<{ success: boolean; data?: any; error?: string }> => {
    return apiCall<any>('/semester/assign-s1', {
      method: 'POST',
      body: JSON.stringify({ studentIds, intake }),
    });
  },

  // Get auto-validation candidates
  getAutoValidationCandidates: async (): Promise<{ success: boolean; data?: any[]; error?: string }> => {
    return apiCall<any[]>('/validation/auto-candidates');
  },

  // Process auto-validations
  processAutoValidations: async (): Promise<{ success: boolean; data?: any; error?: string }> => {
    return apiCall<any>('/validation/process-auto', { method: 'POST' });
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
  return colors[semester - 1] || colors[9] || 'bg-gray-100 text-gray-800';
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
