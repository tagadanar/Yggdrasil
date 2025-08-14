// packages/frontend/src/lib/api/progress.ts
// Progress tracking API client

import { apiClient } from './client';

export interface AttendanceRecord {
  studentId: string;
  attended: boolean;
  notes?: string;
}

export interface CourseProgressUpdate {
  courseId: string;
  progressPercentage?: number;
  chaptersCompleted?: number;
  totalChapters?: number;
  exercisesCompleted?: number;
  totalExercises?: number;
  averageScore?: number;
}

export interface StudentProgress {
  _id: string;
  promotionId: string;
  studentId: string;
  coursesProgress: CourseProgressItem[];
  coursesCompleted: string[];
  coursesInProgress: string[];
  coursesNotStarted: string[];
  totalEvents: number;
  eventsAttended: number;
  attendanceRate: number;
  overallProgress: number;
  averageGrade?: number;
  milestones: {
    firstCourseStarted?: string;
    firstCourseCompleted?: string;
    halfwayCompleted?: string;
    allCoursesCompleted?: string;
  };
  lastCalculated: string;
}

export interface CourseProgressItem {
  courseId: string;
  startedAt: string;
  completedAt?: string;
  progressPercentage: number;
  chaptersCompleted: number;
  totalChapters: number;
  exercisesCompleted: number;
  totalExercises: number;
  averageScore?: number;
  lastActivityAt?: string;
}

export interface PromotionStatistics {
  averageProgress: number;
  averageAttendance: number;
  completionRate: number;
  atRiskStudents: number;
}

export interface ProgressReport {
  studentId: string;
  studentName: string;
  overallProgress: number;
  attendanceRate: number;
  coursesCompleted: number;
  coursesInProgress: number;
  averageGrade?: number;
  status: 'on-track' | 'at-risk' | 'excelling';
}

export const progressApi = {
  // =============================================================================
  // ATTENDANCE METHODS
  // =============================================================================

  /**
   * Mark attendance for a single student at an event
   */
  async markAttendance(
    eventId: string,
    studentId: string,
    attended: boolean,
    notes?: string
  ) {
    const response = await apiClient.post(`/progress/events/${eventId}/attendance`, {
      studentId,
      attended,
      notes,
    });
    return response.data;
  },

  /**
   * Bulk mark attendance for multiple students at an event
   */
  async bulkMarkAttendance(
    eventId: string,
    promotionId: string,
    attendanceRecords: AttendanceRecord[]
  ) {
    const response = await apiClient.post(`/progress/events/${eventId}/attendance/bulk`, {
      promotionId,
      attendanceRecords,
    });
    return response.data;
  },

  /**
   * Get attendance for a specific event
   */
  async getEventAttendance(eventId: string) {
    const response = await apiClient.get(`/progress/events/${eventId}/attendance`);
    return response.data;
  },

  /**
   * Get a student's attendance history
   */
  async getStudentAttendance(studentId: string, promotionId?: string) {
    const params = promotionId ? { promotionId } : {};
    const response = await apiClient.get(`/progress/students/${studentId}/attendance`, { params });
    return response.data;
  },

  // =============================================================================
  // PROGRESS METHODS
  // =============================================================================

  /**
   * Get progress for a specific student
   */
  async getStudentProgress(studentId: string, promotionId: string): Promise<{ success: boolean; data: StudentProgress }> {
    const response = await apiClient.get(`/progress/students/${studentId}`, {
      params: { promotionId },
    });
    return response.data;
  },

  /**
   * Get progress for all students in a promotion
   */
  async getPromotionProgress(promotionId: string) {
    const response = await apiClient.get(`/progress/promotions/${promotionId}`);
    return response.data;
  },

  /**
   * Update course progress for a student
   */
  async updateCourseProgress(
    studentId: string,
    promotionId: string,
    courseProgress: CourseProgressUpdate
  ) {
    const response = await apiClient.put('/progress/course', {
      studentId,
      promotionId,
      courseProgress,
    });
    return response.data;
  },

  /**
   * Mark a course as completed for a student
   */
  async markCourseCompleted(studentId: string, promotionId: string, courseId: string) {
    const response = await apiClient.post('/progress/course/complete', {
      studentId,
      promotionId,
      courseId,
    });
    return response.data;
  },

  // =============================================================================
  // STATISTICS & REPORTS METHODS
  // =============================================================================

  /**
   * Get statistics for a promotion
   */
  async getPromotionStatistics(promotionId: string): Promise<{ success: boolean; data: PromotionStatistics }> {
    const response = await apiClient.get(`/progress/promotions/${promotionId}/statistics`);
    return response.data;
  },

  /**
   * Get top performers in a promotion
   */
  async getTopPerformers(promotionId: string, limit?: number) {
    const params = limit ? { limit } : {};
    const response = await apiClient.get(`/progress/promotions/${promotionId}/top-performers`, { params });
    return response.data;
  },

  /**
   * Get at-risk students in a promotion
   */
  async getAtRiskStudents(
    promotionId: string,
    progressThreshold?: number,
    attendanceThreshold?: number
  ) {
    const params: any = {};
    if (progressThreshold !== undefined) params.progressThreshold = progressThreshold;
    if (attendanceThreshold !== undefined) params.attendanceThreshold = attendanceThreshold;
    
    const response = await apiClient.get(`/progress/promotions/${promotionId}/at-risk`, { params });
    return response.data;
  },

  /**
   * Generate a progress report for a promotion
   */
  async generateProgressReport(promotionId: string): Promise<{ success: boolean; data: ProgressReport[] }> {
    const response = await apiClient.get(`/progress/promotions/${promotionId}/report`);
    return response.data;
  },

  /**
   * Trigger recalculation of all progress in a promotion
   */
  async recalculateProgress(promotionId: string) {
    const response = await apiClient.post(`/progress/promotions/${promotionId}/recalculate`);
    return response.data;
  },

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  /**
   * Get my own progress (for students)
   */
  async getMyProgress(promotionId: string) {
    // Use a special endpoint that automatically uses the current user's ID
    const response = await apiClient.get('/progress/my-progress', {
      params: { promotionId },
    });
    return response.data;
  },

  /**
   * Calculate progress percentage from course data
   */
  calculateProgressPercentage(courseProgress: CourseProgressItem): number {
    const { chaptersCompleted, totalChapters, exercisesCompleted, totalExercises } = courseProgress;
    
    if (totalChapters === 0 && totalExercises === 0) {
      return 0;
    }
    
    const chapterProgress = totalChapters > 0 ? (chaptersCompleted / totalChapters) * 100 : 100;
    const exerciseProgress = totalExercises > 0 ? (exercisesCompleted / totalExercises) * 100 : 100;
    
    // Weighted: 40% chapters, 60% exercises
    return Math.round((chapterProgress * 0.4) + (exerciseProgress * 0.6));
  },

  /**
   * Get progress status color for UI
   */
  getProgressColor(progress: number): string {
    if (progress >= 80) return 'text-green-600';
    if (progress >= 60) return 'text-yellow-600';
    if (progress >= 40) return 'text-orange-600';
    return 'text-red-600';
  },

  /**
   * Get attendance status color for UI
   */
  getAttendanceColor(attendanceRate: number): string {
    if (attendanceRate >= 90) return 'text-green-600';
    if (attendanceRate >= 75) return 'text-yellow-600';
    if (attendanceRate >= 60) return 'text-orange-600';
    return 'text-red-600';
  },

  /**
   * Format milestone date for display
   */
  formatMilestone(milestoneDate?: string): string {
    if (!milestoneDate) return 'Not reached';
    return new Date(milestoneDate).toLocaleDateString();
  },

  /**
   * Get readable status from progress and attendance
   */
  getStudentStatus(progress: number, attendanceRate: number): {
    status: 'excelling' | 'on-track' | 'at-risk';
    label: string;
    color: string;
  } {
    if (progress >= 80 && attendanceRate >= 90) {
      return {
        status: 'excelling',
        label: 'Excelling',
        color: 'text-green-600 bg-green-50',
      };
    }
    
    if (progress < 30 || attendanceRate < 70) {
      return {
        status: 'at-risk',
        label: 'At Risk',
        color: 'text-red-600 bg-red-50',
      };
    }
    
    return {
      status: 'on-track',
      label: 'On Track',
      color: 'text-blue-600 bg-blue-50',
    };
  },
};