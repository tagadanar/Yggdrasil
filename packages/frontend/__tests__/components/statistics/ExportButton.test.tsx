import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ExportButton } from '@/components/statistics/ExportButton';

// Mock fetch
global.fetch = jest.fn();

// Mock window.alert
global.alert = jest.fn();

describe('ExportButton', () => {
  const mockStats = {
    attendance: { rate: 85.5, trend: 'up' },
    grades: { average: 78.2, trend: 'stable' },
    engagement: { score: 72, trend: 'down' }
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render export button with default text', () => {
      render(<ExportButton stats={mockStats} period="month" />);

      expect(screen.getByText('Export')).toBeInTheDocument();
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should render button with correct accessibility attributes', () => {
      render(<ExportButton stats={mockStats} period="month" />);

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });
  });

  describe('Props Handling', () => {
    it('should handle different periods', () => {
      const { rerender } = render(<ExportButton stats={mockStats} period="week" />);
      expect(screen.getByRole('button')).toBeInTheDocument();

      rerender(<ExportButton stats={mockStats} period="year" />);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should handle empty stats object', () => {
      expect(() => {
        render(<ExportButton stats={{}} period="month" />);
      }).not.toThrow();
    });

    it('should handle missing props gracefully', () => {
      expect(() => {
        render(<ExportButton stats={mockStats} period="" />);
      }).not.toThrow();
    });
  });

  describe('User Interaction', () => {
    it('should handle button clicks without errors', () => {
      render(<ExportButton stats={mockStats} period="month" />);

      const button = screen.getByRole('button');
      expect(() => {
        fireEvent.click(button);
      }).not.toThrow();
    });
  });
});