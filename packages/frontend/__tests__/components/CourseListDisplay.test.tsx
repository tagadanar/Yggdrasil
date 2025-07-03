import React from 'react';
import { render, screen } from '@testing-library/react';
import CourseListDisplay from '@/components/courses/CourseListDisplay';
import { Course } from '@/types/course';

// Mock the CourseCard component since it has complex dependencies
jest.mock('@/components/courses/CourseCard', () => {
  return function MockCourseCard({ course }: { course: Course }) {
    return <div data-testid={`course-card-${course._id}`}>{course.title}</div>;
  };
});

const mockCourses: Course[] = [
  {
    _id: '1',
    title: 'Test Course 1',
    description: 'Test description',
    code: 'TEST-101',
    credits: 3,
    level: 'beginner',
    category: 'programming',
    instructor: 'instructor1',
    duration: { weeks: 12, hoursPerWeek: 3, totalHours: 36 },
    schedule: [],
    capacity: 30,
    enrolledStudents: [],
    prerequisites: [],
    tags: ['test'],
    status: 'published',
    visibility: 'public',
    chapters: [],
    resources: [],
    assessments: [],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    startDate: new Date(),
    endDate: new Date()
  }
];

describe('CourseListDisplay', () => {
  const defaultProps = {
    courses: mockCourses,
    loading: false,
    viewMode: 'grid' as const,
    totalCount: 1,
    currentPage: 1,
    pageSize: 10,
    onPageChange: jest.fn(),
    onRefresh: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders courses in grid mode', () => {
    render(<CourseListDisplay {...defaultProps} />);
    
    expect(screen.getByTestId('course-card-1')).toBeInTheDocument();
    expect(screen.getByText('Test Course 1')).toBeInTheDocument();
  });

  it('shows loading spinner when loading', () => {
    render(<CourseListDisplay {...defaultProps} courses={[]} loading={true} />);
    
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('shows empty state when no courses', () => {
    render(<CourseListDisplay {...defaultProps} courses={[]} totalCount={0} />);
    
    expect(screen.getByText('No courses found')).toBeInTheDocument();
  });

  it('shows pagination when multiple pages', () => {
    render(<CourseListDisplay {...defaultProps} totalCount={25} pageSize={10} />);
    
    expect(screen.getByText('Page 1 of 3')).toBeInTheDocument();
  });

  it('applies correct CSS classes for list view mode', () => {
    const { container } = render(<CourseListDisplay {...defaultProps} viewMode="list" />);
    
    expect(container.querySelector('.space-y-4')).toBeInTheDocument();
  });

  it('applies correct CSS classes for grid view mode', () => {
    const { container } = render(<CourseListDisplay {...defaultProps} viewMode="grid" />);
    
    expect(container.querySelector('.grid')).toBeInTheDocument();
  });
});