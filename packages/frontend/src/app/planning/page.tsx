// packages/frontend/src/app/planning/page.tsx
// Planning and calendar management page

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/lib/auth/AuthProvider';
import { planningApi } from '@/lib/api/planning';
import { courseApi } from '@/lib/api/courses';
import { CalendarView } from '@/components/planning/CalendarView';
import { ModernCalendarView } from '@/components/planning/ModernCalendarView';
import { GoogleCalendarSync } from '@/components/planning/GoogleCalendarSync';
import { EventCreateModal } from '@/components/planning/EventCreateModal';
import { EventDetailsModal } from '@/components/planning/EventDetailsModal';
import { EventFilters } from '@/components/planning/EventFilters';
import { ExportCalendarModal } from '@/components/planning/ExportCalendarModal';
import { ConflictWarningModal } from '@/components/planning/ConflictWarningModal';
import { 
  CalendarIcon, 
  PlusIcon, 
  ArrowDownTrayIcon,
  FunnelIcon,
  ExclamationTriangleIcon,
  CloudIcon,
  DevicePhoneMobileIcon
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/Button';

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

interface Course {
  _id: string;
  title: string;
  category: string;
  status: string;
}

export default function PlanningPage() {
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [showGoogleSyncModal, setShowGoogleSyncModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [conflictData, setConflictData] = useState<any>(null);
  
  // View states
  const [currentView, setCurrentView] = useState<'month' | 'week' | 'day' | 'list'>('month');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    type: '',
    course: '',
    location: ''
  });
  
  // Current date for calendar navigation
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Modern calendar features
  const [isRealTimeConnected, setIsRealTimeConnected] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'connected' | 'disconnected' | 'syncing' | 'error'>('disconnected');
  const [isMobile, setIsMobile] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  
  // Check if user can create/edit events
  const canModifyEvents = user?.role === 'admin' || user?.role === 'staff';

  // Memoize filters to prevent unnecessary API calls
  const memoizedFilters = useMemo(() => filters, [filters.type, filters.course, filters.location]);

  // Load events and courses
  useEffect(() => {
    loadData();
  }, [currentDate, currentView, memoizedFilters]);

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Offline detection
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      setIsRealTimeConnected(true);
    };
    
    const handleOffline = () => {
      setIsOffline(true);
      setIsRealTimeConnected(false);
    };
    
    // Set initial status
    setIsOffline(!navigator.onLine);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccessMessage(null);

      // Calculate date range based on current view
      const dateRange = getDateRangeForView(currentDate, currentView);
      
      // Load events
      const eventFilters: any = {
        startDate: dateRange.start.toISOString(),
        endDate: dateRange.end.toISOString()
      };
      
      if (memoizedFilters.type) eventFilters.type = memoizedFilters.type;
      if (memoizedFilters.course) eventFilters.courseId = memoizedFilters.course;
      if (memoizedFilters.location) eventFilters.location = memoizedFilters.location;

      const eventsResponse = await planningApi.getEvents(eventFilters);
      
      if (eventsResponse.success) {
        setEvents(eventsResponse.data || []);
      } else {
        throw new Error(eventsResponse.error || 'Failed to load events');
      }

      // Load courses for linking (only if user can create events)
      if (canModifyEvents) {
        const coursesResponse = await courseApi.searchCourses({ limit: 100 });
        if (coursesResponse.success) {
          setCourses(coursesResponse.data?.courses || []);
        }
      }

    } catch (err: any) {
      setError(err.message || 'Failed to load calendar events');
    } finally {
      setLoading(false);
    }
  };

  // Get date range for current view
  const getDateRangeForView = (date: Date, view: string) => {
    const start = new Date(date);
    const end = new Date(date);

    switch (view) {
      case 'month':
        start.setDate(1);
        end.setMonth(end.getMonth() + 1);
        end.setDate(0);
        break;
      case 'week':
        const dayOfWeek = start.getDay();
        start.setDate(start.getDate() - dayOfWeek);
        end.setDate(start.getDate() + 6);
        break;
      case 'day':
        end.setDate(end.getDate() + 1);
        break;
      case 'list':
        // Show next 30 days for list view
        end.setDate(end.getDate() + 30);
        break;
    }

    return { start, end };
  };

  // Handle event creation
  const handleCreateEvent = async (eventData: any) => {
    try {
      
      // Check for conflicts first
      if (eventData.location) {
        const conflictResponse = await planningApi.checkConflicts({
          startDate: eventData.startDate,
          endDate: eventData.endDate,
          location: eventData.location
        });

        if (conflictResponse.success && conflictResponse.data?.conflicts?.length > 0) {
          setConflictData({
            conflicts: conflictResponse.data.conflicts,
            eventData,
            action: 'create'
          });
          setShowConflictModal(true);
          return;
        }
      }

      await createEvent(eventData);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create event');
    }
  };

  // Actually create the event
  const createEvent = async (eventData: any) => {
    try {
      const response = await planningApi.createEvent(eventData);
      
      if (response.success) {
        await loadData(); // Reload events
        setShowCreateModal(false);
        // Set appropriate success message based on event type
        const message = eventData.recurrence ? 'Recurring event created successfully' : 'Event created successfully';
        setSuccessMessage(message);
        // Auto-hide success message after 3 seconds
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        throw new Error(response.error || 'Failed to create event');
      }
    } catch (error: any) {
      setError(error.response?.data?.error || error.message || 'Failed to create event');
    }
  };

  // Handle event selection
  const handleEventClick = (event: Event) => {
    setSelectedEvent(event);
    setShowDetailsModal(true);
  };

  // Handle event update
  const handleUpdateEvent = async (eventId: string, updateData: any) => {
    try {
      const response = await planningApi.updateEvent(eventId, updateData);
      
      if (response.success) {
        await loadData(); // Reload events
        setShowDetailsModal(false);
        setSuccessMessage('Event updated successfully');
        // Auto-hide success message after 3 seconds
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        throw new Error(response.error || 'Failed to update event');
      }
    } catch (error: any) {
      setError(error.message || 'Failed to update event');
    }
  };

  // Handle event deletion
  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm('Are you sure you want to delete this event?')) {
      return;
    }

    try {
      const response = await planningApi.deleteEvent(eventId);
      
      if (response.success) {
        await loadData(); // Reload events
        setShowDetailsModal(false);
        setSuccessMessage('Event deleted successfully');
        // Auto-hide success message after 3 seconds
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        throw new Error(response.error || 'Failed to delete event');
      }
    } catch (error: any) {
      setError(error.message || 'Failed to delete event');
    }
  };

  // Handle conflict resolution
  const handleConflictResolution = async (proceed: boolean) => {
    setShowConflictModal(false);
    
    if (proceed && conflictData) {
      if (conflictData.action === 'create') {
        await createEventWithConflicts(conflictData.eventData);
      }
    }
    
    setConflictData(null);
  };

  // Create event with conflicts (bypassed conflict check)
  const createEventWithConflicts = async (eventData: any) => {
    try {
      const response = await planningApi.createEvent(eventData);
      
      if (response.success) {
        await loadData(); // Reload events
        setShowCreateModal(false);
        setSuccessMessage('Event created with conflicts');
        // Auto-hide success message after 3 seconds
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        throw new Error(response.error || 'Failed to create event');
      }
    } catch (error: any) {
      setError(error.message || 'Failed to create event');
    }
  };

  // Handle export
  const handleExport = async (exportData: any) => {
    try {
      const response = await planningApi.exportCalendar(exportData);
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `calendar.${exportData.format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      setShowExportModal(false);
    } catch (error: any) {
      setError(error.message || 'Failed to export calendar');
    }
  };

  // Handle event drag & drop
  const handleEventDrop = async (eventId: string, newStart: Date, newEnd: Date) => {
    try {
      const updateData = {
        startDate: newStart.toISOString(),
        endDate: newEnd.toISOString()
      };
      
      await handleUpdateEvent(eventId, updateData);
    } catch (error: any) {
      setError(error.message || 'Failed to move event');
    }
  };

  // Handle event resize
  const handleEventResize = async (eventId: string, newStart: Date, newEnd: Date) => {
    try {
      const updateData = {
        startDate: newStart.toISOString(),
        endDate: newEnd.toISOString()
      };
      
      await handleUpdateEvent(eventId, updateData);
    } catch (error: any) {
      setError(error.message || 'Failed to resize event');
    }
  };

  // Handle date/time selection for quick event creation
  const handleDateSelect = (start: Date, end: Date) => {
    if (canModifyEvents) {
      // Pre-fill create modal with selected time
      setShowCreateModal(true);
      // You could pass the selected dates to the create modal if needed
    }
  };

  // Handle Google Calendar sync completion
  const handleGoogleSyncComplete = () => {
    loadData(); // Reload events after sync
    setSuccessMessage('Google Calendar sync completed successfully');
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={['admin', 'staff']}>
        <DashboardLayout>
          <div className="flex justify-center items-center h-96">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600 dark:border-primary-400"></div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['admin', 'staff']}>
      <DashboardLayout>
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-secondary-900 dark:text-secondary-100 mb-2">Academic Planning</h1>
                <p className="text-secondary-600 dark:text-secondary-400">
                  Manage your academic schedule and events
                </p>
              </div>
              
              <div className="flex space-x-4">
                {/* Google Calendar Sync */}
                <Button
                  onClick={() => setShowGoogleSyncModal(true)}
                  variant="secondary"
                  size="sm"
                  icon={<CloudIcon className="h-4 w-4" />}
                  data-testid="google-calendar-sync"
                >
                  {isMobile ? 'Sync' : 'Google Calendar'}
                </Button>

                {/* Filter Toggle */}
                <Button
                  onClick={() => setShowFilters(!showFilters)}
                  variant="secondary"
                  size="sm"
                  icon={<FunnelIcon className="h-4 w-4" />}
                  data-testid="filter-toggle"
                >
                  {isMobile ? '' : 'Filters'}
                </Button>

                {/* Export Button */}
                <Button
                  onClick={() => setShowExportModal(true)}
                  variant="secondary"
                  size="sm"
                  icon={<ArrowDownTrayIcon className="h-4 w-4" />}
                  data-testid="export-calendar-button"
                >
                  {isMobile ? '' : 'Export'}
                </Button>

                {/* Create Event Button (Admin/Staff only) */}
                {canModifyEvents && (
                  <Button
                    onClick={() => setShowCreateModal(true)}
                    variant="primary"
                    size="sm"
                    icon={<PlusIcon className="h-4 w-4" />}
                    data-testid="create-event-button"
                  >
                    {isMobile ? '' : 'Create Event'}
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-xl p-4" data-testid="error-message">
              <div className="flex">
                <ExclamationTriangleIcon className="h-5 w-5 text-rose-400 dark:text-rose-300" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-rose-800 dark:text-rose-200">Error</h3>
                  <div className="mt-2 text-sm text-rose-700 dark:text-rose-300">{error}</div>
                  <Button
                    onClick={loadData}
                    variant="ghost"
                    size="sm"
                    className="mt-2 text-rose-800 dark:text-rose-200 hover:text-rose-600 dark:hover:text-rose-100"
                    data-testid="retry-button"
                  >
                    Try again
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Success Message */}
          {successMessage && (
            <div className="mb-6 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4" data-testid="success-message">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-emerald-400 dark:text-emerald-300" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-emerald-800 dark:text-emerald-200">Success</h3>
                  <div className="mt-2 text-sm text-emerald-700 dark:text-emerald-300">{successMessage}</div>
                </div>
              </div>
            </div>
          )}

          {/* Filters */}
          {showFilters && (
            <div className="mb-6">
              <EventFilters
                filters={filters}
                onFiltersChange={setFilters}
                courses={courses}
              />
            </div>
          )}

          {/* Modern Calendar View */}
          <div data-testid="calendar-view">
            <ModernCalendarView
              events={events}
              currentView={currentView}
              currentDate={currentDate}
              onViewChange={setCurrentView}
              onDateChange={setCurrentDate}
              onEventClick={handleEventClick}
              canModifyEvents={canModifyEvents}
              onEventDrop={handleEventDrop}
              onEventResize={handleEventResize}
              onDateSelect={handleDateSelect}
              isRealTimeConnected={isRealTimeConnected}
              syncStatus={syncStatus}
              isMobile={isMobile}
              isOffline={isOffline}
            />
          </div>

          {/* Create Event Modal */}
          {showCreateModal && (
            <EventCreateModal
              isOpen={showCreateModal}
              onClose={() => setShowCreateModal(false)}
              onSubmit={handleCreateEvent}
              courses={courses}
            />
          )}

          {/* Event Details Modal */}
          {showDetailsModal && selectedEvent && (
            <EventDetailsModal
              isOpen={showDetailsModal}
              event={selectedEvent}
              onClose={() => setShowDetailsModal(false)}
              onUpdate={handleUpdateEvent}
              onDelete={handleDeleteEvent}
              canModify={canModifyEvents}
              courses={courses}
            />
          )}

          {/* Export Modal */}
          {showExportModal && (
            <ExportCalendarModal
              isOpen={showExportModal}
              onClose={() => setShowExportModal(false)}
              onExport={handleExport}
            />
          )}

          {/* Conflict Warning Modal */}
          {showConflictModal && conflictData && (
            <ConflictWarningModal
              isOpen={showConflictModal}
              conflicts={conflictData.conflicts}
              onClose={() => handleConflictResolution(false)}
              onProceed={() => handleConflictResolution(true)}
            />
          )}

          {/* Google Calendar Sync Modal */}
          {showGoogleSyncModal && (
            <GoogleCalendarSync
              isOpen={showGoogleSyncModal}
              onClose={() => setShowGoogleSyncModal(false)}
              onSyncComplete={handleGoogleSyncComplete}
              currentSyncStatus={syncStatus}
            />
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}