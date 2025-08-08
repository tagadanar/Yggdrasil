// packages/shared-utilities/src/types/course.ts
// Course management types for the Yggdrasil platform

export type CourseStatus = 'draft' | 'published' | 'archived';
export type CourseLevel = 'beginner' | 'intermediate' | 'advanced';
export type ExerciseType = 'code' | 'quiz' | 'assignment';
export type ContentType = 'text' | 'video' | 'exercise' | 'quiz' | 'file';

// Core Course interface
export interface Course {
  _id: string;
  code?: string; // Course code (e.g., PROG101)
  title: string;
  description: string;
  slug: string; // URL-friendly identifier
  category: string;
  level: CourseLevel;
  status: CourseStatus;
  instructor: {
    _id: string;
    name: string;
    email: string;
  };
  collaborators: Array<{
    _id: string;
    name: string;
    email: string;
    role: 'instructor' | 'assistant';
  }>;
  thumbnail?: string;
  tags: string[];
  prerequisites: string[];
  estimatedDuration: number; // in minutes
  chapters: Chapter[];
  resources: CourseResource[];
  settings: CourseSettings;
  stats: CourseStats;
  version: number;
  lastModified?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

// Chapter interface
export interface Chapter {
  _id: string;
  title: string;
  description?: string;
  order: number;
  sections: Section[];
  isPublished: boolean;
  estimatedDuration: number; // in minutes
}

// Section interface
export interface Section {
  _id: string;
  title: string;
  description?: string;
  order: number;
  content: Content[];
  isPublished: boolean;
  estimatedDuration: number; // in minutes
}

// Content interface
export interface Content {
  _id: string;
  type: ContentType;
  title?: string;
  order: number;
  data: ContentData;
  isPublished: boolean;
}

// Content data - varies by type
export interface ContentData {
  // Text content
  markdown?: string;
  html?: string;

  // Video content
  videoUrl?: string;
  videoDuration?: number;
  transcript?: string;

  // Exercise content
  exercise?: Exercise;

  // Quiz content
  quiz?: Quiz;

  // File content
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
}

// Exercise interface
export interface Exercise {
  _id: string;
  title: string;
  description: string;
  type: ExerciseType;
  instructions: string;
  starterCode?: string;
  solution?: string;
  testCases?: TestCase[];
  hints?: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  programmingLanguage?: string;
  maxAttempts?: number;
  timeLimit?: number; // in minutes
}

// Test case for code exercises
export interface TestCase {
  _id: string;
  input: string;
  expectedOutput: string;
  description?: string;
  isHidden: boolean; // Hidden test cases for plagiarism prevention
}

// Quiz interface
export interface Quiz {
  _id: string;
  title: string;
  description?: string;
  questions: QuizQuestion[];
  timeLimit?: number; // in minutes
  maxAttempts?: number;
  passingScore: number; // percentage
}

// Quiz question interface
export interface QuizQuestion {
  _id: string;
  type: 'multiple_choice' | 'true_false' | 'short_answer' | 'essay';
  question: string;
  options?: string[]; // for multiple choice
  correctAnswer: string | string[];
  explanation?: string;
  points: number;
}

// Course resources (files, links, etc.)
export interface CourseResource {
  _id: string;
  name: string;
  type: 'file' | 'link' | 'reference';
  url: string;
  description?: string;
  size?: number; // for files
  uploadedAt: Date;
}

// Course settings
export interface CourseSettings {
  isPublic: boolean;
  requiresApproval: boolean;
  maxStudents?: number;
  startDate?: Date;
  endDate?: Date;
  allowLateSubmissions: boolean;
  enableDiscussions: boolean;
  enableCollaboration: boolean;
}

// Course statistics
export interface CourseStats {
  totalViews: number;
  averageRating?: number;
  lastAccessed?: Date;
}

// API Request/Response types
export interface CreateCourseRequest {
  code?: string;
  title: string;
  description: string;
  category: string;
  level: CourseLevel;
  tags?: string[];
  prerequisites?: string[];
  estimatedDuration?: number;
  settings?: Partial<CourseSettings>;
}

export interface UpdateCourseRequest {
  code?: string;
  title?: string;
  description?: string;
  category?: string;
  level?: CourseLevel;
  status?: CourseStatus;
  tags?: string[];
  prerequisites?: string[];
  estimatedDuration?: number;
  settings?: Partial<CourseSettings>;
}

export interface CreateChapterRequest {
  title: string;
  description?: string;
  order: number;
}

export interface UpdateChapterRequest {
  title?: string;
  description?: string;
  order?: number;
  isPublished?: boolean;
}

export interface CreateSectionRequest {
  title: string;
  description?: string;
  order: number;
}

export interface UpdateSectionRequest {
  title?: string;
  description?: string;
  order?: number;
  isPublished?: boolean;
}

export interface CreateContentRequest {
  type: ContentType;
  title?: string;
  order: number;
  data: Partial<ContentData>;
}

export interface UpdateContentRequest {
  title?: string;
  order?: number;
  data?: Partial<ContentData>;
  isPublished?: boolean;
}

export interface CreateExerciseRequest {
  title: string;
  description: string;
  type: ExerciseType;
  instructions: string;
  starterCode?: string;
  solution?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  programmingLanguage?: string;
  maxAttempts?: number;
  timeLimit?: number;
}

export interface SubmitExerciseRequest {
  exerciseId: string;
  code?: string;
  answer?: string;
  files?: File[];
}

export interface ExerciseSubmission {
  _id: string;
  exerciseId: string;
  studentId: string;
  code?: string;
  answer?: string;
  files?: string[];
  result?: ExerciseResult;
  submittedAt: Date;
  gradedAt?: Date;
}

export interface ExerciseResult {
  isCorrect: boolean;
  score: number;
  feedback: string;
  testResults?: TestResult[];
  executionTime?: number;
  codeQuality?: CodeQualityMetrics;
}

export interface TestResult {
  testCaseId: string;
  passed: boolean;
  actualOutput?: string;
  errorMessage?: string;
}

export interface CodeQualityMetrics {
  linesOfCode: number;
  complexity: number;
  duplicateLines: number;
  codeSmells: string[];
}


// Search and filtering
export interface CourseFilters {
  category?: string;
  level?: CourseLevel;
  instructor?: string;
  tags?: string[];
  status?: CourseStatus;
  search?: string;
  page?: number;
  limit?: number;
}

export interface CourseSearchResult {
  courses: Course[];
  total: number;
  page: number;
  limit: number;
  filters: CourseFilters;
}

// Version control for courses
export interface CourseVersion {
  _id: string;
  courseId: string;
  version: number;
  changes: string;
  createdBy: string;
  createdAt: Date;
  snapshot: Partial<Course>; // Compressed version of course at this point
}
