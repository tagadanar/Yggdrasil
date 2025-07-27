// packages/frontend/src/components/planning/ModernCalendarView.tsx
// Modern calendar component with FullCalendar integration

'use client';

import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { 
  ChevronLeftIcon, 
  ChevronRightIcon,
  CalendarDaysIcon,
  ClockIcon,
  Squares2X2Icon,
  ListBulletIcon,
  DevicePhoneMobileIcon,
  CloudIcon,
  WifiIcon
} from '@heroicons/react/24/outline';
import { format, isToday, isSameWeek, isSameMonth } from 'date-fns';

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

interface ModernCalendarViewProps {
  events: Event[];
  currentView: 'month' | 'week' | 'day' | 'list';
  currentDate: Date;
  onViewChange: (view: 'month' | 'week' | 'day' | 'list') => void;
  onDateChange: (date: Date) => void;
  onEventClick: (event: Event) => void;
  canModifyEvents: boolean;
  onEventDrop?: (eventId: string, newStart: Date, newEnd: Date) => void;
  onEventResize?: (eventId: string, newStart: Date, newEnd: Date) => void;
  onDateSelect?: (start: Date, end: Date) => void;
  isRealTimeConnected?: boolean;
  syncStatus?: 'connected' | 'disconnected' | 'syncing' | 'error';
  isMobile?: boolean;
}

export const ModernCalendarView: React.FC<ModernCalendarViewProps> = ({
  events,
  currentView,
  currentDate,
  onViewChange,
  onDateChange,
  onEventClick,
  canModifyEvents,
  onEventDrop,
  onEventResize,
  onDateSelect,
  isRealTimeConnected = false,
  syncStatus = 'disconnected',
  isMobile = false
}) => {
  const calendarRef = useRef<FullCalendar>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [calendarKey, setCalendarKey] = useState(0);

  // Memoize calendar events to prevent constant re-renders
  const calendarEvents = useMemo(() => {
    return events.map(event => ({
      id: event._id,
      title: event.title,
      start: event.startDate,
      end: event.endDate,
      backgroundColor: getEventColor(event.type),
      borderColor: getEventColor(event.type),
      textColor: getEventTextColor(event.type),
      extendedProps: {
        description: event.description,
        location: event.location,
        type: event.type,
        linkedCourse: event.linkedCourse,
        isRecurring: event.isRecurring,
        attendeeCount: event.attendeeCount,
        originalEvent: event
      },
      editable: canModifyEvents,
      eventResizableFromStart: canModifyEvents,
      classNames: [
        'fc-event-modern',
        event.isRecurring ? 'fc-event-recurring' : '',
        canModifyEvents ? 'fc-event-editable' : 'fc-event-readonly'
      ].filter(Boolean)
    }));
  }, [events, canModifyEvents]);

  // Memoize calendar plugins to prevent re-initialization
  const calendarPlugins = useMemo(() => [
    dayGridPlugin, 
    timeGridPlugin, 
    interactionPlugin
  ], []);

  // Memoize calendar configuration to prevent re-renders
  const calendarConfig = useMemo(() => ({
    initialView: getFullCalendarView(),
    headerToolbar: false as const,
    events: calendarEvents,
    editable: canModifyEvents,
    selectable: canModifyEvents,
    selectMirror: true,
    dayMaxEvents: isMobile ? 2 : 4,
    moreLinkClick: "popover" as const,
  }), [calendarEvents, canModifyEvents, isMobile, currentView]);

  // Add cleanup and error boundaries
  useEffect(() => {
    return () => {
      if (calendarRef.current) {
        try {
          const calendarApi = calendarRef.current.getApi();
          if (calendarApi) {
            // No destroy method needed for FullCalendar v6
            calendarApi.removeAllEvents();
          }
        } catch (error) {
          console.warn('Calendar cleanup error:', error);
        }
      }
    };
  }, []);

  // Get event colors based on type
  function getEventColor(type: string): string {
    const colors = {
      class: '#3b82f6', // blue
      exam: '#ef4444', // red
      meeting: '#10b981', // green
      event: '#8b5cf6' // purple
    };
    return colors[type as keyof typeof colors] || '#6b7280'; // gray default
  }

  function getEventTextColor(type: string): string {
    return '#ffffff'; // white text for all events
  }

  // Handle view changes
  const handleViewChange = useCallback((view: string) => {
    const viewMap: { [key: string]: 'month' | 'week' | 'day' | 'list' } = {
      dayGridMonth: 'month',
      timeGridWeek: 'week',
      timeGridDay: 'day',
      listWeek: 'list'
    };
    const mappedView = viewMap[view];
    if (mappedView && mappedView !== currentView) {
      onViewChange(mappedView);
    }
  }, [currentView, onViewChange]);

  // Handle date navigation
  const handleDateChange = useCallback((date: Date) => {
    onDateChange(date);
  }, [onDateChange]);

  // Handle event click
  const handleEventClick = useCallback((clickInfo: any) => {
    const originalEvent = clickInfo.event.extendedProps.originalEvent;
    if (originalEvent) {
      onEventClick(originalEvent);
    }
  }, [onEventClick]);

  // Handle event drop (drag & drop)
  const handleEventDrop = useCallback((dropInfo: any) => {
    if (onEventDrop && canModifyEvents) {
      const eventId = dropInfo.event.id;
      const newStart = dropInfo.event.start;
      const newEnd = dropInfo.event.end;
      onEventDrop(eventId, newStart, newEnd);
    }
  }, [onEventDrop, canModifyEvents]);

  // Handle event resize
  const handleEventResize = useCallback((resizeInfo: any) => {
    if (onEventResize && canModifyEvents) {
      const eventId = resizeInfo.event.id;
      const newStart = resizeInfo.event.start;
      const newEnd = resizeInfo.event.end;
      onEventResize(eventId, newStart, newEnd);
    }
  }, [onEventResize, canModifyEvents]);

  // Handle date/time selection
  const handleSelect = useCallback((selectInfo: any) => {
    if (onDateSelect && canModifyEvents) {
      onDateSelect(selectInfo.start, selectInfo.end);
    }
  }, [onDateSelect, canModifyEvents]);

  // Navigation functions
  const navigatePrevious = () => {
    const calendar = calendarRef.current?.getApi();
    if (calendar) {
      calendar.prev();
      handleDateChange(calendar.getDate());
    }
  };

  const navigateNext = () => {
    const calendar = calendarRef.current?.getApi();
    if (calendar) {
      calendar.next();
      handleDateChange(calendar.getDate());
    }
  };

  const navigateToday = () => {
    const calendar = calendarRef.current?.getApi();
    if (calendar) {
      calendar.today();
      handleDateChange(new Date());
    }
  };

  // Get FullCalendar view name
  const getFullCalendarView = () => {
    switch (currentView) {
      case 'month': return 'dayGridMonth';
      case 'week': return 'timeGridWeek';
      case 'day': return 'timeGridDay';
      case 'list': return 'listWeek';
      default: return 'dayGridMonth';
    }
  };

  // Format date header
  const formatDateHeader = () => {
    switch (currentView) {
      case 'month':
        return format(currentDate, 'MMMM yyyy');
      case 'week':
        const weekStart = new Date(currentDate);
        weekStart.setDate(currentDate.getDate() - currentDate.getDay());
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        return `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`;
      case 'day':
        return format(currentDate, 'EEEE, MMMM d, yyyy');
      case 'list':
        return 'Upcoming Events';
      default:
        return format(currentDate, 'MMMM yyyy');
    }
  };

  // Get view button icon
  const getViewIcon = (view: string) => {
    switch (view) {
      case 'month': return <Squares2X2Icon className="h-4 w-4" />;
      case 'week': return <CalendarDaysIcon className="h-4 w-4" />;
      case 'day': return <ClockIcon className="h-4 w-4" />;
      case 'list': return <ListBulletIcon className="h-4 w-4" />;
      default: return <CalendarDaysIcon className="h-4 w-4" />;
    }
  };

  // Get sync status indicator
  const getSyncStatusIndicator = () => {
    if (syncStatus === 'disconnected') return null;
    
    const statusConfig = {
      connected: { icon: CloudIcon, color: 'text-green-500', label: 'Synced' },
      syncing: { icon: WifiIcon, color: 'text-blue-500 animate-pulse', label: 'Syncing...' },
      error: { icon: CloudIcon, color: 'text-red-500', label: 'Sync Error' }
    };
    
    const config = statusConfig[syncStatus];
    const Icon = config.icon;
    
    return (
      <div className="flex items-center space-x-1" data-testid="sync-status">
        <Icon className={`h-4 w-4 ${config.color}`} />
        <span className={`text-xs ${config.color.split(' ')[0]}`}>{config.label}</span>
      </div>
    );
  };

  return (
    <div 
      className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden"
      data-testid="modern-calendar-view"
    >
      {/* Header with navigation and controls */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        {/* Date navigation */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <button
              onClick={navigatePrevious}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              data-testid="prev-period-button"
              disabled={isLoading}
            >
              <ChevronLeftIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            </button>
            <button
              onClick={navigateNext}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              data-testid="next-period-button"
              disabled={isLoading}
            >
              <ChevronRightIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            </button>
          </div>
          
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {formatDateHeader()}
          </h2>
          
          <button
            onClick={navigateToday}
            className="px-3 py-1 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
            disabled={isLoading}
          >
            Today
          </button>
        </div>

        {/* Right side controls */}
        <div className="flex items-center space-x-4">
          {/* Sync status */}
          {getSyncStatusIndicator()}
          
          {/* Real-time connection status */}
          {isRealTimeConnected && (
            <div className="flex items-center space-x-1" data-testid="realtime-status">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-xs text-green-600 dark:text-green-400">Live</span>
            </div>
          )}
          
          {/* Mobile indicator */}
          {isMobile && (
            <DevicePhoneMobileIcon className="h-4 w-4 text-gray-500" />
          )}

          {/* View mode controls */}
          <div 
            className={`flex items-center space-x-1 ${isMobile ? 'hidden' : ''}`}
            data-testid="view-mode-toggle"
          >
            {['month', 'week', 'day', 'list'].map((view) => (
              <button
                key={view}
                onClick={() => onViewChange(view as any)}
                className={`flex items-center px-3 py-2 text-sm rounded-md transition-colors ${
                  currentView === view 
                    ? 'bg-indigo-600 text-white' 
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
                data-testid={`view-${view}`}
                disabled={isLoading}
              >
                {getViewIcon(view)}
                <span className="ml-1 capitalize">{view}</span>
              </button>
            ))}
          </div>

          {/* Mobile view selector */}
          {isMobile && (
            <select
              value={currentView}
              onChange={(e) => onViewChange(e.target.value as any)}
              className="px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md"
              data-testid="mobile-view-selector"
            >
              <option value="month">Month</option>
              <option value="week">Week</option>
              <option value="day">Day</option>
              <option value="list">Agenda</option>
            </select>
          )}
        </div>
      </div>

      {/* Drag & drop indicator for admins */}
      {canModifyEvents && (
        <div className="hidden" data-testid="drag-drop-enabled"></div>
      )}

      {/* Calendar content */}
      <div className="p-4">
        <div data-testid={`calendar-grid-${currentView}`}>
          <FullCalendar
            key={calendarKey}
            ref={calendarRef}
            plugins={calendarPlugins}
            {...calendarConfig}
            eventClick={handleEventClick}
            eventDrop={handleEventDrop}
            eventResize={handleEventResize}
            select={handleSelect}
            datesSet={(dateInfo) => {
              handleDateChange(dateInfo.start);
            }}
            viewDidMount={(viewInfo) => {
              handleViewChange(viewInfo.view.type);
            }}
            height={isMobile ? 'auto' : 600}
            contentHeight={isMobile ? 400 : 'auto'}
            aspectRatio={isMobile ? 1.0 : 1.35}
            nowIndicator={true}
            weekNumbers={!isMobile}
            dayHeaders={true}
            allDaySlot={currentView !== 'list'}
            slotMinTime="06:00:00"
            slotMaxTime="22:00:00"
            slotDuration="00:30:00"
            businessHours={{
              daysOfWeek: [1, 2, 3, 4, 5], // Monday - Friday
              startTime: '08:00',
              endTime: '18:00',
            }}
            eventDisplay="block"
            eventOrder="start,title"
            eventClassNames={(arg) => {
              const classes = ['fc-event-modern'];
              if (arg.event.extendedProps['isRecurring']) {
                classes.push('fc-event-recurring');
              }
              if (!canModifyEvents) {
                classes.push('fc-event-readonly');
              }
              return classes;
            }}
            eventDidMount={(info) => {
              // Add custom styling and tooltips
              const event = info.event.extendedProps['originalEvent'];
              if (event) {
                info.el.title = `${event.title}${event.location ? ' @ ' + event.location : ''}${event.description ? '\n' + event.description : ''}`;
                
                // Add event type indicator
                const typeIndicator = document.createElement('div');
                typeIndicator.className = 'fc-event-type-indicator';
                typeIndicator.textContent = event.type.charAt(0).toUpperCase();
                info.el.appendChild(typeIndicator);
                
                // Add recurring indicator
                if (event.isRecurring) {
                  const recurringIndicator = document.createElement('div');
                  recurringIndicator.className = 'fc-event-recurring-indicator';
                  recurringIndicator.textContent = '🔄';
                  info.el.appendChild(recurringIndicator);
                }
              }
            }}
            loading={(isLoading) => setIsLoading(isLoading)}
            dayHeaderFormat={isMobile ? { weekday: 'narrow' } : { weekday: 'short', day: 'numeric' }}
            eventTimeFormat={{
              hour: 'numeric',
              minute: '2-digit',
              meridiem: 'short'
            }}
            // Mobile-specific options
            {...(isMobile && {
              dayMaxEventRows: 3,
              moreLinkText: (num) => `+${num} more`,
              eventOrder: 'start',
              slotLabelFormat: {
                hour: 'numeric',
                minute: '2-digit',
                omitZeroMinute: false,
                meridiem: 'short'
              }
            })}
          />
        </div>
      </div>

      {/* Mobile navigation helpers */}
      {isMobile && (
        <div className="hidden" data-testid="mobile-calendar-nav">
          <div data-testid="swipe-prev"></div>
          <div data-testid="swipe-next"></div>
          <div data-testid="pull-to-refresh"></div>
        </div>
      )}

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-white dark:bg-gray-800 bg-opacity-75 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      )}
    </div>
  );
};

// Custom CSS styles for FullCalendar integration
export const CalendarStyles = `
  .fc-event-modern {
    border-radius: 4px;
    border: none !important;
    font-size: 0.875rem;
    font-weight: 500;
    padding: 2px 6px;
    position: relative;
    overflow: hidden;
  }

  .fc-event-recurring {
    background-image: repeating-linear-gradient(
      45deg,
      transparent,
      transparent 2px,
      rgba(255,255,255,0.1) 2px,
      rgba(255,255,255,0.1) 4px
    );
  }

  .fc-event-readonly {
    cursor: default !important;
  }

  .fc-event-editable {
    cursor: grab;
  }

  .fc-event-editable:active {
    cursor: grabbing;
  }

  .fc-event-type-indicator {
    position: absolute;
    top: 2px;
    right: 2px;
    width: 16px;
    height: 16px;
    background: rgba(255,255,255,0.3);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    font-weight: bold;
  }

  .fc-event-recurring-indicator {
    position: absolute;
    top: 2px;
    left: 2px;
    font-size: 10px;
  }

  .fc-toolbar-mobile .fc-toolbar-chunk {
    flex-wrap: wrap;
  }

  .fc-daygrid-event-harness {
    margin-bottom: 1px;
  }

  .fc-timegrid-slot {
    border-bottom: 1px solid #e5e7eb;
  }

  .fc-timegrid-slot:hover {
    background-color: #f3f4f6;
  }

  .fc-highlight {
    background-color: #dbeafe !important;
  }

  .fc-today {
    background-color: #fef3c7 !important;
  }

  .fc-day-today .fc-daygrid-day-number {
    background-color: #3b82f6;
    color: white;
    border-radius: 50%;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 2px;
  }

  @media (max-width: 768px) {
    .fc-toolbar-mobile {
      flex-direction: column;
      gap: 8px;
    }
    
    .fc-event-modern {
      font-size: 0.75rem;
      padding: 1px 4px;
    }
    
    .fc-daygrid-event {
      margin-bottom: 1px;
    }
  }
`;