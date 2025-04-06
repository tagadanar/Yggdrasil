// src/components/curriculum/__tests__/CurriculumEditor.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CurriculumEditor } from '../CurriculumEditor';
import { CurriculumProvider } from '@/contexts/CurriculumContext';

// Mock curriculum context
jest.mock('@/contexts/CurriculumContext', () => ({
  useCurriculum: jest.fn(() => ({
    curriculum: {
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
                }
              ]
            }
          ]
        }
      ]
    },
    setCurriculum: jest.fn(),
    isLoading: false
  })),
  CurriculumProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));

describe('CurriculumEditor', () => {
  test('renders curriculum editor form', () => {
    render(<CurriculumEditor />);
    
    // Program name should be displayed
    expect(screen.getByLabelText(/program name/i)).toHaveValue('Test Program');
    
    // Year details should be displayed
    expect(screen.getByDisplayValue('Year 1')).toBeInTheDocument();
    
    // Category details should be displayed
    expect(screen.getByDisplayValue('Category 1')).toBeInTheDocument();
    
    // Course details should be displayed
    expect(screen.getByDisplayValue('Course 1')).toBeInTheDocument();
    expect(screen.getByText(/description 1/i)).toBeInTheDocument();
  });
  
  test('allows editing program name', async () => {
    const setCurriculumMock = jest.fn();
    (require('@/contexts/CurriculumContext').useCurriculum as jest.Mock).mockReturnValue({
      curriculum: {
        id: '1',
        programName: 'Test Program',
        years: []
      },
      setCurriculum: setCurriculumMock,
      isLoading: false
    });
    
    render(<CurriculumEditor />);
    
    // Edit program name
    fireEvent.change(screen.getByLabelText(/program name/i), {
      target: { value: 'Updated Program Name' }
    });
    
    // Save changes
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));
    
    // Check if setCurriculum was called with updated name
    await waitFor(() => {
      expect(setCurriculumMock).toHaveBeenCalledWith(expect.objectContaining({
        programName: 'Updated Program Name'
      }));
    });
  });
  
  test('allows adding a new year', async () => {
    const setCurriculumMock = jest.fn();
    (require('@/contexts/CurriculumContext').useCurriculum as jest.Mock).mockReturnValue({
      curriculum: {
        id: '1',
        programName: 'Test Program',
        years: []
      },
      setCurriculum: setCurriculumMock,
      isLoading: false
    });
    
    render(<CurriculumEditor />);
    
    // Click "Add Year" button
    fireEvent.click(screen.getByRole('button', { name: /add year/i }));
    
    // Save changes
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));
    
    // Check if setCurriculum was called with a new year
    await waitFor(() => {
      expect(setCurriculumMock).toHaveBeenCalledWith(expect.objectContaining({
        years: expect.arrayContaining([
          expect.objectContaining({
            number: 1,
            title: expect.any(String)
          })
        ])
      }));
    });
  });
  
  test('shows loading state when isLoading is true', () => {
    (require('@/contexts/CurriculumContext').useCurriculum as jest.Mock).mockReturnValue({
      curriculum: null,
      setCurriculum: jest.fn(),
      isLoading: true
    });
    
    render(<CurriculumEditor />);
    
    expect(screen.getByText(/loading curriculum/i)).toBeInTheDocument();
  });
});