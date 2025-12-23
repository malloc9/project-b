import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from '../../hooks/useTranslation';
import { ChevronRightIcon } from '@heroicons/react/24/outline';
import type { CalendarEvent } from '../../types';
import { 
  getEventsForCalendarViewOptimized, 
  prefetchAdjacentMonths
} from '../../services/optimizedCalendarService';
import { useAuth } from '../../contexts/AuthContext';

interface CalendarViewProps {
  onDateSelect?: (date: Date) => void;
  onEventClick?: (event: CalendarEvent) => void;
  selectedDate?: Date;
  className?: string;
}

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  events: CalendarEvent[];
}

export function CalendarView({ 
  onDateSelect, 
  onEventClick, 
  selectedDate,
  className = '' 
}: CalendarViewProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Memoized calendar grid calculation (6 weeks x 7 days)
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // First day of the month
    const firstDay = new Date(year, month, 1);
    // Last day of the month
    const lastDay = new Date(year, month + 1, 0);
    
    // Start from the Sunday of the week containing the first day
    const startDate = new Date(firstDay);
    startDate.setDate(firstDay.getDate() - firstDay.getDay());
    
    // End at the Saturday of the week containing the last day
    const endDate = new Date(lastDay);
    endDate.setDate(lastDay.getDate() + (6 - lastDay.getDay()));
    
    const days: CalendarDay[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Pre-calculate normalized selected date
    const selectedDateNormalized = selectedDate ? new Date(selectedDate) : null;
    if (selectedDateNormalized) {
      selectedDateNormalized.setHours(0, 0, 0, 0);
    }
    
    // Create a map for faster event lookup by date
    const eventsByDate = new Map<string, CalendarEvent[]>();
    events.forEach(event => {
      const eventStart = new Date(event.startDate);
      eventStart.setHours(0, 0, 0, 0);
      const eventEnd = new Date(event.endDate);
      eventEnd.setHours(23, 59, 59, 999);
      
      // Add event to all dates it spans
      for (let d = new Date(eventStart); d <= eventEnd; d.setDate(d.getDate() + 1)) {
        const dateKey = d.toISOString().split('T')[0];
        if (!eventsByDate.has(dateKey)) {
          eventsByDate.set(dateKey, []);
        }
        eventsByDate.get(dateKey)!.push(event);
      }
    });
    
    for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
      const dayDate = new Date(date);
      dayDate.setHours(0, 0, 0, 0);
      
      const dateKey = dayDate.toISOString().split('T')[0];
      const dayEvents = eventsByDate.get(dateKey) || [];
      
      days.push({
        date: new Date(dayDate),
        isCurrentMonth: dayDate.getMonth() === month,
        isToday: dayDate.getTime() === today.getTime(),
        isSelected: selectedDateNormalized ? dayDate.getTime() === selectedDateNormalized.getTime() : false,
        events: dayEvents
      });
    }
    
    return days;
  }, [currentDate, events, selectedDate]);

  // Load events for the current month view with optimization
  useEffect(() => {
    if (!user) return;

    const loadEvents = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        
        // Use optimized calendar view service with caching
        const monthEvents = await getEventsForCalendarViewOptimized(
          user.uid, 
          year,
          month
        );
        setEvents(monthEvents);
        
        // Prefetch adjacent months for better navigation performance
        prefetchAdjacentMonths(user.uid, year, month);
      } catch (err) {
        console.error('Error loading calendar events:', err);
        setError('Failed to load calendar events');
      } finally {
        setLoading(false);
      }
    };

    loadEvents();
  }, [user, currentDate]);

  const navigateMonth = useCallback((direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  }, []);

  const handleDateClick = useCallback((date: Date) => {
    onDateSelect?.(date);
  }, [onDateSelect]);

  const handleEventClick = useCallback((event: CalendarEvent, e: React.MouseEvent) => {
    e.stopPropagation();
    onEventClick?.(event);
  }, [onEventClick]);

  const getEventTypeColor = useCallback((type: CalendarEvent['type']) => {
    switch (type) {
      case 'task':
        return 'bg-blue-500';
      case 'project':
        return 'bg-green-500';
      case 'plant_care':
        return 'bg-yellow-500';
      case 'custom':
        return 'bg-purple-500';
      default:
        return 'bg-gray-500';
    }
  }, []);

  const monthNames = [
    t('calendar:monthNames.january'), t('calendar:monthNames.february'), t('calendar:monthNames.march'), 
    t('calendar:monthNames.april'), t('calendar:monthNames.may'), t('calendar:monthNames.june'),
    t('calendar:monthNames.july'), t('calendar:monthNames.august'), t('calendar:monthNames.september'), 
    t('calendar:monthNames.october'), t('calendar:monthNames.november'), t('calendar:monthNames.december')
  ];

  const dayNames = [
    t('calendar:dayNames.sunday'), t('calendar:dayNames.monday'), t('calendar:dayNames.tuesday'), 
    t('calendar:dayNames.wednesday'), t('calendar:dayNames.thursday'), t('calendar:dayNames.friday'), 
    t('calendar:dayNames.saturday')
  ];

  if (error) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-md p-4 ${className}`}>
        <div className="text-red-800 text-sm font-medium">{t('calendar:calendarView.errorLoading')}</div>
        <div className="text-red-700 text-sm mt-1">{error}</div>
        <button
          onClick={() => window.location.reload()}
          className="mt-2 bg-red-100 hover:bg-red-200 px-3 py-1 rounded text-sm text-red-800"
        >
          {t('calendar:dayView.retry')}
        </button>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow ${className}`}>
      {/* Calendar Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <button
          onClick={() => navigateMonth('prev')}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          aria-label={t('calendar:calendarView.previousMonth')}
        >
          <svg className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        
        <h2 className="text-lg font-semibold text-gray-900">
          {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
        </h2>
        
        <button
          onClick={() => navigateMonth('next')}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          aria-label={t('calendar:calendarView.nextMonth')}
        >
          <ChevronRightIcon className="h-5 w-5 text-gray-600" />
        </button>
      </div>

      {/* Day Names Header */}
      <div className="grid grid-cols-7 border-b">
        {dayNames.map(day => (
          <div key={day} className="p-3 text-center text-sm font-medium text-gray-500">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7">
        {calendarDays.map((day, index) => (
          <div
            key={index}
            className={`
              min-h-[120px] p-2 border-r border-b cursor-pointer hover:bg-gray-50 transition-colors
              ${!day.isCurrentMonth ? 'bg-gray-50 text-gray-400' : ''}
              ${day.isToday ? 'bg-blue-50' : ''}
              ${day.isSelected ? 'bg-blue-100' : ''}
            `}
            onClick={() => handleDateClick(day.date)}
          >
            {/* Date Number */}
            <div className={`
              text-sm font-medium mb-1
              ${day.isToday ? 'text-blue-600' : ''}
              ${day.isSelected ? 'text-blue-700' : ''}
            `}>
              {day.date.getDate()}
            </div>

            {/* Event Indicators */}
            <div className="space-y-1">
              {day.events.slice(0, 3).map((event) => (
                <div
                  key={event.id}
                  className={`
                    text-xs px-2 py-1 rounded text-white cursor-pointer hover:opacity-80 transition-opacity
                    ${getEventTypeColor(event.type)}
                    ${event.status === 'completed' ? 'opacity-60 line-through' : ''}
                  `}
                  onClick={(e) => handleEventClick(event, e)}
                  title={event.title}
                >
                  <div className="truncate">
                    {event.title}
                  </div>
                </div>
              ))}
              
              {/* Show "+N more" if there are more than 3 events */}
              {day.events.length > 3 && (
                <div className="text-xs text-gray-500 px-2">
                  {t('calendar:calendarView.moreEvents', { count: day.events.length - 3 })}
                </div>
              )}
            </div>

            {/* Loading indicator for this day */}
            {loading && day.isCurrentMonth && (
              <div className="flex justify-center mt-2">
                <div className="animate-spin rounded-full h-3 w-3 border-b border-gray-400"></div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}