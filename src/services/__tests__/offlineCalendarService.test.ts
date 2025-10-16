import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { offlineCalendarService } from '../offlineCalendarService';
import { offlineStorage } from '../../utils/offlineStorage';
import * as calendarService from '../calendarService';
import type { CalendarEvent, CreateCalendarEventData } from '../../types';

// Mock the calendar service
vi.mock('../calendarService');
const mockCalendarService = vi.mocked(calendarService);

// Mock the offline storage
vi.mock('../../utils/offlineStorage');
const mockOfflineStorage = vi.mocked(offlineStorage);

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true,
});

describe('OfflineCalendarService', () => {
  const mockUserId = 'test-user-id';
  const mockEventData: CreateCalendarEventData = {
    userId: mockUserId,
    title: 'Test Event',
    description: 'Test Description',
    startDate: new Date('2024-01-15T10:00:00Z'),
    endDate: new Date('2024-01-15T11:00:00Z'),
    allDay: false,
    type: 'custom',
    status: 'pending',
    notifications: []
  };

  const mockEvent: CalendarEvent = {
    id: 'test-event-id',
    ...mockEventData,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z')
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset navigator.onLine to true by default
    Object.defineProperty(navigator, 'onLine', { value: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createEvent', () => {
    it('should create event online when connected', async () => {
      mockCalendarService.createEvent.mockResolvedValue(mockEvent);

      const result = await offlineCalendarService.createEvent(mockUserId, mockEventData);

      expect(mockCalendarService.createEvent).toHaveBeenCalledWith(mockUserId, mockEventData);
      expect(mockOfflineStorage.cacheData).toHaveBeenCalledWith('calendarEvents', mockEvent.id, mockEvent);
      expect(result).toEqual(mockEvent);
    });

    it('should create event offline when disconnected', async () => {
      Object.defineProperty(navigator, 'onLine', { value: false });

      const result = await offlineCalendarService.createEvent(mockUserId, mockEventData);

      expect(mockCalendarService.createEvent).not.toHaveBeenCalled();
      expect(mockOfflineStorage.cacheData).toHaveBeenCalled();
      expect(mockOfflineStorage.addToSyncQueue).toHaveBeenCalledWith({
        type: 'create',
        collection: 'calendarEvents',
        documentId: expect.stringMatching(/^offline_/),
        data: mockEventData,
        userId: mockUserId
      });
      expect(result.id).toMatch(/^offline_/);
    });

    it('should fall back to offline when online creation fails', async () => {
      mockCalendarService.createEvent.mockRejectedValue(new Error('Network error'));

      const result = await offlineCalendarService.createEvent(mockUserId, mockEventData);

      expect(mockCalendarService.createEvent).toHaveBeenCalledWith(mockUserId, mockEventData);
      expect(mockOfflineStorage.cacheData).toHaveBeenCalled();
      expect(mockOfflineStorage.addToSyncQueue).toHaveBeenCalled();
      expect(result.id).toMatch(/^offline_/);
    });

    it('should throw error when user is not authenticated', async () => {
      await expect(offlineCalendarService.createEvent(undefined, mockEventData))
        .rejects.toThrow('Cannot create calendar event: User not authenticated.');
    });
  });

  describe('updateEvent', () => {
    const updates = { title: 'Updated Title' };

    it('should update event online when connected', async () => {
      const updatedEvent = { ...mockEvent, ...updates };
      mockCalendarService.updateEvent.mockResolvedValue(updatedEvent);

      const result = await offlineCalendarService.updateEvent(mockUserId, mockEvent.id, updates);

      expect(mockCalendarService.updateEvent).toHaveBeenCalledWith(mockUserId, mockEvent.id, updates);
      expect(mockOfflineStorage.cacheData).toHaveBeenCalledWith('calendarEvents', updatedEvent.id, updatedEvent);
      expect(result).toEqual(updatedEvent);
    });

    it('should update event offline when disconnected', async () => {
      Object.defineProperty(navigator, 'onLine', { value: false });
      mockOfflineStorage.getCachedData.mockReturnValue(mockEvent);

      const result = await offlineCalendarService.updateEvent(mockUserId, mockEvent.id, updates);

      expect(mockCalendarService.updateEvent).not.toHaveBeenCalled();
      expect(mockOfflineStorage.getCachedData).toHaveBeenCalledWith('calendarEvents', mockEvent.id);
      expect(mockOfflineStorage.cacheData).toHaveBeenCalled();
      expect(mockOfflineStorage.addToSyncQueue).toHaveBeenCalledWith({
        type: 'update',
        collection: 'calendarEvents',
        documentId: mockEvent.id,
        data: updates,
        userId: mockUserId
      });
      expect(result.title).toBe(updates.title);
    });

    it('should throw error when event not found in offline cache', async () => {
      Object.defineProperty(navigator, 'onLine', { value: false });
      mockOfflineStorage.getCachedData.mockReturnValue(null);

      await expect(offlineCalendarService.updateEvent(mockUserId, mockEvent.id, updates))
        .rejects.toThrow('Calendar event not found in offline cache');
    });
  });

  describe('deleteEvent', () => {
    it('should delete event online when connected', async () => {
      mockCalendarService.deleteEvent.mockResolvedValue();

      await offlineCalendarService.deleteEvent(mockUserId, mockEvent.id);

      expect(mockCalendarService.deleteEvent).toHaveBeenCalledWith(mockUserId, mockEvent.id);
      expect(mockOfflineStorage.removeCachedData).toHaveBeenCalledWith('calendarEvents', mockEvent.id);
    });

    it('should delete event offline when disconnected', async () => {
      Object.defineProperty(navigator, 'onLine', { value: false });
      mockOfflineStorage.getCachedData.mockReturnValue(mockEvent);

      await offlineCalendarService.deleteEvent(mockUserId, mockEvent.id);

      expect(mockCalendarService.deleteEvent).not.toHaveBeenCalled();
      expect(mockOfflineStorage.getCachedData).toHaveBeenCalledWith('calendarEvents', mockEvent.id);
      expect(mockOfflineStorage.removeCachedData).toHaveBeenCalledWith('calendarEvents', mockEvent.id);
      expect(mockOfflineStorage.addToSyncQueue).toHaveBeenCalledWith({
        type: 'delete',
        collection: 'calendarEvents',
        documentId: mockEvent.id,
        userId: mockUserId
      });
    });
  });

  describe('getEventsForDateRange', () => {
    const startDate = new Date('2024-01-01');
    const endDate = new Date('2024-01-31');
    const mockEvents = [mockEvent];

    it('should return cached events when range is cached and valid', async () => {
      mockOfflineStorage.isDateRangeCached.mockReturnValue(true);
      mockOfflineStorage.getCachedCalendarEventsForRange.mockReturnValue(mockEvents);

      const result = await offlineCalendarService.getEventsForDateRange(mockUserId, startDate, endDate);

      expect(mockOfflineStorage.isDateRangeCached).toHaveBeenCalledWith(startDate, endDate);
      expect(mockOfflineStorage.getCachedCalendarEventsForRange).toHaveBeenCalledWith(startDate, endDate);
      expect(mockCalendarService.getEventsForDateRange).not.toHaveBeenCalled();
      expect(result).toEqual(mockEvents);
    });

    it('should fetch from server when online and not cached', async () => {
      mockOfflineStorage.isDateRangeCached.mockReturnValue(false);
      mockCalendarService.getEventsForDateRange.mockResolvedValue(mockEvents);

      const result = await offlineCalendarService.getEventsForDateRange(mockUserId, startDate, endDate);

      expect(mockCalendarService.getEventsForDateRange).toHaveBeenCalledWith(mockUserId, startDate, endDate);
      expect(mockOfflineStorage.cacheCalendarEventsForRange).toHaveBeenCalledWith(mockEvents, startDate, endDate);
      expect(result).toEqual(mockEvents);
    });

    it('should return cached events when offline', async () => {
      Object.defineProperty(navigator, 'onLine', { value: false });
      mockOfflineStorage.getCachedCalendarEventsForRange.mockReturnValue(mockEvents);

      const result = await offlineCalendarService.getEventsForDateRange(mockUserId, startDate, endDate);

      expect(mockCalendarService.getEventsForDateRange).not.toHaveBeenCalled();
      expect(mockOfflineStorage.getCachedCalendarEventsForRange).toHaveBeenCalledWith(startDate, endDate);
      expect(result).toEqual(mockEvents);
    });
  });

  describe('preloadEventsForOfflineAccess', () => {
    it('should preload events for current and adjacent months when online', async () => {
      const mockEvents = [mockEvent];
      mockCalendarService.getEventsForDateRange.mockResolvedValue(mockEvents);

      await offlineCalendarService.preloadEventsForOfflineAccess(mockUserId);

      expect(mockCalendarService.getEventsForDateRange).toHaveBeenCalled();
      expect(mockOfflineStorage.cacheCalendarEventsForRange).toHaveBeenCalled();
    });

    it('should not preload when offline', async () => {
      Object.defineProperty(navigator, 'onLine', { value: false });

      await offlineCalendarService.preloadEventsForOfflineAccess(mockUserId);

      expect(mockCalendarService.getEventsForDateRange).not.toHaveBeenCalled();
      expect(mockOfflineStorage.cacheCalendarEventsForRange).not.toHaveBeenCalled();
    });

    it('should not preload when user is not authenticated', async () => {
      await offlineCalendarService.preloadEventsForOfflineAccess(undefined);

      expect(mockCalendarService.getEventsForDateRange).not.toHaveBeenCalled();
      expect(mockOfflineStorage.cacheCalendarEventsForRange).not.toHaveBeenCalled();
    });
  });

  describe('syncPendingOperations', () => {
    const mockOperations = [
      {
        id: 'op1',
        type: 'create' as const,
        collection: 'calendarEvents' as const,
        documentId: 'offline_123',
        data: mockEventData,
        timestamp: Date.now(),
        userId: mockUserId
      },
      {
        id: 'op2',
        type: 'update' as const,
        collection: 'calendarEvents' as const,
        documentId: 'event-123',
        data: { title: 'Updated' },
        timestamp: Date.now(),
        userId: mockUserId
      }
    ];

    it('should sync pending calendar operations when online', async () => {
      mockOfflineStorage.getPendingOperations.mockReturnValue(mockOperations);
      mockCalendarService.createEvent.mockResolvedValue(mockEvent);
      mockCalendarService.updateEvent.mockResolvedValue(mockEvent);

      await offlineCalendarService.syncPendingOperations(mockUserId);

      expect(mockCalendarService.createEvent).toHaveBeenCalledWith(mockUserId, mockEventData);
      expect(mockCalendarService.updateEvent).toHaveBeenCalledWith(mockUserId, 'event-123', { title: 'Updated' });
      expect(mockOfflineStorage.removeFromSyncQueue).toHaveBeenCalledTimes(2);
      expect(mockOfflineStorage.updateLastSync).toHaveBeenCalled();
    });

    it('should not sync when offline', async () => {
      Object.defineProperty(navigator, 'onLine', { value: false });

      await offlineCalendarService.syncPendingOperations(mockUserId);

      expect(mockOfflineStorage.getPendingOperations).not.toHaveBeenCalled();
      expect(mockCalendarService.createEvent).not.toHaveBeenCalled();
    });
  });

  describe('getCacheStats', () => {
    it('should return cache statistics', () => {
      const mockCachedEvents = { 'event1': mockEvent, 'event2': mockEvent };
      const mockStorageInfo = { used: 1024, available: 4096 };
      const mockLastSync = Date.now();

      mockOfflineStorage.getCachedData.mockReturnValue(mockCachedEvents);
      mockOfflineStorage.getStorageInfo.mockReturnValue(mockStorageInfo);
      mockOfflineStorage.getLastSync.mockReturnValue(mockLastSync);

      const stats = offlineCalendarService.getCacheStats();

      expect(stats.eventCount).toBe(2);
      expect(stats.storageUsed).toBe(1024);
      expect(stats.lastSync).toEqual(new Date(mockLastSync));
    });

    it('should handle null last sync', () => {
      mockOfflineStorage.getCachedData.mockReturnValue({});
      mockOfflineStorage.getStorageInfo.mockReturnValue({ used: 0, available: 5120 });
      mockOfflineStorage.getLastSync.mockReturnValue(0);

      const stats = offlineCalendarService.getCacheStats();

      expect(stats.eventCount).toBe(0);
      expect(stats.lastSync).toBeNull();
    });
  });
});