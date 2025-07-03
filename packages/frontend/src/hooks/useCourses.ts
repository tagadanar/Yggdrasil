// Custom hooks for course management
import { useState, useEffect, useCallback } from 'react';
import { mockCourseApi as courseApi } from '../utils/mockCourseApi';
import { 
  Course, 
  CreateCourseData, 
  UpdateCourseData, 
  CourseSearchFilters, 
  CourseStats 
} from '../types/course';

// Hook for managing courses list
export function useCourses(initialFilters?: CourseSearchFilters) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState<CourseSearchFilters>(initialFilters || {});

  const fetchCourses = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await courseApi.getCourses(filters);
      
      if (result.success && result.data) {
        setCourses(result.data.courses);
        setTotal(result.data.total);
      } else {
        setError(result.error || 'Failed to fetch courses');
      }
    } catch (err) {
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const updateFilters = useCallback((newFilters: Partial<CourseSearchFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({});
  }, []);

  const refresh = useCallback(() => {
    fetchCourses();
  }, [fetchCourses]);

  return {
    courses,
    loading,
    error,
    total,
    filters,
    updateFilters,
    clearFilters,
    refresh
  };
}

// Hook for managing a single course
export function useCourse(courseId: string | null) {
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCourse = useCallback(async () => {
    if (!courseId) {
      setCourse(null);
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const result = await courseApi.getCourse(courseId);
      
      if (result.success && result.data) {
        setCourse(result.data);
      } else {
        setError(result.error || 'Failed to fetch course');
      }
    } catch (err) {
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    fetchCourse();
  }, [fetchCourse]);

  const updateCourse = useCallback(async (updateData: UpdateCourseData) => {
    if (!courseId) return { success: false, error: 'No course ID' };

    setLoading(true);
    
    try {
      const result = await courseApi.updateCourse(courseId, updateData);
      
      if (result.success && result.data) {
        setCourse(result.data);
        return { success: true };
      } else {
        setError(result.error || 'Failed to update course');
        return { success: false, error: result.error };
      }
    } catch (err) {
      const error = 'Network error occurred';
      setError(error);
      return { success: false, error };
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  const refresh = useCallback(() => {
    fetchCourse();
  }, [fetchCourse]);

  return {
    course,
    loading,
    error,
    updateCourse,
    refresh
  };
}

// Hook for course creation
export function useCourseCreate() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createCourse = useCallback(async (courseData: CreateCourseData) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await courseApi.createCourse(courseData);
      
      if (result.success && result.data) {
        return { success: true, course: result.data };
      } else {
        setError(result.error || 'Failed to create course');
        return { success: false, error: result.error };
      }
    } catch (err) {
      const error = 'Network error occurred';
      setError(error);
      return { success: false, error };
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    createCourse,
    loading,
    error
  };
}

// Hook for course enrollment
export function useCourseEnrollment(courseId: string) {
  const [enrollmentStatus, setEnrollmentStatus] = useState<{
    enrolled: boolean;
    enrollmentDate?: Date;
    waitlisted?: boolean;
    position?: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEnrollmentStatus = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await courseApi.getEnrollmentStatus(courseId);
      
      if (result.success && result.data) {
        setEnrollmentStatus(result.data);
      } else {
        setError(result.error || 'Failed to fetch enrollment status');
      }
    } catch (err) {
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    if (courseId) {
      fetchEnrollmentStatus();
    }
  }, [fetchEnrollmentStatus, courseId]);

  const enroll = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await courseApi.enrollInCourse(courseId);
      
      if (result.success) {
        await fetchEnrollmentStatus(); // Refresh status
        return { success: true };
      } else {
        setError(result.error || 'Failed to enroll');
        return { success: false, error: result.error };
      }
    } catch (err) {
      const error = 'Network error occurred';
      setError(error);
      return { success: false, error };
    } finally {
      setLoading(false);
    }
  }, [courseId, fetchEnrollmentStatus]);

  const unenroll = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await courseApi.unenrollFromCourse(courseId);
      
      if (result.success) {
        await fetchEnrollmentStatus(); // Refresh status
        return { success: true };
      } else {
        setError(result.error || 'Failed to unenroll');
        return { success: false, error: result.error };
      }
    } catch (err) {
      const error = 'Network error occurred';
      setError(error);
      return { success: false, error };
    } finally {
      setLoading(false);
    }
  }, [courseId, fetchEnrollmentStatus]);

  return {
    enrollmentStatus,
    loading,
    error,
    enroll,
    unenroll,
    refresh: fetchEnrollmentStatus
  };
}

// Hook for course progress tracking
export function useCourseProgress(courseId: string) {
  const [progress, setProgress] = useState<{
    completionPercentage: number;
    chaptersCompleted: string[];
    sectionsCompleted: string[];
    exercisesCompleted: string[];
    timeSpent: number;
    lastAccessDate: Date;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProgress = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await courseApi.getCourseProgress(courseId);
      
      if (result.success && result.data) {
        setProgress(result.data);
      } else {
        setError(result.error || 'Failed to fetch progress');
      }
    } catch (err) {
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    if (courseId) {
      fetchProgress();
    }
  }, [fetchProgress, courseId]);

  const updateProgress = useCallback(async (progressData: {
    chapterId?: string;
    sectionId?: string;
    exerciseId?: string;
    completed: boolean;
    timeSpent?: number;
  }) => {
    try {
      const result = await courseApi.updateProgress(courseId, progressData);
      
      if (result.success) {
        await fetchProgress(); // Refresh progress
        return { success: true };
      } else {
        return { success: false, error: result.error };
      }
    } catch (err) {
      return { success: false, error: 'Network error occurred' };
    }
  }, [courseId, fetchProgress]);

  return {
    progress,
    loading,
    error,
    updateProgress,
    refresh: fetchProgress
  };
}

// Hook for course statistics
export function useCourseStats() {
  const [stats, setStats] = useState<CourseStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await courseApi.getCourseStats();
      
      if (result.success && result.data) {
        setStats(result.data);
      } else {
        setError(result.error || 'Failed to fetch statistics');
      }
    } catch (err) {
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const refresh = useCallback(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    stats,
    loading,
    error,
    refresh
  };
}

// Hook for course search
export function useCourseSearch() {
  const [results, setResults] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  const search = useCallback(async (query: string, filters?: CourseSearchFilters) => {
    if (!query.trim()) {
      setResults([]);
      setTotal(0);
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const result = await courseApi.searchCourses(query, filters);
      
      if (result.success && result.data) {
        setResults(result.data.courses);
        setTotal(result.data.total);
      } else {
        setError(result.error || 'Search failed');
      }
    } catch (err) {
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  const clearSearch = useCallback(() => {
    setResults([]);
    setTotal(0);
    setError(null);
  }, []);

  return {
    results,
    loading,
    error,
    total,
    search,
    clearSearch
  };
}