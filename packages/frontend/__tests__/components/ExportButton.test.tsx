// packages/frontend/__tests__/components/ExportButton.test.tsx

import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ExportButton } from '../../src/components/statistics/ExportButton';

// Mock fetch
global.fetch = jest.fn();

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(() => 'mock-token'),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock alert
Object.defineProperty(window, 'alert', {
  writable: true,
  value: jest.fn(),
});

describe('ExportButton', () => {
  const defaultProps = {
    stats: { totalStudents: 100, averageGrade: 85 },
    period: 'monthly',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders export button', () => {
    render(<ExportButton {...defaultProps} />);
    
    expect(screen.getByText('Export')).toBeInTheDocument();
  });

  it('shows dropdown when button is clicked', () => {
    render(<ExportButton {...defaultProps} />);
    
    fireEvent.click(screen.getByText('Export'));
    
    expect(screen.getByText('Export as PDF')).toBeInTheDocument();
    expect(screen.getByText('Export as CSV')).toBeInTheDocument();
    expect(screen.getByText('Export as Excel')).toBeInTheDocument();
  });

  it('hides dropdown when clicking outside', () => {
    render(<ExportButton {...defaultProps} />);
    
    fireEvent.click(screen.getByText('Export'));
    expect(screen.getByText('Export as PDF')).toBeInTheDocument();
    
    // Click the backdrop overlay
    const backdrop = document.querySelector('.fixed.inset-0');
    if (backdrop) {
      fireEvent.click(backdrop);
    }
    
    expect(screen.queryByText('Export as PDF')).not.toBeInTheDocument();
  });

  it('shows loading state during export', async () => {
    const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
    // Mock a slow response to capture loading state
    mockFetch.mockImplementationOnce(() => 
      new Promise(resolve => 
        setTimeout(() => resolve({
          ok: true,
          status: 200,
          statusText: 'OK',
          headers: new Headers(),
          blob: () => Promise.resolve(new Blob(['test'])),
          json: () => Promise.resolve({}),
          text: () => Promise.resolve(''),
        } as Response), 100)
      )
    );

    render(<ExportButton {...defaultProps} />);
    
    fireEvent.click(screen.getByText('Export'));
    
    act(() => {
      fireEvent.click(screen.getByText('Export as PDF'));
    });
    
    // Check loading state immediately after click
    expect(screen.getByText('Exporting...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /export/i })).toBeDisabled();
    
    // Wait for export to complete
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 150));
    });
  });

  it('calls fetch with correct parameters for export', async () => {
    const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: new Headers(),
      blob: () => Promise.resolve(new Blob(['test'])),
      json: () => Promise.resolve({}),
      text: () => Promise.resolve(''),
    } as Response);

    render(<ExportButton {...defaultProps} />);
    
    fireEvent.click(screen.getByText('Export'));
    
    await act(async () => {
      fireEvent.click(screen.getByText('Export as PDF'));
      // Wait for the fetch to complete
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    
    expect(mockFetch).toHaveBeenCalledWith('/api/statistics/export', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer mock-token',
        'Content-Type': 'application/json',
      },
      body: expect.stringContaining('"type":"pdf"'),
    });
  });

  it('handles export errors gracefully', async () => {
    const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    // Temporarily suppress console.error for this test since we're testing error handling
    const originalConsoleError = console.error;
    console.error = jest.fn();

    render(<ExportButton {...defaultProps} />);
    
    fireEvent.click(screen.getByText('Export'));
    
    await act(async () => {
      fireEvent.click(screen.getByText('Export as CSV'));
      // Wait for the error to be handled
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    
    expect(window.alert).toHaveBeenCalledWith('Export failed. Please try again.');
    
    // Restore console.error
    console.error = originalConsoleError;
  });
});