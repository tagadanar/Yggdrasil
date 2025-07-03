// Path: packages/api-services/course-service/src/types/course.ts

export interface CreateCourseData {
  title: string;
  description: string;
  code: string;
  credits: number;
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  category: string;
  duration: {
    weeks: number;
    hoursPerWeek: number;
    totalHours: number;
  };
  schedule: any[];
  capacity: number;
  prerequisites?: string[];
  tags?: string[];
  visibility: 'public' | 'private' | 'restricted';
  startDate: Date;
  endDate: Date;
}

export interface UpdateCourseData {
  title?: string;
  description?: string;
  credits?: number;
  level?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  category?: string;
  duration?: {
    weeks: number;
    hoursPerWeek: number;
    totalHours: number;
  };
  schedule?: any[];
  capacity?: number;
  prerequisites?: string[];
  tags?: string[];
  status?: 'draft' | 'published' | 'archived' | 'cancelled';
  visibility?: 'public' | 'private' | 'restricted';
  startDate?: Date;
  endDate?: Date;
}

export interface CourseSearchFilters {
  category?: string;
  level?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  status?: 'draft' | 'published' | 'archived' | 'cancelled';
  instructor?: string;
  tags?: string[];
  minCredits?: number;
  maxCredits?: number;
  hasAvailableSpots?: boolean;
  isActive?: boolean;
  limit?: number;
  offset?: number;
  sortBy?: 'title' | 'createdAt' | 'startDate' | 'popularity';
  sortOrder?: 'asc' | 'desc';
}

export interface CourseStats {
  totalCourses: number;
  publishedCourses: number;
  totalEnrollments: number;
  averageCompletion: number;
  topCategories: Array<{
    category: string;
    count: number;
  }>;
  topInstructors: Array<{
    instructorId: string;
    name: string;
    courseCount: number;
    averageRating: number;
  }>;
}

export interface ValidationHelper {
  validateSchema(schema: any, data: any): { success: boolean; errors?: string[] };
}

export interface ErrorHelper {
  handleServiceError(message: string, error: any): { success: false; error: string };
}