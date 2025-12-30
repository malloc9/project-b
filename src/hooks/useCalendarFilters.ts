import { useMemo } from 'react';
import { CalendarEvent, CalendarFilters } from '../types';

/**
 * Custom hook for filtering calendar events based on provided filters
 */
export function useCalendarFilters(events: CalendarEvent[], filters: CalendarFilters) {
  const filteredEvents = useMemo(() => {
    let filtered = [...events];

    // Filter by event type
    if (filters.type) {
      filtered = filtered.filter(event => event.type === filters.type);
    }

    // Filter by status
    if (filters.status) {
      filtered = filtered.filter(event => event.status === filters.status);
    }

    // Filter by date range
    if (filters.startDate) {
      filtered = filtered.filter(event => {
        const eventStart = new Date(event.startDate);
        const filterStart = new Date(filters.startDate!);
        filterStart.setHours(0, 0, 0, 0);
        return eventStart >= filterStart;
      });
    }

    if (filters.endDate) {
      filtered = filtered.filter(event => {
        const eventEnd = new Date(event.endDate);
        const filterEnd = new Date(filters.endDate!);
        filterEnd.setHours(23, 59, 59, 999);
        return eventEnd <= filterEnd;
      });
    }

    // Filter by search term (title and description)
    if (filters.searchTerm) {
      const searchTerm = filters.searchTerm.toLowerCase().trim();
      filtered = filtered.filter(event => {
        const titleMatch = event.title.toLowerCase().includes(searchTerm);
        const descriptionMatch = event.description?.toLowerCase().includes(searchTerm) || false;
        return titleMatch || descriptionMatch;
      });
    }

    return filtered;
  }, [events, filters]);

  // Calculate filter statistics
  const stats = useMemo(() => {
    const total = events.length;
    const filtered = filteredEvents.length;
    const hidden = total - filtered;

    // Count by type
    const typeStats = filteredEvents.reduce((acc, event) => {
      acc[event.type] = (acc[event.type] || 0) + 1;
      return acc;
    }, {} as Record<CalendarEvent['type'], number>);

    // Count by status
    const statusStats = filteredEvents.reduce((acc, event) => {
      acc[event.status] = (acc[event.status] || 0) + 1;
      return acc;
    }, {} as Record<CalendarEvent['status'], number>);

    return {
      total,
      filtered,
      hidden,
      typeStats,
      statusStats
    };
  }, [events, filteredEvents]);

  return {
    filteredEvents,
    stats
  };
}

/**
 * Helper function to check if any filters are active
 */
export function hasActiveFilters(filters: CalendarFilters): boolean {
  return Object.values(filters).some(value => value !== undefined && value !== '');
}

/**
 * Helper function to get a human-readable description of active filters
 */
export function getFiltersDescription(filters: CalendarFilters): string {
  const descriptions: string[] = [];

  if (filters.type) {
    const typeLabels = {
      task: 'Tasks',
      project: 'Projects',
      plant_care: 'Plant Care',
      custom: 'Custom Events'
    };
    descriptions.push(typeLabels[filters.type]);
  }

  if (filters.status) {
    const statusLabels = {
      pending: 'Pending',
      completed: 'Completed',
      cancelled: 'Cancelled'
    };
    descriptions.push(statusLabels[filters.status]);
  }

  if (filters.startDate && filters.endDate) {
    const startDate = new Date(filters.startDate).toLocaleDateString();
    const endDate = new Date(filters.endDate).toLocaleDateString();
    descriptions.push(`${startDate} - ${endDate}`);
  } else if (filters.startDate) {
    const startDate = new Date(filters.startDate).toLocaleDateString();
    descriptions.push(`From ${startDate}`);
  } else if (filters.endDate) {
    const endDate = new Date(filters.endDate).toLocaleDateString();
    descriptions.push(`Until ${endDate}`);
  }

  if (filters.searchTerm) {
    descriptions.push(`"${filters.searchTerm}"`);
  }

  return descriptions.join(', ');
}

/**
 * Helper function to create a filter preset
 */
export function createFilterPreset(name: string, filters: CalendarFilters) {
  return {
    name,
    filters,
    id: `preset-${name.toLowerCase().replace(/\s+/g, '-')}`
  };
}

/**
 * Common filter presets
 */
export const FILTER_PRESETS = {
  TODAY: createFilterPreset('Today', {
    startDate: new Date(),
    endDate: new Date()
  }),
  THIS_WEEK: createFilterPreset('This Week', {
    startDate: (() => {
      const date = new Date();
      const day = date.getDay();
      const diff = date.getDate() - day;
      return new Date(date.setDate(diff));
    })(),
    endDate: (() => {
      const date = new Date();
      const day = date.getDay();
      const diff = date.getDate() - day + 6;
      return new Date(date.setDate(diff));
    })()
  }),
  PENDING_TASKS: createFilterPreset('Pending Tasks', {
    type: 'task',
    status: 'pending'
  }),
  COMPLETED_EVENTS: createFilterPreset('Completed Events', {
    status: 'completed'
  }),
  PLANT_CARE: createFilterPreset('Plant Care', {
    type: 'plant_care'
  }),
  PROJECTS: createFilterPreset('Projects', {
    type: 'project'
  })
};

/**
 * Helper function to sort filtered events
 */
export function sortFilteredEvents(
  events: CalendarEvent[],
  sortBy: 'startDate' | 'title' | 'type' | 'status' = 'startDate',
  sortOrder: 'asc' | 'desc' = 'asc'
): CalendarEvent[] {
  return [...events].sort((a, b) => {
    let comparison = 0;

    switch (sortBy) {
      case 'startDate':
        comparison = new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
        break;
      case 'title':
        comparison = a.title.localeCompare(b.title);
        break;
      case 'type':
        comparison = a.type.localeCompare(b.type);
        break;
      case 'status':
        comparison = a.status.localeCompare(b.status);
        break;
    }

    return sortOrder === 'asc' ? comparison : -comparison;
  });
}