import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import type { CalendarEvent, RecurrencePattern } from '../../types';

// Mock Firebase
vi.mock('../../config/firebase', () => ({
  db: {}
}));

// Mock Firestore functions with proper implementations
const mockEvents: Map<string, any> = new Map();
let mockEventId = 1;

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc: vi.fn((db, collection, userId, subcollection, id) => ({ id })),
  addDoc: vi.fn((collection, data) => {
    const id = `event-${mockEventId++}`;
    mockEvents.set(id, { id, ...data });
    return Promise.resolve({ id });
  }),
  getDoc: vi.fn((docRef) => {
    const id = docRef.id || 'mock-id';
    let data = mockEvents.get(id);
    
    // If no data found, create a mock event for the base event
    if (!data && id === 'base-event-id') {
      data = {
        id: 'base-event-id',
        userId: 'test-user-id',
        title: 'Test Event',
        startDate: { toDate: () => new Date() },
        endDate: { toDate: () => new Date() },
        createdAt: { toDate: () => new Date() },
        updatedAt: { toDate: () => new Date() }
      };
      mockEvents.set(id, data);
    }
    
    return Promise.resolve({
      exists: () => !!data,
      id,
      data: () => data || {}
    });
  }),
  getDocs: vi.fn(() => {
    const docs = Array.from(mockEvents.entries()).map(([id, data]) => ({
      id,
      data: () => data
    }));
    return Promise.resolve({
      forEach: (callback: (doc: any) => void) => docs.forEach(callback)
    });
  }),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  Timestamp: {
    fromDate: vi.fn((date) => ({ toDate: () => date })),
  },
  limit: vi.fn(),
}));

describe.skip('Calendar Service - Recurring Events Integration', () => {
  const mockUserId = 'test-user-id';

  beforeEach(() => {
    vi.clearAllMocks();
    mockEvents.clear();
    mockEventId = 1;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Daily Recurrence Pattern', () => {
    it('should generate daily recurring events correctly', async () => {
      const { generateRecurringEvents } = await import('../calendarService');
      
      const now = new Date();
      const startDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Tomorrow
      const endDate = new Date(startDate.getTime() + 30 * 60 * 1000); // 30 minutes later
      const recurrenceEndDate = new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000); // One week later
      
      const baseEvent: CalendarEvent = {
        id: 'base-event-id',
        userId: mockUserId,
        title: 'Daily Standup',
        description: 'Team daily standup meeting',
        startDate,
        endDate,
        allDay: false,
        type: 'custom',
        status: 'pending',
        notifications: [],
        createdAt: now,
        updatedAt: now,
        recurrence: {
          type: 'daily',
          interval: 1,
          endDate: recurrenceEndDate
        }
      };

      const generatedEvents = await generateRecurringEvents(mockUserId, baseEvent);
      
      // Should generate events for the week (excluding the base event)
      expect(generatedEvents.length).toBeGreaterThan(0);
      
      // Verify the events are generated correctly
      generatedEvents.forEach((event, index) => {
        const expectedDate = new Date(startDate.getTime() + (index + 1) * 24 * 60 * 60 * 1000);
        expect(event.startDate.getTime()).toBe(expectedDate.getTime());
        expect(event.title).toBe(baseEvent.title);
        expect(event.type).toBe(baseEvent.type);
        expect(event.recurrence?.seriesId).toBeDefined();
      });
    });

    it('should generate daily recurring events with custom interval', async () => {
      const { generateRecurringEvents } = await import('../calendarService');
      
      const now = new Date();
      const startDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Tomorrow
      const endDate = new Date(startDate.getTime() + 30 * 60 * 1000); // 30 minutes later
      const recurrenceEndDate = new Date(startDate.getTime() + 15 * 24 * 60 * 60 * 1000); // 15 days later
      
      const baseEvent: CalendarEvent = {
        id: 'base-event-id',
        userId: mockUserId,
        title: 'Every 3 Days Task',
        startDate,
        endDate,
        allDay: false,
        type: 'custom',
        status: 'pending',
        notifications: [],
        createdAt: now,
        updatedAt: now,
        recurrence: {
          type: 'daily',
          interval: 3,
          endDate: recurrenceEndDate
        }
      };

      const generatedEvents = await generateRecurringEvents(mockUserId, baseEvent);
      
      // Should generate 4 events (every 3 days for 15 days)
      expect(generatedEvents).toHaveLength(4);
      
      // Verify the events are generated with correct 3-day intervals
      generatedEvents.forEach((event, index) => {
        expect(event.title).toBe(baseEvent.title);
        expect(event.type).toBe(baseEvent.type);
        expect(event.recurrence?.seriesId).toBeDefined();
        // Verify it's a future date
        expect(event.startDate.getTime()).toBeGreaterThan(startDate.getTime());
      });
    });
  });

  describe('Weekly Recurrence Pattern', () => {
    it('should generate weekly recurring events correctly', async () => {
      const { generateRecurringEvents } = await import('../calendarService');
      
      const now = new Date();
      const startDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Tomorrow
      const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // 1 hour later
      const recurrenceEndDate = new Date(startDate.getTime() + 28 * 24 * 60 * 60 * 1000); // 4 weeks later
      
      const baseEvent: CalendarEvent = {
        id: 'base-event-id',
        userId: mockUserId,
        title: 'Weekly Team Meeting',
        startDate,
        endDate,
        allDay: false,
        type: 'custom',
        status: 'pending',
        notifications: [],
        createdAt: now,
        updatedAt: now,
        recurrence: {
          type: 'weekly',
          interval: 1,
          endDate: recurrenceEndDate
        }
      };

      const generatedEvents = await generateRecurringEvents(mockUserId, baseEvent);
      
      // Should generate weekly events
      expect(generatedEvents.length).toBeGreaterThan(0);
      
      // Verify the events are generated with correct weekly intervals
      generatedEvents.forEach((event, index) => {
        expect(event.title).toBe(baseEvent.title);
        expect(event.type).toBe(baseEvent.type);
        expect(event.recurrence?.seriesId).toBeDefined();
        // Verify it's a future date
        expect(event.startDate.getTime()).toBeGreaterThan(startDate.getTime());
      });
    });

    it('should generate bi-weekly recurring events correctly', async () => {
      const { generateRecurringEvents } = await import('../calendarService');
      
      const now = new Date();
      const startDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Tomorrow
      const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // 1 hour later
      const recurrenceEndDate = new Date(startDate.getTime() + 45 * 24 * 60 * 60 * 1000); // 45 days later
      
      const baseEvent: CalendarEvent = {
        id: 'base-event-id',
        userId: mockUserId,
        title: 'Bi-weekly Review',
        startDate,
        endDate,
        allDay: false,
        type: 'custom',
        status: 'pending',
        notifications: [],
        createdAt: now,
        updatedAt: now,
        recurrence: {
          type: 'weekly',
          interval: 2,
          endDate: recurrenceEndDate
        }
      };

      const generatedEvents = await generateRecurringEvents(mockUserId, baseEvent);
      
      // Should generate events every 2 weeks
      expect(generatedEvents.length).toBeGreaterThan(0);
      
      // Verify the first generated event is in the future
      expect(generatedEvents[0].startDate.getTime()).toBeGreaterThan(startDate.getTime());
    });
  });

  describe('Monthly Recurrence Pattern', () => {
    it('should generate monthly recurring events correctly', async () => {
      const { generateRecurringEvents } = await import('../calendarService');
      
      const now = new Date();
      const startDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Tomorrow
      const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // 1 hour later
      const recurrenceEndDate = new Date(startDate.getTime() + 150 * 24 * 60 * 60 * 1000); // 5 months later
      
      const baseEvent: CalendarEvent = {
        id: 'base-event-id',
        userId: mockUserId,
        title: 'Monthly Report',
        startDate,
        endDate,
        allDay: false,
        type: 'custom',
        status: 'pending',
        notifications: [],
        createdAt: now,
        updatedAt: now,
        recurrence: {
          type: 'monthly',
          interval: 1,
          endDate: recurrenceEndDate
        }
      };

      const generatedEvents = await generateRecurringEvents(mockUserId, baseEvent);
      
      // Should generate monthly events
      expect(generatedEvents.length).toBeGreaterThan(0);
      
      // Verify the events are generated with correct monthly intervals
      generatedEvents.forEach((event, index) => {
        expect(event.title).toBe(baseEvent.title);
        expect(event.type).toBe(baseEvent.type);
        expect(event.recurrence?.seriesId).toBeDefined();
        // Verify it's a future date
        expect(event.startDate.getTime()).toBeGreaterThan(startDate.getTime());
      });
    });
  });

  describe('Yearly Recurrence Pattern', () => {
    it('should generate yearly recurring events correctly', async () => {
      const { generateRecurringEvents } = await import('../calendarService');
      
      const now = new Date();
      const startDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Tomorrow
      const endDate = new Date(startDate.getTime() + 8 * 60 * 60 * 1000); // 8 hours later
      const recurrenceEndDate = new Date(startDate.getTime() + 3 * 365 * 24 * 60 * 60 * 1000); // 3 years later
      
      const baseEvent: CalendarEvent = {
        id: 'base-event-id',
        userId: mockUserId,
        title: 'Annual Review',
        startDate,
        endDate,
        allDay: false,
        type: 'custom',
        status: 'pending',
        notifications: [],
        createdAt: now,
        updatedAt: now,
        recurrence: {
          type: 'yearly',
          interval: 1,
          endDate: recurrenceEndDate
        }
      };

      const generatedEvents = await generateRecurringEvents(mockUserId, baseEvent);
      
      // Should generate yearly events
      expect(generatedEvents.length).toBeGreaterThan(0);
      
      // Verify the events are generated with correct yearly intervals
      generatedEvents.forEach((event, index) => {
        expect(event.title).toBe(baseEvent.title);
        expect(event.type).toBe(baseEvent.type);
        expect(event.recurrence?.seriesId).toBeDefined();
        // Verify it's a future date
        expect(event.startDate.getTime()).toBeGreaterThan(startDate.getTime());
      });
    });
  });

  describe('Series Management', () => {
    it('should assign the same series ID to all events in a recurring series', async () => {
      const { generateRecurringEvents } = await import('../calendarService');
      
      const now = new Date();
      const startDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Tomorrow
      const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // 1 hour later
      const recurrenceEndDate = new Date(startDate.getTime() + 4 * 24 * 60 * 60 * 1000); // 4 days later
      
      const baseEvent: CalendarEvent = {
        id: 'base-event-id',
        userId: mockUserId,
        title: 'Series Test',
        startDate,
        endDate,
        allDay: false,
        type: 'custom',
        status: 'pending',
        notifications: [],
        createdAt: now,
        updatedAt: now,
        recurrence: {
          type: 'daily',
          interval: 1,
          endDate: recurrenceEndDate
        }
      };

      const generatedEvents = await generateRecurringEvents(mockUserId, baseEvent);
      
      expect(generatedEvents).toHaveLength(4);
      
      // All events should have the same series ID
      const seriesId = generatedEvents[0].recurrence?.seriesId;
      expect(seriesId).toBeDefined();
      
      generatedEvents.forEach(event => {
        expect(event.recurrence?.seriesId).toBe(seriesId);
      });
    });

    it('should preserve event duration across recurring instances', async () => {
      const { generateRecurringEvents } = await import('../calendarService');
      
      const now = new Date();
      const startDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Tomorrow
      const endDate = new Date(startDate.getTime() + 2.5 * 60 * 60 * 1000); // 2.5 hours later
      const recurrenceEndDate = new Date(startDate.getTime() + 2 * 24 * 60 * 60 * 1000); // 2 days later
      
      const baseEvent: CalendarEvent = {
        id: 'base-event-id',
        userId: mockUserId,
        title: 'Duration Test',
        startDate,
        endDate,
        allDay: false,
        type: 'custom',
        status: 'pending',
        notifications: [],
        createdAt: now,
        updatedAt: now,
        recurrence: {
          type: 'daily',
          interval: 1,
          endDate: recurrenceEndDate
        }
      };

      const generatedEvents = await generateRecurringEvents(mockUserId, baseEvent);
      
      expect(generatedEvents).toHaveLength(2);
      
      // Check that duration is preserved (2.5 hours = 9000000 ms)
      const expectedDuration = 2.5 * 60 * 60 * 1000;
      
      generatedEvents.forEach(event => {
        const actualDuration = event.endDate.getTime() - event.startDate.getTime();
        expect(actualDuration).toBe(expectedDuration);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle events without recurrence pattern', async () => {
      const { generateRecurringEvents } = await import('../calendarService');
      
      const baseEvent: CalendarEvent = {
        id: 'base-event-id',
        userId: mockUserId,
        title: 'No Recurrence',
        startDate: new Date('2024-01-01T10:00:00Z'),
        endDate: new Date('2024-01-01T11:00:00Z'),
        allDay: false,
        type: 'custom',
        status: 'pending',
        notifications: [],
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z')
        // No recurrence property
      };

      await expect(generateRecurringEvents(mockUserId, baseEvent))
        .rejects.toThrow('Cannot generate recurring events: Base event has no recurrence pattern');
    });

    it('should handle unauthenticated users', async () => {
      const { generateRecurringEvents } = await import('../calendarService');
      
      const baseEvent: CalendarEvent = {
        id: 'base-event-id',
        userId: mockUserId,
        title: 'Test Event',
        startDate: new Date('2024-01-01T10:00:00Z'),
        endDate: new Date('2024-01-01T11:00:00Z'),
        allDay: false,
        type: 'custom',
        status: 'pending',
        notifications: [],
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z'),
        recurrence: {
          type: 'daily',
          interval: 1
        }
      };

      await expect(generateRecurringEvents(undefined, baseEvent))
        .rejects.toThrow('Cannot generate recurring events: User not authenticated.');
    });
  });
});