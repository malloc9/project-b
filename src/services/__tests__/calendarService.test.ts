import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { CalendarEvent, CreateCalendarEventData } from '../../types';

// Mock Firebase
vi.mock('../../config/firebase', () => ({
  db: {}
}));



// Import the service after mocking
import {
  createEvent,
  getEvent,
  updateEvent,
  deleteEvent,
  validateEventData,
  sanitizeEventData,
  getEventsForDateRange,
  getEventsForDate,
  getUpcomingEvents,
  getOverdueEvents,
  filterEventsByType,
  filterEventsByStatus,
  searchEvents,
  sortEventsByStartDate
} from '../calendarService';

// Import mocked functions and objects from global setup
import {
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  Timestamp,
  query,
  where,
  orderBy,
  limit
} from 'firebase/firestore';

describe.skip('Calendar Service', () => {
  const mockUserId = 'test-user-id';
  const mockEventId = 'test-event-id';

  const mockEvent: CalendarEvent = {
    id: mockEventId,
    userId: mockUserId,
    title: 'Test Event',
    description: 'Test event description',
    startDate: new Date('2024-12-31T10:00:00Z'),
    endDate: new Date('2024-12-31T11:00:00Z'),
    allDay: false,
    type: 'custom',
    status: 'pending',
    notifications: [],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  };

  const mockCreateEventData: CreateCalendarEventData = {
    userId: mockUserId,
    title: 'New Event',
    description: 'New event description',
    startDate: new Date('2024-12-31T10:00:00Z'),
    endDate: new Date('2024-12-31T11:00:00Z'),
    allDay: false,
    type: 'custom',
    status: 'pending',
    notifications: []
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(addDoc).mockResolvedValue({ id: mockEventId } as any);
    vi.mocked(getDoc).mockResolvedValue({
      exists: () => false,
      data: () => undefined,
      id: 'mock-id'
    } as any);
    vi.mocked(getDocs).mockResolvedValue({
      empty: true,
      size: 0,
      docs: [],
      forEach: () => {}
    } as any);
    vi.mocked(updateDoc).mockResolvedValue(undefined);
    vi.mocked(deleteDoc).mockResolvedValue(undefined);
    vi.mocked(Timestamp.fromDate).mockImplementation((date: Date) => ({ toDate: () => date }) as any);

    // Mock query related functions if they are used directly in the service
    vi.mocked(query).mockImplementation((_col, ...constraints) => ({
      _collection: _col,
      _constraints: constraints,
      where: vi.fn(),
      orderBy: vi.fn(),
      limit: vi.fn(),
      startAfter: vi.fn(),
      endBefore: vi.fn(),
    }) as any);
    vi.mocked(where).mockImplementation((field, op, value) => ({ type: 'where', field, op, value }) as any);
    vi.mocked(orderBy).mockImplementation((field, direction) => ({ type: 'orderBy', field, direction }) as any);
    vi.mocked(limit).mockImplementation((l) => ({ type: 'limit', limit: l }) as any);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('CRUD Operations', () => {
    describe('createEvent', () => {
      it('should create an event successfully', async () => {
        const mockDocRef = { id: mockEventId };
        (addDoc as any).mockResolvedValue(mockDocRef);

        const result = await createEvent(mockUserId, mockCreateEventData);

        expect(result.id).toBe(mockEventId);
        expect(result.title).toBe(mockCreateEventData.title);
        expect(result.userId).toBe(mockUserId);
        expect(addDoc).toHaveBeenCalledTimes(1);
      });

      it('should create an event without optional fields', async () => {
        const mockDocRef = { id: mockEventId };
        (addDoc as any).mockResolvedValue(mockDocRef);

        const minimalEventData: CreateCalendarEventData = {
          userId: mockUserId,
          title: 'Minimal Event',
          startDate: new Date('2024-12-31T10:00:00Z'),
          endDate: new Date('2024-12-31T11:00:00Z'),
          allDay: false,
          type: 'custom',
          status: 'pending',
          notifications: []
        };

        const result = await createEvent(mockUserId, minimalEventData);

        expect(result.id).toBe(mockEventId);
        expect(result.title).toBe(minimalEventData.title);
        expect(addDoc).toHaveBeenCalledTimes(1);
      });

      it('should throw error when user is not authenticated', async () => {
        await expect(createEvent(undefined, mockCreateEventData)).rejects.toThrow(
          'Cannot create calendar event: User not authenticated.'
        );
      });

      it('should throw error when title is empty', async () => {
        const invalidEventData = { ...mockCreateEventData, title: '' };

        await expect(createEvent(mockUserId, invalidEventData)).rejects.toThrow(
          'Event title is required'
        );
      });

      it('should throw error when start date is missing', async () => {
        const invalidEventData = { ...mockCreateEventData, startDate: undefined as any };

        await expect(createEvent(mockUserId, invalidEventData)).rejects.toThrow(
          'Event start and end dates are required'
        );
      });

      it('should throw error when end date is missing', async () => {
        const invalidEventData = { ...mockCreateEventData, endDate: undefined as any };

        await expect(createEvent(mockUserId, invalidEventData)).rejects.toThrow(
          'Event start and end dates are required'
        );
      });

      it('should throw error when start date is after end date', async () => {
        const invalidEventData = {
          ...mockCreateEventData,
          startDate: new Date('2024-12-31T11:00:00Z'),
          endDate: new Date('2024-12-31T10:00:00Z')
        };

        await expect(createEvent(mockUserId, invalidEventData)).rejects.toThrow(
          'Event start date must be before end date'
        );
      });

      it('should throw error when creation fails', async () => {
        (addDoc as any).mockRejectedValue(new Error('Firestore error'));

        await expect(createEvent(mockUserId, mockCreateEventData)).rejects.toThrow(
          'Failed to create calendar event'
        );
      });
    });

    describe('getEvent', () => {
      it('should get an event successfully', async () => {
        const mockDocSnap = {
          exists: () => true,
          id: mockEventId,
          data: () => ({
            ...mockEvent,
            createdAt: { toDate: () => mockEvent.createdAt },
            updatedAt: { toDate: () => mockEvent.updatedAt },
            startDate: { toDate: () => mockEvent.startDate },
            endDate: { toDate: () => mockEvent.endDate }
          })
        };
        (getDoc as any).mockResolvedValue(mockDocSnap);

        const result = await getEvent(mockUserId, mockEventId);

        expect(result).toEqual(mockEvent);
        expect(getDoc).toHaveBeenCalled();
      });

      it('should return null when event does not exist', async () => {
        const mockDocSnap = {
          exists: () => false
        };
        (getDoc as any).mockResolvedValue(mockDocSnap);

        const result = await getEvent(mockUserId, mockEventId);

        expect(result).toBeNull();
      });

      it('should throw error when user is not authenticated', async () => {
        await expect(getEvent(undefined, mockEventId)).rejects.toThrow(
          'Cannot get calendar event: User not authenticated.'
        );
      });

      it('should throw error when get fails', async () => {
        (getDoc as any).mockRejectedValue(new Error('Firestore error'));

        await expect(getEvent(mockUserId, mockEventId)).rejects.toThrow(
          'Failed to get calendar event'
        );
      });
    });

    describe('updateEvent', () => {
      it('should update an event successfully', async () => {
        // Mock getEvent to return existing event first, then updated event
        const mockDocSnapOriginal = {
          exists: () => true,
          id: mockEventId,
          data: () => ({
            ...mockEvent,
            createdAt: { toDate: () => mockEvent.createdAt },
            updatedAt: { toDate: () => mockEvent.updatedAt },
            startDate: { toDate: () => mockEvent.startDate },
            endDate: { toDate: () => mockEvent.endDate }
          })
        };
        
        const mockDocSnapUpdated = {
          exists: () => true,
          id: mockEventId,
          data: () => ({
            ...mockEvent,
            title: 'Updated Event',
            createdAt: { toDate: () => mockEvent.createdAt },
            updatedAt: { toDate: () => new Date() },
            startDate: { toDate: () => mockEvent.startDate },
            endDate: { toDate: () => mockEvent.endDate }
          })
        };
        
        (getDoc as any)
          .mockResolvedValueOnce(mockDocSnapOriginal) // First call for existence check
          .mockResolvedValueOnce(mockDocSnapUpdated); // Second call for returning updated event
        (updateDoc as any).mockResolvedValue(undefined);

        const updates = { title: 'Updated Event' };
        const result = await updateEvent(mockUserId, mockEventId, updates);

        expect(result.title).toBe('Updated Event');
        expect(updateDoc).toHaveBeenCalledTimes(1);
      });

      it('should handle date updates', async () => {
        const mockDocSnap = {
          exists: () => true,
          id: mockEventId,
          data: () => ({
            ...mockEvent,
            createdAt: { toDate: () => mockEvent.createdAt },
            updatedAt: { toDate: () => mockEvent.updatedAt },
            startDate: { toDate: () => mockEvent.startDate },
            endDate: { toDate: () => mockEvent.endDate }
          })
        };
        (getDoc as any).mockResolvedValue(mockDocSnap);
        (updateDoc as any).mockResolvedValue(undefined);

        const updates = {
          startDate: new Date('2024-12-31T12:00:00Z'),
          endDate: new Date('2024-12-31T13:00:00Z')
        };
        
        await updateEvent(mockUserId, mockEventId, updates);

        expect(updateDoc).toHaveBeenCalledTimes(1);
      });

      it('should throw error when user is not authenticated', async () => {
        await expect(updateEvent(undefined, mockEventId, {})).rejects.toThrow(
          'Cannot update calendar event: User not authenticated.'
        );
      });

      it('should throw error when start date is after end date', async () => {
        const updates = {
          startDate: new Date('2024-12-31T13:00:00Z'),
          endDate: new Date('2024-12-31T12:00:00Z')
        };

        await expect(updateEvent(mockUserId, mockEventId, updates)).rejects.toThrow(
          'Event start date must be before end date'
        );
      });

      it('should throw error when event not found', async () => {
        const mockDocSnap = {
          exists: () => false
        };
        (getDoc as any).mockResolvedValue(mockDocSnap);

        await expect(updateEvent(mockUserId, mockEventId, {})).rejects.toThrow(
          'Calendar event not found'
        );
      });

      it('should throw error when update fails', async () => {
        const mockDocSnap = {
          exists: () => true,
          id: mockEventId,
          data: () => ({
            ...mockEvent,
            createdAt: { toDate: () => mockEvent.createdAt },
            updatedAt: { toDate: () => mockEvent.updatedAt },
            startDate: { toDate: () => mockEvent.startDate },
            endDate: { toDate: () => mockEvent.endDate }
          })
        };
        (getDoc as any).mockResolvedValueOnce(mockDocSnap); // First call for existence check
        (updateDoc as any).mockRejectedValue(new Error('Firestore error'));

        await expect(updateEvent(mockUserId, mockEventId, { title: 'Updated' })).rejects.toThrow(
          'Failed to update calendar event'
        );
      });
    });

    describe('deleteEvent', () => {
      it('should delete an event successfully', async () => {
        const mockDocSnap = {
          exists: () => true,
          id: mockEventId,
          data: () => ({
            ...mockEvent,
            createdAt: { toDate: () => mockEvent.createdAt },
            updatedAt: { toDate: () => mockEvent.updatedAt },
            startDate: { toDate: () => mockEvent.startDate },
            endDate: { toDate: () => mockEvent.endDate }
          })
        };
        (getDoc as any).mockResolvedValue(mockDocSnap);
        (deleteDoc as any).mockResolvedValue(undefined);

        await deleteEvent(mockUserId, mockEventId);

        expect(deleteDoc).toHaveBeenCalled();
      });

      it('should throw error when user is not authenticated', async () => {
        await expect(deleteEvent(undefined, mockEventId)).rejects.toThrow(
          'Cannot delete calendar event: User not authenticated.'
        );
      });

      it('should throw error when event not found', async () => {
        const mockDocSnap = {
          exists: () => false
        };
        (getDoc as any).mockResolvedValue(mockDocSnap);

        await expect(deleteEvent(mockUserId, mockEventId)).rejects.toThrow(
          'Calendar event not found'
        );
      });

      it('should throw error when delete fails', async () => {
        const mockDocSnap = {
          exists: () => true,
          id: mockEventId,
          data: () => ({
            ...mockEvent,
            createdAt: { toDate: () => mockEvent.createdAt },
            updatedAt: { toDate: () => mockEvent.updatedAt },
            startDate: { toDate: () => mockEvent.startDate },
            endDate: { toDate: () => mockEvent.endDate }
          })
        };
        (getDoc as any).mockResolvedValue(mockDocSnap);
        (deleteDoc as any).mockRejectedValue(new Error('Firestore error'));

        await expect(deleteEvent(mockUserId, mockEventId)).rejects.toThrow(
          'Failed to delete calendar event'
        );
      });
    });
  });

  describe('Validation Utilities', () => {
    describe('validateEventData', () => {
      it('should return no errors for valid event data', () => {
        const errors = validateEventData(mockCreateEventData);
        expect(errors).toHaveLength(0);
      });

      it('should return error for missing title', () => {
        const invalidData = { ...mockCreateEventData, title: '' };
        const errors = validateEventData(invalidData);
        expect(errors).toContain('Event title is required');
      });

      it('should return error for missing start date', () => {
        const invalidData = { ...mockCreateEventData, startDate: undefined as any };
        const errors = validateEventData(invalidData);
        expect(errors).toContain('Event start date is required');
      });

      it('should return error for missing end date', () => {
        const invalidData = { ...mockCreateEventData, endDate: undefined as any };
        const errors = validateEventData(invalidData);
        expect(errors).toContain('Event end date is required');
      });

      it('should return error for invalid date order', () => {
        const invalidData = {
          ...mockCreateEventData,
          startDate: new Date('2024-12-31T11:00:00Z'),
          endDate: new Date('2024-12-31T10:00:00Z')
        };
        const errors = validateEventData(invalidData);
        expect(errors).toContain('Event start date must be before end date');
      });

      it('should return error for invalid event type', () => {
        const invalidData = { ...mockCreateEventData, type: 'invalid' as any };
        const errors = validateEventData(invalidData);
        expect(errors).toContain('Invalid event type');
      });

      it('should return error for invalid event status', () => {
        const invalidData = { ...mockCreateEventData, status: 'invalid' as any };
        const errors = validateEventData(invalidData);
        expect(errors).toContain('Invalid event status');
      });

      it('should validate notification settings', () => {
        const invalidData = {
          ...mockCreateEventData,
          notifications: [
            { id: '1', type: 'invalid' as any, timing: 15, enabled: true },
            { id: '2', type: 'browser', timing: -5, enabled: true }
          ]
        };
        const errors = validateEventData(invalidData);
        expect(errors).toContain('Invalid notification type at index 0');
        expect(errors).toContain('Invalid notification timing at index 1');
      });

      it('should return multiple errors for multiple issues', () => {
        const invalidData = {
          ...mockCreateEventData,
          title: '',
          startDate: undefined as any,
          type: 'invalid' as any
        };
        const errors = validateEventData(invalidData);
        expect(errors.length).toBeGreaterThan(1);
      });
    });

    describe('sanitizeEventData', () => {
      it('should trim title and description', () => {
        const dirtyData = {
          ...mockCreateEventData,
          title: '  Test Event  ',
          description: '  Test description  '
        };
        const sanitized = sanitizeEventData(dirtyData);
        expect(sanitized.title).toBe('Test Event');
        expect(sanitized.description).toBe('Test description');
      });

      it('should handle undefined description', () => {
        const dataWithoutDescription = {
          ...mockCreateEventData,
          description: undefined
        };
        const sanitized = sanitizeEventData(dataWithoutDescription);
        expect(sanitized.description).toBeUndefined();
      });

      it('should handle empty description', () => {
        const dataWithEmptyDescription = {
          ...mockCreateEventData,
          description: ''
        };
        const sanitized = sanitizeEventData(dataWithEmptyDescription);
        expect(sanitized.description).toBeUndefined();
      });

      it('should ensure notifications array exists', () => {
        const dataWithoutNotifications = {
          ...mockCreateEventData,
          notifications: undefined as any
        };
        const sanitized = sanitizeEventData(dataWithoutNotifications);
        expect(sanitized.notifications).toEqual([]);
      });
    });
  });

  describe('Query Operations', () => {
    describe('getEventsForDateRange', () => {
      it('should get events for a date range successfully', async () => {
        const mockQuerySnapshot = {
          forEach: vi.fn((callback) => {
            callback({
              id: mockEventId,
              data: () => ({
                ...mockEvent,
                createdAt: { toDate: () => mockEvent.createdAt },
                updatedAt: { toDate: () => mockEvent.updatedAt },
                startDate: { toDate: () => mockEvent.startDate },
                endDate: { toDate: () => mockEvent.endDate }
              })
            });
          })
        };
        (getDocs as any).mockResolvedValue(mockQuerySnapshot);

        const startDate = new Date('2024-12-01');
        const endDate = new Date('2024-12-31');
        const result = await getEventsForDateRange(mockUserId, startDate, endDate);

        expect(result).toHaveLength(1);
        expect(result[0]).toEqual(mockEvent);
      });

      it('should throw error when user is not authenticated', async () => {
        const startDate = new Date('2024-12-01');
        const endDate = new Date('2024-12-31');

        await expect(getEventsForDateRange(undefined, startDate, endDate)).rejects.toThrow(
          'Cannot get calendar events: User not authenticated.'
        );
      });

      it('should throw error when start date is after end date', async () => {
        const startDate = new Date('2024-12-31');
        const endDate = new Date('2024-12-01');

        await expect(getEventsForDateRange(mockUserId, startDate, endDate)).rejects.toThrow(
          'Start date must be before end date'
        );
      });

      it('should throw error when query fails', async () => {
        (getDocs as any).mockRejectedValue(new Error('Firestore error'));

        const startDate = new Date('2024-12-01');
        const endDate = new Date('2024-12-31');

        await expect(getEventsForDateRange(mockUserId, startDate, endDate)).rejects.toThrow(
          'Failed to get events for date range'
        );
      });
    });

    describe('getEventsForDate', () => {
      it('should get events for a specific date successfully', async () => {
        const mockQuerySnapshot = {
          forEach: vi.fn((callback) => {
            callback({
              id: mockEventId,
              data: () => ({
                ...mockEvent,
                createdAt: { toDate: () => mockEvent.createdAt },
                updatedAt: { toDate: () => mockEvent.updatedAt },
                startDate: { toDate: () => mockEvent.startDate },
                endDate: { toDate: () => mockEvent.endDate }
              })
            });
          })
        };
        (getDocs as any).mockResolvedValue(mockQuerySnapshot);

        const date = new Date('2024-12-31');
        const result = await getEventsForDate(mockUserId, date);

        expect(result).toHaveLength(1);
        expect(result[0]).toEqual(mockEvent);
      });

      it('should throw error when user is not authenticated', async () => {
        const date = new Date('2024-12-31');

        await expect(getEventsForDate(undefined, date)).rejects.toThrow(
          'Cannot get calendar events: User not authenticated.'
        );
      });

      it('should throw error when query fails', async () => {
        (getDocs as any).mockRejectedValue(new Error('Firestore error'));

        const date = new Date('2024-12-31');

        await expect(getEventsForDate(mockUserId, date)).rejects.toThrow(
          'Failed to get events for date'
        );
      });
    });

    describe('getUpcomingEvents', () => {
      it('should get upcoming events successfully', async () => {
        const mockQuerySnapshot = {
          forEach: vi.fn((callback) => {
            callback({
              id: mockEventId,
              data: () => ({
                ...mockEvent,
                createdAt: { toDate: () => mockEvent.createdAt },
                updatedAt: { toDate: () => mockEvent.updatedAt },
                startDate: { toDate: () => mockEvent.startDate },
                endDate: { toDate: () => mockEvent.endDate }
              })
            });
          })
        };
        (getDocs as any).mockResolvedValue(mockQuerySnapshot);

        const result = await getUpcomingEvents(mockUserId, 5);

        expect(result).toHaveLength(1);
        expect(result[0]).toEqual(mockEvent);
      });

      it('should use default limit when not specified', async () => {
        const mockQuerySnapshot = {
          forEach: vi.fn((callback) => {
            callback({
              id: mockEventId,
              data: () => ({
                ...mockEvent,
                createdAt: { toDate: () => mockEvent.createdAt },
                updatedAt: { toDate: () => mockEvent.updatedAt },
                startDate: { toDate: () => mockEvent.startDate },
                endDate: { toDate: () => mockEvent.endDate }
              })
            });
          })
        };
        (getDocs as any).mockResolvedValue(mockQuerySnapshot);

        const result = await getUpcomingEvents(mockUserId);

        expect(result).toHaveLength(1);
        expect(result[0]).toEqual(mockEvent);
      });

      it('should throw error when user is not authenticated', async () => {
        await expect(getUpcomingEvents(undefined)).rejects.toThrow(
          'Cannot get calendar events: User not authenticated.'
        );
      });

      it('should throw error when limit is invalid', async () => {
        await expect(getUpcomingEvents(mockUserId, 0)).rejects.toThrow(
          'Limit must be greater than 0'
        );

        await expect(getUpcomingEvents(mockUserId, -1)).rejects.toThrow(
          'Limit must be greater than 0'
        );
      });

      it('should throw error when query fails', async () => {
        (getDocs as any).mockRejectedValue(new Error('Firestore error'));

        await expect(getUpcomingEvents(mockUserId)).rejects.toThrow(
          'Failed to get upcoming events'
        );
      });
    });

    describe('getOverdueEvents', () => {
      it('should get overdue events successfully', async () => {
        const mockQuerySnapshot = {
          forEach: vi.fn((callback) => {
            callback({
              id: mockEventId,
              data: () => ({
                ...mockEvent,
                createdAt: { toDate: () => mockEvent.createdAt },
                updatedAt: { toDate: () => mockEvent.updatedAt },
                startDate: { toDate: () => mockEvent.startDate },
                endDate: { toDate: () => mockEvent.endDate }
              })
            });
          })
        };
        (getDocs as any).mockResolvedValue(mockQuerySnapshot);

        const result = await getOverdueEvents(mockUserId);

        expect(result).toHaveLength(1);
        expect(result[0]).toEqual(mockEvent);
      });

      it('should throw error when user is not authenticated', async () => {
        await expect(getOverdueEvents(undefined)).rejects.toThrow(
          'Cannot get calendar events: User not authenticated.'
        );
      });

      it('should throw error when query fails', async () => {
        (getDocs as any).mockRejectedValue(new Error('Firestore error'));

        await expect(getOverdueEvents(mockUserId)).rejects.toThrow(
          'Failed to get overdue events'
        );
      });
    });
  });

  describe('Utility Functions', () => {
    const mockEvents: CalendarEvent[] = [
      { ...mockEvent, id: '1', title: 'Task Event', type: 'task', status: 'pending' },
      { ...mockEvent, id: '2', title: 'Project Event', type: 'project', status: 'completed' },
      { ...mockEvent, id: '3', title: 'Plant Care Event', type: 'plant_care', status: 'pending' },
      { ...mockEvent, id: '4', title: 'Custom Event', type: 'custom', status: 'cancelled' }
    ];

    describe('filterEventsByType', () => {
      it('should filter events by type', () => {
        const result = filterEventsByType(mockEvents, 'task');
        expect(result).toHaveLength(1);
        expect(result[0].type).toBe('task');
      });

      it('should return all events when no type filter', () => {
        const result = filterEventsByType(mockEvents);
        expect(result).toHaveLength(4);
      });
    });

    describe('filterEventsByStatus', () => {
      it('should filter events by status', () => {
        const result = filterEventsByStatus(mockEvents, 'pending');
        expect(result).toHaveLength(2);
        expect(result.every(event => event.status === 'pending')).toBe(true);
      });

      it('should return all events when no status filter', () => {
        const result = filterEventsByStatus(mockEvents);
        expect(result).toHaveLength(4);
      });
    });

    describe('searchEvents', () => {
      it('should search events by title', () => {
        const result = searchEvents(mockEvents, 'Task');
        expect(result).toHaveLength(1);
        expect(result[0].title).toBe('Task Event');
      });

      it('should search events by description', () => {
        const eventsWithDescription = mockEvents.map(event => ({
          ...event,
          description: event.id === '2' ? 'Important project' : 'Regular event'
        }));

        const result = searchEvents(eventsWithDescription, 'important');
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe('2');
      });

      it('should return all events for empty search term', () => {
        const result = searchEvents(mockEvents, '');
        expect(result).toHaveLength(4);
      });

      it('should be case insensitive', () => {
        const result = searchEvents(mockEvents, 'task');
        expect(result).toHaveLength(1);
        expect(result[0].title).toBe('Task Event');
      });
    });

    describe('sortEventsByStartDate', () => {
      it('should sort events by start date ascending', () => {
        const eventsWithDifferentDates = mockEvents.map((event, index) => ({
          ...event,
          startDate: new Date(2024, 11, index + 1, 10, 0, 0) // December 1-4, 2024
        }));

        const result = sortEventsByStartDate(eventsWithDifferentDates, true);
        expect(result[0].startDate.getDate()).toBe(1);
        expect(result[3].startDate.getDate()).toBe(4);
      });

      it('should sort events by start date descending', () => {
        const eventsWithDifferentDates = mockEvents.map((event, index) => ({
          ...event,
          startDate: new Date(2024, 11, index + 1, 10, 0, 0) // December 1-4, 2024
        }));

        const result = sortEventsByStartDate(eventsWithDifferentDates, false);
        expect(result[0].startDate.getDate()).toBe(4);
        expect(result[3].startDate.getDate()).toBe(1);
      });
    });
  });

  describe('Synchronization Operations', () => {
    describe('syncFromTasks', () => {
      it('should throw error when user is not authenticated', async () => {
        const { syncFromTasks } = await import('../calendarService');
        
        await expect(syncFromTasks(undefined)).rejects.toThrow(
          'Cannot sync tasks: User not authenticated.'
        );
      });
    });

    describe('syncFromProjects', () => {
      it('should throw error when user is not authenticated', async () => {
        const { syncFromProjects } = await import('../calendarService');
        
        await expect(syncFromProjects(undefined)).rejects.toThrow(
          'Cannot sync projects: User not authenticated.'
        );
      });
    });

    describe('syncFromPlantCare', () => {
      it('should throw error when user is not authenticated', async () => {
        const { syncFromPlantCare } = await import('../calendarService');
        
        await expect(syncFromPlantCare(undefined)).rejects.toThrow(
          'Cannot sync plant care: User not authenticated.'
        );
      });
    });

    describe('syncAllToCalendar', () => {
      it('should throw error when user is not authenticated', async () => {
        const { syncAllToCalendar } = await import('../calendarService');
        
        await expect(syncAllToCalendar(undefined)).rejects.toThrow(
          'Cannot sync to calendar: User not authenticated.'
        );
      });
    });
  });
});

// ============================================================================
// RECURRING EVENT TESTS
// ============================================================================

  describe.skip('Recurring Event Generation', () => {  const mockUserId = 'test-user-123';
  
  const mockBaseEvent: CalendarEvent = {
    id: 'base-event-1',
    userId: mockUserId,
    title: 'Weekly Team Meeting',
    description: 'Regular team sync',
    startDate: new Date('2024-01-01T10:00:00Z'),
    endDate: new Date('2024-01-01T11:00:00Z'),
    allDay: false,
    type: 'custom',
    status: 'pending',
    recurrence: {
      type: 'weekly',
      interval: 1
    },
    notifications: [],
    createdAt: new Date('2024-01-01T09:00:00Z'),
    updatedAt: new Date('2024-01-01T09:00:00Z')
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateRecurringEvents', () => {
    it('should generate recurring events successfully', async () => {
      // Mock the dynamic import
      vi.doMock('../../utils/recurrenceUtils', () => ({
        validateRecurrencePattern: vi.fn(() => ({ isValid: true, errors: [] })),
        generateOccurrencesInRange: vi.fn(() => [
          new Date('2024-01-01T10:00:00Z'),
          new Date('2024-01-08T10:00:00Z'),
          new Date('2024-01-15T10:00:00Z')
        ]),
        generateSeriesId: vi.fn(() => 'series_123_abc')
      }));

      // Mock createEvent to return created events
      const mockCreateEvent = vi.fn().mockImplementation((userId, eventData) => 
        Promise.resolve({
          id: `event-${Date.now()}`,
          ...eventData,
          createdAt: new Date(),
          updatedAt: new Date()
        })
      );

      // Mock updateEvent
      const mockUpdateEvent = vi.fn().mockResolvedValue(mockBaseEvent);

      // Import after mocking
      const { generateRecurringEvents } = await import('../calendarService');

      // Replace the actual functions with mocks
      vi.doMock('../calendarService', async () => {
        const actual = await vi.importActual('../calendarService');
        return {
          ...actual,
          createEvent: mockCreateEvent,
          updateEvent: mockUpdateEvent
        };
      });

      const endDate = new Date('2024-01-31T23:59:59Z');
      const result = await generateRecurringEvents(mockUserId, mockBaseEvent, endDate);

      expect(result).toHaveLength(2); // Should create 2 additional events (excluding base)
      expect(mockCreateEvent).toHaveBeenCalledTimes(2);
      expect(mockUpdateEvent).toHaveBeenCalledTimes(1); // Update base event with series ID
    });

    it('should throw error for unauthenticated user', async () => {
      const { generateRecurringEvents } = await import('../calendarService');
      
      await expect(
        generateRecurringEvents(undefined, mockBaseEvent, new Date())
      ).rejects.toThrow('Cannot generate recurring events: User not authenticated');
    });

    it('should throw error for event without recurrence pattern', async () => {
      const { generateRecurringEvents } = await import('../calendarService');
      
      const eventWithoutRecurrence = { ...mockBaseEvent, recurrence: undefined };
      
      await expect(
        generateRecurringEvents(mockUserId, eventWithoutRecurrence, new Date())
      ).rejects.toThrow('Base event must have a recurrence pattern');
    });

    it('should throw error for invalid recurrence pattern', async () => {
      // Mock validation to return errors
      vi.doMock('../../utils/recurrenceUtils', () => ({
        validateRecurrencePattern: vi.fn(() => ({
          isValid: false,
          errors: [{ field: 'interval', message: 'Interval must be positive' }]
        }))
      }));

      const { generateRecurringEvents } = await import('../calendarService');
      
      await expect(
        generateRecurringEvents(mockUserId, mockBaseEvent, new Date())
      ).rejects.toThrow('Invalid recurrence pattern: Interval must be positive');
    });
  });

  describe('updateRecurringSeries', () => {
    it('should update all events in a series', async () => {
      const mockSeriesEvents = [
        { ...mockBaseEvent, id: 'event-1' },
        { ...mockBaseEvent, id: 'event-2' },
        { ...mockBaseEvent, id: 'event-3' }
      ];

      // Mock getEventsBySeries
      const mockGetEventsBySeries = vi.fn().mockResolvedValue(mockSeriesEvents);
      
      // Mock updateEvent
      const mockUpdateEvent = vi.fn().mockImplementation((userId, eventId, updates) =>
        Promise.resolve({ ...mockBaseEvent, id: eventId, ...updates })
      );

      // Mock the internal function
      vi.doMock('../calendarService', async () => {
        const actual = await vi.importActual('../calendarService');
        return {
          ...actual,
          updateEvent: mockUpdateEvent
        };
      });

      const { updateRecurringSeries } = await import('../calendarService');

      // Mock the internal getEventsBySeries function
      const originalGetEventsBySeries = (await import('../calendarService')).getEventsBySeries;
      vi.mocked(originalGetEventsBySeries || (() => {})).mockResolvedValue(mockSeriesEvents);

      const updates = { title: 'Updated Meeting Title' };
      const result = await updateRecurringSeries(mockUserId, 'series_123', updates);

      expect(result).toHaveLength(3);
      expect(mockUpdateEvent).toHaveBeenCalledTimes(3);
    });

    it('should only update future events when updateFutureOnly is true', async () => {
      const now = new Date();
      const pastEvent = { 
        ...mockBaseEvent, 
        id: 'past-event', 
        startDate: new Date(now.getTime() - 24 * 60 * 60 * 1000) // Yesterday
      };
      const futureEvent = { 
        ...mockBaseEvent, 
        id: 'future-event', 
        startDate: new Date(now.getTime() + 24 * 60 * 60 * 1000) // Tomorrow
      };

      const mockSeriesEvents = [pastEvent, futureEvent];
      
      // Mock updateEvent
      const mockUpdateEvent = vi.fn().mockImplementation((userId, eventId, updates) =>
        Promise.resolve({ ...mockBaseEvent, id: eventId, ...updates })
      );

      const { updateRecurringSeries } = await import('../calendarService');

      // Mock the internal getEventsBySeries function
      const originalGetEventsBySeries = (await import('../calendarService')).getEventsBySeries;
      vi.mocked(originalGetEventsBySeries || (() => {})).mockResolvedValue(mockSeriesEvents);

      const updates = { title: 'Updated Meeting Title' };
      const result = await updateRecurringSeries(mockUserId, 'series_123', updates, true);

      expect(result).toHaveLength(1); // Only future event should be updated
      expect(mockUpdateEvent).toHaveBeenCalledTimes(1);
      expect(mockUpdateEvent).toHaveBeenCalledWith(mockUserId, 'future-event', updates);
    });
  });

  describe('deleteRecurringSeries', () => {
    it('should delete all events in a series', async () => {
      const mockSeriesEvents = [
        { ...mockBaseEvent, id: 'event-1' },
        { ...mockBaseEvent, id: 'event-2' },
        { ...mockBaseEvent, id: 'event-3' }
      ];

      // Mock deleteEvent
      const mockDeleteEvent = vi.fn().mockResolvedValue(undefined);

      const { deleteRecurringSeries } = await import('../calendarService');

      // Mock the internal getEventsBySeries function
      const originalGetEventsBySeries = (await import('../calendarService')).getEventsBySeries;
      vi.mocked(originalGetEventsBySeries || (() => {})).mockResolvedValue(mockSeriesEvents);

      await deleteRecurringSeries(mockUserId, 'series_123');

      expect(mockDeleteEvent).toHaveBeenCalledTimes(3);
    });

    it('should only delete future events when deleteFutureOnly is true', async () => {
      const now = new Date();
      const pastEvent = { 
        ...mockBaseEvent, 
        id: 'past-event', 
        startDate: new Date(now.getTime() - 24 * 60 * 60 * 1000) // Yesterday
      };
      const futureEvent = { 
        ...mockBaseEvent, 
        id: 'future-event', 
        startDate: new Date(now.getTime() + 24 * 60 * 60 * 1000) // Tomorrow
      };

      const mockSeriesEvents = [pastEvent, futureEvent];
      
      // Mock deleteEvent
      const mockDeleteEvent = vi.fn().mockResolvedValue(undefined);

      const { deleteRecurringSeries } = await import('../calendarService');

      // Mock the internal getEventsBySeries function
      const originalGetEventsBySeries = (await import('../calendarService')).getEventsBySeries;
      vi.mocked(originalGetEventsBySeries || (() => {})).mockResolvedValue(mockSeriesEvents);

      await deleteRecurringSeries(mockUserId, 'series_123', true);

      expect(mockDeleteEvent).toHaveBeenCalledTimes(1);
      expect(mockDeleteEvent).toHaveBeenCalledWith(mockUserId, 'future-event');
    });
  });

  describe('generateRecurringEventsForRange', () => {
    it('should generate events for all recurring base events in range', async () => {
      const mockRecurringEvents = [mockBaseEvent];

      // Mock Firestore query
      const mockQuerySnapshot = {
        forEach: vi.fn((callback) => {
          mockRecurringEvents.forEach((event, index) => {
            callback({
              id: event.id,
              data: () => ({
                ...event,
                createdAt: { toDate: () => event.createdAt },
                updatedAt: { toDate: () => event.updatedAt },
                startDate: { toDate: () => event.startDate },
                endDate: { toDate: () => event.endDate }
              })
            });
          });
        })
      };

      vi.mocked(getDocs).mockResolvedValue(mockQuerySnapshot as any);

      // Mock generateRecurringEvents
      const mockGenerateRecurringEvents = vi.fn().mockResolvedValue([
        { ...mockBaseEvent, id: 'generated-1' },
        { ...mockBaseEvent, id: 'generated-2' }
      ]);

      const { generateRecurringEventsForRange } = await import('../calendarService');

      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');
      
      const result = await generateRecurringEventsForRange(mockUserId, startDate, endDate);

      expect(getDocs).toHaveBeenCalled();
      // Note: In a real test, we'd need to properly mock the generateRecurringEvents call
    });
  });

  describe('cleanupOldRecurringEvents', () => {
    it('should delete old completed recurring events', async () => {
      const oldCompletedEvents = [
        { ...mockBaseEvent, id: 'old-1', status: 'completed' },
        { ...mockBaseEvent, id: 'old-2', status: 'completed' }
      ];

      // Mock Firestore query
      const mockQuerySnapshot = {
        forEach: vi.fn((callback) => {
          oldCompletedEvents.forEach((event) => {
            callback({
              id: event.id,
              data: () => event
            });
          });
        })
      };

      vi.mocked(getDocs).mockResolvedValue(mockQuerySnapshot as any);

      // Mock deleteEvent
      const mockDeleteEvent = vi.fn().mockResolvedValue(undefined);

      const { cleanupOldRecurringEvents } = await import('../calendarService');

      const result = await cleanupOldRecurringEvents(mockUserId);

      expect(result).toBe(2); // Should return count of deleted events
      expect(getDocs).toHaveBeenCalled();
    });
  });
});