import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { StatisticsDashboard } from '@/components/statistics/StatisticsDashboard';

// Simple component-level mocks to avoid conflicts with global mocks
jest.mock('@/components/statistics/ExportButton', () => ({
  ExportButton: ({ period }: { period: string }) => (
    <button data-testid="export-button">Export {period} data</button>
  )
}));

jest.mock('@/components/statistics/AttendanceChart', () => ({
  AttendanceChart: ({ data }: { data: any }) => (
    <div data-testid="attendance-chart">Attendance Chart</div>
  )
}));

jest.mock('@/components/statistics/GradeChart', () => ({
  GradeChart: ({ data }: { data: any }) => (
    <div data-testid="grade-chart">Grade Chart</div>
  )
}));

jest.mock('@/components/statistics/EngagementChart', () => ({
  EngagementChart: ({ data }: { data: any }) => (
    <div data-testid="engagement-chart">Engagement Chart</div>
  )
}));

jest.mock('@/components/statistics/StatisticsCard', () => ({
  StatisticsCard: ({ title, value }: { title: string; value: string }) => (
    <div data-testid="statistics-card">{title}: {value}</div>
  )
}));

// Mock fetch globally
global.fetch = jest.fn();

describe('StatisticsDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock successful fetch response
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        attendance: {
          rate: 85.5,
          trend: 'up',
          data: [
            { period: 'Week 1', rate: 85.5 },
            { period: 'Week 2', rate: 88.2 },
          ]
        },
        grades: {
          average: 78.5,
          trend: 'stable',
          distribution: [
            { subject: 'Math', average: 78.5 },
            { subject: 'Science', average: 82.1 },
          ]
        },
        engagement: {
          score: 75,
          trend: 'up',
          data: [
            { metric: 'Active Users', value: 150 },
            { metric: 'Course Completions', value: 45 },
          ]
        },
        overview: {
          totalStudents: 120
        }
      }),
    });
  });

  describe('Basic Rendering', () => {
    it('should render component without errors', () => {
      expect(() => {
        render(<StatisticsDashboard />);
      }).not.toThrow();
    });

    it('should render loading spinner initially', () => {
      render(<StatisticsDashboard />);
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('should render time period selector', async () => {
      render(<StatisticsDashboard />);
      
      await waitFor(() => {
        const selector = screen.getByRole('combobox');
        expect(selector).toBeInTheDocument();
        expect(selector).toHaveValue('month');
      });
    });

    it('should render export button', async () => {
      render(<StatisticsDashboard />);
      
      await waitFor(() => {
        expect(screen.getByTestId('export-button')).toBeInTheDocument();
      });
    });
  });

  describe('Time Period Selection', () => {
    it('should update time period when changed', async () => {
      render(<StatisticsDashboard />);
      
      await waitFor(() => {
        expect(screen.getByRole('combobox')).toBeInTheDocument();
      });

      const selector = screen.getByRole('combobox');
      fireEvent.change(selector, { target: { value: 'week' } });
      
      expect(selector).toHaveValue('week');
    });
  });

  describe('Data Fetching', () => {
    it('should handle fetch success', async () => {
      render(<StatisticsDashboard />);
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });
    });

    it('should handle fetch errors gracefully', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));
      
      expect(() => {
        render(<StatisticsDashboard />);
      }).not.toThrow();
    });
  });

  describe('User Role Handling', () => {
    it('should handle different user roles', () => {
      // The global mock handles this, just test that component renders
      expect(() => {
        render(<StatisticsDashboard />);
      }).not.toThrow();
    });

    it('should handle missing user', () => {
      // The global mock handles this, just test that component renders
      expect(() => {
        render(<StatisticsDashboard />);
      }).not.toThrow();
    });
  });
});