// Path: packages/shared-utilities/src/types/course.ts

export interface Course {
  _id: string;
  title: string;
  description: string;
  code: string; // e.g., "CS101", "MATH201"
  credits: number;
  level: CourseLevel;
  category: CourseCategory;
  instructor: string; // User ID
  instructorInfo?: {
    firstName: string;
    lastName: string;
    email: string;
  };
  duration: CourseDuration;
  schedule: CourseSchedule[];
  capacity: number;
  enrolledStudents: string[]; // User IDs
  prerequisites: string[]; // Course IDs
  tags: string[];
  status: CourseStatus;
  visibility: CourseVisibility;
  chapters: CourseChapter[];
  resources: CourseResource[];
  assessments: CourseAssessment[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  startDate: Date;
  endDate: Date;
}

export type CourseLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';

export type CourseCategory = 
  | 'programming' 
  | 'web-development' 
  | 'mobile-development'
  | 'data-science'
  | 'artificial-intelligence'
  | 'cybersecurity'
  | 'cloud-computing'
  | 'devops'
  | 'database'
  | 'design'
  | 'project-management'
  | 'soft-skills'
  | 'other';

export type CourseStatus = 'draft' | 'published' | 'archived' | 'cancelled';

export type CourseVisibility = 'public' | 'private' | 'restricted';

export interface CourseDuration {
  weeks: number;
  hoursPerWeek: number;
  totalHours: number;
}

export interface CourseSchedule {
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, etc.
  startTime: string; // "09:00"
  endTime: string; // "11:00"
  location?: string;
  type: 'lecture' | 'practical' | 'exam' | 'project';
}

export interface CourseChapter {
  _id: string;
  title: string;
  description: string;
  order: number;
  sections: CourseSection[];
  isRequired: boolean;
  estimatedDuration: number; // minutes
}

export interface CourseSection {
  _id: string;
  title: string;
  description: string;
  order: number;
  content: SectionContent[];
  exercises: Exercise[];
  estimatedDuration: number; // minutes
  isCompleted?: boolean; // For student progress tracking
}

export interface SectionContent {
  _id: string;
  type: ContentType;
  title: string;
  data: any; // Content varies by type
  order: number;
}

export type ContentType = 'text' | 'video' | 'image' | 'code' | 'quiz' | 'file' | 'link';

export interface Exercise {
  _id: string;
  title: string;
  description: string;
  type: ExerciseType;
  difficulty: 'easy' | 'medium' | 'hard';
  points: number;
  timeLimit?: number; // minutes
  instructions: string;
  solution?: string;
  hints?: string[];
  resources?: CourseResource[];
}

export type ExerciseType = 'coding' | 'quiz' | 'essay' | 'project' | 'presentation';

export interface CourseResource {
  _id: string;
  title: string;
  description: string;
  type: ResourceType;
  url?: string;
  filePath?: string;
  fileSize?: number;
  mimeType?: string;
  isRequired: boolean;
  order: number;
}

export type ResourceType = 'document' | 'video' | 'audio' | 'image' | 'link' | 'book' | 'tool';

export interface CourseAssessment {
  _id: string;
  title: string;
  description: string;
  type: AssessmentType;
  weight: number; // percentage of final grade
  maxScore: number;
  dueDate?: Date;
  instructions: string;
  rubric?: AssessmentRubric[];
  isRequired: boolean;
}

export type AssessmentType = 'quiz' | 'assignment' | 'project' | 'exam' | 'participation';

export interface AssessmentRubric {
  criteria: string;
  description: string;
  maxPoints: number;
}

// Student-specific interfaces
export interface StudentCourseProgress {
  courseId: string;
  studentId: string;
  enrollmentDate: Date;
  completionPercentage: number;
  chaptersCompleted: string[];
  sectionsCompleted: string[];
  exercisesCompleted: string[];
  assessmentScores: StudentAssessmentScore[];
  timeSpent: number; // minutes
  lastAccessDate: Date;
  certificateEarned?: boolean;
  finalGrade?: number;
}

export interface StudentAssessmentScore {
  assessmentId: string;
  score: number;
  maxScore: number;
  submissionDate: Date;
  feedback?: string;
  gradeDate?: Date;
  gradedBy?: string; // User ID
}

// Course creation/update interfaces
export interface CreateCourseData {
  title: string;
  description: string;
  code: string;
  credits: number;
  level: CourseLevel;
  category: CourseCategory;
  duration: CourseDuration;
  schedule: CourseSchedule[];
  capacity: number;
  prerequisites?: string[];
  tags?: string[];
  visibility: CourseVisibility;
  status?: CourseStatus;
  startDate: Date;
  endDate: Date;
}

export interface UpdateCourseData {
  title?: string;
  description?: string;
  credits?: number;
  level?: CourseLevel;
  category?: CourseCategory;
  duration?: CourseDuration;
  schedule?: CourseSchedule[];
  capacity?: number;
  prerequisites?: string[];
  tags?: string[];
  status?: CourseStatus;
  visibility?: CourseVisibility;
  startDate?: Date;
  endDate?: Date;
}

// Search and filter interfaces
export interface CourseSearchFilters {
  category?: CourseCategory;
  level?: CourseLevel;
  status?: CourseStatus;
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

export interface CourseEnrollmentResult {
  success: boolean;
  message?: string;
  enrollmentDate?: Date;
  waitlisted?: boolean;
  position?: number; // If waitlisted
}

export interface CourseStats {
  totalCourses: number;
  publishedCourses: number;
  totalEnrollments: number;
  averageCompletion: number;
  topCategories: Array<{
    category: CourseCategory;
    count: number;
  }>;
  topInstructors: Array<{
    instructorId: string;
    name: string;
    courseCount: number;
    averageRating: number;
  }>;
}