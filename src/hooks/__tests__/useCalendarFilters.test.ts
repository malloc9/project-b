import { renderHook } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useCalendarFilters, hasActiveFilters, getFiltersDescription, FILTER_PRESETS, sortFilteredEvents } from '../useCalendarFilters';
import { CalendarEvent, CalendarFilters } from '../../types';

const mockEvents: CalendarEvent[] = [
  {
    id: '1',
    userId: 'user1',
    title: 'Morning Meeting',
    description: 'Team standup meeting',
    startDate: new Date('2024-01-15T09:00:00'),
    endDate: new Date('2024-01-15T10:00:00'),
    allDay: false,
    type: 'custom',
    status: 'pending',
    notifications: [],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '2',
    userId: 'user1',
    title: 'Project Deadline',
    description: 'Complete project deliverables',
    startDate: new Date('2024-01-20T17:00:00'),
    endDate: new Date('2024-01-20T17:00:00'),
    allDay: true,
    type: 'project',
    status: 'pending',
    notifications: [],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '3',
    userId: 'user1',
    title: 'Water Plants',
    description: 'Water all indoor plants',
    startDate: new Date('2024-01-16T08:00:00'),
    endDate: new Date('2024-01-16T08:30:00'),
    allDay: false,
    type: 'plant_care',
    status: 'completed',
    notifications: [],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '4',
    userId: 'user1',
    title: 'Task Review',
    description: 'Review completed tasks',
    startDate: new Date('2024-01-18T14:00:00'),
    endDate: new Date('2024-01-18T15:00:00'),
    allDay: false,
    type: 'task',
    status: 'cancelled',
    notifications: [],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '5',
    userId: 'user1',
    title: 'Team Building',
    description: 'Company team building event',
    startDate: new Date('2024-01-25T10:00:00'),
    endDate: new Date('2024-01-25T16:00:00'),
    allDay: false,
    type: 'custom',
    status: 'pending',
    notifications: [],
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

describe('useCalendarFilters', () => {
  it('returns all events when no filters are applied', () => {
    const { result } = renderHook(() => 
      useCalendarFilters(mockEvents, {})
    );

    expect(result.current.filteredEvents).toHaveLength(5);
    expect(result.current.stats.total).toBe(5);
    expect(result.current.stats.filtered).toBe(5);
    expect(result.current.stats.hidden).toBe(0);
  });

  it('filters events by type', () => {
    const filters: CalendarFilters = { type: 'custom' };
    const { result } = renderHook(() => 
      useCalendarFilters(mockEvents, filters)
    );

    expect(result.current.filteredEvents).toHaveLength(2);
    expect(result.current.filteredEvents.every(event => event.type === 'custom')).toBe(true);
  });

  it('filters events by status', () => {
    const filters: CalendarFilters = { status: 'pending' };
    const { result } = renderHook(() => 
      useCalendarFilters(mockEvents, filters)
    );

    expect(result.current.filteredEvents).toHaveLength(3);
    expect(result.current.filteredEvents.every(event => event.status === 'pending')).toBe(true);
  });

  it('filters events by search term in title', () => {
    const filters: CalendarFilters = { searchTerm: 'meeting' };
    const { result } = renderHook(() => 
      useCalendarFilters(mockEvents, filters)
    );

    expect(result.current.filteredEvents).toHaveLength(1);
    expect(result.current.filteredEvents[0].title).toBe('Morning Meeting');
  });

  it('filters events by search term in description', () => {
    const filters: CalendarFilters = { searchTerm: 'team' };
    const { result } = renderHook(() => 
      useCalendarFilters(mockEvents, filters)
    );

    expect(result.current.filteredEvents).toHaveLength(2);
    expect(result.current.filteredEvents.some(event => event.title === 'Morning Meeting')).toBe(true);
    expect(result.current.filteredEvents.some(event => event.title === 'Team Building')).toBe(true);
  });

  it('filters events by start date', () => {
    const filters: CalendarFilters = { startDate: new Date('2024-01-18') };
    const { result } = renderHook(() => 
      useCalendarFilters(mockEvents, filters)
    );

    expect(result.current.filteredEvents).toHaveLength(3);
    expect(result.current.filteredEvents.every(event => 
      new Date(event.startDate) >= new Date('2024-01-18')
    )).toBe(true);
  });

  it('filters events by end date', () => {
    const filters: CalendarFilters = { endDate: new Date('2024-01-18') };
    const { result } = renderHook(() => 
      useCalendarFilters(mockEvents, filters)
    );

    expect(result.current.filteredEvents).toHaveLength(3);
    expect(result.current.filteredEvents.every(event => 
      new Date(event.endDate) <= new Date('2024-01-18T23:59:59')
    )).toBe(true);
  });

  it('filters events by date range', () => {
    const filters: CalendarFilters = { 
      startDate: new Date('2024-01-16'), 
      endDate: new Date('2024-01-20') 
    };
    const { result } = renderHook(() => 
      useCalendarFilters(mockEvents, filters)
    );

    expect(result.current.filteredEvents).toHaveLength(3);
    expect(result.current.filteredEvents.every(event => {
      const eventStart = new Date(event.startDate);
      const eventEnd = new Date(event.endDate);
      return eventStart >= new Date('2024-01-16') && eventEnd <= new Date('2024-01-20T23:59:59');
    })).toBe(true);
  });

  it('applies multiple filters simultaneously', () => {
    const filters: CalendarFilters = { 
      type: 'custom',
      status: 'pending',
      searchTerm: 'building'
    };
    const { result } = renderHook(() => 
      useCalendarFilters(mockEvents, filters)
    );

    // Should only match "Team Building" (custom type, pending status, contains "building")
    expect(result.current.filteredEvents).toHaveLength(1);
    expect(result.current.filteredEvents[0].title).toBe('Team Building');
  });

  it('handles case-insensitive search', () => {
    const filters: CalendarFilters = { searchTerm: 'MEETING' };
    const { result } = renderHook(() => 
      useCalendarFilters(mockEvents, filters)
    );

    expect(result.current.filteredEvents).toHaveLength(1);
    expect(result.current.filteredEvents[0].title).toBe('Morning Meeting');
  });

  it('trims search term whitespace', () => {
    const filters: CalendarFilters = { searchTerm: '  meeting  ' };
    const { result } = renderHook(() => 
      useCalendarFilters(mockEvents, filters)
    );

    expect(result.current.filteredEvents).toHaveLength(1);
    expect(result.current.filteredEvents[0].title).toBe('Morning Meeting');
  });

  it('calculates correct statistics', () => {
    const filters: CalendarFilters = { type: 'custom' };
    const { result } = renderHook(() => 
      useCalendarFilters(mockEvents, filters)
    );

    expect(result.current.stats.total).toBe(5);
    expect(result.current.stats.filtered).toBe(2);
    expect(result.current.stats.hidden).toBe(3);
    expect(result.current.stats.typeStats.custom).toBe(2);
    expect(result.current.stats.statusStats.pending).toBe(2);
  });

  it('updates filtered events when filters change', () => {
    const { result, rerender } = renderHook(
      ({ filters }) => useCalendarFilters(mockEvents, filters),
      { initialProps: { filters: {} as CalendarFilters } }
    );

    expect(result.current.filteredEvents).toHaveLength(5);

    rerender({ filters: { type: 'task' } });
    expect(result.current.filteredEvents).toHaveLength(1);

    rerender({ filters: { status: 'completed' } });
    expect(result.current.filteredEvents).toHaveLength(1);
  });
});

describe('hasActiveFilters', () => {
  it('returns false for empty filters', () => {
    expect(hasActiveFilters({})).toBe(false);
  });

  it('returns true when filters are active', () => {
    expect(hasActiveFilters({ type: 'task' })).toBe(true);
    expect(hasActiveFilters({ searchTerm: 'test' })).toBe(true);
    expect(hasActiveFilters({ startDate: new Date() })).toBe(true);
  });

  it('returns false for undefined values', () => {
    expect(hasActiveFilters({ type: undefined, searchTerm: undefined })).toBe(false);
  });

  it('returns false for empty string values', () => {
    expect(hasActiveFilters({ searchTerm: '' })).toBe(false);
  });
});

describe('getFiltersDescription', () => {
  it('returns empty string for no filters', () => {
    expect(getFiltersDescription({})).toBe('');
  });

  it('describes single filter', () => {
    expect(getFiltersDescription({ type: 'task' })).toBe('Tasks');
    expect(getFiltersDescription({ status: 'pending' })).toBe('Pending');
    expect(getFiltersDescription({ searchTerm: 'test' })).toBe('"test"');
  });

  it('describes multiple filters', () => {
    const description = getFiltersDescription({ 
      type: 'project', 
      status: 'completed' 
    });
    expect(description).toBe('Projects, Completed');
  });

  it('describes date range filters', () => {
    const startDate = new Date('2024-01-01');
    const endDate = new Date('2024-01-31');
    
    const startDateStr = startDate.toLocaleDateString();
    const endDateStr = endDate.toLocaleDateString();
    
    expect(getFiltersDescription({ startDate, endDate }))
      .toContain(`${startDateStr} - ${endDateStr}`);
    
    expect(getFiltersDescription({ startDate }))
      .toContain(`From ${startDateStr}`);
    
    expect(getFiltersDescription({ endDate }))
      .toContain(`Until ${endDateStr}`);
  });
});

describe('sortFilteredEvents', () => {
  it('sorts by start date ascending by default', () => {
    const sorted = sortFilteredEvents(mockEvents);
    
    expect(sorted[0].title).toBe('Morning Meeting'); // 2024-01-15
    expect(sorted[1].title).toBe('Water Plants'); // 2024-01-16
    expect(sorted[2].title).toBe('Task Review'); // 2024-01-18
    expect(sorted[3].title).toBe('Project Deadline'); // 2024-01-20
    expect(sorted[4].title).toBe('Team Building'); // 2024-01-25
  });

  it('sorts by start date descending', () => {
    const sorted = sortFilteredEvents(mockEvents, 'startDate', 'desc');
    
    expect(sorted[0].title).toBe('Team Building'); // 2024-01-25
    expect(sorted[4].title).toBe('Morning Meeting'); // 2024-01-15
  });

  it('sorts by title', () => {
    const sorted = sortFilteredEvents(mockEvents, 'title');
    
    expect(sorted[0].title).toBe('Morning Meeting');
    expect(sorted[1].title).toBe('Project Deadline');
    expect(sorted[2].title).toBe('Task Review');
    expect(sorted[3].title).toBe('Team Building');
    expect(sorted[4].title).toBe('Water Plants');
  });

  it('sorts by type', () => {
    const sorted = sortFilteredEvents(mockEvents, 'type');
    
    expect(sorted.filter(e => e.type === 'custom')).toHaveLength(2);
    expect(sorted.filter(e => e.type === 'plant_care')).toHaveLength(1);
    expect(sorted.filter(e => e.type === 'project')).toHaveLength(1);
    expect(sorted.filter(e => e.type === 'task')).toHaveLength(1);
  });

  it('sorts by status', () => {
    const sorted = sortFilteredEvents(mockEvents, 'status');
    
    // cancelled, completed, pending (alphabetical)
    expect(sorted[0].status).toBe('cancelled');
    expect(sorted[1].status).toBe('completed');
    expect(sorted[2].status).toBe('pending');
  });

  it('does not mutate original array', () => {
    const original = [...mockEvents];
    const sorted = sortFilteredEvents(mockEvents, 'title');
    
    expect(mockEvents).toEqual(original);
    expect(sorted).not.toBe(mockEvents);
  });
});

describe('FILTER_PRESETS', () => {
  it('contains expected presets', () => {
    expect(FILTER_PRESETS.TODAY).toBeDefined();
    expect(FILTER_PRESETS.THIS_WEEK).toBeDefined();
    expect(FILTER_PRESETS.PENDING_TASKS).toBeDefined();
    expect(FILTER_PRESETS.COMPLETED_EVENTS).toBeDefined();
    expect(FILTER_PRESETS.PLANT_CARE).toBeDefined();
    expect(FILTER_PRESETS.PROJECTS).toBeDefined();
  });

  it('has correct filter configurations', () => {
    expect(FILTER_PRESETS.PENDING_TASKS.filters).toEqual({
      type: 'task',
      status: 'pending'
    });

    expect(FILTER_PRESETS.PLANT_CARE.filters).toEqual({
      type: 'plant_care'
    });

    expect(FILTER_PRESETS.COMPLETED_EVENTS.filters).toEqual({
      status: 'completed'
    });
  });

  it('generates correct preset IDs', () => {
    expect(FILTER_PRESETS.PENDING_TASKS.id).toBe('preset-pending-tasks');
    expect(FILTER_PRESETS.PLANT_CARE.id).toBe('preset-plant-care');
  });
});