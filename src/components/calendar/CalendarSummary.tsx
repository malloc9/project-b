import React, { useState, useEffect } from 'react';
import { 
  CalendarIcon, 
  ClockIcon, 
  ExclamationTriangleIcon,
  ArrowRightIcon 
} from '@heroicons/react/24/outline';
import type { CalendarEvent } from '../../types';
import { getEventsForDate, getUpcomingEvents, getOverdueEvents } from '../../services/calendarService';
import { useAuth } from '../../contexts/AuthContext';

interface CalendarSummaryProps {
  className?: string;
}

export function CalendarSummary({ className = '' }: CalendarSummaryProps) {
  const { user } = useAuth();
  const [todayEvents, setTodayEvents] = useState<CalendarEvent[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<CalendarEvent[]>([]);
  const [overdueEvents, setOverdueEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const loadCalendarData = async () => {
      setLoading(true);
      setError(null);

      try {
        const today = new Date();
        
        // Load today's events
        const todayEventsData = await getEventsForDate(user.uid, today);
        setTodayEvents(todayEventsData);

        // Load upcoming events (next 7 days, excluding today)
        const upcomingEventsData = await getUpcomingEvents(user.uid, 7);
        const filteredUpcoming = upcomingEventsData.filter(event => {
          const eventDate = new Date(event.startDate);
          eventDate.setHours(0, 0, 0, 0);
          today.setHours(0, 0, 0, 0);
          return eventDate.getTime() > today.getTime();
        });
        setUpcomingEvents(filteredUpcoming.slice(0, 5)); // Limit to 5 events

        // Load overdue events
        const overdueEventsData = await getOverdueEvents(user.uid);
        setOverdueEvents(overdueEventsData.slice(0, 3)); // Limit to 3 events

      } catch (err) {
        console.error('Error loading calendar summary:', err);
        setError('Failed to load calendar data');
      } finally {
        setLoading(false);
      }
    };

    loadCalendarData();
  }, [user]);

  const getEventTypeColor = (type: CalendarEvent['type']) => {
    switch (type) {
      case 'task':
        return 'text-blue-600 bg-blue-100';
      case 'project':
        return 'text-green-600 bg-green-100';
      case 'plant_care':
        return 'text-yellow-600 bg-yellow-100';
      case 'custom':
        return 'text-purple-600 bg-purple-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getEventTypeIcon = (type: CalendarEvent['type']) => {
    switch (type) {
      case 'task':
        return '✅';
      case 'project':
        return '🔨';
      case 'plant_care':
        return '🌱';
      case 'custom':
        return '📅';
      default:
        return '📋';
    }
  };

  const formatEventTime = (event: CalendarEvent) => {
    if (event.allDay) return 'All day';
    
    const startTime = new Date(event.startDate).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
    
    return startTime;
  };

  const formatEventDate = (date: Date) => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    
    const eventDate = new Date(date);
    eventDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    tomorrow.setHours(0, 0, 0, 0);
    
    if (eventDate.getTime() === today.getTime()) {
      return 'Today';
    } else if (eventDate.getTime() === tomorrow.getTime()) {
      return 'Tomorrow';
    } else {
      return eventDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });
    }
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <div className="text-center">
          <ExclamationTriangleIcon className="h-8 w-8 text-red-500 mx-auto mb-2" />
          <p className="text-sm text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  const hasAnyEvents = todayEvents.length > 0 || upcomingEvents.length > 0 || overdueEvents.length > 0;

  return (
    <div className={`bg-white rounded-lg shadow ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">Calendar Summary</h3>
          </div>
          <a
            href="/calendar"
            className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
          >
            View Calendar
            <ArrowRightIcon className="h-4 w-4" />
          </a>
        </div>
      </div>

      <div className="p-6">
        {!hasAnyEvents ? (
          <div className="text-center py-8">
            <CalendarIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 mb-2">No upcoming events</p>
            <p className="text-sm text-gray-500">
              Your calendar is clear for now
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Overdue Events */}
            {overdueEvents.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <ExclamationTriangleIcon className="h-4 w-4 text-red-500" />
                  <h4 className="text-sm font-medium text-red-700">Overdue</h4>
                </div>
                <div className="space-y-2">
                  {overdueEvents.map((event) => (
                    <div
                      key={event.id}
                      className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-lg"
                    >
                      <span className="text-lg">{getEventTypeIcon(event.type)}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {event.title}
                        </p>
                        <p className="text-xs text-red-600">
                          Due {formatEventDate(event.startDate)}
                        </p>
                      </div>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getEventTypeColor(event.type)}`}>
                        {event.type.replace('_', ' ')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Today's Events */}
            {todayEvents.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <ClockIcon className="h-4 w-4 text-blue-500" />
                  <h4 className="text-sm font-medium text-gray-700">Today</h4>
                </div>
                <div className="space-y-2">
                  {todayEvents.map((event) => (
                    <div
                      key={event.id}
                      className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg"
                    >
                      <span className="text-lg">{getEventTypeIcon(event.type)}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {event.title}
                        </p>
                        <p className="text-xs text-blue-600">
                          {formatEventTime(event)}
                        </p>
                      </div>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getEventTypeColor(event.type)}`}>
                        {event.type.replace('_', ' ')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Upcoming Events */}
            {upcomingEvents.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <CalendarIcon className="h-4 w-4 text-gray-500" />
                  <h4 className="text-sm font-medium text-gray-700">Upcoming</h4>
                </div>
                <div className="space-y-2">
                  {upcomingEvents.map((event) => (
                    <div
                      key={event.id}
                      className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg"
                    >
                      <span className="text-lg">{getEventTypeIcon(event.type)}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {event.title}
                        </p>
                        <p className="text-xs text-gray-600">
                          {formatEventDate(event.startDate)} • {formatEventTime(event)}
                        </p>
                      </div>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getEventTypeColor(event.type)}`}>
                        {event.type.replace('_', ' ')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}