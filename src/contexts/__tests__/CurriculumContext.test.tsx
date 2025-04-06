// src/contexts/__tests__/CurriculumContext.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CurriculumProvider, useCurriculum } from '../CurriculumContext';

// Sample test curriculum
const sampleCurriculum = {
  id: '1',
  programName: 'Test Program',
  years: [
    {
      id: 'y1',
      number: 1,
      title: 'Year 1',
      categories: [
        {
          id: 'cat1',
          name: 'Category 1',
          courses: [
            {
              id: 'course1',
              title: 'Course 1',
              description: 'Description 1',
              prerequisites: [],
              isStartingNode: true
            },
            {
              id: 'course2',
              title: 'Course 2',
              description: 'Description 2',
              prerequisites: ['course1']
            }
          ]
        }
      ]
    }
  ]
};

// Mock local storage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    clear: () => {
      store = {};
    }
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Test component
const TestComponent = () => {
  const { 
    curriculum, 
    graphData, 
    selectedCourse, 
    completedCourses,
    unlockedCourses,
    selectCourse,
    completeCourse
  } = useCurriculum();
  
  return (
    <div>
      <h1 data-testid="program-name">{curriculum?.programName}</h1>
      
      <div>
        <h2>Courses</h2>
        <ul>
          {graphData?.nodes.map(node => (
            <li key={node.id} data-testid={`course-${node.id}`}>
              {node.name}
              <button onClick={() => selectCourse(node.id)}>Select</button>
              
              {unlockedCourses.includes(node.id) && !completedCourses.includes(node.id) && (
                <button 
                  onClick={() => completeCourse(node.id)} 
                  data-testid={`complete-${node.id}`}
                >
                  Complete
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>
      
      {selectedCourse && (
        <div data-testid="selected-course">
          <h3>{selectedCourse.name}</h3>
          <p>{selectedCourse.description}</p>
        </div>
      )}
      
      <div>
        <h2>Progress</h2>
        <p data-testid="progress">
          {completedCourses.length} / {graphData?.nodes.length} completed
        </p>
      </div>
    </div>
  );
};

describe('CurriculumContext', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });
  
  test('provides curriculum data and graph data', async () => {
    // Mock fetching curriculum data
    global.fetch = jest.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(sampleCurriculum)
      })
    ) as jest.Mock;
    
    render(
      <CurriculumProvider>
        <TestComponent />
      </CurriculumProvider>
    );
    
    // Wait for curriculum to load
    await waitFor(() => {
      expect(screen.getByTestId('program-name')).toHaveTextContent('Test Program');
    });
    
    // Check graph data was transformed correctly
    expect(screen.getByTestId('course-course1')).toBeInTheDocument();
    expect(screen.getByTestId('course-course2')).toBeInTheDocument();
  });
  
  test('allows selecting a course', async () => {
    // Mock fetching curriculum data
    global.fetch = jest.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(sampleCurriculum)
      })
    ) as jest.Mock;
    
    render(
      <CurriculumProvider>
        <TestComponent />
      </CurriculumProvider>
    );
    
    // Wait for curriculum to load
    await waitFor(() => {
      expect(screen.getByTestId('program-name')).toHaveTextContent('Test Program');
    });
    
    // Select a course
    fireEvent.click(screen.getAllByText('Select')[0]);
    
    // Check selected course details are displayed
    expect(screen.getByTestId('selected-course')).toHaveTextContent('Course 1');
  });
  
  test('allows completing a course and unlocks dependencies', async () => {
    // Mock fetching curriculum data
    global.fetch = jest.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(sampleCurriculum)
      })
    ) as jest.Mock;
    
    render(
      <CurriculumProvider>
        <TestComponent />
      </CurriculumProvider>
    );
    
    // Wait for curriculum to load
    await waitFor(() => {
      expect(screen.getByTestId('program-name')).toHaveTextContent('Test Program');
    });
    
    // Complete course1 (which should be unlocked as a starting node)
    expect(screen.getByTestId('complete-course1')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('complete-course1'));
    
    // Progress should update
    expect(screen.getByTestId('progress')).toHaveTextContent('1 / 2 completed');
    
    // Course2 should now be unlocked
    await waitFor(() => {
      expect(screen.getByTestId('complete-course2')).toBeInTheDocument();
    });
  });
});