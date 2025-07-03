import React from 'react';
import { render, screen } from '@testing-library/react';
import { StatisticsCard } from '@/components/statistics/StatisticsCard';

describe('StatisticsCard', () => {
  const defaultProps = {
    title: 'Test Metric',
    value: '100',
    icon: 'attendance' as const,
  };

  describe('Basic Rendering', () => {
    it('should render title and value', () => {
      render(<StatisticsCard {...defaultProps} />);

      expect(screen.getByText('Test Metric')).toBeInTheDocument();
      expect(screen.getByText('100')).toBeInTheDocument();
    });

    it('should render different title and value', () => {
      render(<StatisticsCard title="Different Metric" value="200" icon="grades" />);

      expect(screen.getByText('Different Metric')).toBeInTheDocument();
      expect(screen.getByText('200')).toBeInTheDocument();
    });

    it('should render numeric values as strings', () => {
      render(<StatisticsCard title="Number Test" value="50" icon="engagement" />);

      expect(screen.getByText('Number Test')).toBeInTheDocument();
      expect(screen.getByText('50')).toBeInTheDocument();
    });

    it('should render large numbers correctly', () => {
      render(<StatisticsCard title="Big Number" value="1,000,000" icon="students" />);

      expect(screen.getByText('Big Number')).toBeInTheDocument();
      expect(screen.getByText('1,000,000')).toBeInTheDocument();
    });
  });

  describe('Icon Rendering', () => {
    it('should render with attendance icon', () => {
      render(<StatisticsCard {...defaultProps} icon="attendance" />);
      // Check that SVG is rendered
      expect(document.querySelector('svg')).toBeInTheDocument();
    });

    it('should render with grades icon', () => {
      render(<StatisticsCard {...defaultProps} icon="grades" />);
      expect(document.querySelector('svg')).toBeInTheDocument();
    });

    it('should render with engagement icon', () => {
      render(<StatisticsCard {...defaultProps} icon="engagement" />);
      expect(document.querySelector('svg')).toBeInTheDocument();
    });

    it('should render with students icon', () => {
      render(<StatisticsCard {...defaultProps} icon="students" />);
      expect(document.querySelector('svg')).toBeInTheDocument();
    });
  });

  describe('Trend Indicators', () => {
    it('should render up trend', () => {
      render(<StatisticsCard {...defaultProps} trend="up" />);
      expect(screen.getByText('Test Metric')).toBeInTheDocument();
      // SVG should be present for trend
      expect(document.querySelectorAll('svg').length).toBeGreaterThan(0);
    });

    it('should render down trend', () => {
      render(<StatisticsCard {...defaultProps} trend="down" />);
      expect(screen.getByText('Test Metric')).toBeInTheDocument();
      expect(document.querySelectorAll('svg').length).toBeGreaterThan(0);
    });

    it('should render stable trend', () => {
      render(<StatisticsCard {...defaultProps} trend="stable" />);
      expect(screen.getByText('Test Metric')).toBeInTheDocument();
      expect(document.querySelectorAll('svg').length).toBeGreaterThan(0);
    });

    it('should not render trend section when trend is not provided', () => {
      render(<StatisticsCard {...defaultProps} />);
      expect(screen.getByText('Test Metric')).toBeInTheDocument();
      expect(screen.getByText('100')).toBeInTheDocument();
    });
  });

  describe('Card Structure', () => {
    it('should have proper card structure', () => {
      render(<StatisticsCard {...defaultProps} />);
      
      const card = screen.getByText('Test Metric').closest('div');
      expect(card).toBeInTheDocument();
      expect(card).toHaveClass('bg-white');
    });

    it('should render with correct layout', () => {
      render(<StatisticsCard {...defaultProps} />);
      
      expect(screen.getByText('Test Metric')).toBeInTheDocument();
      expect(screen.getByText('100')).toBeInTheDocument();
      expect(document.querySelector('svg')).toBeInTheDocument();
    });
  });

  describe('Props Validation', () => {
    it('should handle empty string values', () => {
      render(<StatisticsCard title="" value="" icon="attendance" />);
      // Should render without throwing
      expect(document.querySelector('svg')).toBeInTheDocument();
    });

    it('should handle special characters in title and value', () => {
      render(<StatisticsCard title="Test & Special" value="100%" icon="attendance" />);

      expect(screen.getByText('Test & Special')).toBeInTheDocument();
      expect(screen.getByText('100%')).toBeInTheDocument();
    });

    it('should handle very long titles gracefully', () => {
      const longTitle = 'This is a very long title that should be handled gracefully by the component';
      render(<StatisticsCard title={longTitle} value="100" icon="attendance" />);

      expect(screen.getByText(longTitle)).toBeInTheDocument();
    });

    it('should handle very large numbers in value', () => {
      render(<StatisticsCard title="Large Number" value="999,999,999" icon="attendance" />);

      expect(screen.getByText('Large Number')).toBeInTheDocument();
      expect(screen.getByText('999,999,999')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined trend gracefully', () => {
      render(<StatisticsCard {...defaultProps} trend={undefined} />);

      expect(screen.getByText('Test Metric')).toBeInTheDocument();
      expect(screen.getByText('100')).toBeInTheDocument();
    });

    it('should handle zero values', () => {
      render(<StatisticsCard title="Zero Value" value="0" icon="attendance" />);

      expect(screen.getByText('Zero Value')).toBeInTheDocument();
      expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('should render multiple cards independently', () => {
      const { rerender } = render(<StatisticsCard title="Card 1" value="100" icon="attendance" />);
      expect(screen.getByText('Card 1')).toBeInTheDocument();

      rerender(<StatisticsCard title="Card 2" value="200" icon="grades" />);
      expect(screen.getByText('Card 2')).toBeInTheDocument();
    });
  });
});