import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { StatisticsDashboard } from '@/components/statistics/StatisticsDashboard';
import { useAuth } from '@/context/AuthContext';

// Mock dependencies
jest.mock('@/context/AuthContext', () => ({
  useAuth: jest.fn()
}));
jest.mock('@/components/statistics/ExportButton', () => {
  return function MockExportButton({ timePeriod }: { timePeriod: string }) {
    return <button data-testid="export-button">Export {timePeriod} data</button>;
  };
});
jest.mock('@/components/statistics/AttendanceChart', () => {
  return function MockAttendanceChart({ data }: { data: any }) {
    return <div data-testid="attendance-chart">Attendance Chart</div>;
  };
});
jest.mock('@/components/statistics/GradeChart', () => {
  return function MockGradeChart({ data }: { data: any }) {
    return <div data-testid="grade-chart">Grade Chart</div>;
  };
});
jest.mock('@/components/statistics/EngagementChart', () => {
  return function MockEngagementChart({ data }: { data: any }) {
    return <div data-testid="engagement-chart">Engagement Chart</div>;
  };
});
jest.mock('@/components/ui/LoadingSpinner', () => {
  return function MockLoadingSpinner() {
    return <div data-testid="loading-spinner" role="status">Loading...</div>;
  };
});

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

// Mock fetch globally
global.fetch = jest.fn();

describe('StatisticsDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: { role: 'admin' },
      isAuthenticated: true,
      isLoading: false,
    });

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
      mockUseAuth.mockReturnValue({
        user: { role: 'student' },
        isAuthenticated: true,
        isLoading: false,
      });

      expect(() => {
        render(<StatisticsDashboard />);
      }).not.toThrow();
    });

    it('should handle missing user', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });

      expect(() => {
        render(<StatisticsDashboard />);
      }).not.toThrow();
    });
  });
});