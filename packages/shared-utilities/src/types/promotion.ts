// packages/shared-utilities/src/types/promotion.ts
// Promotion-related type definitions

export interface Promotion {
  _id: string;
  name: string;
  semester: number; // 1-10
  intake: 'september' | 'march';
  academicYear: string; // e.g., "2024-2025"
  startDate: Date | string;
  endDate: Date | string;
  studentIds: string[];
  eventIds: string[];
  status: PromotionStatus;
  metadata: PromotionMetadata;
  createdBy: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export type PromotionStatus = 'draft' | 'active' | 'completed' | 'archived';

export interface PromotionMetadata {
  level?: string;
  department?: string;
  maxStudents?: number;
  description?: string;
}

export interface PromotionMembership {
  _id: string;
  promotionId: string;
  studentId: string;
  joinedAt: Date | string;
  leftAt?: Date | string;
  status: MembershipStatus;
  progress: MembershipProgress;
}

export type MembershipStatus = 'active' | 'inactive' | 'graduated' | 'dropped';

export interface MembershipProgress {
  eventsAttended: string[];
  coursesCompleted: string[];
  overallProgress: number;
}

// Request/Response DTOs
export interface CreatePromotionRequest {
  name: string;
  semester: number;
  intake: 'september' | 'march';
  academicYear: string;
  startDate: string;
  endDate: string;
  metadata?: Partial<PromotionMetadata>;
}

export interface UpdatePromotionRequest {
  name?: string;
  startDate?: string;
  endDate?: string;
  status?: PromotionStatus;
  metadata?: Partial<PromotionMetadata>;
}

export interface AddStudentsToPromotionRequest {
  studentIds: string[];
}

export interface RemoveStudentFromPromotionRequest {
  studentId: string;
}

export interface LinkEventsToPromotionRequest {
  eventIds: string[];
}

export interface PromotionWithDetails extends Promotion {
  students?: Array<{
    _id: string;
    email: string;
    profile: {
      firstName: string;
      lastName: string;
      studentId?: string;
    };
  }>;
  events?: Array<{
    _id: string;
    title: string;
    type: string;
    startDate: Date | string;
    endDate: Date | string;
    linkedCourse?: string;
    teacherId?: string;
  }>;
}

export interface StudentPromotionView {
  promotion: Promotion;
  // All events in the promotion (for /my-courses page to extract courses)
  events: Array<{
    _id: string;
    title: string;
    type: string;
    startDate: Date | string;
    endDate: Date | string;
    linkedCourse?: {
      _id: string;
      title: string;
      slug: string;
      description: string;
      category: string;
      level: 'beginner' | 'intermediate' | 'advanced';
      instructor: {
        _id: string;
        name: string;
        email: string;
      };
      estimatedDuration: number;
      thumbnail?: string;
    };
    teacher?: {
      _id: string;
      name: string;
    };
  }>;
  // Upcoming events only (for dashboard/calendar views)
  upcomingEvents: Array<{
    _id: string;
    title: string;
    type: string;
    startDate: Date | string;
    endDate: Date | string;
    linkedCourse?: {
      _id: string;
      title: string;
      slug: string;
    };
    teacher?: {
      _id: string;
      name: string;
    };
  }>;
  progress: MembershipProgress;
}

// Filters and search
export interface PromotionFilters {
  semester?: number;
  intake?: 'september' | 'march';
  academicYear?: string;
  status?: PromotionStatus;
  department?: string;
}

export interface PromotionSearchResult {
  promotions: Promotion[];
  total: number;
  page: number;
  pageSize: number;
}
