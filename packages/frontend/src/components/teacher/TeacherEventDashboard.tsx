// packages/frontend/src/components/teacher/TeacherEventDashboard.tsx
// Teacher dashboard for managing assigned events and promotions

'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/AuthProvider';
import { promotionApi } from '@/lib/api/promotions';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Button } from '@/components/ui/Button';
import { 
  CalendarDaysIcon, 
  AcademicCapIcon, 
  UserGroupIcon,
  ClockIcon,
  MapPinIcon,
  BookOpenIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

interface TeacherEvent {
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
  promotions: Array<{
    _id: string;
    name: string;
    semester: number;
    intake: 'september' | 'march';
    studentCount: number;
  }>;
  status: 'upcoming' | 'ongoing' | 'completed';
}

interface TeacherEventStats {
  totalEvents: number;
  upcomingEvents: number;
  ongoingEvents: number;
  totalStudents: number;
  activePromotions: number;
}

export const TeacherEventDashboard: React.FC = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState<TeacherEvent[]>([]);
  const [stats, setStats] = useState<TeacherEventStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState<'week' | 'month' | 'all'>('week');
  const [selectedEvent, setSelectedEvent] = useState<TeacherEvent | null>(null);

  useEffect(() => {
    loadTeacherEvents();
  }, [user, selectedTimeframe]);

  const loadTeacherEvents = async () => {
    if (!user || !user._id) return;

    try {
      setLoading(true);
      setError(null);

      // Get events assigned to this teacher
      const response = await promotionApi.getTeacherEvents(user._id, selectedTimeframe);

      if (response.success && response.data) {
        setEvents(response.data.events || []);
        setStats(response.data.stats || {
          totalEvents: 0,
          upcomingEvents: 0,
          ongoingEvents: 0,
          totalStudents: 0,
          activePromotions: 0
        });
      } else {
        throw new Error(response.error || 'Failed to load events');
      }
    } catch (err: any) {
      console.error('Error loading teacher events:', err);
      setError(err.message || 'Failed to load events');
      setEvents([]);
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return `Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else if (diffDays === 1) {
      return `Tomorrow at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else if (diffDays > 0 && diffDays <= 7) {
      return `${date.toLocaleDateString([], { weekday: 'long' })} at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else {
      return date.toLocaleString([], { 
        month: 'short', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    }
  };

  const getEventStatusColor = (status: string): string => {
    switch (status) {
      case 'upcoming':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200';
      case 'ongoing':
        return 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200';
      case 'completed':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-200';
    }
  };

  const getEventTypeColor = (type: string): string => {
    switch (type) {
      case 'class':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200';
      case 'exam':
        return 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200';
      case 'meeting':
        return 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200';
      case 'academic':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg p-6 text-white">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
          <div>
            <h1 className="text-2xl font-bold mb-2">My Teaching Schedule</h1>
            <p className="text-indigo-100">
              Manage your assigned events and track student promotions
            </p>
          </div>
          <div className="flex items-center gap-4 mt-4 sm:mt-0">
            <select
              value={selectedTimeframe}
              onChange={(e) => setSelectedTimeframe(e.target.value as any)}
              className="bg-white/10 border border-white/20 text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-white/50"
            >
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="all">All Events</option>
            </select>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mt-0.5" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800 dark:text-red-200">Error</h3>
              <p className="text-sm text-red-700 dark:text-red-300 mt-1">{error}</p>
              <Button
                onClick={loadTeacherEvents}
                variant="secondary"
                className="mt-3"
                size="sm"
              >
                Try Again
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CalendarDaysIcon className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Events</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                  {stats.totalEvents}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ClockIcon className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Upcoming</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                  {stats.upcomingEvents}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircleIcon className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Ongoing</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                  {stats.ongoingEvents}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <UserGroupIcon className="h-8 w-8 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Students</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                  {stats.totalStudents}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <AcademicCapIcon className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Promotions</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                  {stats.activePromotions}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Events List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Your Assigned Events
          </h2>
        </div>
        
        <div className="p-6">
          {events.length === 0 ? (
            <div className="text-center py-12">
              <CalendarDaysIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No events assigned</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {selectedTimeframe === 'week' 
                  ? 'No events scheduled for this week'
                  : selectedTimeframe === 'month'
                  ? 'No events scheduled for this month'
                  : 'No events currently assigned to you'
                }
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {events.map((event) => (
                <div
                  key={event._id}
                  className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 truncate">
                          {event.title}
                        </h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getEventTypeColor(event.type)}`}>
                          {event.type}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getEventStatusColor(event.status)}`}>
                          {event.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm text-gray-600 dark:text-gray-400">
                        <div className="flex items-center gap-1">
                          <ClockIcon className="h-4 w-4" />
                          {formatDateTime(event.startDate)}
                        </div>
                        
                        {event.location && (
                          <div className="flex items-center gap-1">
                            <MapPinIcon className="h-4 w-4" />
                            {event.location}
                          </div>
                        )}

                        {event.linkedCourse && (
                          <div className="flex items-center gap-1">
                            <BookOpenIcon className="h-4 w-4" />
                            {event.linkedCourse.title}
                          </div>
                        )}

                        <div className="flex items-center gap-1">
                          <UserGroupIcon className="h-4 w-4" />
                          {event.promotions.reduce((total, promo) => total + promo.studentCount, 0)} students
                        </div>

                        <div className="flex items-center gap-1">
                          <AcademicCapIcon className="h-4 w-4" />
                          {event.promotions.length} promotion{event.promotions.length !== 1 ? 's' : ''}
                        </div>
                      </div>

                      {event.description && (
                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                          {event.description}
                        </p>
                      )}

                      {event.promotions.length > 0 && (
                        <div className="mt-3">
                          <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                            Promotions:
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {event.promotions.map((promotion) => (
                              <span
                                key={promotion._id}
                                className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-200"
                              >
                                {promotion.name} ({promotion.studentCount} students)
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="mt-4 lg:mt-0 lg:ml-6 flex items-center space-x-2">
                      <Button
                        onClick={() => setSelectedEvent(event)}
                        variant="secondary"
                        size="sm"
                        icon={<InformationCircleIcon className="w-4 h-4" />}
                      >
                        Details
                      </Button>
                      
                      {event.linkedCourse && (
                        <Button
                          onClick={() => window.location.href = `/courses/${event.linkedCourse!._id}`}
                          variant="primary"
                          size="sm"
                          icon={<BookOpenIcon className="w-4 h-4" />}
                        >
                          Course
                        </Button>
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
  );
};

export default TeacherEventDashboard;