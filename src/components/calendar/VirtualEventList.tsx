import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { CalendarEvent } from '../../types';

interface VirtualEventListProps {
  events: CalendarEvent[];
  itemHeight: number;
  containerHeight: number;
  onEventClick?: (event: CalendarEvent) => void;
  renderEvent?: (event: CalendarEvent, index: number) => React.ReactNode;
  className?: string;
  overscan?: number; // Number of items to render outside visible area
}

interface VirtualItem {
  index: number;
  event: CalendarEvent;
  top: number;
  height: number;
}

export function VirtualEventList({
  events,
  itemHeight,
  containerHeight,
  onEventClick,
  renderEvent,
  className = '',
  overscan = 5
}: VirtualEventListProps) {
  const [scrollTop, setScrollTop] = useState(0);
  const scrollElementRef = useRef<HTMLDivElement>(null);

  // Calculate total height
  const totalHeight = events.length * itemHeight;

  // Calculate visible range
  const visibleRange = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
      events.length - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    );
    return { startIndex, endIndex };
  }, [scrollTop, itemHeight, containerHeight, events.length, overscan]);

  // Calculate visible items
  const visibleItems = useMemo((): VirtualItem[] => {
    const items: VirtualItem[] = [];
    for (let i = visibleRange.startIndex; i <= visibleRange.endIndex; i++) {
      if (events[i]) {
        items.push({
          index: i,
          event: events[i],
          top: i * itemHeight,
          height: itemHeight
        });
      }
    }
    return items;
  }, [visibleRange, events, itemHeight]);

  // Handle scroll
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  // Default event renderer
  const defaultRenderEvent = useCallback((event: CalendarEvent, index: number) => {
    const getEventTypeColor = (type: CalendarEvent['type']) => {
      switch (type) {
        case 'task':
          return 'bg-blue-100 border-blue-300 text-blue-800';
        case 'project':
          return 'bg-green-100 border-green-300 text-green-800';
        case 'plant_care':
          return 'bg-yellow-100 border-yellow-300 text-yellow-800';
        case 'custom':
          return 'bg-purple-100 border-purple-300 text-purple-800';
        default:
          return 'bg-gray-100 border-gray-300 text-gray-800';
      }
    };

    const formatDate = (date: Date) => {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: event.allDay ? undefined : 'numeric',
        minute: event.allDay ? undefined : '2-digit'
      });
    };

    return (
      <div
        className={`
          p-3 border rounded-lg cursor-pointer hover:shadow-md transition-shadow
          ${getEventTypeColor(event.type)}
          ${event.status === 'completed' ? 'opacity-60' : ''}
        `}
        onClick={() => onEventClick?.(event)}
      >
        <div className="flex justify-between items-start">
          <div className="flex-1 min-w-0">
            <h3 className={`font-medium truncate ${event.status === 'completed' ? 'line-through' : ''}`}>
              {event.title}
            </h3>
            {event.description && (
              <p className="text-sm opacity-75 mt-1 line-clamp-2">
                {event.description}
              </p>
            )}
            <div className="flex items-center gap-2 mt-2 text-xs">
              <span className="capitalize px-2 py-1 bg-white bg-opacity-50 rounded">
                {event.type.replace('_', ' ')}
              </span>
              <span>
                {formatDate(event.startDate)}
                {!event.allDay && event.startDate.getTime() !== event.endDate.getTime() && (
                  <> - {formatDate(event.endDate)}</>
                )}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1 ml-2">
            {event.status === 'completed' && (
              <svg className="h-4 w-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
            {event.recurrence && (
              <svg className="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            )}
            {event.notifications && event.notifications.length > 0 && (
              <svg className="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM4 19h6v-6H4v6zM16 3h5v5h-5V3zM4 3h6v6H4V3z" />
              </svg>
            )}
          </div>
        </div>
      </div>
    );
  }, [onEventClick]);

  // Scroll to specific event
  const scrollToEvent = useCallback((eventId: string) => {
    const eventIndex = events.findIndex(event => event.id === eventId);
    if (eventIndex !== -1 && scrollElementRef.current) {
      const targetScrollTop = eventIndex * itemHeight;
      scrollElementRef.current.scrollTop = targetScrollTop;
    }
  }, [events, itemHeight]);

  // Expose scroll function via ref
  React.useImperativeHandle(scrollElementRef, () => ({
    scrollToEvent,
    scrollToTop: () => {
      if (scrollElementRef.current) {
        scrollElementRef.current.scrollTop = 0;
      }
    },
    scrollToBottom: () => {
      if (scrollElementRef.current) {
        scrollElementRef.current.scrollTop = totalHeight;
      }
    }
  }));

  if (events.length === 0) {
    return (
      <div className={`flex items-center justify-center h-full text-gray-500 ${className}`}>
        <div className="text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No events</h3>
          <p className="mt-1 text-sm text-gray-500">No events found for the selected criteria.</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={scrollElementRef}
      className={`overflow-auto ${className}`}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      {/* Virtual container with total height */}
      <div style={{ height: totalHeight, position: 'relative' }}>
        {/* Render only visible items */}
        {visibleItems.map((item) => (
          <div
            key={item.event.id}
            style={{
              position: 'absolute',
              top: item.top,
              height: item.height,
              width: '100%',
              paddingLeft: '8px',
              paddingRight: '8px',
              paddingBottom: '8px'
            }}
          >
            {renderEvent ? renderEvent(item.event, item.index) : defaultRenderEvent(item.event, item.index)}
          </div>
        ))}
      </div>
    </div>
  );
}

// Hook for managing virtual list state
export function useVirtualEventList(
  events: CalendarEvent[],
  options: {
    itemHeight?: number;
    containerHeight?: number;
    overscan?: number;
  } = {}
) {
  const {
    itemHeight = 120,
    containerHeight = 400,
    overscan = 5
  } = options;

  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<CalendarEvent['type'] | 'all'>('all');
  const [sortBy, setSortBy] = useState<'startDate' | 'title' | 'type'>('startDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Filter and sort events
  const processedEvents = useMemo(() => {
    let filtered = events;

    // Apply search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(event =>
        event.title.toLowerCase().includes(term) ||
        (event.description && event.description.toLowerCase().includes(term))
      );
    }

    // Apply type filter
    if (filterType !== 'all') {
      filtered = filtered.filter(event => event.type === filterType);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'startDate':
          comparison = a.startDate.getTime() - b.startDate.getTime();
          break;
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'type':
          comparison = a.type.localeCompare(b.type);
          break;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [events, searchTerm, filterType, sortBy, sortOrder]);

  return {
    events: processedEvents,
    searchTerm,
    setSearchTerm,
    filterType,
    setFilterType,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    itemHeight,
    containerHeight,
    overscan
  };
}

// Performance monitoring component
export function VirtualListPerformanceMonitor({ 
  events, 
  visibleCount 
}: { 
  events: CalendarEvent[]; 
  visibleCount: number; 
}) {
  const [renderTime, setRenderTime] = useState(0);

  useEffect(() => {
    const start = performance.now();
    
    // Use requestAnimationFrame to measure after render
    requestAnimationFrame(() => {
      const end = performance.now();
      setRenderTime(end - start);
    });
  }, [events, visibleCount]);

  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="text-xs text-gray-500 p-2 bg-gray-50 border-t">
      <div>Total Events: {events.length}</div>
      <div>Visible: {visibleCount}</div>
      <div>Render Time: {renderTime.toFixed(2)}ms</div>
      <div>Performance: {events.length > 1000 ? 'Virtual scrolling active' : 'Standard rendering'}</div>
    </div>
  );
}