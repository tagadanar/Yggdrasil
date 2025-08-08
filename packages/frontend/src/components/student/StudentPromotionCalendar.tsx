// packages/frontend/src/components/student/StudentPromotionCalendar.tsx
// Student calendar view for promotion events

'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/AuthProvider';
import { promotionApi, getSemesterName } from '@/lib/api/promotions';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Button } from '@/components/ui/Button';
import { 
  CalendarDaysIcon, 
  AcademicCapIcon, 
  ClockIcon,
  MapPinIcon,
  BookOpenIcon,
  InformationCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

interface PromotionEvent {
  _id: string;
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  location?: string;
  type: 'class' | 'exam' | 'meeting' | 'academic';
  linkedCourse?: {
    _id: string;
    title: string;
  };
  teacherName?: string;
  status: 'upcoming' | 'ongoing' | 'completed';
}

interface CurrentPromotion {
  _id: string;
  name: string;
  semester: number;
  intake: 'september' | 'march';
  academicYear: string;
  status: string;
  events: PromotionEvent[];
}

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  events: PromotionEvent[];
}

export const StudentPromotionCalendar: React.FC = () => {
  const { user } = useAuth();
  const [promotion, setPromotion] = useState<CurrentPromotion | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<PromotionEvent | null>(null);
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');

  useEffect(() => {
    loadPromotionCalendar();
  }, [user, currentDate]);

  const loadPromotionCalendar = async () => {
    if (!user || !user._id) return;

    try {
      setLoading(true);
      setError(null);

      const response = await promotionApi.getMyPromotion();

      if (response.success && response.data) {
        setPromotion({
          ...response.data,
          events: response.data.upcomingEvents || []
        });
      } else if (response.error) {
        setError(response.error);
      } else {
        setError('No promotion assigned');
      }
    } catch (err: any) {
      console.error('Error loading promotion calendar:', err);
      setError(err.message || 'Failed to load calendar');
    } finally {
      setLoading(false);
    }
  };

  const generateCalendarDays = (): CalendarDay[] => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // Get first day of month and calculate starting point
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const startDate = new Date(firstDayOfMonth);
    startDate.setDate(startDate.getDate() - firstDayOfMonth.getDay());
    
    const days: CalendarDay[] = [];
    const today = new Date();
    
    // Generate 6 weeks of days (42 days total)
    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      
      const isCurrentMonth = date.getMonth() === month;
      const isToday = date.toDateString() === today.toDateString();
      
      // Find events for this day
      const dayEvents = promotion?.events?.filter(event => {
        const eventDate = new Date(event.startDate);
        return eventDate.toDateString() === date.toDateString();
      }) || [];
      
      days.push({
        date,
        isCurrentMonth,
        isToday,
        events: dayEvents
      });
    }
    
    return days;
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    newDate.setMonth(currentDate.getMonth() + (direction === 'next' ? 1 : -1));
    setCurrentDate(newDate);
  };

  const formatTime = (dateString: string): string => {
    return new Date(dateString).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const today = new Date();
    const diffTime = date.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Tomorrow';
    } else if (diffDays > 0 && diffDays <= 7) {
      return date.toLocaleDateString([], { weekday: 'long' });
    } else {
      return date.toLocaleDateString();
    }
  };

  const getEventTypeColor = (type: string): string => {
    switch (type) {
      case 'class':
        return 'bg-blue-500';
      case 'exam':
        return 'bg-red-500';
      case 'meeting':
        return 'bg-green-500';
      case 'academic':
        return 'bg-purple-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getUpcomingEvents = (): PromotionEvent[] => {
    if (!promotion?.events) return [];
    
    const now = new Date();
    return promotion.events
      .filter(event => new Date(event.startDate) >= now)
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
      .slice(0, 5);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !promotion) {
    return (
      <div className="bg-yellow-50 dark:bg-yellow-900/50 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6">
        <div className="flex">
          <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400 mt-0.5" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
              No Promotion Calendar
            </h3>
            <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
              {error || 'You are not currently assigned to a promotion. Contact your administrator.'}
            </p>
            <Button
              onClick={loadPromotionCalendar}
              variant="secondary"
              className="mt-3"
              size="sm"
            >
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const calendarDays = generateCalendarDays();
  const upcomingEvents = getUpcomingEvents();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg p-6 text-white">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
          <div>
            <h1 className="text-2xl font-bold mb-2">My Promotion Calendar</h1>
            <div className="flex items-center gap-4">
              <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-medium">
                {promotion.name}
              </span>
              <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-medium">
                {getSemesterName(promotion.semester, promotion.intake)}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-4 sm:mt-0">
            <Button
              onClick={() => setViewMode(viewMode === 'calendar' ? 'list' : 'calendar')}
              variant="secondary"
              size="sm"
              className="bg-white/10 hover:bg-white/20 text-white border-white/20"
            >
              {viewMode === 'calendar' ? 'List View' : 'Calendar View'}
            </Button>
          </div>
        </div>
      </div>

      {viewMode === 'calendar' ? (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Calendar */}
          <div className="lg:col-span-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            {/* Calendar Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {currentDate.toLocaleDateString([], { month: 'long', year: 'numeric' })}
              </h2>
              <div className="flex items-center space-x-1">
                <Button
                  onClick={() => navigateMonth('prev')}
                  variant="secondary"
                  size="sm"
                  icon={<ChevronLeftIcon className="w-4 h-4" />}
                />
                <Button
                  onClick={() => setCurrentDate(new Date())}
                  variant="secondary"
                  size="sm"
                  className="px-3"
                >
                  Today
                </Button>
                <Button
                  onClick={() => navigateMonth('next')}
                  variant="secondary"
                  size="sm"
                  icon={<ChevronRightIcon className="w-4 h-4" />}
                />
              </div>
            </div>

            {/* Calendar Grid */}
            <div className="p-4">
              {/* Days of week header */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                  <div key={day} className="p-2 text-center text-sm font-medium text-gray-500 dark:text-gray-400">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar days */}
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((day, index) => (
                  <div
                    key={index}
                    className={`min-h-[120px] p-2 border rounded-lg ${
                      day.isCurrentMonth 
                        ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600' 
                        : 'bg-gray-50 dark:bg-gray-700/50 border-gray-100 dark:border-gray-700'
                    } ${day.isToday ? 'ring-2 ring-blue-500' : ''}`}
                  >
                    <div className={`text-sm font-medium mb-1 ${
                      day.isCurrentMonth 
                        ? 'text-gray-900 dark:text-gray-100' 
                        : 'text-gray-400 dark:text-gray-500'
                    } ${day.isToday ? 'text-blue-600 dark:text-blue-400' : ''}`}>
                      {day.date.getDate()}
                    </div>
                    <div className="space-y-1">
                      {day.events.slice(0, 3).map((event) => (
                        <div
                          key={event._id}
                          onClick={() => setSelectedEvent(event)}
                          className={`text-xs p-1 rounded cursor-pointer ${getEventTypeColor(event.type)} text-white truncate hover:opacity-80`}
                          title={`${event.title} - ${formatTime(event.startDate)}`}
                        >
                          {formatTime(event.startDate)} {event.title}
                        </div>
                      ))}
                      {day.events.length > 3 && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 pl-1">
                          +{day.events.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Upcoming Events Sidebar */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Upcoming Events</h3>
            </div>
            <div className="p-4">
              {upcomingEvents.length === 0 ? (
                <div className="text-center py-8">
                  <CalendarDaysIcon className="mx-auto h-8 w-8 text-gray-400" />
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                    No upcoming events
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {upcomingEvents.map((event) => (
                    <div
                      key={event._id}
                      onClick={() => setSelectedEvent(event)}
                      className="p-3 border border-gray-200 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <div className="flex items-start gap-2">
                        <div className={`w-3 h-3 rounded-full mt-1 ${getEventTypeColor(event.type)}`} />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                            {event.title}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {formatDate(event.startDate)} • {formatTime(event.startDate)}
                          </div>
                          {event.linkedCourse && (
                            <div className="text-xs text-indigo-600 dark:text-indigo-400 mt-1">
                              {event.linkedCourse.title}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* List View */
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">All Events</h2>
          </div>
          <div className="p-6">
            {promotion.events.length === 0 ? (
              <div className="text-center py-12">
                <CalendarDaysIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No events scheduled</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Events will appear here when they are added to your promotion.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {promotion.events
                  .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
                  .map((event) => (
                    <div
                      key={event._id}
                      className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-4 h-4 rounded-full ${getEventTypeColor(event.type)}`} />
                        <div>
                          <div className="font-medium text-gray-900 dark:text-gray-100">
                            {event.title}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            {formatDate(event.startDate)} • {formatTime(event.startDate)} - {formatTime(event.endDate)}
                          </div>
                          {event.linkedCourse && (
                            <div className="text-sm text-indigo-600 dark:text-indigo-400 mt-1">
                              📖 {event.linkedCourse.title}
                            </div>
                          )}
                          {event.location && (
                            <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                              📍 {event.location}
                            </div>
                          )}
                        </div>
                      </div>
                      <Button
                        onClick={() => setSelectedEvent(event)}
                        variant="secondary"
                        size="sm"
                        icon={<InformationCircleIcon className="w-4 h-4" />}
                      >
                        Details
                      </Button>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Event Detail Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {selectedEvent.title}
              </h3>
              <button
                onClick={() => setSelectedEvent(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <ClockIcon className="w-4 h-4 text-gray-500" />
                <span className="text-gray-900 dark:text-gray-100">
                  {formatDate(selectedEvent.startDate)} • {formatTime(selectedEvent.startDate)} - {formatTime(selectedEvent.endDate)}
                </span>
              </div>
              
              {selectedEvent.location && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPinIcon className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-900 dark:text-gray-100">{selectedEvent.location}</span>
                </div>
              )}
              
              {selectedEvent.linkedCourse && (
                <div className="flex items-center gap-2 text-sm">
                  <BookOpenIcon className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-900 dark:text-gray-100">{selectedEvent.linkedCourse.title}</span>
                </div>
              )}
              
              {selectedEvent.teacherName && (
                <div className="flex items-center gap-2 text-sm">
                  <AcademicCapIcon className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-900 dark:text-gray-100">{selectedEvent.teacherName}</span>
                </div>
              )}
              
              {selectedEvent.description && (
                <div className="mt-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {selectedEvent.description}
                  </p>
                </div>
              )}
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <Button onClick={() => setSelectedEvent(null)} variant="secondary">
                Close
              </Button>
              {selectedEvent.linkedCourse && (
                <Button
                  onClick={() => window.location.href = `/courses/${selectedEvent.linkedCourse!._id}`}
                  variant="primary"
                >
                  View Course
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentPromotionCalendar;