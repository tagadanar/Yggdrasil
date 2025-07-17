// packages/frontend/src/components/planning/CalendarView.tsx
// Main calendar component with multiple view modes

'use client';

import React from 'react';
import { 
  ChevronLeftIcon, 
  ChevronRightIcon,
  CalendarDaysIcon,
  Bars3Icon,
  Square3Stack3DIcon
} from '@heroicons/react/24/outline';

interface Event {
  _id: string;
  title: string;
  description?: string;
  location?: string;
  type: 'class' | 'exam' | 'meeting' | 'event';
  startDate: string;
  endDate: string;
  linkedCourse?: {
    _id: string;
    title: string;
  };
  isRecurring: boolean;
  color?: string;
  attendeeCount?: number;
}

interface CalendarViewProps {
  events: Event[];
  currentView: 'month' | 'week' | 'day' | 'list';
  currentDate: Date;
  onViewChange: (view: 'month' | 'week' | 'day' | 'list') => void;
  onDateChange: (date: Date) => void;
  onEventClick: (event: Event) => void;
  canModifyEvents: boolean;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  events,
  currentView,
  currentDate,
  onViewChange,
  onDateChange,
  onEventClick,
  canModifyEvents
}) => {
  // Navigation functions
  const navigatePrevious = () => {
    const newDate = new Date(currentDate);
    switch (currentView) {
      case 'month':
        newDate.setMonth(newDate.getMonth() - 1);
        break;
      case 'week':
        newDate.setDate(newDate.getDate() - 7);
        break;
      case 'day':
        newDate.setDate(newDate.getDate() - 1);
        break;
      case 'list':
        newDate.setDate(newDate.getDate() - 30);
        break;
    }
    onDateChange(newDate);
  };

  const navigateNext = () => {
    const newDate = new Date(currentDate);
    switch (currentView) {
      case 'month':
        newDate.setMonth(newDate.getMonth() + 1);
        break;
      case 'week':
        newDate.setDate(newDate.getDate() + 7);
        break;
      case 'day':
        newDate.setDate(newDate.getDate() + 1);
        break;
      case 'list':
        newDate.setDate(newDate.getDate() + 30);
        break;
    }
    onDateChange(newDate);
  };

  const navigateToday = () => {
    onDateChange(new Date());
  };

  // Format date for display
  const formatDateHeader = () => {
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'long'
    };

    switch (currentView) {
      case 'month':
        return currentDate.toLocaleDateString('en-US', options);
      case 'week':
        const weekStart = new Date(currentDate);
        weekStart.setDate(currentDate.getDate() - currentDate.getDay());
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        return `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
      case 'day':
        return currentDate.toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        });
      case 'list':
        return 'Upcoming Events';
    }
  };

  // Get event type badge color
  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'class':
        return 'bg-blue-100 text-blue-800';
      case 'exam':
        return 'bg-red-100 text-red-800';
      case 'meeting':
        return 'bg-green-100 text-green-800';
      case 'event':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Event component
  const EventItem: React.FC<{ event: Event; isLinked?: boolean }> = ({ event, isLinked = false }) => (
    <div
      className="p-2 mb-2 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md cursor-pointer transition-shadow"
      onClick={() => onEventClick(event)}
      data-testid={`calendar-event${isLinked ? '-' + event._id : ''}`}
      data-linked-course={event.linkedCourse ? 'true' : 'false'}
    >
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <h4 className="font-medium text-gray-900 text-sm">{event.title}</h4>
          {event.location && (
            <p className="text-xs text-gray-600 mt-1">📍 {event.location}</p>
          )}
          {event.linkedCourse && (
            <p className="text-xs text-blue-600 mt-1">📚 {event.linkedCourse.title}</p>
          )}
        </div>
        <div className="flex flex-col items-end">
          <span className={`inline-block px-2 py-1 text-xs rounded-full ${getEventTypeColor(event.type)}`} data-testid="event-type-badge">
            {event.type.charAt(0).toUpperCase() + event.type.slice(1)}
          </span>
          {event.isRecurring && (
            <span className="text-xs text-gray-500 mt-1">🔄 Recurring</span>
          )}
        </div>
      </div>
      <div className="mt-2 text-xs text-gray-600">
        {new Date(event.startDate).toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          minute: '2-digit' 
        })} - {new Date(event.endDate).toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          minute: '2-digit' 
        })}
      </div>
    </div>
  );

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header with navigation and view controls */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        {/* Date navigation */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <button
              onClick={navigatePrevious}
              className="p-2 hover:bg-gray-100 rounded-lg"
              data-testid="prev-period-button"
            >
              <ChevronLeftIcon className="h-5 w-5" />
            </button>
            <button
              onClick={navigateNext}
              className="p-2 hover:bg-gray-100 rounded-lg"
              data-testid="next-week-button"
            >
              <ChevronRightIcon className="h-5 w-5" />
            </button>
          </div>
          
          <h2 className="text-xl font-semibold text-gray-900">
            {formatDateHeader()}
          </h2>
          
          <button
            onClick={navigateToday}
            className="px-3 py-1 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            Today
          </button>
        </div>

        {/* View mode controls */}
        <div className="flex items-center space-x-2" data-testid="view-mode-toggle">
          <button
            onClick={() => onViewChange('month')}
            className={`px-3 py-2 text-sm rounded-md ${
              currentView === 'month' 
                ? 'bg-indigo-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            data-testid="view-month"
          >
            Month
          </button>
          <button
            onClick={() => onViewChange('week')}
            className={`px-3 py-2 text-sm rounded-md ${
              currentView === 'week' 
                ? 'bg-indigo-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            data-testid="view-week"
          >
            Week
          </button>
          <button
            onClick={() => onViewChange('day')}
            className={`px-3 py-2 text-sm rounded-md ${
              currentView === 'day' 
                ? 'bg-indigo-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            data-testid="view-day"
          >
            Day
          </button>
          <button
            onClick={() => onViewChange('list')}
            className={`px-3 py-2 text-sm rounded-md ${
              currentView === 'list' 
                ? 'bg-indigo-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            data-testid="view-list"
          >
            List
          </button>
        </div>
      </div>

      {/* Calendar content */}
      <div className="p-4">
        {/* Month View */}
        {currentView === 'month' && (
          <div data-testid="month-view">
            {/* Basic month grid - simplified for MVP */}
            <div className="grid grid-cols-7 gap-2 mb-4">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div key={day} className="p-2 text-center text-sm font-semibold text-gray-600">
                  {day}
                </div>
              ))}
            </div>
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Events this month:</h3>
              {events.map((event) => (
                <EventItem key={event._id} event={event} isLinked={true} />
              ))}
              {events.length === 0 && (
                <p className="text-gray-500 text-center py-8">No events scheduled for this month.</p>
              )}
            </div>
          </div>
        )}

        {/* Week View */}
        {currentView === 'week' && (
          <div data-testid="week-view">
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Events this week:</h3>
              {events.map((event) => (
                <EventItem key={event._id} event={event} isLinked={true} />
              ))}
              {events.length === 0 && (
                <p className="text-gray-500 text-center py-8">No events scheduled for this week.</p>
              )}
            </div>
          </div>
        )}

        {/* Day View */}
        {currentView === 'day' && (
          <div data-testid="day-view">
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Events today:</h3>
              {events.map((event) => (
                <EventItem key={event._id} event={event} isLinked={true} />
              ))}
              {events.length === 0 && (
                <p className="text-gray-500 text-center py-8">No events scheduled for today.</p>
              )}
            </div>
          </div>
        )}

        {/* List View */}
        {currentView === 'list' && (
          <div data-testid="list-view">
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Upcoming events:</h3>
              {events
                .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
                .map((event) => (
                  <EventItem key={event._id} event={event} isLinked={true} />
                ))}
              {events.length === 0 && (
                <p className="text-gray-500 text-center py-8">No upcoming events.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};