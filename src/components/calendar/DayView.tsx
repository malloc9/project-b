import React, { useState, useEffect, useMemo, useRef } from 'react';
import { PlusIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { useTranslation } from '../../hooks/useTranslation';
import type { CalendarEvent } from '../../types';
import { getEventsForDate, createEvent } from '../../services/calendarService';
import { useAuth } from '../../contexts/AuthContext';

interface DayViewProps {
  selectedDate?: Date;
  onDateChange?: (date: Date) => void;
  onEventClick?: (event: CalendarEvent) => void;
  onEventCreate?: (event: CalendarEvent) => void;
  className?: string;
}

interface TimeSlot {
  hour: number;
  minute: number;
  label: string;
  position: number; // Percentage position in the day
}

interface PositionedEvent extends CalendarEvent {
  top: number; // Percentage from top
  height: number; // Percentage height
  left: number; // Percentage from left for overlapping events
  width: number; // Percentage width for overlapping events
  zIndex: number;
}

export function DayView({
  selectedDate = new Date(),
  onDateChange,
  onEventClick,
  onEventCreate,
  className = ''
}: DayViewProps) {
  const { t, language } = useTranslation();
  const { user } = useAuth();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draggedEvent, setDraggedEvent] = useState<CalendarEvent | null>(null);
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);
  const [newEventStart, setNewEventStart] = useState<Date | null>(null);
  const [newEventEnd, setNewEventEnd] = useState<Date | null>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  // Generate time slots for the day (24 hours, 30-minute intervals)
  const timeSlots = useMemo((): TimeSlot[] => {
    const slots: TimeSlot[] = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const position = (hour * 60 + minute) / (24 * 60) * 100;
        const label = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        slots.push({ hour, minute, label, position });
      }
    }
    return slots;
  }, []);

  // Position events on the timeline and handle overlaps
  const positionedEvents = useMemo((): PositionedEvent[] => {
    if (!events.length) return [];

    const dayStart = new Date(selectedDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(selectedDate);
    dayEnd.setHours(23, 59, 59, 999);

    // Filter events for the selected day
    const dayEvents = events.filter(event => {
      const eventStart = new Date(event.startDate);
      const eventEnd = new Date(event.endDate);
      return eventStart <= dayEnd && eventEnd >= dayStart;
    });

    // Sort events by start time
    const sortedEvents = dayEvents.sort((a, b) => 
      new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
    );

    const positioned: PositionedEvent[] = [];
    const columns: PositionedEvent[][] = [];

    for (const event of sortedEvents) {
      const eventStart = new Date(event.startDate);
      const eventEnd = new Date(event.endDate);

      // Handle all-day events
      if (event.allDay) {
        positioned.push({
          ...event,
          top: 0,
          height: 100,
          left: 0,
          width: 100,
          zIndex: 1
        });
        continue;
      }

      // Calculate position for timed events
      const startMinutes = eventStart.getHours() * 60 + eventStart.getMinutes();
      const endMinutes = eventEnd.getHours() * 60 + eventEnd.getMinutes();
      const duration = Math.max(endMinutes - startMinutes, 30); // Minimum 30 minutes

      const top = (startMinutes / (24 * 60)) * 100;
      const height = (duration / (24 * 60)) * 100;

      // Find the best column for this event (to handle overlaps)
      let columnIndex = 0;
      for (let i = 0; i < columns.length; i++) {
        const column = columns[i];
        const hasOverlap = column.some(existingEvent => {
          const existingStart = new Date(existingEvent.startDate);
          const existingEnd = new Date(existingEvent.endDate);
          return eventStart < existingEnd && eventEnd > existingStart;
        });
        
        if (!hasOverlap) {
          columnIndex = i;
          break;
        }
        
        if (i === columns.length - 1) {
          columnIndex = columns.length;
        }
      }

      // Create column if it doesn't exist
      if (!columns[columnIndex]) {
        columns[columnIndex] = [];
      }

      const positionedEvent: PositionedEvent = {
        ...event,
        top,
        height,
        left: (columnIndex / Math.max(columns.length, 1)) * 100,
        width: 100 / Math.max(columns.length, 1),
        zIndex: 10 + columnIndex
      };

      columns[columnIndex].push(positionedEvent);
      positioned.push(positionedEvent);
    }

    // Adjust widths for overlapping events
    const maxColumns = columns.length;
    if (maxColumns > 1) {
      positioned.forEach(event => {
        if (!event.allDay) {
          event.width = 100 / maxColumns;
        }
      });
    }

    return positioned;
  }, [events, selectedDate]);

  // Load events for the selected date
  useEffect(() => {
    if (!user) return;

    const loadEvents = async () => {
      setLoading(true);
      setError(null);

      try {
        const dayEvents = await getEventsForDate(user.uid, selectedDate);
        setEvents(dayEvents);
      } catch (err) {
        console.error('Error loading day events:', err);
        setError(t('calendar:dayView.errorLoading'));
      } finally {
        setLoading(false);
      }
    };

    loadEvents();
  }, [user, selectedDate, t]);

  const navigateDay = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate);
    if (direction === 'prev') {
      newDate.setDate(selectedDate.getDate() - 1);
    } else {
      newDate.setDate(selectedDate.getDate() + 1);
    }
    onDateChange?.(newDate);
  };

  const handleTimelineClick = (e: React.MouseEvent) => {
    if (!timelineRef.current || isCreatingEvent) return;

    const rect = timelineRef.current.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const percentage = (y / rect.height) * 100;
    const minutes = (percentage / 100) * (24 * 60);
    const hour = Math.floor(minutes / 60);
    const minute = Math.floor(minutes % 60);

    // Round to nearest 15 minutes
    const roundedMinute = Math.round(minute / 15) * 15;
    const adjustedHour = roundedMinute >= 60 ? hour + 1 : hour;
    const finalMinute = roundedMinute >= 60 ? 0 : roundedMinute;

    const startTime = new Date(selectedDate);
    startTime.setHours(adjustedHour, finalMinute, 0, 0);

    const endTime = new Date(startTime);
    endTime.setHours(startTime.getHours() + 1); // Default 1-hour duration

    setNewEventStart(startTime);
    setNewEventEnd(endTime);
    setIsCreatingEvent(true);
  };

  const handleQuickEventCreate = async (title: string) => {
    if (!user || !newEventStart || !newEventEnd) return;

    try {
      const eventData = {
        userId: user.uid,
        title: title.trim(),
        startDate: newEventStart,
        endDate: newEventEnd,
        allDay: false,
        type: 'custom' as const,
        status: 'pending' as const,
        notifications: []
      };

      const createdEvent = await createEvent(user.uid, eventData);
      setEvents(prev => [...prev, createdEvent]);
      onEventCreate?.(createdEvent);
      
      // Reset creation state
      setIsCreatingEvent(false);
      setNewEventStart(null);
      setNewEventEnd(null);
    } catch (err) {
      console.error('Error creating quick event:', err);
      setError('Failed to create event');
    }
  };

  const cancelEventCreation = () => {
    setIsCreatingEvent(false);
    setNewEventStart(null);
    setNewEventEnd(null);
  };

  const handleEventMouseDown = (event: CalendarEvent, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!timelineRef.current) return;

    setDraggedEvent(event);
  };

  const handleMouseMove = () => {
    if (!draggedEvent || !timelineRef.current) return;

    // Update visual feedback here if needed
    // For now, we'll handle the actual update on mouse up
  };

  const handleMouseUp = async (e: React.MouseEvent) => {
    if (!draggedEvent || !timelineRef.current || !user) {
      setDraggedEvent(null);
      return;
    }

    const rect = timelineRef.current.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const percentage = Math.max(0, Math.min(100, (y / rect.height) * 100));
    const minutes = (percentage / 100) * (24 * 60);
    const hour = Math.floor(minutes / 60);
    const minute = Math.floor(minutes % 60);

    // Round to nearest 15 minutes
    const roundedMinute = Math.round(minute / 15) * 15;
    const adjustedHour = roundedMinute >= 60 ? hour + 1 : hour;
    const finalMinute = roundedMinute >= 60 ? 0 : roundedMinute;

    const newStartTime = new Date(selectedDate);
    newStartTime.setHours(adjustedHour, finalMinute, 0, 0);

    // Calculate duration and new end time
    const originalDuration = draggedEvent.endDate.getTime() - draggedEvent.startDate.getTime();
    const newEndTime = new Date(newStartTime.getTime() + originalDuration);

    try {
      // Update the event with new times
      const { updateEvent } = await import('../../services/calendarService');
      await updateEvent(user.uid, draggedEvent.id, {
        startDate: newStartTime,
        endDate: newEndTime
      });

      // Refresh events
      const dayEvents = await getEventsForDate(user.uid, selectedDate);
      setEvents(dayEvents);
    } catch (err) {
      console.error('Error updating event time:', err);
      setError('Failed to reschedule event');
    }

    setDraggedEvent(null);
  };

  const getEventTypeColor = (type: CalendarEvent['type']) => {
    switch (type) {
      case 'task':
        return 'bg-blue-500 border-blue-600';
      case 'project':
        return 'bg-green-500 border-green-600';
      case 'plant_care':
        return 'bg-yellow-500 border-yellow-600';
      case 'custom':
        return 'bg-purple-500 border-purple-600';
      default:
        return 'bg-gray-500 border-gray-600';
    }
  };

  const formatDate = (date: Date) => {
    const locale = language === 'hu' ? 'hu-HU' : 'en-US';
    return date.toLocaleDateString(locale, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  if (error) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-md p-4 ${className}`}>
        <div className="text-red-800 text-sm font-medium">{t('calendar:dayView.errorLoading')}</div>
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
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <button
          onClick={() => navigateDay('prev')}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          aria-label={t('calendar:dayView.previousDay')}
        >
          <ChevronLeftIcon className="h-5 w-5 text-gray-600" />
        </button>
        
        <div className="text-center">
          <h2 className={`text-lg font-semibold ${isToday(selectedDate) ? 'text-blue-600' : 'text-gray-900'}`}>
            {formatDate(selectedDate)}
          </h2>
          {isToday(selectedDate) && (
            <span className="text-sm text-blue-500 font-medium">{t('calendar:today')}</span>
          )}
        </div>
        
        <button
          onClick={() => navigateDay('next')}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          aria-label={t('calendar:dayView.nextDay')}
        >
          <ChevronRightIcon className="h-5 w-5 text-gray-600" />
        </button>
      </div>

      {/* All-day events section */}
      {positionedEvents.some(event => event.allDay) && (
        <div className="border-b bg-gray-50 p-3">
          <div className="text-xs font-medium text-gray-500 mb-2">{t('calendar:dayView.allDay')}</div>
          <div className="space-y-1">
            {positionedEvents
              .filter(event => event.allDay)
              .map(event => (
                <div
                  key={event.id}
                  className={`
                    px-3 py-1 rounded text-white text-sm cursor-pointer hover:opacity-80 transition-opacity
                    ${getEventTypeColor(event.type)}
                    ${event.status === 'completed' ? 'opacity-60 line-through' : ''}
                  `}
                  onClick={() => onEventClick?.(event)}
                  title={event.description || event.title}
                >
                  {event.title}
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="relative flex">
        {/* Time labels */}
        <div className="w-16 flex-shrink-0 border-r">
          {timeSlots.filter((_, index) => index % 2 === 0).map(slot => (
            <div
              key={`${slot.hour}-${slot.minute}`}
              className="h-12 flex items-start justify-end pr-2 text-xs text-gray-500 border-b border-gray-100"
            >
              {slot.minute === 0 && (
                <span className="font-medium">
                  {slot.hour === 0 ? '12 AM' : 
                   slot.hour === 12 ? '12 PM' :
                   slot.hour > 12 ? `${slot.hour - 12} PM` : `${slot.hour} AM`}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Event timeline */}
        <div 
          ref={timelineRef}
          className="flex-1 relative cursor-pointer"
          onClick={handleTimelineClick}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          style={{ height: `${timeSlots.length / 2 * 48}px` }}
        >
          {/* Time grid lines */}
          {timeSlots.filter((_, index) => index % 2 === 0).map((slot, index) => (
            <div
              key={`grid-${slot.hour}-${slot.minute}`}
              className="absolute w-full border-b border-gray-100"
              style={{ top: `${index * 48}px`, height: '48px' }}
            />
          ))}

          {/* Current time indicator */}
          {isToday(selectedDate) && (
            <div
              className="absolute w-full border-t-2 border-red-500 z-20"
              style={{
                top: `${((new Date().getHours() * 60 + new Date().getMinutes()) / (24 * 60)) * 100}%`
              }}
            >
              <div className="w-2 h-2 bg-red-500 rounded-full -mt-1 -ml-1" />
            </div>
          )}

          {/* Events */}
          {positionedEvents
            .filter(event => !event.allDay)
            .map(event => (
              <div
                key={event.id}
                className={`
                  absolute rounded border-l-4 p-2 text-white text-xs cursor-pointer hover:opacity-80 transition-opacity
                  ${getEventTypeColor(event.type)}
                  ${event.status === 'completed' ? 'opacity-60' : ''}
                  ${draggedEvent?.id === event.id ? 'opacity-50' : ''}
                `}
                style={{
                  top: `${event.top}%`,
                  height: `${event.height}%`,
                  left: `${event.left}%`,
                  width: `${event.width}%`,
                  zIndex: event.zIndex,
                  minHeight: '24px'
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  onEventClick?.(event);
                }}
                onMouseDown={(e) => handleEventMouseDown(event, e)}
                title={`${event.title}${event.description ? ` - ${event.description}` : ''}`}
              >
                <div className="font-medium truncate">{event.title}</div>
                <div className="text-xs opacity-90 truncate">
                  {new Date(event.startDate).toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true
                  })}
                  {event.status === 'completed' && ' ✓'}
                </div>
              </div>
            ))}

          {/* Quick event creation overlay */}
          {isCreatingEvent && newEventStart && newEventEnd && (
            <div
              className="absolute bg-blue-200 border-2 border-blue-400 rounded p-2 z-30"
              style={{
                top: `${((newEventStart.getHours() * 60 + newEventStart.getMinutes()) / (24 * 60)) * 100}%`,
                height: `${((newEventEnd.getTime() - newEventStart.getTime()) / (24 * 60 * 60 * 1000)) * 100}%`,
                left: '0%',
                width: '100%',
                minHeight: '48px'
              }}
            >
              <input
                type="text"
                placeholder="Event title..."
                className="w-full bg-white border-0 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                    handleQuickEventCreate(e.currentTarget.value);
                  } else if (e.key === 'Escape') {
                    cancelEventCreation();
                  }
                }}
                onBlur={(e) => {
                  if (e.target.value.trim()) {
                    handleQuickEventCreate(e.target.value);
                  } else {
                    cancelEventCreation();
                  }
                }}
              />
              <div className="text-xs text-gray-600 mt-1">
                {newEventStart.toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true
                })} - {newEventEnd.toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true
                })}
              </div>
            </div>
          )}

          {/* Loading overlay */}
          {loading && (
            <div className="absolute inset-0 bg-white bg-opacity-50 flex items-center justify-center z-40">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
            </div>
          )}
        </div>
      </div>

      {/* Quick add button */}
      <div className="p-4 border-t">
        <button
          onClick={() => {
            const now = new Date();
            const startTime = new Date(selectedDate);
            startTime.setHours(now.getHours(), 0, 0, 0);
            const endTime = new Date(startTime);
            endTime.setHours(startTime.getHours() + 1);
            
            setNewEventStart(startTime);
            setNewEventEnd(endTime);
            setIsCreatingEvent(true);
          }}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
        >
          <PlusIcon className="h-4 w-4" />
          {t('calendar:dayView.addEvent')}
        </button>
      </div>
    </div>
  );
}