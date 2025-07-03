// packages/frontend/__tests__/components/StatisticsCard.test.tsx

import React from 'react';
import { render, screen } from '@testing-library/react';
import { StatisticsCard } from '../../src/components/statistics/StatisticsCard';

describe('StatisticsCard', () => {
  const defaultProps = {
    title: 'Total Students',
    value: '150',
    icon: 'students' as const,
  };

  it('renders basic card information', () => {
    render(<StatisticsCard {...defaultProps} />);
    
    expect(screen.getByText('Total Students')).toBeInTheDocument();
    expect(screen.getByText('150')).toBeInTheDocument();
  });

  it('renders different icon types', () => {
    const icons = ['attendance', 'grade', 'engagement', 'students'] as const;
    
    icons.forEach((icon) => {
      const { container } = render(
        <StatisticsCard {...defaultProps} icon={icon} />
      );
      
      const svgElement = container.querySelector('svg');
      expect(svgElement).toBeInTheDocument();
    });
  });

  it('renders trend indicators correctly', () => {
    const trends = [
      { trend: 'up' as const, expectedText: 'Increasing', expectedColor: 'text-green-600' },
      { trend: 'down' as const, expectedText: 'Decreasing', expectedColor: 'text-red-600' },
      { trend: 'stable' as const, expectedText: 'Stable', expectedColor: 'text-gray-600' },
    ];

    trends.forEach(({ trend, expectedText, expectedColor }) => {
      const { container } = render(
        <StatisticsCard {...defaultProps} trend={trend} />
      );
      
      expect(screen.getByText(expectedText)).toBeInTheDocument();
      const trendElement = screen.getByText(expectedText);
      expect(trendElement).toHaveClass(expectedColor);
    });
  });

  it('does not render trend when not provided', () => {
    render(<StatisticsCard {...defaultProps} />);
    
    expect(screen.queryByText('Increasing')).not.toBeInTheDocument();
    expect(screen.queryByText('Decreasing')).not.toBeInTheDocument();
    expect(screen.queryByText('Stable')).not.toBeInTheDocument();
  });

  it('applies hover effect classes', () => {
    const { container } = render(<StatisticsCard {...defaultProps} />);
    
    const cardElement = container.querySelector('.hover\\:shadow-md');
    expect(cardElement).toBeInTheDocument();
  });

  it('renders with long title text', () => {
    const longTitle = 'This is a very long statistics title that should be truncated';
    render(<StatisticsCard {...defaultProps} title={longTitle} />);
    
    expect(screen.getByText(longTitle)).toBeInTheDocument();
    const titleElement = screen.getByText(longTitle);
    expect(titleElement).toHaveClass('truncate');
  });
});