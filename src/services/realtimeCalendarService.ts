import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp,
  type Unsubscribe,
  type DocumentChange,
} from "firebase/firestore";
import { db } from "../config/firebase";
import type { CalendarEvent } from "../types";
import { offlineStorage } from "../utils/offlineStorage";
import { ErrorCode, createAppError } from "../types/errors";

export interface CalendarEventChange {
  type: 'added' | 'modified' | 'removed';
  event: CalendarEvent;
  oldEvent?: CalendarEvent; // For modified events
}

export interface RealtimeCalendarOptions {
  onEventChange?: (changes: CalendarEventChange[]) => void;
  onError?: (error: any) => void;
  dateRange?: {
    startDate: Date;
    endDate: Date;
  };
}

/**
 * Real-time calendar service that provides live synchronization of calendar events
 */
class RealtimeCalendarService {
  private listeners: Map<string, Unsubscribe> = new Map();
  private eventCache: Map<string, CalendarEvent> = new Map();

  /**
   * Start listening to calendar events for a user
   */
  subscribeToUserEvents(
    userId: string,
    options: RealtimeCalendarOptions = {}
  ): string {
    if (!userId) {
      throw createAppError(
        ErrorCode.DB_PERMISSION_DENIED,
        "Cannot subscribe to calendar events: User not authenticated."
      );
    }

    const subscriptionId = `user_${userId}_${Date.now()}`;

    try {
      let q = query(
        collection(db, "users", userId, "calendarEvents"),
        orderBy("startDate", "asc")
      );

      // Add date range filter if provided
      if (options.dateRange) {
        q = query(
          collection(db, "users", userId, "calendarEvents"),
          where("startDate", ">=", Timestamp.fromDate(options.dateRange.startDate)),
          where("startDate", "<=", Timestamp.fromDate(options.dateRange.endDate)),
          orderBy("startDate", "asc")
        );
      }

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          try {
            const changes: CalendarEventChange[] = [];

            snapshot.docChanges().forEach((change: DocumentChange) => {
              const data = change.doc.data();
              const event: CalendarEvent = {
                id: change.doc.id,
                ...data,
                createdAt: data.createdAt.toDate(),
                updatedAt: data.updatedAt.toDate(),
                startDate: data.startDate.toDate(),
                endDate: data.endDate.toDate(),
              } as CalendarEvent;

              switch (change.type) {
                case 'added':
                  // Cache the new event
                  this.eventCache.set(event.id, event);
                  offlineStorage.cacheData('calendarEvents', event.id, event);
                  
                  changes.push({
                    type: 'added',
                    event
                  });
                  break;

                case 'modified':
                  const oldEvent = this.eventCache.get(event.id);
                  
                  // Update cache
                  this.eventCache.set(event.id, event);
                  offlineStorage.cacheData('calendarEvents', event.id, event);
                  
                  changes.push({
                    type: 'modified',
                    event,
                    oldEvent
                  });
                  break;

                case 'removed':
                  const removedEvent = this.eventCache.get(event.id);
                  
                  // Remove from cache
                  this.eventCache.delete(event.id);
                  offlineStorage.removeCachedData('calendarEvents', event.id);
                  
                  if (removedEvent) {
                    changes.push({
                      type: 'removed',
                      event: removedEvent
                    });
                  }
                  break;
              }
            });

            // Notify about changes
            if (changes.length > 0 && options.onEventChange) {
              options.onEventChange(changes);
            }
          } catch (error) {
            console.error('Error processing calendar event changes:', error);
            if (options.onError) {
              options.onError(error);
            }
          }
        },
        (error) => {
          console.error('Calendar events subscription error:', error);
          if (options.onError) {
            options.onError(createAppError(
              ErrorCode.DB_NETWORK_ERROR,
              "Failed to listen to calendar events"
            ));
          }
        }
      );

      this.listeners.set(subscriptionId, unsubscribe);
      return subscriptionId;
    } catch (error) {
      console.error('Error setting up calendar events subscription:', error);
      throw createAppError(
        ErrorCode.DB_NETWORK_ERROR,
        "Failed to set up calendar events subscription"
      );
    }
  }

  /**
   * Subscribe to events for a specific date range
   */
  subscribeToDateRange(
    userId: string,
    startDate: Date,
    endDate: Date,
    options: Omit<RealtimeCalendarOptions, 'dateRange'> = {}
  ): string {
    return this.subscribeToUserEvents(userId, {
      ...options,
      dateRange: { startDate, endDate }
    });
  }

  /**
   * Subscribe to events for the current month
   */
  subscribeToCurrentMonth(
    userId: string,
    options: Omit<RealtimeCalendarOptions, 'dateRange'> = {}
  ): string {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    return this.subscribeToDateRange(userId, startOfMonth, endOfMonth, options);
  }

  /**
   * Subscribe to upcoming events (next 30 days)
   */
  subscribeToUpcomingEvents(
    userId: string,
    options: Omit<RealtimeCalendarOptions, 'dateRange'> = {}
  ): string {
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000));

    return this.subscribeToDateRange(userId, now, thirtyDaysFromNow, options);
  }

  /**
   * Unsubscribe from a specific subscription
   */
  unsubscribe(subscriptionId: string): void {
    const unsubscribe = this.listeners.get(subscriptionId);
    if (unsubscribe) {
      unsubscribe();
      this.listeners.delete(subscriptionId);
    }
  }

  /**
   * Unsubscribe from all active subscriptions
   */
  unsubscribeAll(): void {
    this.listeners.forEach((unsubscribe) => {
      unsubscribe();
    });
    this.listeners.clear();
    this.eventCache.clear();
  }

  /**
   * Get the current cached events
   */
  getCachedEvents(): CalendarEvent[] {
    return Array.from(this.eventCache.values());
  }

  /**
   * Get a specific cached event
   */
  getCachedEvent(eventId: string): CalendarEvent | undefined {
    return this.eventCache.get(eventId);
  }

  /**
   * Check if currently subscribed to any events
   */
  hasActiveSubscriptions(): boolean {
    return this.listeners.size > 0;
  }

  /**
   * Get subscription statistics
   */
  getSubscriptionStats(): {
    activeSubscriptions: number;
    cachedEvents: number;
    subscriptionIds: string[];
  } {
    return {
      activeSubscriptions: this.listeners.size,
      cachedEvents: this.eventCache.size,
      subscriptionIds: Array.from(this.listeners.keys())
    };
  }

  /**
   * Handle conflict resolution for concurrent edits
   * Uses last-write-wins strategy with user notification
   */
  resolveConflict(
    localEvent: CalendarEvent,
    remoteEvent: CalendarEvent,
    onConflictResolved?: (resolvedEvent: CalendarEvent, wasConflict: boolean) => void
  ): CalendarEvent {
    // Simple last-write-wins strategy
    const localUpdated = localEvent.updatedAt.getTime();
    const remoteUpdated = remoteEvent.updatedAt.getTime();

    let resolvedEvent: CalendarEvent;
    let wasConflict = false;

    if (remoteUpdated > localUpdated) {
      // Remote version is newer
      resolvedEvent = remoteEvent;
      wasConflict = true;
    } else if (localUpdated > remoteUpdated) {
      // Local version is newer
      resolvedEvent = localEvent;
      wasConflict = true;
    } else {
      // Same timestamp, prefer remote (server) version
      resolvedEvent = remoteEvent;
      wasConflict = false;
    }

    // Update cache with resolved version
    this.eventCache.set(resolvedEvent.id, resolvedEvent);
    offlineStorage.cacheData('calendarEvents', resolvedEvent.id, resolvedEvent);

    // Notify about conflict resolution
    if (onConflictResolved) {
      onConflictResolved(resolvedEvent, wasConflict);
    }

    return resolvedEvent;
  }

  /**
   * Batch update multiple events with conflict resolution
   */
  batchUpdateWithConflictResolution(
    updates: { eventId: string; localEvent: CalendarEvent; remoteEvent: CalendarEvent }[],
    onConflictResolved?: (results: { eventId: string; resolvedEvent: CalendarEvent; wasConflict: boolean }[]) => void
  ): CalendarEvent[] {
    const results: { eventId: string; resolvedEvent: CalendarEvent; wasConflict: boolean }[] = [];
    const resolvedEvents: CalendarEvent[] = [];

    updates.forEach(({ eventId, localEvent, remoteEvent }) => {
      const localUpdated = localEvent.updatedAt.getTime();
      const remoteUpdated = remoteEvent.updatedAt.getTime();
      
      const resolvedEvent = this.resolveConflict(localEvent, remoteEvent);
      const wasConflict = localUpdated !== remoteUpdated;

      results.push({
        eventId,
        resolvedEvent,
        wasConflict
      });

      resolvedEvents.push(resolvedEvent);
    });

    if (onConflictResolved) {
      onConflictResolved(results);
    }

    return resolvedEvents;
  }

  /**
   * Sync local changes with real-time updates
   * This method handles the case where local changes need to be merged with incoming real-time updates
   */
  syncLocalChangesWithRealtime(
    localChanges: CalendarEvent[],
    onSyncComplete?: (syncedEvents: CalendarEvent[], conflicts: number) => void
  ): void {
    let conflictCount = 0;
    const syncedEvents: CalendarEvent[] = [];

    localChanges.forEach(localEvent => {
      const cachedRemoteEvent = this.eventCache.get(localEvent.id);
      
      if (cachedRemoteEvent) {
        // Check for conflicts
        if (cachedRemoteEvent.updatedAt.getTime() !== localEvent.updatedAt.getTime()) {
          conflictCount++;
          const resolvedEvent = this.resolveConflict(localEvent, cachedRemoteEvent);
          syncedEvents.push(resolvedEvent);
        } else {
          // No conflict, use local version
          syncedEvents.push(localEvent);
        }
      } else {
        // Event doesn't exist in remote cache, use local version
        syncedEvents.push(localEvent);
        this.eventCache.set(localEvent.id, localEvent);
      }
    });

    if (onSyncComplete) {
      onSyncComplete(syncedEvents, conflictCount);
    }
  }
}

export const realtimeCalendarService = new RealtimeCalendarService();