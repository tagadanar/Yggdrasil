import React from 'react';
import { render, screen } from '@testing-library/react';
import CourseCard from '@/components/courses/CourseCard';
import { Course } from '@/types/course';

const mockCourse: Course = {
  _id: '1',
  title: 'Test Course',
  description: 'Test Description',
  code: 'TEST101',
  credits: 3,
  level: 'beginner',
  category: 'programming',
  instructor: 'instructor-id',
  instructorInfo: {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
  },
  duration: {
    weeks: 12,
    hoursPerWeek: 3,
    totalHours: 36,
  },
  schedule: [],
  capacity: 30,
  enrolledStudents: [],
  prerequisites: [],
  tags: ['javascript', 'web'],
  status: 'published',
  visibility: 'public',
  chapters: [],
  resources: [],
  assessments: [],
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  startDate: new Date(),
  endDate: new Date(),
};

const defaultProps = {
  course: mockCourse,
  viewMode: 'grid' as const,
  instructorView: false,
  onUpdate: jest.fn(),
};

describe('CourseCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders course information correctly', () => {
    render(<CourseCard {...defaultProps} />);
    
    expect(screen.getByText('Test Course')).toBeInTheDocument();
    expect(screen.getByText('TEST101')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('View Details')).toBeInTheDocument();
  });

  it('shows enrollment button when not in instructor view', () => {
    render(<CourseCard {...defaultProps} instructorView={false} />);
    
    expect(screen.getByText('Enroll')).toBeInTheDocument();
  });

  it('hides enrollment button in instructor view', () => {
    render(<CourseCard {...defaultProps} instructorView={true} />);
    
    expect(screen.queryByText('Enroll')).not.toBeInTheDocument();
    expect(screen.getByText('View Details')).toBeInTheDocument();
  });

  it('renders in list view mode', () => {
    render(<CourseCard {...defaultProps} viewMode="list" />);
    
    // In list mode, should show course title and view details button
    expect(screen.getByText('Test Course')).toBeInTheDocument();
    expect(screen.getByText('View Details')).toBeInTheDocument();
  });

  it('handles course without instructor info', () => {
    const courseWithoutInstructor = {
      ...mockCourse,
      instructorInfo: undefined,
    };
    
    render(<CourseCard {...defaultProps} course={courseWithoutInstructor} />);
    
    // Should still render without crashing
    expect(screen.getByText('Test Course')).toBeInTheDocument();
  });
});