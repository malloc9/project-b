import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import type { CalendarEvent } from '../../types';

// Mock Firestore functions
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  onSnapshot: vi.fn(),
  getFirestore: vi.fn(() => ({})),
  Timestamp: {
    fromDate: vi.fn((date) => ({ toDate: () => date }))
  }
}));

// Mock Firebase config
vi.mock('../config/firebase', () => ({
  db: {}
}));

// Mock offline storage
vi.mock('../../utils/offlineStorage', () => ({
  offlineStorage: {
    cacheData: vi.fn(),
    removeCachedData: vi.fn()
  }
}));

// Import after mocking
import { realtimeCalendarService, type CalendarEventChange } from '../realtimeCalendarService';
import { offlineStorage } from '../../utils/offlineStorage';
import { onSnapshot } from 'firebase/firestore';

const mockOfflineStorage = vi.mocked(offlineStorage);
const mockOnSnapshot = vi.mocked(onSnapshot);
const mockUnsubscribe = vi.fn();

describe('RealtimeCalendarService', () => {
  const mockUserId = 'test-user-id';
  const mockEvent: CalendarEvent = {
    id: 'test-event-id',
    userId: mockUserId,
    title: 'Test Event',
    description: 'Test Description',
    startDate: new Date('2024-01-15T10:00:00Z'),
    endDate: new Date('2024-01-15T11:00:00Z'),
    allDay: false,
    type: 'custom',
    status: 'pending',
    notifications: [],
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z')
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUnsubscribe.mockClear();
    // Ensure clean state
    realtimeCalendarService.unsubscribeAll();
    mockOnSnapshot.mockImplementation((query, onNext, onError) => {
      // Return a new mock unsubscribe function for each call
      return vi.fn();
    });
  });

  afterEach(() => {
    realtimeCalendarService.unsubscribeAll();
    vi.restoreAllMocks();
  });

  describe('subscribeToUserEvents', () => {
    it('should create a subscription and return subscription ID', () => {
      const subscriptionId = realtimeCalendarService.subscribeToUserEvents(mockUserId);

      expect(subscriptionId).toMatch(/^user_test-user-id_\d+$/);
      expect(mockOnSnapshot).toHaveBeenCalled();
      expect(realtimeCalendarService.hasActiveSubscriptions()).toBe(true);
    });

    it('should throw error when user is not authenticated', () => {
      expect(() => {
        realtimeCalendarService.subscribeToUserEvents('');
      }).toThrow('Cannot subscribe to calendar events: User not authenticated.');
    });

    it('should handle event changes correctly', () => {
      const onEventChange = vi.fn();
      const subscriptionId = realtimeCalendarService.subscribeToUserEvents(mockUserId, {
        onEventChange
      });

      // Get the onNext callback that was passed to onSnapshot
      const onNext = mockOnSnapshot.mock.calls[0][1];

      // Mock snapshot with document changes
      const mockSnapshot = {
        docChanges: () => [
          {
            type: 'added',
            doc: {
              id: mockEvent.id,
              data: () => ({
                ...mockEvent,
                createdAt: { toDate: () => mockEvent.createdAt },
                updatedAt: { toDate: () => mockEvent.updatedAt },
                startDate: { toDate: () => mockEvent.startDate },
                endDate: { toDate: () => mockEvent.endDate }
              })
            }
          }
        ]
      };

      // Trigger the callback
      onNext(mockSnapshot);

      expect(onEventChange).toHaveBeenCalledWith([
        {
          type: 'added',
          event: mockEvent
        }
      ]);
      expect(mockOfflineStorage.cacheData).toHaveBeenCalledWith('calendarEvents', mockEvent.id, mockEvent);
    });

    it('should handle modified events correctly', () => {
      const onEventChange = vi.fn();
      
      // First, add an event to the cache
      realtimeCalendarService.subscribeToUserEvents(mockUserId, { onEventChange });
      const onNext = mockOnSnapshot.mock.calls[0][1];

      // Add initial event
      const addSnapshot = {
        docChanges: () => [
          {
            type: 'added',
            doc: {
              id: mockEvent.id,
              data: () => ({
                ...mockEvent,
                createdAt: { toDate: () => mockEvent.createdAt },
                updatedAt: { toDate: () => mockEvent.updatedAt },
                startDate: { toDate: () => mockEvent.startDate },
                endDate: { toDate: () => mockEvent.endDate }
              })
            }
          }
        ]
      };
      onNext(addSnapshot);

      // Clear the mock to focus on the modification
      onEventChange.mockClear();

      // Now modify the event
      const modifiedEvent = { ...mockEvent, title: 'Modified Event', updatedAt: new Date() };
      const modifySnapshot = {
        docChanges: () => [
          {
            type: 'modified',
            doc: {
              id: mockEvent.id,
              data: () => ({
                ...modifiedEvent,
                createdAt: { toDate: () => modifiedEvent.createdAt },
                updatedAt: { toDate: () => modifiedEvent.updatedAt },
                startDate: { toDate: () => modifiedEvent.startDate },
                endDate: { toDate: () => modifiedEvent.endDate }
              })
            }
          }
        ]
      };

      onNext(modifySnapshot);

      expect(onEventChange).toHaveBeenCalledWith([
        {
          type: 'modified',
          event: modifiedEvent,
          oldEvent: mockEvent
        }
      ]);
    });

    it('should handle removed events correctly', () => {
      const onEventChange = vi.fn();
      
      // First, add an event to the cache
      realtimeCalendarService.subscribeToUserEvents(mockUserId, { onEventChange });
      const onNext = mockOnSnapshot.mock.calls[0][1];

      // Add initial event
      const addSnapshot = {
        docChanges: () => [
          {
            type: 'added',
            doc: {
              id: mockEvent.id,
              data: () => ({
                ...mockEvent,
                createdAt: { toDate: () => mockEvent.createdAt },
                updatedAt: { toDate: () => mockEvent.updatedAt },
                startDate: { toDate: () => mockEvent.startDate },
                endDate: { toDate: () => mockEvent.endDate }
              })
            }
          }
        ]
      };
      onNext(addSnapshot);

      // Clear the mock to focus on the removal
      onEventChange.mockClear();

      // Now remove the event
      const removeSnapshot = {
        docChanges: () => [
          {
            type: 'removed',
            doc: {
              id: mockEvent.id,
              data: () => ({
                ...mockEvent,
                createdAt: { toDate: () => mockEvent.createdAt },
                updatedAt: { toDate: () => mockEvent.updatedAt },
                startDate: { toDate: () => mockEvent.startDate },
                endDate: { toDate: () => mockEvent.endDate }
              })
            }
          }
        ]
      };

      onNext(removeSnapshot);

      expect(onEventChange).toHaveBeenCalledWith([
        {
          type: 'removed',
          event: mockEvent
        }
      ]);
      expect(mockOfflineStorage.removeCachedData).toHaveBeenCalledWith('calendarEvents', mockEvent.id);
    });
  });

  describe('subscribeToDateRange', () => {
    it('should create subscription with date range filter', () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      const subscriptionId = realtimeCalendarService.subscribeToDateRange(
        mockUserId,
        startDate,
        endDate
      );

      expect(subscriptionId).toMatch(/^user_test-user-id_\d+$/);
      expect(mockOnSnapshot).toHaveBeenCalled();
    });
  });

  describe('subscribeToCurrentMonth', () => {
    it('should create subscription for current month', () => {
      const subscriptionId = realtimeCalendarService.subscribeToCurrentMonth(mockUserId);

      expect(subscriptionId).toMatch(/^user_test-user-id_\d+$/);
      expect(mockOnSnapshot).toHaveBeenCalled();
    });
  });

  describe('subscribeToUpcomingEvents', () => {
    it('should create subscription for upcoming events', () => {
      const subscriptionId = realtimeCalendarService.subscribeToUpcomingEvents(mockUserId);

      expect(subscriptionId).toMatch(/^user_test-user-id_\d+$/);
      expect(mockOnSnapshot).toHaveBeenCalled();
    });
  });

  describe('unsubscribe', () => {
    it('should unsubscribe from specific subscription', () => {
      const mockUnsubscribeFunc = vi.fn();
      mockOnSnapshot.mockReturnValue(mockUnsubscribeFunc);
      
      const subscriptionId = realtimeCalendarService.subscribeToUserEvents(mockUserId);
      
      expect(realtimeCalendarService.hasActiveSubscriptions()).toBe(true);

      realtimeCalendarService.unsubscribe(subscriptionId);

      expect(mockUnsubscribeFunc).toHaveBeenCalled();
      expect(realtimeCalendarService.hasActiveSubscriptions()).toBe(false);
    });

    it('should handle unsubscribing from non-existent subscription', () => {
      const mockUnsubscribeFunc = vi.fn();
      mockOnSnapshot.mockReturnValue(mockUnsubscribeFunc);
      
      realtimeCalendarService.unsubscribe('non-existent-id');
      
      expect(mockUnsubscribeFunc).not.toHaveBeenCalled();
    });
  });

  describe('unsubscribeAll', () => {
    it('should unsubscribe from all active subscriptions', () => {
      const subscriptionId1 = realtimeCalendarService.subscribeToUserEvents(mockUserId);
      const subscriptionId2 = realtimeCalendarService.subscribeToCurrentMonth(mockUserId);

      expect(realtimeCalendarService.hasActiveSubscriptions()).toBe(true);

      realtimeCalendarService.unsubscribeAll();

      expect(realtimeCalendarService.hasActiveSubscriptions()).toBe(false);
      expect(realtimeCalendarService.getCachedEvents()).toHaveLength(0);
    });
  });

  describe('conflict resolution', () => {
    it('should resolve conflicts using last-write-wins strategy', () => {
      const localEvent = { ...mockEvent, title: 'Local Title', updatedAt: new Date('2024-01-01T10:00:00Z') };
      const remoteEvent = { ...mockEvent, title: 'Remote Title', updatedAt: new Date('2024-01-01T11:00:00Z') };

      const onConflictResolved = vi.fn();
      const resolvedEvent = realtimeCalendarService.resolveConflict(
        localEvent,
        remoteEvent,
        onConflictResolved
      );

      expect(resolvedEvent).toEqual(remoteEvent); // Remote is newer
      expect(onConflictResolved).toHaveBeenCalledWith(remoteEvent, true);
      expect(mockOfflineStorage.cacheData).toHaveBeenCalledWith('calendarEvents', remoteEvent.id, remoteEvent);
    });

    it('should prefer local event when it is newer', () => {
      const localEvent = { ...mockEvent, title: 'Local Title', updatedAt: new Date('2024-01-01T11:00:00Z') };
      const remoteEvent = { ...mockEvent, title: 'Remote Title', updatedAt: new Date('2024-01-01T10:00:00Z') };

      const resolvedEvent = realtimeCalendarService.resolveConflict(localEvent, remoteEvent);

      expect(resolvedEvent).toEqual(localEvent); // Local is newer
    });

    it('should prefer remote event when timestamps are equal', () => {
      const timestamp = new Date('2024-01-01T10:00:00Z');
      const localEvent = { ...mockEvent, title: 'Local Title', updatedAt: timestamp };
      const remoteEvent = { ...mockEvent, title: 'Remote Title', updatedAt: timestamp };

      const resolvedEvent = realtimeCalendarService.resolveConflict(localEvent, remoteEvent);

      expect(resolvedEvent).toEqual(remoteEvent); // Prefer remote when equal
    });
  });

  describe('batch conflict resolution', () => {
    it('should resolve multiple conflicts in batch', () => {
      const updates = [
        {
          eventId: 'event1',
          localEvent: { ...mockEvent, id: 'event1', title: 'Local 1', updatedAt: new Date('2024-01-01T10:00:00Z') },
          remoteEvent: { ...mockEvent, id: 'event1', title: 'Remote 1', updatedAt: new Date('2024-01-01T11:00:00Z') }
        },
        {
          eventId: 'event2',
          localEvent: { ...mockEvent, id: 'event2', title: 'Local 2', updatedAt: new Date('2024-01-01T12:00:00Z') },
          remoteEvent: { ...mockEvent, id: 'event2', title: 'Remote 2', updatedAt: new Date('2024-01-01T11:00:00Z') }
        }
      ];

      const onConflictResolved = vi.fn();
      const resolvedEvents = realtimeCalendarService.batchUpdateWithConflictResolution(
        updates,
        onConflictResolved
      );

      expect(resolvedEvents).toHaveLength(2);
      expect(resolvedEvents[0].title).toBe('Remote 1'); // Remote was newer
      expect(resolvedEvents[1].title).toBe('Local 2'); // Local was newer
      expect(onConflictResolved).toHaveBeenCalledWith([
        { eventId: 'event1', resolvedEvent: expect.objectContaining({ title: 'Remote 1' }), wasConflict: true },
        { eventId: 'event2', resolvedEvent: expect.objectContaining({ title: 'Local 2' }), wasConflict: true }
      ]);
    });
  });

  describe('getSubscriptionStats', () => {
    it('should return correct subscription statistics', () => {
      const subscriptionId1 = realtimeCalendarService.subscribeToUserEvents(mockUserId);

      const stats = realtimeCalendarService.getSubscriptionStats();

      expect(stats.activeSubscriptions).toBe(1);
      expect(stats.cachedEvents).toBe(0); // No events cached yet
      expect(stats.subscriptionIds).toContain(subscriptionId1);
    });
  });
});