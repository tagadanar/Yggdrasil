// packages/frontend/src/app/planning/page.tsx
// Planning and calendar management page

'use client';

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/lib/auth/AuthProvider';
import { planningApi } from '@/lib/api/planning';
import { courseApi } from '@/lib/api/courses';
import { CalendarView } from '@/components/planning/CalendarView';
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
  ExclamationTriangleIcon
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
  
  // Check if user can create/edit events
  const canModifyEvents = user?.role === 'admin' || user?.role === 'staff';

  // Load events and courses
  useEffect(() => {
    loadData();
  }, [currentDate, currentView, filters]);

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
      
      if (filters.type) eventFilters.type = filters.type;
      if (filters.course) eventFilters.courseId = filters.course;
      if (filters.location) eventFilters.location = filters.location;

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
      console.error('Error loading planning data:', err);
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
      console.log('HandleCreateEvent called with:', eventData); // Debug log
      
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
      console.error('Error in handleCreateEvent:', error);
      setError(error instanceof Error ? error.message : 'Failed to create event');
    }
  };

  // Actually create the event
  const createEvent = async (eventData: any) => {
    try {
      console.log('CreateEvent called with:', eventData); // Debug log
      const response = await planningApi.createEvent(eventData);
      console.log('API Response:', response); // Debug log
      
      if (response.success) {
        console.log('Event created successfully, reloading data...'); // Debug log
        await loadData(); // Reload events
        setShowCreateModal(false);
        // Set appropriate success message based on event type
        const message = eventData.recurrence ? 'Recurring event created successfully' : 'Event created successfully';
        setSuccessMessage(message);
        console.log('Success message set:', message); // Debug log
        // Auto-hide success message after 3 seconds
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        console.error('API returned error:', response.error); // Debug log
        throw new Error(response.error || 'Failed to create event');
      }
    } catch (error: any) {
      console.error('Error creating event:', error);
      console.error('Error details:', error.response?.data); // Debug log
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
      console.error('Error updating event:', error);
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
      console.error('Error deleting event:', error);
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
      console.error('Error creating event with conflicts:', error);
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
      console.error('Error exporting calendar:', error);
      setError(error.message || 'Failed to export calendar');
    }
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <div className="flex justify-center items-center h-96">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Academic Planning</h1>
                <p className="text-gray-600">
                  Manage your academic schedule and events
                </p>
              </div>
              
              <div className="flex space-x-4">
                {/* Filter Toggle */}
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  data-testid="filter-toggle"
                >
                  <FunnelIcon className="h-4 w-4 mr-2" />
                  Filters
                </button>

                {/* Export Button */}
                <button
                  onClick={() => setShowExportModal(true)}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  data-testid="export-calendar-button"
                >
                  <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                  Export
                </button>

                {/* Create Event Button (Admin/Staff only) */}
                {canModifyEvents && (
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                    data-testid="create-event-button"
                  >
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Create Event
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4" data-testid="error-message">
              <div className="flex">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Error</h3>
                  <div className="mt-2 text-sm text-red-700">{error}</div>
                  <button
                    onClick={loadData}
                    className="mt-2 text-sm font-medium text-red-800 hover:text-red-600"
                    data-testid="retry-button"
                  >
                    Try again
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Success Message */}
          {successMessage && (
            <div className="mb-6 bg-green-50 border border-green-200 rounded-md p-4" data-testid="success-message">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-green-800">Success</h3>
                  <div className="mt-2 text-sm text-green-700">{successMessage}</div>
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

          {/* Calendar View */}
          <div className="bg-white rounded-lg shadow" data-testid="calendar-view">
            <CalendarView
              events={events}
              currentView={currentView}
              currentDate={currentDate}
              onViewChange={setCurrentView}
              onDateChange={setCurrentDate}
              onEventClick={handleEventClick}
              canModifyEvents={canModifyEvents}
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
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}