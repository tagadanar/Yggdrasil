// packages/frontend/src/lib/api/planning.ts
// API client for planning and calendar management

import axios, { AxiosInstance } from 'axios';
import { tokenStorage } from '@/lib/auth/tokenStorage';

// Planning service API client
const PLANNING_SERVICE_URL = process.env.NEXT_PUBLIC_PLANNING_SERVICE_URL || 'http://localhost:3005';

// Create axios instance for planning service
const planningApiClient: AxiosInstance = axios.create({
  baseURL: `${PLANNING_SERVICE_URL}/api/planning`,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Add auth token to planning service requests
planningApiClient.interceptors.request.use(
  (config) => {
    const token = tokenStorage.getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Event management API methods
export const planningApi = {
  // =============================================================================
  // EVENT CRUD OPERATIONS
  // =============================================================================

  // Get events with filtering
  async getEvents(filters: {
    startDate?: string;
    endDate?: string;
    type?: 'class' | 'exam' | 'meeting' | 'event';
    courseId?: string;
    location?: string;
  } = {}) {
    const params = new URLSearchParams();
    
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.type) params.append('type', filters.type);
    if (filters.courseId) params.append('courseId', filters.courseId);
    if (filters.location) params.append('location', filters.location);

    const response = await planningApiClient.get(`/events?${params.toString()}`);
    return response.data;
  },

  // Create new event
  async createEvent(eventData: {
    title: string;
    description?: string;
    location?: string;
    type: 'class' | 'exam' | 'meeting' | 'event';
    startDate: string;
    endDate: string;
    linkedCourse?: string;
    recurrence?: {
      pattern: 'daily' | 'weekly' | 'monthly' | 'yearly';
      interval: number;
      endDate?: string;
      count?: number;
      days?: number[];
    };
    capacity?: number;
    isPublic?: boolean;
    color?: string;
  }) {
    const response = await planningApiClient.post('/events', eventData);
    return response.data;
  },

  // Get single event by ID
  async getEvent(eventId: string) {
    const response = await planningApiClient.get(`/events/${eventId}`);
    return response.data;
  },

  // Update event
  async updateEvent(eventId: string, updateData: {
    title?: string;
    description?: string;
    location?: string;
    type?: 'class' | 'exam' | 'meeting' | 'event';
    startDate?: string;
    endDate?: string;
    linkedCourse?: string;
    recurrence?: {
      pattern: 'daily' | 'weekly' | 'monthly' | 'yearly';
      interval: number;
      endDate?: string;
      count?: number;
      days?: number[];
    };
    capacity?: number;
    isPublic?: boolean;
    color?: string;
  }) {
    const response = await planningApiClient.put(`/events/${eventId}`, updateData);
    return response.data;
  },

  // Delete event
  async deleteEvent(eventId: string) {
    const response = await planningApiClient.delete(`/events/${eventId}`);
    return response.data;
  },

  // =============================================================================
  // CONFLICT DETECTION
  // =============================================================================

  // Check for scheduling conflicts
  async checkConflicts(conflictData: {
    startDate: string;
    endDate: string;
    location?: string;
    excludeEventId?: string;
  }) {
    const params = new URLSearchParams();
    params.append('startDate', conflictData.startDate);
    params.append('endDate', conflictData.endDate);
    if (conflictData.location) params.append('location', conflictData.location);
    if (conflictData.excludeEventId) params.append('excludeEventId', conflictData.excludeEventId);

    const response = await planningApiClient.get(`/conflicts?${params.toString()}`);
    return response.data;
  },

  // =============================================================================
  // EXPORT FUNCTIONALITY
  // =============================================================================

  // Export calendar
  async exportCalendar(exportData: {
    format: 'ical' | 'csv';
    startDate: string;
    endDate: string;
    eventType?: 'class' | 'exam' | 'meeting' | 'event';
    includePrivate?: boolean;
  }) {
    const response = await planningApiClient.post('/export', exportData, {
      responseType: 'blob',
    });
    return response;
  },

  // =============================================================================
  // RECURRING EVENTS
  // =============================================================================

  // Generate recurring event instances
  async generateRecurringInstances(eventId: string) {
    const response = await planningApiClient.post(`/events/${eventId}/instances`);
    return response.data;
  },

  // =============================================================================
  // ATTENDEE MANAGEMENT
  // =============================================================================

  // Add attendee to event
  async addAttendee(eventId: string, userId: string) {
    const response = await planningApiClient.post(`/events/${eventId}/attendees`, { userId });
    return response.data;
  },

  // Remove attendee from event
  async removeAttendee(eventId: string, userId: string) {
    const response = await planningApiClient.delete(`/events/${eventId}/attendees/${userId}`);
    return response.data;
  },

  // Update attendee response
  async updateAttendeeStatus(eventId: string, status: 'accepted' | 'declined', note?: string) {
    const response = await planningApiClient.put(`/events/${eventId}/attendees/response`, {
      status,
      note,
    });
    return response.data;
  },

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  // Get upcoming events for current user
  async getUpcomingEvents(limit: number = 10) {
    const params = new URLSearchParams();
    params.append('limit', limit.toString());
    params.append('startDate', new Date().toISOString());

    const response = await planningApiClient.get(`/events/upcoming?${params.toString()}`);
    return response.data;
  },

  // Get events by date range for calendar view
  async getCalendarEvents(startDate: string, endDate: string) {
    return this.getEvents({ startDate, endDate });
  },

  // Search events
  async searchEvents(query: string, filters: {
    type?: 'class' | 'exam' | 'meeting' | 'event';
    startDate?: string;
    endDate?: string;
  } = {}) {
    const params = new URLSearchParams();
    params.append('search', query);
    if (filters.type) params.append('type', filters.type);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);

    const response = await planningApiClient.get(`/events/search?${params.toString()}`);
    return response.data;
  },

  // Get events by location
  async getEventsByLocation(location: string, dateRange?: { startDate: string; endDate: string }) {
    const params = new URLSearchParams();
    params.append('location', location);
    if (dateRange) {
      params.append('startDate', dateRange.startDate);
      params.append('endDate', dateRange.endDate);
    }

    const response = await planningApiClient.get(`/events/location?${params.toString()}`);
    return response.data;
  },

  // Get events linked to a specific course
  async getEventsByCourse(courseId: string) {
    const response = await planningApiClient.get(`/events?courseId=${courseId}`);
    return response.data;
  },
};

export default planningApi;