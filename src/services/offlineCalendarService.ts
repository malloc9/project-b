import type { CalendarEvent, CreateCalendarEventData } from '../types';
import { offlineStorage } from '../utils/offlineStorage';
import * as calendarService from './calendarService';
import { ErrorCode, createAppError } from '../types/errors';

/**
 * Offline-aware calendar service that provides seamless online/offline functionality
 */
class OfflineCalendarService {
  private isOnline(): boolean {
    return navigator.onLine;
  }

  /**
   * Create a calendar event with offline support
   */
  async createEvent(
    userId: string | undefined,
    eventData: CreateCalendarEventData
  ): Promise<CalendarEvent> {
    if (!userId) {
      throw createAppError(
        ErrorCode.DB_PERMISSION_DENIED,
        "Cannot create calendar event: User not authenticated."
      );
    }

    if (this.isOnline()) {
      try {
        // Try to create online first
        const event = await calendarService.createEvent(userId, eventData);
        
        // Cache the created event
        offlineStorage.cacheData('calendarEvents', event.id, event);
        
        return event;
      } catch (error) {
        // If online creation fails, fall back to offline
        console.warn('Online event creation failed, falling back to offline:', error);
        return this.createEventOffline(userId, eventData);
      }
    } else {
      // Create offline
      return this.createEventOffline(userId, eventData);
    }
  }

  /**
   * Create event offline and queue for sync
   */
  private createEventOffline(
    userId: string,
    eventData: CreateCalendarEventData
  ): CalendarEvent {
    const now = new Date();
    const tempId = `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const event: CalendarEvent = {
      id: tempId,
      ...eventData,
      userId,
      createdAt: now,
      updatedAt: now,
    };

    // Cache the event locally
    offlineStorage.cacheData('calendarEvents', event.id, event);

    // Add to sync queue
    offlineStorage.addToSyncQueue({
      type: 'create',
      collection: 'calendarEvents',
      documentId: event.id,
      data: eventData,
      userId
    });

    return event;
  }

  /**
   * Update a calendar event with offline support
   */
  async updateEvent(
    userId: string | undefined,
    eventId: string,
    updates: Partial<Omit<CalendarEvent, 'id' | 'userId' | 'createdAt'>>
  ): Promise<CalendarEvent> {
    if (!userId) {
      throw createAppError(
        ErrorCode.DB_PERMISSION_DENIED,
        "Cannot update calendar event: User not authenticated."
      );
    }

    if (this.isOnline()) {
      try {
        // Try to update online first
        const event = await calendarService.updateEvent(userId, eventId, updates);
        
        // Update cache
        offlineStorage.cacheData('calendarEvents', event.id, event);
        
        return event;
      } catch (error) {
        // If online update fails, fall back to offline
        console.warn('Online event update failed, falling back to offline:', error);
        return this.updateEventOffline(userId, eventId, updates);
      }
    } else {
      // Update offline
      return this.updateEventOffline(userId, eventId, updates);
    }
  }

  /**
   * Update event offline and queue for sync
   */
  private updateEventOffline(
    userId: string,
    eventId: string,
    updates: Partial<Omit<CalendarEvent, 'id' | 'userId' | 'createdAt'>>
  ): CalendarEvent {
    // Get existing event from cache
    const existingEvent = offlineStorage.getCachedData('calendarEvents', eventId) as CalendarEvent;
    
    if (!existingEvent) {
      throw createAppError(
        ErrorCode.DB_NOT_FOUND,
        "Calendar event not found in offline cache"
      );
    }

    const updatedEvent: CalendarEvent = {
      ...existingEvent,
      ...updates,
      updatedAt: new Date(),
    };

    // Update cache
    offlineStorage.cacheData('calendarEvents', eventId, updatedEvent);

    // Add to sync queue
    offlineStorage.addToSyncQueue({
      type: 'update',
      collection: 'calendarEvents',
      documentId: eventId,
      data: updates,
      userId
    });

    return updatedEvent;
  }

  /**
   * Delete a calendar event with offline support
   */
  async deleteEvent(userId: string | undefined, eventId: string): Promise<void> {
    if (!userId) {
      throw createAppError(
        ErrorCode.DB_PERMISSION_DENIED,
        "Cannot delete calendar event: User not authenticated."
      );
    }

    if (this.isOnline()) {
      try {
        // Try to delete online first
        await calendarService.deleteEvent(userId, eventId);
        
        // Remove from cache
        offlineStorage.removeCachedData('calendarEvents', eventId);
        
        return;
      } catch (error) {
        // If online deletion fails, fall back to offline
        console.warn('Online event deletion failed, falling back to offline:', error);
        this.deleteEventOffline(userId, eventId);
      }
    } else {
      // Delete offline
      this.deleteEventOffline(userId, eventId);
    }
  }

  /**
   * Delete event offline and queue for sync
   */
  private deleteEventOffline(userId: string, eventId: string): void {
    // Check if event exists in cache
    const existingEvent = offlineStorage.getCachedData('calendarEvents', eventId) as CalendarEvent;
    
    if (!existingEvent) {
      throw createAppError(
        ErrorCode.DB_NOT_FOUND,
        "Calendar event not found in offline cache"
      );
    }

    // Remove from cache
    offlineStorage.removeCachedData('calendarEvents', eventId);

    // Add to sync queue
    offlineStorage.addToSyncQueue({
      type: 'delete',
      collection: 'calendarEvents',
      documentId: eventId,
      userId
    });
  }

  /**
   * Get a single calendar event with offline support
   */
  async getEvent(userId: string | undefined, eventId: string): Promise<CalendarEvent | null> {
    if (!userId) {
      throw createAppError(
        ErrorCode.DB_PERMISSION_DENIED,
        "Cannot get calendar event: User not authenticated."
      );
    }

    // Try cache first
    const cachedEvent = offlineStorage.getCachedData('calendarEvents', eventId) as CalendarEvent;
    
    if (cachedEvent) {
      return cachedEvent;
    }

    // If not in cache and online, try to fetch from server
    if (this.isOnline()) {
      try {
        const event = await calendarService.getEvent(userId, eventId);
        
        if (event) {
          // Cache the fetched event
          offlineStorage.cacheData('calendarEvents', event.id, event);
        }
        
        return event;
      } catch (error) {
        console.warn('Failed to fetch event from server:', error);
        return null;
      }
    }

    return null;
  }

  /**
   * Get events for a date range with offline support and caching
   */
  async getEventsForDateRange(
    userId: string | undefined,
    startDate: Date,
    endDate: Date
  ): Promise<CalendarEvent[]> {
    if (!userId) {
      throw createAppError(
        ErrorCode.DB_PERMISSION_DENIED,
        "Cannot get calendar events: User not authenticated."
      );
    }

    // Check if this date range is cached and still valid
    if (offlineStorage.isDateRangeCached(startDate, endDate)) {
      return offlineStorage.getCachedCalendarEventsForRange(startDate, endDate);
    }

    // If online, try to fetch from server
    if (this.isOnline()) {
      try {
        const events = await calendarService.getEventsForDateRange(userId, startDate, endDate);
        
        // Cache the fetched events
        offlineStorage.cacheCalendarEventsForRange(events, startDate, endDate);
        
        return events;
      } catch (error) {
        console.warn('Failed to fetch events from server, using cached data:', error);
        // Fall back to cached data even if it might be stale
        return offlineStorage.getCachedCalendarEventsForRange(startDate, endDate);
      }
    } else {
      // Return cached events for offline mode
      return offlineStorage.getCachedCalendarEventsForRange(startDate, endDate);
    }
  }

  /**
   * Get events for a specific date with offline support
   */
  async getEventsForDate(userId: string | undefined, date: Date): Promise<CalendarEvent[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return this.getEventsForDateRange(userId, startOfDay, endOfDay);
  }

  /**
   * Get upcoming events with offline support
   */
  async getUpcomingEvents(
    userId: string | undefined,
    limitCount: number = 10
  ): Promise<CalendarEvent[]> {
    if (!userId) {
      throw createAppError(
        ErrorCode.DB_PERMISSION_DENIED,
        "Cannot get calendar events: User not authenticated."
      );
    }

    if (this.isOnline()) {
      try {
        const events = await calendarService.getUpcomingEvents(userId, limitCount);
        
        // Cache the fetched events
        events.forEach(event => {
          offlineStorage.cacheData('calendarEvents', event.id, event);
        });
        
        return events;
      } catch (error) {
        console.warn('Failed to fetch upcoming events from server, using cached data:', error);
      }
    }

    // Fall back to cached events
    const cachedEvents = offlineStorage.getCachedEventsForCurrentAndAdjacentMonths();
    const now = new Date();
    
    return cachedEvents
      .filter(event => event.startDate >= now && event.status === 'pending')
      .sort((a, b) => a.startDate.getTime() - b.startDate.getTime())
      .slice(0, limitCount);
  }

  /**
   * Get overdue events with offline support
   */
  async getOverdueEvents(userId: string | undefined): Promise<CalendarEvent[]> {
    if (!userId) {
      throw createAppError(
        ErrorCode.DB_PERMISSION_DENIED,
        "Cannot get calendar events: User not authenticated."
      );
    }

    if (this.isOnline()) {
      try {
        const events = await calendarService.getOverdueEvents(userId);
        
        // Cache the fetched events
        events.forEach(event => {
          offlineStorage.cacheData('calendarEvents', event.id, event);
        });
        
        return events;
      } catch (error) {
        console.warn('Failed to fetch overdue events from server, using cached data:', error);
      }
    }

    // Fall back to cached events
    const cachedEvents = offlineStorage.getCachedEventsForCurrentAndAdjacentMonths();
    const now = new Date();
    
    return cachedEvents
      .filter(event => event.endDate < now && event.status === 'pending')
      .sort((a, b) => b.endDate.getTime() - a.endDate.getTime());
  }

  /**
   * Preload events for current and adjacent months for offline access
   */
  async preloadEventsForOfflineAccess(userId: string | undefined): Promise<void> {
    if (!userId || !this.isOnline()) {
      return;
    }

    try {
      const now = new Date();
      const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const nextMonthEnd = new Date(now.getFullYear(), now.getMonth() + 2, 0);

      const events = await calendarService.getEventsForDateRange(userId, previousMonth, nextMonthEnd);
      offlineStorage.cacheCalendarEventsForRange(events, previousMonth, nextMonthEnd);
      
      console.log(`Preloaded ${events.length} calendar events for offline access`);
    } catch (error) {
      console.warn('Failed to preload events for offline access:', error);
    }
  }

  /**
   * Sync pending offline operations when coming back online
   */
  async syncPendingOperations(userId: string): Promise<void> {
    if (!this.isOnline()) {
      return;
    }

    const pendingOperations = offlineStorage.getPendingOperations()
      .filter(op => op.collection === 'calendarEvents' && op.userId === userId);

    for (const operation of pendingOperations) {
      try {
        switch (operation.type) {
          case 'create':
            if (operation.data) {
              const createdEvent = await calendarService.createEvent(userId, operation.data);
              
              // Update cache with the server-generated ID
              offlineStorage.removeCachedData('calendarEvents', operation.documentId);
              offlineStorage.cacheData('calendarEvents', createdEvent.id, createdEvent);
            }
            break;

          case 'update':
            if (operation.data) {
              await calendarService.updateEvent(userId, operation.documentId, operation.data);
            }
            break;

          case 'delete':
            await calendarService.deleteEvent(userId, operation.documentId);
            break;
        }

        // Remove the operation from the queue after successful sync
        offlineStorage.removeFromSyncQueue(operation.id);
      } catch (error) {
        console.error(`Failed to sync calendar operation ${operation.id}:`, error);
        // Keep the operation in the queue for retry later
      }
    }

    // Update last sync timestamp
    offlineStorage.updateLastSync();
  }

  /**
   * Clean up old cached data to free storage space
   */
  cleanupCache(): void {
    offlineStorage.cleanupCalendarCache();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { eventCount: number; storageUsed: number; lastSync: Date | null } {
    const cachedEvents = offlineStorage.getCachedData('calendarEvents') as Record<string, CalendarEvent>;
    const eventCount = Object.keys(cachedEvents || {}).length;
    const storageInfo = offlineStorage.getStorageInfo();
    const lastSync = offlineStorage.getLastSync();

    return {
      eventCount,
      storageUsed: storageInfo.used,
      lastSync: lastSync > 0 ? new Date(lastSync) : null
    };
  }
}

export const offlineCalendarService = new OfflineCalendarService();