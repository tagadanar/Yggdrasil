// src/components/curriculum/__tests__/CurriculumGraph.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { CurriculumGraph } from '../CurriculumGraph';
import { CurriculumProvider } from '@/contexts/CurriculumContext';

// Mock D3
jest.mock('d3', () => ({
  select: jest.fn(() => ({
    selectAll: jest.fn(() => ({
      remove: jest.fn()
    })),
    append: jest.fn(() => ({
      attr: jest.fn(() => ({
        append: jest.fn(() => ({
          attr: jest.fn(() => ({
            append: jest.fn(() => ({
              attr: jest.fn()
            }))
          }))
        }))
      }))
    }))
  })),
  color: jest.fn(() => ({
    darker: jest.fn(() => '#111'),
    brighter: jest.fn(() => '#999')
  }))
}));

// Mock curriculum data
jest.mock('@/contexts/CurriculumContext', () => ({
  useCurriculum: jest.fn(() => ({
    graphData: {
      nodes: [
        {
          id: 'course1',
          name: 'Course 1',
          group: 'Category 1',
          year: 1,
          description: 'Description 1',
          prerequisites: [],
          allPrerequisites: [],
          level: 0,
          isStartingNode: true,
          isFinalNode: false,
          isUnlocked: true,
          isCompleted: false
        },
        {
          id: 'course2',
          name: 'Course 2',
          group: 'Category 1',
          year: 1,
          description: 'Description 2',
          prerequisites: ['course1'],
          allPrerequisites: ['course1'],
          level: 1,
          isStartingNode: false,
          isFinalNode: false,
          isUnlocked: false,
          isCompleted: false
        }
      ],
      links: [
        {
          source: 'course1',
          target: 'course2',
          isDirectPrerequisite: true
        }
      ],
      maxLevel: 1
    },
    selectedCourse: null,
    selectCourse: jest.fn(),
    completedCourses: [],
    unlockedCourses: ['course1'],
    completeCourse: jest.fn(),
    isLoading: false
  })),
  CurriculumProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));

describe('CurriculumGraph', () => {
  test('renders graph container', () => {
    render(<CurriculumGraph />);
    
    expect(screen.getByTestId('graph-container')).toBeInTheDocument();
  });
  
  test('renders SVG element', () => {
    render(<CurriculumGraph />);
    
    expect(screen.getByTestId('curriculum-svg')).toBeInTheDocument();
  });
  
  test('renders legend', () => {
    render(<CurriculumGraph />);
    
    expect(screen.getByText(/Legend/i)).toBeInTheDocument();
  });
  
  test('renders progress indicator', () => {
    render(<CurriculumGraph />);
    
    expect(screen.getByText(/Progress/i)).toBeInTheDocument();
  });
  
  test('renders loading state when isLoading is true', () => {
    const useCurriculumMock = require('@/contexts/CurriculumContext').useCurriculum;
    useCurriculumMock.mockReturnValueOnce({
      ...useCurriculumMock(),
      isLoading: true
    });
    
    render(<CurriculumGraph />);
    
    expect(screen.getByText(/Loading curriculum/i)).toBeInTheDocument();
  });
  
  test('renders course details when a course is selected', () => {
    const useCurriculumMock = require('@/contexts/CurriculumContext').useCurriculum;
    useCurriculumMock.mockReturnValueOnce({
      ...useCurriculumMock(),
      selectedCourse: {
        id: 'course1',
        name: 'Course 1',
        group: 'Category 1',
        year: 1,
        description: 'Description 1',
        prerequisites: [],
        allPrerequisites: [],
        level: 0,
        isStartingNode: true,
        isFinalNode: false,
        isUnlocked: true,
        isCompleted: false
      }
    });
    
    render(<CurriculumGraph />);
    
    expect(screen.getByText('Course 1')).toBeInTheDocument();
    expect(screen.getByText('Description 1')).toBeInTheDocument();
  });
});