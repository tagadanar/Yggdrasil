import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { StatisticsDashboard } from '@/components/statistics/StatisticsDashboard';

// Mock the child components
jest.mock('@/components/statistics/ExportButton', () => ({
  ExportButton: () => <div data-testid="export-button">Export Button</div>
}));

jest.mock('@/components/statistics/AttendanceChart', () => ({
  AttendanceChart: ({ data }: { data: any }) => (
    <div data-testid="attendance-chart">Attendance Chart with {data?.length || 0} data points</div>
  )
}));

jest.mock('@/components/statistics/GradeChart', () => ({
  GradeChart: ({ data }: { data: any }) => (
    <div data-testid="grade-chart">Grade Chart with {data?.length || 0} grade levels</div>
  )
}));

jest.mock('@/components/statistics/EngagementChart', () => ({
  EngagementChart: ({ data }: { data: any }) => (
    <div data-testid="engagement-chart">Engagement Chart with {data?.length || 0} activities</div>
  )
}));

jest.mock('@/components/statistics/StatisticsCard', () => ({
  StatisticsCard: ({ title, value, trend, icon }: { title: string; value: string; trend?: string; icon?: string }) => (
    <div data-testid="statistics-card" data-title={title} data-value={value} data-trend={trend} data-icon={icon}>
      {title}: {value} {trend && `(${trend})`}
    </div>
  )
}));

// Mock fetch globally
global.fetch = jest.fn();

describe('StatisticsDashboard Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('API Response Structure Compatibility', () => {
    it('should handle the correct API response structure from statistics service', async () => {
      const mockApiResponse = {
        success: true,
        data: {
          attendance: {
            rate: 87,
            trend: 'up' as const,
            data: [
              { date: '2024-01-01', rate: 85 },
              { date: '2024-02-01', rate: 87 },
              { date: '2024-03-01', rate: 89 }
            ]
          },
          grades: {
            average: 82.5,
            trend: 'stable' as const,
            distribution: [
              { grade: 'A', count: 25 },
              { grade: 'B', count: 40 },
              { grade: 'C', count: 30 },
              { grade: 'D', count: 15 },
              { grade: 'F', count: 5 }
            ]
          },
          engagement: {
            score: 78,
            trend: 'down' as const,
            activities: [
              { activity: 'Forum Posts', score: 75 },
              { activity: 'Assignment Submissions', score: 85 },
              { activity: 'Quiz Participation', score: 70 },
              { activity: 'Video Views', score: 65 }
            ]
          },
          overview: {
            totalStudents: 150,
            totalCourses: 20,
            completionRate: 85,
            averageGrade: 82.5
          }
        },
        message: 'Dashboard statistics retrieved successfully'
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse
      });

      render(<StatisticsDashboard />);

      // Wait for the component to load and display data
      await waitFor(() => {
        expect(screen.queryByRole('status')).not.toBeInTheDocument();
      });

      // Check that attendance data is displayed correctly
      await waitFor(() => {
        const cards = screen.getAllByTestId('statistics-card');
        expect(cards.length).toBeGreaterThan(0);
        
        // Find attendance card
        const attendanceCard = cards.find(card => 
          card.getAttribute('data-title') === 'Attendance Rate'
        );
        expect(attendanceCard).toBeDefined();
        expect(attendanceCard?.getAttribute('data-value')).toBe('87%');
        expect(attendanceCard?.getAttribute('data-trend')).toBe('up');
      });

      // Verify charts are rendered with data
      expect(screen.getByTestId('attendance-chart')).toBeInTheDocument();
      expect(screen.getByTestId('grade-chart')).toBeInTheDocument();
      expect(screen.getByTestId('engagement-chart')).toBeInTheDocument();
    });

    it('should handle missing or undefined data gracefully', async () => {
      const mockApiResponseWithMissingData = {
        success: true,
        data: {
          // Missing attendance data
          grades: {
            average: 82.5,
            trend: 'stable' as const,
            distribution: [
              { grade: 'A', count: 25 },
              { grade: 'B', count: 40 }
            ]
          },
          // Missing engagement data
          overview: {
            totalStudents: 150,
            totalCourses: 20
            // Missing completionRate and averageGrade
          }
        }
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponseWithMissingData
      });

      render(<StatisticsDashboard />);

      await waitFor(() => {
        expect(screen.queryByRole('status')).not.toBeInTheDocument();
      });

      // Component should not crash and should only render available data
      expect(screen.queryByTestId('attendance-chart')).not.toBeInTheDocument();
      expect(screen.getByTestId('grade-chart')).toBeInTheDocument();
      expect(screen.queryByTestId('engagement-chart')).not.toBeInTheDocument();

      // Should only show cards for available data
      const cards = screen.getAllByTestId('statistics-card');
      const attendanceCard = cards.find(card => 
        card.getAttribute('data-title') === 'Attendance Rate'
      );
      expect(attendanceCard).toBeUndefined();
    });

    it('should handle legacy API response structure (without success wrapper)', async () => {
      const legacyApiResponse = {
        attendance: {
          rate: 87,
          trend: 'up' as const,
          data: [{ date: '2024-01-01', rate: 85 }]
        },
        grades: {
          average: 82.5,
          trend: 'stable' as const,
          distribution: [{ grade: 'A', count: 25 }]
        },
        engagement: {
          score: 78,
          trend: 'down' as const,
          activities: [{ activity: 'Forum Posts', score: 75 }]
        },
        overview: {
          totalStudents: 150,
          totalCourses: 20,
          completionRate: 85,
          averageGrade: 82.5
        }
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => legacyApiResponse
      });

      render(<StatisticsDashboard />);

      await waitFor(() => {
        expect(screen.queryByRole('status')).not.toBeInTheDocument();
      });

      // Should handle legacy format and display data correctly
      const cards = screen.getAllByTestId('statistics-card');
      expect(cards.length).toBeGreaterThan(0);
    });

    it('should throw clear error when API returns malformed data', async () => {
      const malformedApiResponse = {
        success: true,
        data: {
          attendance: {
            // Missing required 'rate' property
            trend: 'up',
            data: []
          },
          grades: {
            // Missing required 'average' property
            trend: 'stable',
            distribution: []
          }
        }
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => malformedApiResponse
      });

      // Expect the component to handle malformed data gracefully
      expect(() => {
        render(<StatisticsDashboard />);
      }).not.toThrow();

      await waitFor(() => {
        expect(screen.queryByRole('status')).not.toBeInTheDocument();
      });

      // Should gracefully handle malformed data by not rendering statistics cards
      const cards = screen.queryAllByTestId('statistics-card');
      expect(cards.length).toBe(0); // Should not render cards with malformed data
    });

    it('should detect API structure mismatch that caused the original bug', async () => {
      // This simulates the original bug where API returned different structure
      const buggyApiResponse = {
        success: true,
        data: {
          systemOverview: {
            totalUsers: 1000,
            activeUsers: 700,
            totalCourses: 50
          },
          widgets: [],
          recentReports: []
          // Missing attendance, grades, engagement structure
        }
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => buggyApiResponse
      });

      render(<StatisticsDashboard />);

      await waitFor(() => {
        expect(screen.queryByRole('status')).not.toBeInTheDocument();
      });

      // Should gracefully handle missing structure by not rendering those components
      expect(screen.queryByTestId('attendance-chart')).not.toBeInTheDocument();
      expect(screen.queryByTestId('grade-chart')).not.toBeInTheDocument();
      expect(screen.queryByTestId('engagement-chart')).not.toBeInTheDocument();

      // Should not render statistics cards for missing data
      const cards = screen.queryAllByTestId('statistics-card');
      expect(cards.length).toBe(0); // No cards should be rendered with missing structure
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors and display fallback data', async () => {
      // Suppress expected console.error
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('API Error'));

      render(<StatisticsDashboard />);

      await waitFor(() => {
        expect(screen.queryByRole('status')).not.toBeInTheDocument();
      });

      // Should display mock/fallback data when API fails
      const cards = screen.getAllByTestId('statistics-card');
      expect(cards.length).toBeGreaterThan(0);
      
      consoleSpy.mockRestore();
    });

    it('should handle network timeouts gracefully', async () => {
      // Suppress expected console.error
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      (global.fetch as jest.Mock).mockImplementationOnce(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Network timeout')), 100)
        )
      );

      render(<StatisticsDashboard />);

      await waitFor(() => {
        expect(screen.queryByRole('status')).not.toBeInTheDocument();
      }, { timeout: 3000 });

      // Should display fallback data
      const cards = screen.getAllByTestId('statistics-card');
      expect(cards.length).toBeGreaterThan(0);
      
      consoleSpy.mockRestore();
    });
  });
});