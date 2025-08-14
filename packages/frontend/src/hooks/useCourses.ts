// packages/frontend/src/hooks/useCourses.ts
// Specialized hook for course operations and state management

import { useState, useEffect, useCallback } from 'react';
import { courseApi } from '@/lib/api/courses';
import { Course } from '@yggdrasil/shared-utilities/client';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useAsyncState } from './useAsyncState';

type ViewMode = 'my-courses' | 'published' | 'all';

interface SearchFilters {
  search?: string;
  category?: string;
  level?: string;
  limit?: number;
}

interface UseCoursesReturn {
  // Course data
  courses: Course[];
  loading: boolean;
  error: string | null;
  
  // Categories
  categories: string[];
  categoriesLoading: boolean;
  
  // View mode and filters
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedCategory: string;
  setSelectedCategory: (category: string) => void;
  selectedLevel: string;
  setSelectedLevel: (level: string) => void;
  
  // Actions
  loadCourses: () => Promise<void>;
  loadCategories: () => Promise<void>;
  publishCourse: (courseId: string, publish: boolean) => Promise<boolean>;
  refresh: () => Promise<void>;
  
  // Utilities
  canManageCourse: (course: Course) => boolean;
}

export function useCourses(): UseCoursesReturn {
  const { user } = useAuth();
  
  // Main courses state
  const {
    data: courses,
    loading,
    error,
    setData: setCourses,
    execute: executeCourseLoad
  } = useAsyncState<Course[]>([]);
  
  // Categories state
  const {
    data: categories,
    loading: categoriesLoading,
    execute: executeCategoriesLoad
  } = useAsyncState<string[]>([]);
  
  // Filter states
  const [viewMode, setViewMode] = useState<ViewMode>('my-courses');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('');

  // Load courses based on current view mode and filters
  const loadCourses = useCallback(async () => {
    await executeCourseLoad(async () => {
      let response;

      if (viewMode === 'my-courses' && user) {
        response = await courseApi.getMyCourses();
      } else if (viewMode === 'published') {
        response = await courseApi.getPublishedCourses();
      } else {
        // Search all courses with filters
        const filters: SearchFilters = {
          limit: 50,
        };
        
        if (searchQuery) filters.search = searchQuery;
        if (selectedCategory) filters.category = selectedCategory;
        if (selectedLevel) filters.level = selectedLevel;
        
        response = await courseApi.searchCourses(filters);
      }

      if (response.success) {
        const coursesData = viewMode === 'all' && response.data.courses
          ? response.data.courses
          : response.data;
        return Array.isArray(coursesData) ? coursesData : [];
      } else {
        throw new Error(response.error || 'Failed to load courses');
      }
    });
  }, [viewMode, user, searchQuery, selectedCategory, selectedLevel, executeCourseLoad]);

  // Load available categories
  const loadCategories = useCallback(async () => {
    await executeCategoriesLoad(async () => {
      const categoryList = await courseApi.getCourseCategories();
      return categoryList as string[];
    });
  }, [executeCategoriesLoad]);

  // Publish/unpublish a course
  const publishCourse = useCallback(async (courseId: string, publish: boolean): Promise<boolean> => {
    try {
      const response = await courseApi.publishCourse(courseId, publish);
      if (response.success) {
        // Refresh courses list to show updated status
        await loadCourses();
        return true;
      } else {
        throw new Error(response.error || 'Failed to update course status');
      }
    } catch (err: any) {
      console.error('Error updating course status:', err);
      throw err;
    }
  }, [loadCourses]);

  // Refresh both courses and categories
  const refresh = useCallback(async () => {
    await Promise.all([loadCourses(), loadCategories()]);
  }, [loadCourses, loadCategories]);

  // Check if user can manage a specific course
  const canManageCourse = useCallback((course: Course) => {
    if (!user) return false;
    return (
      user.role === 'admin' ||
      course.instructor._id === user._id ||
      user.role === 'staff'
    );
  }, [user]);

  // Load data when dependencies change
  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  return {
    // Course data
    courses: courses || [],
    loading,
    error,
    
    // Categories
    categories: categories || [],
    categoriesLoading,
    
    // View mode and filters
    viewMode,
    setViewMode,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    selectedLevel,
    setSelectedLevel,
    
    // Actions
    loadCourses,
    loadCategories,
    publishCourse,
    refresh,
    
    // Utilities
    canManageCourse,
  };
}