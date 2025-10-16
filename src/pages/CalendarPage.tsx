import { useState, useCallback } from 'react';
import { CalendarIcon, ClockIcon, PlusIcon } from '@heroicons/react/24/outline';
import { CalendarView } from '../components/calendar/CalendarView';
import { DayView } from '../components/calendar/DayView';
import { EventDetailsModal } from '../components/calendar/EventDetailsModal';
import { EventForm } from '../components/calendar/EventForm';
import type { CalendarEvent } from '../types';
import { useAuth } from '../contexts/AuthContext';

type ViewType = 'month' | 'day';

export function CalendarPage() {
  const { user } = useAuth();
  const [currentView, setCurrentView] = useState<ViewType>('month');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isEventFormOpen, setIsEventFormOpen] = useState(false);
  const [eventToEdit, setEventToEdit] = useState<CalendarEvent | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Handle date selection from calendar view
  const handleDateSelect = useCallback((date: Date) => {
    setSelectedDate(date);
    if (currentView === 'month') {
      setCurrentView('day');
    }
  }, [currentView]);

  // Handle event click
  const handleEventClick = useCallback((event: CalendarEvent) => {
    setSelectedEvent(event);
    setIsEventModalOpen(true);
  }, []);

  // Handle event creation
  const handleCreateEvent = useCallback(() => {
    setEventToEdit(null);
    setIsEventFormOpen(true);
  }, []);

  // Handle event editing
  const handleEditEvent = useCallback((event: CalendarEvent) => {
    setEventToEdit(event);
    setIsEventFormOpen(true);
  }, []);

  // Handle event updates (refresh calendar)
  const handleEventUpdated = useCallback(() => {
    setRefreshKey(prev => prev + 1);
    setIsEventModalOpen(false);
  }, []);

  // Handle event form save
  const handleEventSaved = useCallback(() => {
    setRefreshKey(prev => prev + 1);
    setIsEventFormOpen(false);
    setEventToEdit(null);
  }, []);

  // Handle view switching
  const handleViewChange = useCallback((view: ViewType) => {
    setCurrentView(view);
  }, []);

  // Handle date navigation from day view
  const handleDateChange = useCallback((date: Date) => {
    setSelectedDate(date);
  }, []);

  if (!user) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Please log in to view your calendar.</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Calendar</h1>
          <p className="text-gray-600">Manage your events and schedule</p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* View Toggle */}
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => handleViewChange('month')}
              className={`
                flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors
                ${currentView === 'month' 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
                }
              `}
            >
              <CalendarIcon className="h-4 w-4" />
              Month
            </button>
            <button
              onClick={() => handleViewChange('day')}
              className={`
                flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors
                ${currentView === 'day' 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
                }
              `}
            >
              <ClockIcon className="h-4 w-4" />
              Day
            </button>
          </div>

          {/* Create Event Button */}
          <button
            onClick={handleCreateEvent}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <PlusIcon className="h-4 w-4" />
            New Event
          </button>
        </div>
      </div>

      {/* Calendar Views */}
      <div className="bg-white rounded-lg shadow">
        {currentView === 'month' ? (
          <CalendarView
            key={`month-${refreshKey}`}
            onDateSelect={handleDateSelect}
            onEventClick={handleEventClick}
            selectedDate={selectedDate}
            className="min-h-[600px]"
          />
        ) : (
          <DayView
            key={`day-${refreshKey}`}
            selectedDate={selectedDate}
            onDateChange={handleDateChange}
            onEventClick={handleEventClick}
            onEventCreate={handleEventUpdated}
            className="min-h-[600px]"
          />
        )}
      </div>

      {/* Event Details Modal */}
      <EventDetailsModal
        event={selectedEvent}
        isOpen={isEventModalOpen}
        onClose={() => {
          setIsEventModalOpen(false);
          setSelectedEvent(null);
        }}
        onEdit={handleEditEvent}
        onEventUpdated={handleEventUpdated}
      />

      {/* Event Form Modal */}
      <EventForm
        event={eventToEdit}
        isOpen={isEventFormOpen}
        onClose={() => {
          setIsEventFormOpen(false);
          setEventToEdit(null);
        }}
        onEventSaved={handleEventSaved}
        initialDate={selectedDate}
      />
    </div>
  );
}
