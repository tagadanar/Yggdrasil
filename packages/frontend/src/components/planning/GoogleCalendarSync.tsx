// packages/frontend/src/components/planning/GoogleCalendarSync.tsx
// Google Calendar integration and sync management component

'use client';

import React, { useState, useEffect } from 'react';
import {
  CloudIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XMarkIcon,
  Cog6ToothIcon,
  LinkIcon,
  ArrowsRightLeftIcon
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/Button';

interface GoogleCalendar {
  id: string;
  summary: string;
  description?: string;
  primary?: boolean;
  accessRole: string;
  selected?: boolean;
}

interface SyncPreferences {
  syncDirection: 'bidirectional' | 'import' | 'export';
  selectedCalendars: string[];
  syncFrequency: 'realtime' | 'hourly' | 'daily';
  conflictResolution: 'yggdrasil-wins' | 'google-wins' | 'manual';
  syncCategories: {
    classes: boolean;
    exams: boolean;
    meetings: boolean;
    events: boolean;
  };
}

interface GoogleCalendarSyncProps {
  isOpen: boolean;
  onClose: () => void;
  onSyncComplete?: () => void;
  currentSyncStatus?: 'connected' | 'disconnected' | 'syncing' | 'error';
}

export const GoogleCalendarSync: React.FC<GoogleCalendarSyncProps> = ({
  isOpen,
  onClose,
  onSyncComplete,
  currentSyncStatus = 'disconnected'
}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableCalendars, setAvailableCalendars] = useState<GoogleCalendar[]>([]);
  const [syncPreferences, setSyncPreferences] = useState<SyncPreferences>({
    syncDirection: 'bidirectional',
    selectedCalendars: [],
    syncFrequency: 'hourly',
    conflictResolution: 'manual',
    syncCategories: {
      classes: true,
      exams: true,
      meetings: true,
      events: true
    }
  });
  const [activeTab, setActiveTab] = useState<'connection' | 'preferences' | 'status'>('connection');

  useEffect(() => {
    if (isOpen) {
      loadSyncStatus();
    }
  }, [isOpen]);

  const loadSyncStatus = async () => {
    try {
      // Check if user has Google Calendar connected
      const response = await fetch('/api/planning/google-calendar/status');
      const data = await response.json();
      
      if (data.success) {
        setIsConnected(data.data.isConnected);
        if (data.data.isConnected) {
          setAvailableCalendars(data.data.calendars || []);
          setSyncPreferences(data.data.preferences || syncPreferences);
        }
      }
    } catch (err) {
      console.error('Failed to load sync status:', err);
      setError('Failed to load sync status');
    }
  };

  const handleGoogleAuth = async () => {
    setIsConnecting(true);
    setError(null);

    try {
      // Initiate Google OAuth flow
      const response = await fetch('/api/planning/google-calendar/auth', {
        method: 'POST'
      });
      const data = await response.json();

      if (data.success && data.data.authUrl) {
        // Redirect to Google OAuth
        window.location.href = data.data.authUrl;
      } else {
        throw new Error(data.error || 'Failed to initiate Google authentication');
      }
    } catch (err: any) {
      console.error('Google auth error:', err);
      setError(err.message || 'Failed to connect to Google Calendar');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect Google Calendar? This will stop all synchronization.')) {
      return;
    }

    try {
      const response = await fetch('/api/planning/google-calendar/disconnect', {
        method: 'POST'
      });
      const data = await response.json();

      if (data.success) {
        setIsConnected(false);
        setAvailableCalendars([]);
        setSyncPreferences({
          ...syncPreferences,
          selectedCalendars: []
        });
      } else {
        throw new Error(data.error || 'Failed to disconnect');
      }
    } catch (err: any) {
      console.error('Disconnect error:', err);
      setError(err.message || 'Failed to disconnect Google Calendar');
    }
  };

  const handleSyncNow = async () => {
    setIsSyncing(true);
    setError(null);

    try {
      const response = await fetch('/api/planning/google-calendar/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ preferences: syncPreferences })
      });
      const data = await response.json();

      if (data.success) {
        if (onSyncComplete) {
          onSyncComplete();
        }
      } else {
        throw new Error(data.error || 'Sync failed');
      }
    } catch (err: any) {
      console.error('Sync error:', err);
      setError(err.message || 'Failed to sync calendars');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSavePreferences = async () => {
    try {
      const response = await fetch('/api/planning/google-calendar/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(syncPreferences)
      });
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to save preferences');
      }
    } catch (err: any) {
      console.error('Save preferences error:', err);
      setError(err.message || 'Failed to save preferences');
    }
  };

  const toggleCalendarSelection = (calendarId: string) => {
    setSyncPreferences(prev => ({
      ...prev,
      selectedCalendars: prev.selectedCalendars.includes(calendarId)
        ? prev.selectedCalendars.filter(id => id !== calendarId)
        : [...prev.selectedCalendars, calendarId]
    }));
  };

  const updateSyncCategory = (category: keyof SyncPreferences['syncCategories'], enabled: boolean) => {
    setSyncPreferences(prev => ({
      ...prev,
      syncCategories: {
        ...prev.syncCategories,
        [category]: enabled
      }
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" data-testid="google-sync-modal">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <CloudIcon className="h-6 w-6 text-indigo-600" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Google Calendar Integration
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            data-testid="google-sync-close"
          >
            <XMarkIcon className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          {[
            { id: 'connection', label: 'Connection', icon: LinkIcon },
            { id: 'preferences', label: 'Preferences', icon: Cog6ToothIcon },
            { id: 'status', label: 'Sync Status', icon: ArrowsRightLeftIcon }
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Connection Tab */}
          {activeTab === 'connection' && (
            <div className="space-y-6">
              <div className="text-center">
                <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 ${
                  isConnected ? 'bg-green-100 dark:bg-green-900/20' : 'bg-gray-100 dark:bg-gray-700'
                }`}>
                  {isConnected ? (
                    <CheckCircleIcon className="h-8 w-8 text-green-600 dark:text-green-400" />
                  ) : (
                    <CloudIcon className="h-8 w-8 text-gray-400" />
                  )}
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                  {isConnected ? 'Connected to Google Calendar' : 'Connect Google Calendar'}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  {isConnected 
                    ? 'Your Google Calendar is connected and ready to sync with Yggdrasil.'
                    : 'Connect your Google Calendar to sync events between Yggdrasil and Google Calendar.'
                  }
                </p>
              </div>

              {!isConnected ? (
                <div className="space-y-4" data-testid="google-auth-instructions">
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <h4 className="font-medium text-blue-900 dark:text-blue-200 mb-2">What happens when you connect?</h4>
                    <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
                      <li>• Access to your Google Calendar events</li>
                      <li>• Ability to create events in your Google Calendar</li>
                      <li>• Two-way synchronization of events</li>
                      <li>• Automatic conflict detection</li>
                    </ul>
                  </div>

                  <Button
                    onClick={handleGoogleAuth}
                    variant="primary"
                    size="lg"
                    disabled={isConnecting}
                    className="w-full"
                    data-testid="connect-google-calendar"
                  >
                    {isConnecting ? (
                      <>
                        <ArrowPathIcon className="h-5 w-5 mr-2 animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      <>
                        <CloudIcon className="h-5 w-5 mr-2" />
                        Connect Google Calendar
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                    <h4 className="font-medium text-green-900 dark:text-green-200 mb-2">Connected Successfully</h4>
                    <p className="text-sm text-green-800 dark:text-green-300">
                      Your Google Calendar is connected and synchronized with Yggdrasil. 
                      Configure your sync preferences in the Preferences tab.
                    </p>
                  </div>

                  <div className="flex space-x-3">
                    <Button
                      onClick={handleSyncNow}
                      variant="primary"
                      disabled={isSyncing}
                      data-testid="sync-now-button"
                    >
                      {isSyncing ? (
                        <>
                          <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
                          Syncing...
                        </>
                      ) : (
                        <>
                          <ArrowsRightLeftIcon className="h-4 w-4 mr-2" />
                          Sync Now
                        </>
                      )}
                    </Button>

                    <Button
                      onClick={handleDisconnect}
                      variant="secondary"
                      data-testid="disconnect-google-calendar"
                    >
                      Disconnect
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Preferences Tab */}
          {activeTab === 'preferences' && (
            <div className="space-y-6" data-testid="sync-preferences">
              {!isConnected ? (
                <div className="text-center py-8">
                  <CloudIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">
                    Connect your Google Calendar first to configure sync preferences.
                  </p>
                </div>
              ) : (
                <>
                  {/* Sync Direction */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      Sync Direction
                    </label>
                    <div className="space-y-2">
                      {[
                        { value: 'bidirectional', label: 'Two-way sync', desc: 'Sync events both ways' },
                        { value: 'import', label: 'Import only', desc: 'Import from Google to Yggdrasil' },
                        { value: 'export', label: 'Export only', desc: 'Export from Yggdrasil to Google' }
                      ].map(option => (
                        <label key={option.value} className="flex items-start space-x-3 cursor-pointer">
                          <input
                            type="radio"
                            name="syncDirection"
                            value={option.value}
                            checked={syncPreferences.syncDirection === option.value}
                            onChange={(e) => setSyncPreferences(prev => ({ ...prev, syncDirection: e.target.value as any }))}
                            className="mt-1"
                            data-testid={`${option.value}-sync`}
                          />
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{option.label}</div>
                            <div className="text-xs text-gray-600 dark:text-gray-400">{option.desc}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Calendar Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      Google Calendars to Sync
                    </label>
                    <div className="space-y-2 max-h-40 overflow-y-auto" data-testid="calendar-select">
                      {availableCalendars.map(calendar => (
                        <label key={calendar.id} className="flex items-center space-x-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={syncPreferences.selectedCalendars.includes(calendar.id)}
                            onChange={() => toggleCalendarSelection(calendar.id)}
                          />
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {calendar.summary}
                              {calendar.primary && (
                                <span className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">Primary</span>
                              )}
                            </div>
                            {calendar.description && (
                              <div className="text-xs text-gray-600 dark:text-gray-400">{calendar.description}</div>
                            )}
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Event Categories */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      Event Types to Sync
                    </label>
                    <div className="space-y-2">
                      {Object.entries(syncPreferences.syncCategories).map(([category, enabled]) => (
                        <label key={category} className="flex items-center space-x-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={enabled}
                            onChange={(e) => updateSyncCategory(category as any, e.target.checked)}
                          />
                          <span className="text-sm text-gray-900 dark:text-gray-100 capitalize">{category}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Sync Frequency */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      Sync Frequency
                    </label>
                    <select
                      value={syncPreferences.syncFrequency}
                      onChange={(e) => setSyncPreferences(prev => ({ ...prev, syncFrequency: e.target.value as any }))}
                      className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    >
                      <option value="realtime">Real-time (immediate)</option>
                      <option value="hourly">Every hour</option>
                      <option value="daily">Daily</option>
                    </select>
                  </div>

                  {/* Conflict Resolution */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      Conflict Resolution
                    </label>
                    <select
                      value={syncPreferences.conflictResolution}
                      onChange={(e) => setSyncPreferences(prev => ({ ...prev, conflictResolution: e.target.value as any }))}
                      className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    >
                      <option value="manual">Ask me each time</option>
                      <option value="yggdrasil-wins">Yggdrasil events take priority</option>
                      <option value="google-wins">Google events take priority</option>
                    </select>
                  </div>

                  <Button onClick={handleSavePreferences} variant="primary">
                    Save Preferences
                  </Button>
                </>
              )}
            </div>
          )}

          {/* Status Tab */}
          {activeTab === 'status' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Connection Status</h4>
                  <div className={`flex items-center space-x-2 ${
                    isConnected ? 'text-green-600' : 'text-red-600'
                  }`}>
                    <div className={`w-2 h-2 rounded-full ${
                      isConnected ? 'bg-green-500' : 'bg-red-500'
                    }`}></div>
                    <span className="text-sm">{isConnected ? 'Connected' : 'Disconnected'}</span>
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Sync Status</h4>
                  <div className={`flex items-center space-x-2 ${
                    currentSyncStatus === 'connected' ? 'text-green-600' :
                    currentSyncStatus === 'syncing' ? 'text-blue-600' :
                    currentSyncStatus === 'error' ? 'text-red-600' : 'text-gray-600'
                  }`}>
                    <div className={`w-2 h-2 rounded-full ${
                      currentSyncStatus === 'connected' ? 'bg-green-500' :
                      currentSyncStatus === 'syncing' ? 'bg-blue-500 animate-pulse' :
                      currentSyncStatus === 'error' ? 'bg-red-500' : 'bg-gray-500'
                    }`}></div>
                    <span className="text-sm capitalize">{currentSyncStatus}</span>
                  </div>
                </div>
              </div>

              {isConnected && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 dark:text-blue-200 mb-2">Sync Information</h4>
                  <div className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
                    <div>Sync Direction: <span className="font-medium">{syncPreferences.syncDirection}</span></div>
                    <div>Selected Calendars: <span className="font-medium">{syncPreferences.selectedCalendars.length}</span></div>
                    <div>Sync Frequency: <span className="font-medium">{syncPreferences.syncFrequency}</span></div>
                    <div>Last Sync: <span className="font-medium">Not implemented yet</span></div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mt-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div className="flex">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-400 dark:text-red-300" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800 dark:text-red-200">Error</h3>
                  <div className="mt-2 text-sm text-red-700 dark:text-red-300">{error}</div>
                  <Button
                    onClick={() => setError(null)}
                    variant="ghost"
                    size="sm"
                    className="mt-2 text-red-800 dark:text-red-200"
                  >
                    Dismiss
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};