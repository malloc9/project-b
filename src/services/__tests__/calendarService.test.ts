import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  createCalendarEvent, 
  updateCalendarEvent, 
  deleteCalendarEvent,
  safeCreateCalendarEvent,
  safeUpdateCalendarEvent,
  safeDeleteCalendarEvent,
  manualSyncCalendar,
  getCalendarSyncStatus
} from '../calendarService';
import type { CalendarEvent } from '../../types';

// Mock Firebase Functions
vi.mock('firebase/functions', () => ({
  getFunctions: vi.fn(() => ({})),
  httpsCallable: vi.fn((_functions, name) => {
    return vi.fn().mockImplementation(async (data) => {
      // Mock different responses based on function name
      switch (name) {
        case 'createCalendarEvent':
          if (data.event.title.includes('fail')) {
            throw new Error('Mock calendar error');
          }
          return { data: { eventId: 'mock-event-id' } };
        
        case 'updateCalendarEvent':
          if (data.eventId === 'fail-id') {
            throw new Error('Mock update error');
          }
          return { data: { success: true } };
        
        case 'deleteCalendarEvent':
          if (data.eventId === 'fail-id') {
            throw new Error('Mock delete error');
          }
          return { data: { success: true } };
        
        default:
          return { data: {} };
      }
    });
  }),
}));

// Mock error handler
vi.mock('../../utils/calendarErrorHandler', () => ({
  executeCalendarOperation: vi.fn(async (operation, operationName) => {
    try {
      return await operation();
    } catch (error) {
      // Simulate retry logic - return null for network errors, throw for others
      if ((error as Error).message.includes('Mock')) {
        if (operationName.includes('create') || operationName.includes('update') || operationName.includes('delete')) {
          return null; // Simulate graceful failure
        }
        throw error;
      }
      return await operation();
    }
  }),
  isCalendarAvailable: vi.fn(async () => true),
  calendarQueue: {
    enqueue: vi.fn(),
    getStatus: vi.fn(() => ({ pending: 0, processing: false })),
  },
}));

describe('CalendarService', () => {
  const mockEvent: CalendarEvent = {
    id: 'test-id',
    title: 'Test Event',
    description: 'Test Description',
    startDate: new Date('2024-01-01T10:00:00Z'),
    endDate: new Date('2024-01-01T11:00:00Z'),
    reminders: [
      { method: 'popup', minutes: 15 },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createCalendarEvent', () => {
    it('should create calendar event successfully', async () => {
      const eventId = await createCalendarEvent(mockEvent);
      expect(eventId).toBe('mock-event-id');
    });

    it('should handle creation errors', async () => {
      const failEvent = { ...mockEvent, title: 'fail event' };
      
      await expect(createCalendarEvent(failEvent)).rejects.toThrow();
    });
  });

  describe('updateCalendarEvent', () => {
    it('should update calendar event successfully', async () => {
      await expect(updateCalendarEvent('test-id', { title: 'Updated Title' }))
        .resolves.not.toThrow();
    });

    it('should handle update errors', async () => {
      await expect(updateCalendarEvent('fail-id', { title: 'Updated Title' }))
        .rejects.toThrow();
    });
  });

  describe('deleteCalendarEvent', () => {
    it('should delete calendar event successfully', async () => {
      await expect(deleteCalendarEvent('test-id')).resolves.not.toThrow();
    });

    it('should handle delete errors', async () => {
      await expect(deleteCalendarEvent('fail-id')).rejects.toThrow();
    });
  });

  describe('Safe calendar operations', () => {
    it('should handle safe create with success', async () => {
      const eventId = await safeCreateCalendarEvent(mockEvent, 'task-1', 'simple');
      expect(eventId).toBe('mock-event-id');
    });

    it('should handle safe create with failure and queue retry', async () => {
      const failEvent = { ...mockEvent, title: 'fail event' };
      const eventId = await safeCreateCalendarEvent(failEvent, 'task-1', 'simple');
      
      expect(eventId).toBeNull();
      
      // Check that operation was queued
      const { calendarQueue } = await import('../../utils/calendarErrorHandler');
      expect(calendarQueue.enqueue).toHaveBeenCalledWith(
        'create-simple-task-1',
        expect.any(Function)
      );
    });

    it('should handle safe update with failure and queue retry', async () => {
      await safeUpdateCalendarEvent('fail-id', { title: 'Updated' }, 'task-1', 'simple');
      
      // Check that operation was queued
      const { calendarQueue } = await import('../../utils/calendarErrorHandler');
      expect(calendarQueue.enqueue).toHaveBeenCalledWith(
        'update-simple-task-1',
        expect.any(Function)
      );
    });

    it('should handle safe delete with failure and queue retry', async () => {
      await safeDeleteCalendarEvent('fail-id', 'task-1', 'simple');
      
      // Check that operation was queued
      const { calendarQueue } = await import('../../utils/calendarErrorHandler');
      expect(calendarQueue.enqueue).toHaveBeenCalledWith(
        'delete-simple-task-1',
        expect.any(Function)
      );
    });
  });

  describe('Manual sync and status', () => {
    it('should return sync status', () => {
      const status = getCalendarSyncStatus();
      
      expect(status).toHaveProperty('connected');
      expect(status).toHaveProperty('pendingOperations');
      expect(status).toHaveProperty('processing');
    });

    it('should handle manual sync with no pending operations', async () => {
      const result = await manualSyncCalendar();
      
      expect(result.success).toBe(true);
      expect(result.pendingOperations).toBe(0);
      expect(result.message).toContain('up to date');
    });

    it('should handle manual sync with pending operations', async () => {
      // Mock pending operations
      const { calendarQueue } = await import('../../utils/calendarErrorHandler');
      vi.mocked(calendarQueue.getStatus).mockReturnValue({ pending: 3, processing: false });
      
      const result = await manualSyncCalendar();
      
      expect(result.success).toBe(true);
      expect(result.pendingOperations).toBe(3);
      expect(result.message).toContain('3 calendar operations');
    });
  });

  describe('Calendar helper functions', () => {
    it('should create plant care calendar event with correct format', async () => {
      const { createPlantCareCalendarEvent } = await import('../calendarService');
      
      const eventId = await createPlantCareCalendarEvent(
        'Water plants',
        'Weekly watering',
        new Date('2024-01-01T10:00:00Z'),
        'Monstera'
      );
      
      expect(eventId).toBe('mock-event-id');
    });

    it('should create project calendar event with correct format', async () => {
      const { createProjectCalendarEvent } = await import('../calendarService');
      
      const eventId = await createProjectCalendarEvent(
        'Kitchen renovation',
        'Complete kitchen renovation project',
        new Date('2024-01-01T10:00:00Z')
      );
      
      expect(eventId).toBe('mock-event-id');
    });

    it('should create simple task calendar event with correct format', async () => {
      const { createSimpleTaskCalendarEvent } = await import('../calendarService');
      
      const eventId = await createSimpleTaskCalendarEvent(
        'Buy groceries',
        'Weekly grocery shopping',
        new Date('2024-01-01T10:00:00Z')
      );
      
      expect(eventId).toBe('mock-event-id');
    });
  });
});