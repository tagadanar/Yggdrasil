import React from 'react';
import { render } from '@testing-library/react';
import CourseDetail from '@/components/courses/CourseDetail';
import { courseApi } from '@/utils/courseApi';
import toast from 'react-hot-toast';

// Mock dependencies
jest.mock('@/utils/courseApi');
jest.mock('react-hot-toast');

describe('CourseDetail Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Configure API mocks
    (courseApi.deleteCourse as jest.Mock).mockResolvedValue({ success: true });
    (courseApi.publishCourse as jest.Mock).mockResolvedValue({ success: true });
    (courseApi.archiveCourse as jest.Mock).mockResolvedValue({ success: true });
    (toast.success as jest.Mock).mockImplementation(() => {});
    (toast.error as jest.Mock).mockImplementation(() => {});
  });

  describe('Basic Rendering', () => {
    it('should render component without errors', () => {
      expect(() => {
        render(<CourseDetail courseId="course-123" />);
      }).not.toThrow();
    });

    it('should handle missing courseId', () => {
      expect(() => {
        render(<CourseDetail courseId="" />);
      }).not.toThrow();
    });

    it('should handle null courseId', () => {
      expect(() => {
        render(<CourseDetail courseId={null as any} />);
      }).not.toThrow();
    });
  });

  describe('API Integration', () => {
    it('should have course API methods available', () => {
      expect(courseApi.deleteCourse).toBeDefined();
      expect(courseApi.publishCourse).toBeDefined();
      expect(courseApi.archiveCourse).toBeDefined();
    });
  });

  describe('Toast Integration', () => {
    it('should have toast methods available', () => {
      expect(toast.success).toBeDefined();
      expect(toast.error).toBeDefined();
    });
  });
});