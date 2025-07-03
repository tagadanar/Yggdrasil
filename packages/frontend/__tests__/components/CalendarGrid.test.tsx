// packages/frontend/__tests__/components/CalendarGrid.test.tsx

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { CalendarGrid } from '../../src/components/planning/CalendarGrid';

describe('CalendarGrid', () => {
  const mockEvents = [
    {
      id: '1',
      title: 'Math Class',
      description: 'Advanced Mathematics',
      startDate: '2024-01-15T10:00:00Z',
      endDate: '2024-01-15T11:00:00Z',
      type: 'class' as const,
      location: 'Room 101',
      instructor: 'Dr. Smith',
      course: {
        id: 'course1',
        title: 'Mathematics',
      },
    },
    {
      id: '2',
      title: 'Final Exam',
      startDate: '2024-01-20T14:00:00Z',
      endDate: '2024-01-20T16:00:00Z',
      type: 'exam' as const,
      location: 'Hall A',
    },
  ];

  const defaultProps = {
    events: mockEvents,
    selectedDate: new Date('2024-01-15'),
    viewMode: 'month' as const,
    onEventClick: jest.fn(),
    canEdit: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders calendar grid in month view', () => {
    render(<CalendarGrid {...defaultProps} />);
    
    // Check for day headers
    expect(screen.getByText('Sun')).toBeInTheDocument();
    expect(screen.getByText('Mon')).toBeInTheDocument();
    expect(screen.getByText('Tue')).toBeInTheDocument();
    expect(screen.getByText('Wed')).toBeInTheDocument();
    expect(screen.getByText('Thu')).toBeInTheDocument();
    expect(screen.getByText('Fri')).toBeInTheDocument();
    expect(screen.getByText('Sat')).toBeInTheDocument();
  });

  it('displays events in the correct dates', () => {
    render(<CalendarGrid {...defaultProps} />);
    
    expect(screen.getByText('Math Class')).toBeInTheDocument();
    expect(screen.getByText('Final Exam')).toBeInTheDocument();
  });

  it('applies correct colors for different event types', () => {
    render(<CalendarGrid {...defaultProps} />);
    
    const mathClassEvent = screen.getByText('Math Class').closest('.bg-blue-100');
    const examEvent = screen.getByText('Final Exam').closest('.bg-red-100');
    
    // Class event should have blue colors
    expect(mathClassEvent).toHaveClass('bg-blue-100');
    
    // Exam event should have red colors
    expect(examEvent).toHaveClass('bg-red-100');
  });

  it('calls onEventClick when event is clicked and editing is allowed', () => {
    render(<CalendarGrid {...defaultProps} />);
    
    const mathClassEvent = screen.getByText('Math Class');
    fireEvent.click(mathClassEvent);
    
    expect(defaultProps.onEventClick).toHaveBeenCalledWith(mockEvents[0]);
  });

  it('does not call onEventClick when editing is disabled', () => {
    render(<CalendarGrid {...defaultProps} canEdit={false} />);
    
    const mathClassEvent = screen.getByText('Math Class');
    fireEvent.click(mathClassEvent);
    
    expect(defaultProps.onEventClick).not.toHaveBeenCalled();
  });

  it('shows today with special styling', () => {
    const today = new Date();
    const propsWithToday = {
      ...defaultProps,
      selectedDate: today,
      events: [
        {
          ...mockEvents[0],
          startDate: today.toISOString(),
          endDate: new Date(today.getTime() + 60 * 60 * 1000).toISOString(),
        },
      ],
    };

    render(<CalendarGrid {...propsWithToday} />);
    
    // Today should have blue background
    const todayCell = document.querySelector('.bg-blue-50');
    expect(todayCell).toBeInTheDocument();
  });

  it('limits displayed events to 3 per day and shows "more" indicator', () => {
    const manyEvents = Array.from({ length: 5 }, (_, i) => ({
      id: `event-${i}`,
      title: `Event ${i + 1}`,
      startDate: '2024-01-15T10:00:00Z',
      endDate: '2024-01-15T11:00:00Z',
      type: 'class' as const,
    }));

    render(<CalendarGrid {...defaultProps} events={manyEvents} />);
    
    // Should only show first 3 events
    expect(screen.getByText('Event 1')).toBeInTheDocument();
    expect(screen.getByText('Event 2')).toBeInTheDocument();
    expect(screen.getByText('Event 3')).toBeInTheDocument();
    
    // Should show "+2 more" indicator
    expect(screen.getByText('+2 more')).toBeInTheDocument();
    
    // Should not show the 4th and 5th events
    expect(screen.queryByText('Event 4')).not.toBeInTheDocument();
    expect(screen.queryByText('Event 5')).not.toBeInTheDocument();
  });

  it('displays event time correctly', () => {
    render(<CalendarGrid {...defaultProps} />);
    
    // Check that time is displayed (format may vary by locale, so just check it exists)
    const timeElements = document.querySelectorAll('.text-xs.opacity-75');
    expect(timeElements.length).toBeGreaterThan(0);
  });

  it('handles empty events array', () => {
    render(<CalendarGrid {...defaultProps} events={[]} />);
    
    // Should still render the calendar grid
    expect(screen.getByText('Sun')).toBeInTheDocument();
    expect(screen.queryByText('Math Class')).not.toBeInTheDocument();
  });

  it('handles different view modes', () => {
    // Test week view
    render(<CalendarGrid {...defaultProps} viewMode="week" />);
    expect(screen.getByText('Sun')).toBeInTheDocument();
    
    // Test day view
    render(<CalendarGrid {...defaultProps} viewMode="day" />);
    // Day view should still render some content
    expect(document.querySelector('.bg-white')).toBeInTheDocument();
  });
});