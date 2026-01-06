import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import type { CalendarEvent, CreateCalendarEventData, RecurrencePattern } from '../../types';
import { ErrorCode } from '../../types/errors';

// Mock Firebase
vi.mock('../../config/firebase', () => ({
  db: {}
}));

// Mock Firestore functions
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc: vi.fn(),
  addDoc: vi.fn(() => Promise.resolve({ id: 'mock-id' })),
  getDoc: vi.fn(() => Promise.resolve({ 
    exists: () => true, 
    id: 'mock-id',
    data: () => ({
      createdAt: { toDate: () => new Date() },
      updatedAt: { toDate: () => new Date() },
      startDate: { toDate: () => new Date() },
      endDate: { toDate: () => new Date() }
    })
  })),
  getDocs: vi.fn(),
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

// Mock recurrence utilities
vi.mock('../../utils/recurrenceUtils', () => ({
  validateRecurrencePattern: vi.fn(),
  generateOccurrencesInRange: vi.fn(),
  generateSeriesId: vi.fn(() => 'test-series-id'),
}));

describe.skip('Calendar Service - Recurring Events', () => {
  const mockUserId = 'test-user-id';
  
  const mockBaseEvent: CalendarEvent = {
    id: 'base-event-id',
    userId: mockUserId,
    title: 'Weekly Team Meeting',
    description: 'Regular team sync meeting',
    startDate: new Date('2024-01-01T10:00:00Z'),
    endDate: new Date('2024-01-01T11:00:00Z'),
    allDay: false,
    type: 'custom',
    status: 'pending',
    notifications: [],
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
    recurrence: {
      type: 'weekly',
      interval: 1,
      endDate: new Date('2024-03-01T00:00:00Z')
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('generateRecurringEvents', () => {
    it('should generate recurring events successfully', async () => {
      // Import the function after mocks are set up
      const { generateRecurringEvents } = await import('../calendarService');
      const { validateRecurrencePattern, generateOccurrencesInRange } = await import('../../utils/recurrenceUtils');
      
      // Mock validation success
      vi.mocked(validateRecurrencePattern).mockReturnValue({
        isValid: true,
        errors: []
      });

      // Mock occurrence generation
      const mockOccurrences = [
        new Date('2024-01-01T10:00:00Z'), // Base event
        new Date('2024-01-08T10:00:00Z'), // Week 2
        new Date('2024-01-15T10:00:00Z'), // Week 3
        new Date('2024-01-22T10:00:00Z'), // Week 4
      ];
      vi.mocked(generateOccurrencesInRange).mockReturnValue(mockOccurrences);

      const result = await generateRecurringEvents(mockUserId, mockBaseEvent);

      expect(validateRecurrencePattern).toHaveBeenCalledWith(mockBaseEvent.recurrence);
      expect(generateOccurrencesInRange).toHaveBeenCalledWith(
        mockBaseEvent.startDate,
        mockBaseEvent.recurrence,
        mockBaseEvent.startDate,
        expect.any(Date),
        100
      );
    });

    it('should throw error for unauthenticated user', async () => {
      const { generateRecurringEvents } = await import('../calendarService');
      
      await expect(generateRecurringEvents(undefined, mockBaseEvent))
        .rejects.toThrow('Cannot generate recurring events: User not authenticated.');
    });

    it('should throw error for event without recurrence pattern', async () => {
      const { generateRecurringEvents } = await import('../calendarService');
      const eventWithoutRecurrence = { ...mockBaseEvent, recurrence: undefined };
      
      await expect(generateRecurringEvents(mockUserId, eventWithoutRecurrence))
        .rejects.toThrow('Cannot generate recurring events: Base event has no recurrence pattern');
    });

    it('should throw error for invalid recurrence pattern', async () => {
      const { generateRecurringEvents } = await import('../calendarService');
      const { validateRecurrencePattern } = await import('../../utils/recurrenceUtils');
      
      vi.mocked(validateRecurrencePattern).mockReturnValue({
        isValid: false,
        errors: [{ field: 'interval', message: 'Interval must be positive' }]
      });

      await expect(generateRecurringEvents(mockUserId, mockBaseEvent))
        .rejects.toThrow('Invalid recurrence pattern: Interval must be positive');
    });

    it('should use custom end date when provided', async () => {
      const { generateRecurringEvents } = await import('../calendarService');
      const { validateRecurrencePattern, generateOccurrencesInRange } = await import('../../utils/recurrenceUtils');
      
      vi.mocked(validateRecurrencePattern).mockReturnValue({
        isValid: true,
        errors: []
      });

      vi.mocked(generateOccurrencesInRange).mockReturnValue([mockBaseEvent.startDate]);

      const customEndDate = new Date('2024-02-01T00:00:00Z');
      await generateRecurringEvents(mockUserId, mockBaseEvent, customEndDate);

      expect(generateOccurrencesInRange).toHaveBeenCalledWith(
        mockBaseEvent.startDate,
        mockBaseEvent.recurrence,
        mockBaseEvent.startDate,
        customEndDate,
        100
      );
    });
  });

  describe('updateRecurringSeries', () => {
    it('should throw error for unauthenticated user', async () => {
      const { updateRecurringSeries } = await import('../calendarService');
      
      await expect(updateRecurringSeries(undefined, 'series-id', {}))
        .rejects.toThrow('Cannot update recurring series: User not authenticated.');
    });

    it('should throw error for empty series ID', async () => {
      const { updateRecurringSeries } = await import('../calendarService');
      
      await expect(updateRecurringSeries(mockUserId, '', {}))
        .rejects.toThrow('Series ID is required');
    });
  });

  describe('deleteRecurringSeries', () => {
    it('should throw error for unauthenticated user', async () => {
      const { deleteRecurringSeries } = await import('../calendarService');
      
      await expect(deleteRecurringSeries(undefined, 'series-id'))
        .rejects.toThrow('Cannot delete recurring series: User not authenticated.');
    });

    it('should throw error for empty series ID', async () => {
      const { deleteRecurringSeries } = await import('../calendarService');
      
      await expect(deleteRecurringSeries(mockUserId, ''))
        .rejects.toThrow('Series ID is required');
    });
  });

  describe('getEventsBySeries', () => {
    it('should throw error for unauthenticated user', async () => {
      const { getEventsBySeries } = await import('../calendarService');
      
      await expect(getEventsBySeries(undefined, 'series-id'))
        .rejects.toThrow('Cannot get series events: User not authenticated.');
    });

    it('should throw error for empty series ID', async () => {
      const { getEventsBySeries } = await import('../calendarService');
      
      await expect(getEventsBySeries(mockUserId, ''))
        .rejects.toThrow('Series ID is required');
    });
  });

  describe('generateRecurringEventsForRange', () => {
    it('should throw error when start date is after end date', async () => {
      const { generateRecurringEventsForRange } = await import('../calendarService');
      
      const startDate = new Date('2024-02-01T00:00:00Z');
      const endDate = new Date('2024-01-01T00:00:00Z');

      await expect(generateRecurringEventsForRange(mockUserId, mockBaseEvent, startDate, endDate))
        .rejects.toThrow('Start date must be before end date');
    });

    it('should throw error for unauthenticated user', async () => {
      const { generateRecurringEventsForRange } = await import('../calendarService');
      
      const startDate = new Date('2024-01-01T00:00:00Z');
      const endDate = new Date('2024-01-31T23:59:59Z');

      await expect(generateRecurringEventsForRange(undefined, mockBaseEvent, startDate, endDate))
        .rejects.toThrow('Cannot generate recurring events: User not authenticated.');
    });

    it('should throw error for event without recurrence pattern', async () => {
      const { generateRecurringEventsForRange } = await import('../calendarService');
      
      const eventWithoutRecurrence = { ...mockBaseEvent, recurrence: undefined };
      const startDate = new Date('2024-01-01T00:00:00Z');
      const endDate = new Date('2024-01-31T23:59:59Z');

      await expect(generateRecurringEventsForRange(mockUserId, eventWithoutRecurrence, startDate, endDate))
        .rejects.toThrow('Cannot generate recurring events: Base event has no recurrence pattern');
    });
  });

  describe('Recurrence Pattern Validation', () => {
    it('should validate daily recurrence pattern', async () => {
      const { generateRecurringEvents } = await import('../calendarService');
      const { validateRecurrencePattern, generateOccurrencesInRange } = await import('../../utils/recurrenceUtils');
      
      const dailyEvent = {
        ...mockBaseEvent,
        recurrence: {
          type: 'daily' as const,
          interval: 2, // Every 2 days
          endDate: new Date('2024-01-10T00:00:00Z')
        }
      };

      vi.mocked(validateRecurrencePattern).mockReturnValue({
        isValid: true,
        errors: []
      });

      vi.mocked(generateOccurrencesInRange).mockReturnValue([dailyEvent.startDate]);

      await generateRecurringEvents(mockUserId, dailyEvent);

      expect(validateRecurrencePattern).toHaveBeenCalledWith(dailyEvent.recurrence);
      expect(generateOccurrencesInRange).toHaveBeenCalledWith(
        dailyEvent.startDate,
        dailyEvent.recurrence,
        dailyEvent.startDate,
        expect.any(Date),
        100
      );
    });

    it('should validate monthly recurrence pattern', async () => {
      const { generateRecurringEvents } = await import('../calendarService');
      const { validateRecurrencePattern, generateOccurrencesInRange } = await import('../../utils/recurrenceUtils');
      
      const monthlyEvent = {
        ...mockBaseEvent,
        recurrence: {
          type: 'monthly' as const,
          interval: 1, // Every month
          endDate: new Date('2024-06-01T00:00:00Z')
        }
      };

      vi.mocked(validateRecurrencePattern).mockReturnValue({
        isValid: true,
        errors: []
      });

      vi.mocked(generateOccurrencesInRange).mockReturnValue([monthlyEvent.startDate]);

      await generateRecurringEvents(mockUserId, monthlyEvent);

      expect(validateRecurrencePattern).toHaveBeenCalledWith(monthlyEvent.recurrence);
    });

    it('should validate yearly recurrence pattern', async () => {
      const { generateRecurringEvents } = await import('../calendarService');
      const { validateRecurrencePattern, generateOccurrencesInRange } = await import('../../utils/recurrenceUtils');
      
      const yearlyEvent = {
        ...mockBaseEvent,
        recurrence: {
          type: 'yearly' as const,
          interval: 1, // Every year
          endDate: new Date('2027-01-01T00:00:00Z')
        }
      };

      vi.mocked(validateRecurrencePattern).mockReturnValue({
        isValid: true,
        errors: []
      });

      vi.mocked(generateOccurrencesInRange).mockReturnValue([yearlyEvent.startDate]);

      await generateRecurringEvents(mockUserId, yearlyEvent);

      expect(validateRecurrencePattern).toHaveBeenCalledWith(yearlyEvent.recurrence);
    });
  });
});