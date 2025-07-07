// packages/frontend/src/components/planning/CalendarView.tsx

'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { CalendarGrid } from './CalendarGrid';
import { EventModal } from './EventModal';
import { EventFilters } from './EventFilters';
import { ConflictWarning } from './ConflictWarning';

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  type: 'class' | 'exam' | 'meeting' | 'event';
  category?: 'academic' | 'administrative' | 'social' | 'personal' | 'system';
  location?: string;
  instructor?: string;
  course?: {
    id: string;
    title: string;
  };
  participants?: string[];
  isRecurring?: boolean;
  recurrencePattern?: string;
}

interface ConflictWarning {
  id: string;
  message: string;
  severity: 'warning' | 'error';
  events: string[];
}

export function CalendarView() {
  const { user } = useAuth();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');
  const [showEventModal, setShowEventModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [filters, setFilters] = useState({
    type: 'all' as 'all' | 'class' | 'exam' | 'meeting' | 'event',
    course: 'all',
  });
  const [conflicts, setConflicts] = useState<ConflictWarning[]>([]);

  useEffect(() => {
    fetchEvents();
  }, [selectedDate, filters]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const startDate = new Date(selectedDate);
      startDate.setDate(1);
      const endDate = new Date(selectedDate);
      endDate.setMonth(endDate.getMonth() + 1, 0);

      const params = new URLSearchParams({
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        ...(filters.type !== 'all' && { type: filters.type }),
      });

      const response = await fetch(`/api/planning/events?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch events');
      }

      const data = await response.json();
      
      // Map backend event data to frontend format
      const mappedEvents = data.data?.map((event: any) => ({
        id: event._id,
        title: event.title,
        description: event.description,
        startDate: event.startDate,
        endDate: event.endDate,
        type: event.type,
        category: event.category,
        location: event.location,
        instructor: event.organizer || event.instructor,
        course: event.courseId ? {
          id: event.courseId,
          title: event.courseName || 'Unknown Course'
        } : undefined,
        participants: event.attendees || [],
        isRecurring: event.isRecurring || false,
        recurrencePattern: event.recurrencePattern,
      })) || [];

      setEvents(mappedEvents);
    } catch (error) {
      console.error('Error fetching events:', error);
      setError('Failed to load calendar events');
      // Mock data for development
      setEvents([
        {
          id: '1',
          title: 'Database Design Lecture',
          description: 'Introduction to relational database design principles',
          startDate: '2024-12-30T09:00:00Z',
          endDate: '2024-12-30T10:30:00Z',
          type: 'class',
          location: 'Room 101',
          instructor: 'Dr. Smith',
          course: { id: '1', title: 'Database Systems' },
        },
        {
          id: '2',
          title: 'Midterm Exam',
          description: 'JavaScript Programming midterm examination',
          startDate: '2024-12-31T14:00:00Z',
          endDate: '2024-12-31T16:00:00Z',
          type: 'exam',
          location: 'Room 203',
          course: { id: '2', title: 'JavaScript Programming' },
        },
        {
          id: '3',
          title: 'Faculty Meeting',
          description: 'Monthly faculty coordination meeting',
          startDate: '2025-01-02T10:00:00Z',
          endDate: '2025-01-02T11:30:00Z',
          type: 'meeting',
          location: 'Conference Room',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEvent = () => {
    setSelectedEvent(null);
    setShowEventModal(true);
  };

  const handleEditEvent = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setShowEventModal(true);
  };

  const handleSaveEvent = async (eventData: Partial<CalendarEvent>) => {
    try {
      const token = localStorage.getItem('token');
      const url = selectedEvent 
        ? `/api/planning/events/${selectedEvent.id}`
        : '/api/planning/events';
      
      const method = selectedEvent ? 'PUT' : 'POST';

      console.log('Sending event data:', {
        url,
        method,
        eventData,
        token: token ? 'present' : 'missing'
      });

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventData),
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('API Error Response:', {
          status: response.status,
          statusText: response.statusText,
          body: errorData
        });
        throw new Error(`Failed to save event: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      
      // Check for conflicts
      if (result.conflicts && result.conflicts.length > 0) {
        setConflicts(result.conflicts);
      }

      setShowEventModal(false);
      fetchEvents();
    } catch (error) {
      console.error('Error saving event:', error);
      alert('Failed to save event. Please try again.');
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm('Are you sure you want to delete this event?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/planning/events/${eventId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete event');
      }

      fetchEvents();
    } catch (error) {
      console.error('Error deleting event:', error);
      alert('Failed to delete event. Please try again.');
    }
  };

  const canEditEvents = user?.role && ['admin', 'staff'].includes(user.role);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  if (error && events.length === 0) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <p className="text-red-800">{error}</p>
        <button
          onClick={fetchEvents}
          className="mt-2 text-red-700 underline hover:text-red-900"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Calendar Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setSelectedDate(new Date(selectedDate.setMonth(selectedDate.getMonth() - 1)))}
            className="p-2 rounded-md border border-gray-300 hover:bg-gray-50"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          <h2 className="text-xl font-semibold text-gray-900">
            {selectedDate.toLocaleDateString('en-US', { 
              month: 'long', 
              year: 'numeric' 
            })}
          </h2>
          
          <button
            onClick={() => setSelectedDate(new Date(selectedDate.setMonth(selectedDate.getMonth() + 1)))}
            className="p-2 rounded-md border border-gray-300 hover:bg-gray-50"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          <button
            onClick={() => setSelectedDate(new Date())}
            className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Today
          </button>
        </div>

        <div className="flex gap-2">
          <EventFilters filters={filters} onFiltersChange={setFilters} />
          
          <div className="flex rounded-md shadow-sm">
            {(['month', 'week', 'day'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-2 text-sm font-medium border ${
                  viewMode === mode
                    ? 'bg-blue-50 border-blue-500 text-blue-700'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                } ${
                  mode === 'month' ? 'rounded-l-md' : 
                  mode === 'day' ? 'rounded-r-md' : 
                  'border-l-0'
                }`}
              >
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </button>
            ))}
          </div>

          {canEditEvents && (
            <button
              onClick={handleCreateEvent}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <svg className="-ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Event
            </button>
          )}
        </div>
      </div>

      {/* Conflict Warnings */}
      {conflicts.length > 0 && (
        <div className="space-y-2">
          {conflicts.map((conflict) => (
            <ConflictWarning 
              key={conflict.id} 
              conflict={conflict}
              onDismiss={() => setConflicts(prev => prev.filter(c => c.id !== conflict.id))}
            />
          ))}
        </div>
      )}

      {/* Calendar Grid */}
      <CalendarGrid
        events={events}
        selectedDate={selectedDate}
        viewMode={viewMode}
        onEventClick={handleEditEvent}
        canEdit={canEditEvents}
      />

      {/* Event Modal */}
      {showEventModal && (
        <EventModal
          event={selectedEvent}
          onSave={handleSaveEvent}
          onCancel={() => setShowEventModal(false)}
          onDelete={selectedEvent ? () => handleDeleteEvent(selectedEvent.id) : undefined}
        />
      )}
    </div>
  );
}