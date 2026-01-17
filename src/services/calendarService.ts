import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
  limit,
} from "firebase/firestore";
import { db, auth } from "../config/firebase";
import type { CalendarEvent, CreateCalendarEventData, UpdateCalendarEventData } from "../types";
import { ErrorCode, createAppError } from "../types/errors";
import { QueryWrapper } from "./queryWrapper";

// ============================================================================
// CALENDAR EVENT CRUD OPERATIONS
// ============================================================================

/**
 * Create a new calendar event
 */
export const createEvent = async (
  userId: string | undefined,
  eventData: CreateCalendarEventData
): Promise<CalendarEvent> => {
  if (!userId) {
    throw createAppError(
      ErrorCode.DB_PERMISSION_DENIED,
      "Cannot create calendar event: User not authenticated."
    );
  }

  // Validate required fields
  if (!eventData.title?.trim()) {
    throw createAppError(
      ErrorCode.VALIDATION_ERROR,
      "Event title is required"
    );
  }

  if (!eventData.startDate || !eventData.endDate) {
    throw createAppError(
      ErrorCode.VALIDATION_ERROR,
      "Event start and end dates are required"
    );
  }

  if (eventData.startDate > eventData.endDate) {
    throw createAppError(
      ErrorCode.VALIDATION_ERROR,
      "Event start date must be before end date"
    );
  }

  try {
    const now = new Date();

    const eventToSave = {
      ...eventData,
      userId,
      description: eventData.description || null,
      notifications: eventData.notifications || [],
      createdAt: Timestamp.fromDate(now),
      updatedAt: Timestamp.fromDate(now),
      startDate: Timestamp.fromDate(eventData.startDate),
      endDate: Timestamp.fromDate(eventData.endDate),
    };

    const docRef = await addDoc(
      collection(db, "users", userId, "calendarEvents"),
      eventToSave
    );

    // Return the created event with the generated ID
    return {
      id: docRef.id,
      ...eventData,
      userId,
      createdAt: now,
      updatedAt: now,
    };
  } catch (error) {
    console.error("Error creating calendar event:", error);
    throw createAppError(
      ErrorCode.DB_NETWORK_ERROR,
      "Failed to create calendar event"
    );
  }
};

/**
 * Get a single calendar event by ID
 */
export const getEvent = async (
  userId: string | undefined,
  eventId: string
): Promise<CalendarEvent | null> => {
  if (!userId) {
    throw createAppError(
      ErrorCode.DB_PERMISSION_DENIED,
      "Cannot get calendar event: User not authenticated."
    );
  }

  try {
    const docRef = doc(db, "users", userId, "calendarEvents", eventId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return null;
    }

    const data = docSnap.data();
    return {
      id: docSnap.id,
      ...data,
      createdAt: data.createdAt.toDate(),
      updatedAt: data.updatedAt.toDate(),
      startDate: data.startDate.toDate(),
      endDate: data.endDate.toDate(),
    } as CalendarEvent;
  } catch (error) {
    console.error("Error getting calendar event:", error);
    throw createAppError(
      ErrorCode.DB_NETWORK_ERROR,
      "Failed to get calendar event"
    );
  }
};

/**
 * Update an existing calendar event
 */
export const updateEvent = async (
  userId: string | undefined,
  eventId: string,
  updates: Partial<Omit<CalendarEvent, 'id' | 'userId' | 'createdAt'>>
): Promise<CalendarEvent> => {
  if (!userId) {
    throw createAppError(
      ErrorCode.DB_PERMISSION_DENIED,
      "Cannot update calendar event: User not authenticated."
    );
  }

  // Validate date logic if dates are being updated
  if (updates.startDate && updates.endDate && updates.startDate > updates.endDate) {
    throw createAppError(
      ErrorCode.VALIDATION_ERROR,
      "Event start date must be before end date"
    );
  }

  try {
    const docRef = doc(db, "users", userId, "calendarEvents", eventId);
    
    // Check if event exists
    const existingEvent = await getEvent(userId, eventId);
    if (!existingEvent) {
      throw createAppError(
        ErrorCode.DB_NOT_FOUND,
        "Calendar event not found"
      );
    }

    const updateData: any = {
      ...updates,
      updatedAt: Timestamp.fromDate(new Date()),
    };

    // Convert Date objects to Timestamps
    if (updates.startDate) {
      updateData.startDate = Timestamp.fromDate(updates.startDate);
    }
    if (updates.endDate) {
      updateData.endDate = Timestamp.fromDate(updates.endDate);
    }

    // Filter out undefined values (Firestore doesn't accept them)
    const cleanData = Object.fromEntries(
      Object.entries(updateData).filter(([_, value]) => value !== undefined)
    ) as Record<string, any>;

    await updateDoc(docRef, cleanData);

    // Return the updated event
    const updatedEvent = await getEvent(userId, eventId);
    if (!updatedEvent) {
      throw createAppError(
        ErrorCode.DB_NETWORK_ERROR,
        "Failed to retrieve updated event"
      );
    }

    return updatedEvent;
  } catch (error) {
    console.error("Error updating calendar event:", error);
    // Re-throw AppError instances (like DB_NOT_FOUND) without modification
    if (error && typeof error === 'object' && 'code' in error) {
      throw error;
    }
    throw createAppError(
      ErrorCode.DB_NETWORK_ERROR,
      "Failed to update calendar event"
    );
  }
};

/**
 * Delete a calendar event
 */
export const deleteEvent = async (
  userId: string | undefined,
  eventId: string
): Promise<void> => {
  if (!userId) {
    throw createAppError(
      ErrorCode.DB_PERMISSION_DENIED,
      "Cannot delete calendar event: User not authenticated."
    );
  }

  try {
    const docRef = doc(db, "users", userId, "calendarEvents", eventId);
    
    // Check if event exists before deleting
    const existingEvent = await getEvent(userId, eventId);
    if (!existingEvent) {
      throw createAppError(
        ErrorCode.DB_NOT_FOUND,
        "Calendar event not found"
      );
    }

    await deleteDoc(docRef);
  } catch (error) {
    console.error("Error deleting calendar event:", error);
    // Re-throw AppError instances (like DB_NOT_FOUND) without modification
    if (error && typeof error === 'object' && 'code' in error) {
      throw error;
    }
    throw createAppError(
      ErrorCode.DB_NETWORK_ERROR,
      "Failed to delete calendar event"
    );
  }
};

// ============================================================================
// CALENDAR EVENT QUERY OPERATIONS
// ============================================================================

/**
 * Get events for a specific date range
 */
export const getEventsForDateRange = async (
  userId: string | undefined,
  startDate: Date,
  endDate: Date
): Promise<CalendarEvent[]> => {
  if (startDate > endDate) {
    throw createAppError(
      ErrorCode.VALIDATION_ERROR,
      "Start date must be before end date"
    );
  }

  return QueryWrapper.executeWithAuthValidation(
    async (authenticatedUserId: string) => {
      const q = query(
        collection(db, "users", authenticatedUserId, "calendarEvents"),
        where("startDate", ">=", Timestamp.fromDate(startDate)),
        where("startDate", "<=", Timestamp.fromDate(endDate)),
        orderBy("startDate", "asc")
      );

      const querySnapshot = await getDocs(q);
      const events: CalendarEvent[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        events.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt.toDate(),
          updatedAt: data.updatedAt.toDate(),
          startDate: data.startDate.toDate(),
          endDate: data.endDate.toDate(),
        } as CalendarEvent);
      });

      return events;
    },
    userId,
    {
      maxRetries: 3,
      retryDelay: 1000,
      requireAuth: true
    }
  );
};

/**
 * Get events for a specific date (all events that occur on this date)
 */
export const getEventsForDate = async (
  userId: string | undefined,
  date: Date
): Promise<CalendarEvent[]> => {
  if (!userId) {
    return [];
  }

  // Simple retry logic with auth token refresh
  let lastError: any;
  const maxRetries = 3;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Ensure we have a fresh auth token on retries
      if (attempt > 0) {
        const currentUser = auth.currentUser;
        if (currentUser) {
          await currentUser.getIdToken(true); // Force refresh
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for propagation
        }
      }

      // Get events that start or end on this date, or span across this date
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      // Query for events that start on or before this day and end on or after this day
      const q = query(
        collection(db, "users", userId, "calendarEvents"),
        where("startDate", "<=", Timestamp.fromDate(endOfDay)),
        where("endDate", ">=", Timestamp.fromDate(startOfDay)),
        orderBy("startDate", "asc")
      );

      const querySnapshot = await getDocs(q);
      const events: CalendarEvent[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        events.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt.toDate(),
          updatedAt: data.updatedAt.toDate(),
          startDate: data.startDate.toDate(),
          endDate: data.endDate.toDate(),
        } as CalendarEvent);
      });

      return events;
    } catch (error) {
      lastError = error;
      console.warn(`getEventsForDate attempt ${attempt + 1} failed:`, error);
      
      // Only retry on permission errors
      if (error?.code !== 'permission-denied' && !error?.message?.includes('Missing or insufficient permissions')) {
        break;
      }
      
      if (attempt === maxRetries - 1) {
        break;
      }
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
    }
  }

  console.error("All retry attempts failed for getEventsForDate:", lastError);
  
  // Return empty array instead of throwing error to prevent UI breakage
  return [];
};

/**
 * Get upcoming events (events starting from now)
 */
export const getUpcomingEvents = async (
  userId: string | undefined,
  limitCount: number = 10
): Promise<CalendarEvent[]> => {
  if (!userId) {
    throw createAppError(
      ErrorCode.DB_PERMISSION_DENIED,
      "Cannot get calendar events: User not authenticated."
    );
  }

  if (limitCount <= 0) {
    throw createAppError(
      ErrorCode.VALIDATION_ERROR,
      "Limit must be greater than 0"
    );
  }

  // Simple retry logic with auth token refresh
  let lastError: any;
  const maxRetries = 3;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Ensure we have a fresh auth token on retries
      if (attempt > 0) {
        const currentUser = auth.currentUser;
        if (currentUser) {
          await currentUser.getIdToken(true); // Force refresh
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for propagation
        }
      }

      const now = new Date();
      
      // Simplified query to avoid composite index issues
      const q = query(
        collection(db, "users", userId, "calendarEvents"),
        where("startDate", ">=", Timestamp.fromDate(now)),
        orderBy("startDate", "asc"),
        limit(limitCount)
      );

      const querySnapshot = await getDocs(q);
      const events: CalendarEvent[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        events.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt.toDate(),
          updatedAt: data.updatedAt.toDate(),
          startDate: data.startDate.toDate(),
          endDate: data.endDate.toDate(),
        } as CalendarEvent);
      });

      return events;
    } catch (error) {
      lastError = error;
      console.warn(`getUpcomingEvents attempt ${attempt + 1} failed:`, error);
      
      // Only retry on permission errors
      if (error?.code !== 'permission-denied' && !error?.message?.includes('Missing or insufficient permissions')) {
        break;
      }
      
      if (attempt === maxRetries - 1) {
        break;
      }
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
    }
  }

  console.error("All retry attempts failed for getUpcomingEvents:", lastError);
  
  // Return empty array instead of throwing error to prevent UI breakage
  return [];
};

/**
 * Get overdue events (events that have passed their end date and are still pending)
 */
export const getOverdueEvents = async (
  userId: string | undefined
): Promise<CalendarEvent[]> => {
  if (!userId) {
    return [];
  }

  // Simple retry logic with auth token refresh
  let lastError: any;
  const maxRetries = 3;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Ensure we have a fresh auth token on retries
      if (attempt > 0) {
        const currentUser = auth.currentUser;
        if (currentUser) {
          await currentUser.getIdToken(true); // Force refresh
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for propagation
        }
      }

      const now = new Date();
      
      const q = query(
        collection(db, "users", userId, "calendarEvents"),
        where("endDate", "<", Timestamp.fromDate(now)),
        where("status", "==", "pending"),
        orderBy("endDate", "desc")
      );

      const querySnapshot = await getDocs(q);
      const events: CalendarEvent[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        events.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt.toDate(),
          updatedAt: data.updatedAt.toDate(),
          startDate: data.startDate.toDate(),
          endDate: data.endDate.toDate(),
        } as CalendarEvent);
      });

      return events;
    } catch (error) {
      lastError = error;
      console.warn(`getOverdueEvents attempt ${attempt + 1} failed:`, error);
      
      // Only retry on permission errors
      if (error?.code !== 'permission-denied' && !error?.message?.includes('Missing or insufficient permissions')) {
        break;
      }
      
      if (attempt === maxRetries - 1) {
        break;
      }
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
    }
  }

  console.error("All retry attempts failed for getOverdueEvents:", lastError);
  
  // Return empty array instead of throwing error to prevent UI breakage
  return [];
};

// ============================================================================
// RECURRING EVENT GENERATION SYSTEM
// ============================================================================

/**
 * Generate recurring events based on a recurrence pattern
 */
export const generateRecurringEvents = async (
  userId: string | undefined,
  baseEvent: CalendarEvent,
  endDate?: Date
): Promise<CalendarEvent[]> => {
  if (!userId) {
    throw createAppError(
      ErrorCode.DB_PERMISSION_DENIED,
      "Cannot generate recurring events: User not authenticated."
    );
  }

  if (!baseEvent.recurrence) {
    throw createAppError(
      ErrorCode.VALIDATION_ERROR,
      "Cannot generate recurring events: Base event has no recurrence pattern"
    );
  }

  try {
    // Import recurrence utilities
    const { 
      validateRecurrencePattern, 
      generateOccurrencesInRange, 
      generateSeriesId 
    } = await import('../utils/recurrenceUtils');

    // Validate the recurrence pattern
    const validation = validateRecurrencePattern(baseEvent.recurrence);
    if (!validation.isValid) {
      throw createAppError(
        ErrorCode.VALIDATION_ERROR,
        `Invalid recurrence pattern: ${validation.errors.map(e => e.message).join(', ')}`
      );
    }

    // Determine the end date for generation
    const generationEndDate = endDate || 
      baseEvent.recurrence.endDate || 
      new Date(Date.now() + (365 * 24 * 60 * 60 * 1000)); // Default to 1 year from now

    // Generate occurrence dates
    const occurrenceDates = generateOccurrencesInRange(
      baseEvent.startDate,
      baseEvent.recurrence,
      baseEvent.startDate,
      generationEndDate,
      100 // Limit to 100 occurrences for performance
    );

    // Create series ID if not already present
    const seriesId = baseEvent.recurrence.seriesId || generateSeriesId();

    // Generate calendar events for each occurrence
    const generatedEvents: CalendarEvent[] = [];
    const batch = [];

    for (let i = 1; i < occurrenceDates.length; i++) { // Skip first occurrence (base event)
      const occurrenceDate = occurrenceDates[i];
      
      // Calculate duration from base event
      const duration = baseEvent.endDate.getTime() - baseEvent.startDate.getTime();
      const eventEndDate = new Date(occurrenceDate.getTime() + duration);

      const eventData: CreateCalendarEventData = {
        userId,
        title: baseEvent.title,
        description: baseEvent.description,
        startDate: occurrenceDate,
        endDate: eventEndDate,
        allDay: baseEvent.allDay,
        type: baseEvent.type,
        sourceId: baseEvent.sourceId,
        status: 'pending', // New occurrences are always pending
        notifications: baseEvent.notifications,
        recurrence: {
          ...baseEvent.recurrence,
          seriesId
        }
      };

      batch.push(createEvent(userId, eventData));
    }

    // Update base event with series ID if it doesn't have one
    if (!baseEvent.recurrence.seriesId) {
      await updateEvent(userId, baseEvent.id, {
        recurrence: {
          ...baseEvent.recurrence,
          seriesId
        }
      });
    }

    // Execute all event creation operations
    const createdEvents = await Promise.all(batch);
    generatedEvents.push(...createdEvents);

    return generatedEvents;
  } catch (error) {
    console.error("Error generating recurring events:", error);
    // Re-throw AppError instances without modification
    if (error && typeof error === 'object' && 'code' in error) {
      throw error;
    }
    throw createAppError(
      ErrorCode.DB_NETWORK_ERROR,
      "Failed to generate recurring events"
    );
  }
};

/**
 * Update all events in a recurring series
 */
export const updateRecurringSeries = async (
  userId: string | undefined,
  seriesId: string,
  updates: Partial<Omit<CalendarEvent, 'id' | 'userId' | 'createdAt' | 'startDate' | 'endDate'>>,
  updateFutureOnly: boolean = false
): Promise<CalendarEvent[]> => {
  if (!userId) {
    throw createAppError(
      ErrorCode.DB_PERMISSION_DENIED,
      "Cannot update recurring series: User not authenticated."
    );
  }

  if (!seriesId) {
    throw createAppError(
      ErrorCode.VALIDATION_ERROR,
      "Series ID is required"
    );
  }

  try {
    // Get all events in the series
    const seriesEvents = await getEventsBySeries(userId, seriesId);
    
    if (seriesEvents.length === 0) {
      throw createAppError(
        ErrorCode.DB_NOT_FOUND,
        "No events found for the specified series"
      );
    }

    const now = new Date();
    const eventsToUpdate = updateFutureOnly 
      ? seriesEvents.filter(event => event.startDate >= now)
      : seriesEvents;

    // Update each event in the series
    const batch = eventsToUpdate.map(event => 
      updateEvent(userId, event.id, updates)
    );

    const updatedEvents = await Promise.all(batch);
    return updatedEvents;
  } catch (error) {
    console.error("Error updating recurring series:", error);
    // Re-throw AppError instances without modification
    if (error && typeof error === 'object' && 'code' in error) {
      throw error;
    }
    throw createAppError(
      ErrorCode.DB_NETWORK_ERROR,
      "Failed to update recurring series"
    );
  }
};

/**
 * Delete all events in a recurring series
 */
export const deleteRecurringSeries = async (
  userId: string | undefined,
  seriesId: string,
  deleteFutureOnly: boolean = false
): Promise<void> => {
  if (!userId) {
    throw createAppError(
      ErrorCode.DB_PERMISSION_DENIED,
      "Cannot delete recurring series: User not authenticated."
    );
  }

  if (!seriesId) {
    throw createAppError(
      ErrorCode.VALIDATION_ERROR,
      "Series ID is required"
    );
  }

  try {
    // Get all events in the series
    const seriesEvents = await getEventsBySeries(userId, seriesId);
    
    if (seriesEvents.length === 0) {
      return; // No events to delete
    }

    const now = new Date();
    const eventsToDelete = deleteFutureOnly 
      ? seriesEvents.filter(event => event.startDate >= now)
      : seriesEvents;

    // Delete each event in the series
    const batch = eventsToDelete.map(event => 
      deleteEvent(userId, event.id)
    );

    await Promise.all(batch);
  } catch (error) {
    console.error("Error deleting recurring series:", error);
    // Re-throw AppError instances without modification
    if (error && typeof error === 'object' && 'code' in error) {
      throw error;
    }
    throw createAppError(
      ErrorCode.DB_NETWORK_ERROR,
      "Failed to delete recurring series"
    );
  }
};

/**
 * Get all events in a recurring series
 */
export const getEventsBySeries = async (
  userId: string | undefined,
  seriesId: string
): Promise<CalendarEvent[]> => {
  if (!userId) {
    throw createAppError(
      ErrorCode.DB_PERMISSION_DENIED,
      "Cannot get series events: User not authenticated."
    );
  }

  if (!seriesId) {
    throw createAppError(
      ErrorCode.VALIDATION_ERROR,
      "Series ID is required"
    );
  }

  try {
    const q = query(
      collection(db, "users", userId, "calendarEvents"),
      where("recurrence.seriesId", "==", seriesId),
      orderBy("startDate", "asc")
    );

    const querySnapshot = await getDocs(q);
    const events: CalendarEvent[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      events.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate(),
        startDate: data.startDate.toDate(),
        endDate: data.endDate.toDate(),
      } as CalendarEvent);
    });

    return events;
  } catch (error) {
    console.error("Error getting events by series:", error);
    throw createAppError(
      ErrorCode.DB_NETWORK_ERROR,
      "Failed to get events by series"
    );
  }
};

/**
 * Generate recurring events for a specific date range
 */
export const generateRecurringEventsForRange = async (
  userId: string | undefined,
  baseEvent: CalendarEvent,
  startDate: Date,
  endDate: Date
): Promise<CalendarEvent[]> => {
  if (!userId) {
    throw createAppError(
      ErrorCode.DB_PERMISSION_DENIED,
      "Cannot generate recurring events: User not authenticated."
    );
  }

  if (!baseEvent.recurrence) {
    throw createAppError(
      ErrorCode.VALIDATION_ERROR,
      "Cannot generate recurring events: Base event has no recurrence pattern"
    );
  }

  if (startDate > endDate) {
    throw createAppError(
      ErrorCode.VALIDATION_ERROR,
      "Start date must be before end date"
    );
  }

  try {
    // Import recurrence utilities
    const { 
      validateRecurrencePattern, 
      generateOccurrencesInRange, 
      generateSeriesId 
    } = await import('../utils/recurrenceUtils');

    // Validate the recurrence pattern
    const validation = validateRecurrencePattern(baseEvent.recurrence);
    if (!validation.isValid) {
      throw createAppError(
        ErrorCode.VALIDATION_ERROR,
        `Invalid recurrence pattern: ${validation.errors.map(e => e.message).join(', ')}`
      );
    }

    // Generate occurrence dates within the specified range
    const occurrenceDates = generateOccurrencesInRange(
      baseEvent.startDate,
      baseEvent.recurrence,
      startDate,
      endDate,
      50 // Limit for performance
    );

    // Create series ID if not already present
    const seriesId = baseEvent.recurrence.seriesId || generateSeriesId();

    // Generate calendar events for each occurrence
    const generatedEvents: CalendarEvent[] = [];
    const batch = [];

    for (const occurrenceDate of occurrenceDates) {
      // Skip if this is the base event date
      if (occurrenceDate.getTime() === baseEvent.startDate.getTime()) {
        continue;
      }
      
      // Calculate duration from base event
      const duration = baseEvent.endDate.getTime() - baseEvent.startDate.getTime();
      const eventEndDate = new Date(occurrenceDate.getTime() + duration);

      const eventData: CreateCalendarEventData = {
        userId,
        title: baseEvent.title,
        description: baseEvent.description,
        startDate: occurrenceDate,
        endDate: eventEndDate,
        allDay: baseEvent.allDay,
        type: baseEvent.type,
        sourceId: baseEvent.sourceId,
        status: 'pending',
        notifications: baseEvent.notifications,
        recurrence: {
          ...baseEvent.recurrence,
          seriesId
        }
      };

      batch.push(createEvent(userId, eventData));
    }

    // Execute all event creation operations
    if (batch.length > 0) {
      const createdEvents = await Promise.all(batch);
      generatedEvents.push(...createdEvents);
    }

    return generatedEvents;
  } catch (error) {
    console.error("Error generating recurring events for range:", error);
    // Re-throw AppError instances without modification
    if (error && typeof error === 'object' && 'code' in error) {
      throw error;
    }
    throw createAppError(
      ErrorCode.DB_NETWORK_ERROR,
      "Failed to generate recurring events for range"
    );
  }
};

// ============================================================================
// CALENDAR EVENT VALIDATION UTILITIES
// ============================================================================

/**
 * Validate calendar event data
 */
export const validateEventData = (eventData: CreateCalendarEventData): string[] => {
  const errors: string[] = [];

  if (!eventData.title?.trim()) {
    errors.push("Event title is required");
  }

  if (!eventData.startDate) {
    errors.push("Event start date is required");
  }

  if (!eventData.endDate) {
    errors.push("Event end date is required");
  }

  if (eventData.startDate && eventData.endDate && eventData.startDate > eventData.endDate) {
    errors.push("Event start date must be before end date");
  }

  if (!['task', 'project', 'plant_care', 'custom'].includes(eventData.type)) {
    errors.push("Invalid event type");
  }

  if (!['pending', 'completed', 'cancelled'].includes(eventData.status)) {
    errors.push("Invalid event status");
  }

  // Validate notifications if provided
  if (eventData.notifications) {
    eventData.notifications.forEach((notification, index) => {
      if (!['browser', 'in_app'].includes(notification.type)) {
        errors.push(`Invalid notification type at index ${index}`);
      }
      if (typeof notification.timing !== 'number' || notification.timing < 0) {
        errors.push(`Invalid notification timing at index ${index}`);
      }
    });
  }

  return errors;
};

/**
 * Sanitize event data before saving
 */
export const sanitizeEventData = (eventData: CreateCalendarEventData): CreateCalendarEventData => {
  return {
    ...eventData,
    title: eventData.title.trim(),
    description: eventData.description?.trim() || undefined,
    notifications: eventData.notifications || [],
  };
};

// ============================================================================
// CALENDAR EVENT UTILITY FUNCTIONS
// ============================================================================

/**
 * Filter events by type
 */
export const filterEventsByType = (
  events: CalendarEvent[],
  eventType?: 'task' | 'project' | 'plant_care' | 'custom'
): CalendarEvent[] => {
  if (!eventType) return events;
  return events.filter((event) => event.type === eventType);
};

/**
 * Filter events by status
 */
export const filterEventsByStatus = (
  events: CalendarEvent[],
  status?: 'pending' | 'completed' | 'cancelled'
): CalendarEvent[] => {
  if (!status) return events;
  return events.filter((event) => event.status === status);
};

/**
 * Search events by title or description
 */
export const searchEvents = (
  events: CalendarEvent[],
  searchTerm: string
): CalendarEvent[] => {
  if (!searchTerm.trim()) return events;

  const term = searchTerm.toLowerCase();
  return events.filter(
    (event) =>
      event.title.toLowerCase().includes(term) ||
      (event.description && event.description.toLowerCase().includes(term))
  );
};

/**
 * Sort events by start date
 */
export const sortEventsByStartDate = (
  events: CalendarEvent[],
  ascending: boolean = true
): CalendarEvent[] => {
  return [...events].sort((a, b) => {
    const comparison = a.startDate.getTime() - b.startDate.getTime();
    return ascending ? comparison : -comparison;
  });
};

/**
 * Get events happening today
 */
export const getTodaysEvents = async (
  userId: string | undefined
): Promise<CalendarEvent[]> => {
  const today = new Date();
  return getEventsForDate(userId, today);
};

/**
 * Get events for the current week
 */
export const getThisWeeksEvents = async (
  userId: string | undefined
): Promise<CalendarEvent[]> => {
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday
  startOfWeek.setHours(0, 0, 0, 0);
  
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6); // Saturday
  endOfWeek.setHours(23, 59, 59, 999);

  return getEventsForDateRange(userId, startOfWeek, endOfWeek);
};

/**
 * Get events for the current month
 */
export const getThisMonthsEvents = async (
  userId: string | undefined
): Promise<CalendarEvent[]> => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  return getEventsForDateRange(userId, startOfMonth, endOfMonth);
};

// ============================================================================
// EVENT SYNCHRONIZATION FROM EXISTING ENTITIES
// ============================================================================

/**
 * Sync calendar events from SimpleTask entities
 */
export const syncFromTasks = async (
  userId: string | undefined
): Promise<void> => {
  if (!userId) {
    throw createAppError(
      ErrorCode.DB_PERMISSION_DENIED,
      "Cannot sync tasks: User not authenticated."
    );
  }

  try {
    // Import SimpleTaskService dynamically to avoid circular dependencies
    const { getUserSimpleTasks } = await import('./simpleTaskService');
    
    const tasks = await getUserSimpleTasks(userId);
    
    // Get existing task events to avoid duplicates
    const existingTaskEvents = await getEventsBySourceType(userId, 'task');
    const existingTaskEventMap = new Map(
      existingTaskEvents.map(event => [event.sourceId, event])
    );

    const batch = [];

    for (const task of tasks) {
      if (!task.dueDate) continue; // Skip tasks without due dates

      const existingEvent = existingTaskEventMap.get(task.id);
      
      if (existingEvent) {
        // Update existing event if task has changed
        const shouldUpdate = 
          existingEvent.title !== task.title ||
          existingEvent.description !== task.description ||
          existingEvent.startDate.getTime() !== task.dueDate.getTime() ||
          existingEvent.status !== (task.completed ? 'completed' : 'pending');

        if (shouldUpdate) {
          batch.push(updateEvent(userId, existingEvent.id, {
            title: task.title,
            description: task.description,
            startDate: task.dueDate,
            endDate: task.dueDate,
            status: task.completed ? 'completed' : 'pending'
          }));
        }
      } else {
        // Create new event for task
        const eventData: CreateCalendarEventData = {
          userId,
          title: task.title,
          description: task.description,
          startDate: task.dueDate,
          endDate: task.dueDate,
          allDay: true,
          type: 'task',
          sourceId: task.id,
          status: task.completed ? 'completed' : 'pending',
          notifications: []
        };

        batch.push(createEvent(userId, eventData));
      }
    }

    // Remove events for deleted tasks
    const currentTaskIds = new Set(tasks.map(task => task.id));
    for (const event of existingTaskEvents) {
      if (event.sourceId && !currentTaskIds.has(event.sourceId)) {
        batch.push(deleteEvent(userId, event.id));
      }
    }

    // Execute all operations
    await Promise.all(batch);
  } catch (error) {
    console.error("Error syncing tasks to calendar:", error);
    throw createAppError(
      ErrorCode.DB_NETWORK_ERROR,
      "Failed to sync tasks to calendar"
    );
  }
};

/**
 * Sync calendar events from Project entities
 */
export const syncFromProjects = async (
  userId: string | undefined
): Promise<void> => {
  if (!userId) {
    throw createAppError(
      ErrorCode.DB_PERMISSION_DENIED,
      "Cannot sync projects: User not authenticated."
    );
  }

  try {
    // Import ProjectService dynamically to avoid circular dependencies
    const { getUserProjects } = await import('./projectService');
    
    const projects = await getUserProjects(userId);
    
    // Get existing project events to avoid duplicates
    const existingProjectEvents = await getEventsBySourceType(userId, 'project');
    const existingProjectEventMap = new Map(
      existingProjectEvents.map(event => [event.sourceId, event])
    );

    const batch = [];

    for (const project of projects) {
      if (!project.dueDate) continue; // Skip projects without due dates

      const existingEvent = existingProjectEventMap.get(project.id);
      
      if (existingEvent) {
        // Update existing event if project has changed
        const shouldUpdate = 
          existingEvent.title !== project.title ||
          existingEvent.description !== project.description ||
          existingEvent.startDate.getTime() !== project.dueDate.getTime() ||
          existingEvent.status !== (project.status === 'finished' ? 'completed' : 'pending');

        if (shouldUpdate) {
          batch.push(updateEvent(userId, existingEvent.id, {
            title: project.title,
            description: project.description,
            startDate: project.dueDate,
            endDate: project.dueDate,
            status: project.status === 'finished' ? 'completed' : 'pending'
          }));
        }
      } else {
        // Create new event for project
        const eventData: CreateCalendarEventData = {
          userId,
          title: `Project: ${project.title}`,
          description: project.description,
          startDate: project.dueDate,
          endDate: project.dueDate,
          allDay: true,
          type: 'project',
          sourceId: project.id,
          status: project.status === 'finished' ? 'completed' : 'pending',
          notifications: []
        };

        batch.push(createEvent(userId, eventData));
      }

      // Also sync subtasks with due dates
      for (const subtask of project.subtasks || []) {
        if (!subtask.dueDate) continue;

        const subtaskEventId = `${project.id}-${subtask.id}`;
        const existingSubtaskEvent = existingProjectEventMap.get(subtaskEventId);

        if (existingSubtaskEvent) {
          // Update existing subtask event
          const shouldUpdate = 
            existingSubtaskEvent.title !== `${project.title}: ${subtask.title}` ||
            existingSubtaskEvent.description !== subtask.description ||
            existingSubtaskEvent.startDate.getTime() !== subtask.dueDate.getTime() ||
            existingSubtaskEvent.status !== (subtask.status === 'finished' ? 'completed' : 'pending');

          if (shouldUpdate) {
            batch.push(updateEvent(userId, existingSubtaskEvent.id, {
              title: `${project.title}: ${subtask.title}`,
              description: subtask.description,
              startDate: subtask.dueDate,
              endDate: subtask.dueDate,
              status: subtask.status === 'finished' ? 'completed' : 'pending'
            }));
          }
        } else {
          // Create new event for subtask
          const eventData: CreateCalendarEventData = {
            userId,
            title: `${project.title}: ${subtask.title}`,
            description: subtask.description,
            startDate: subtask.dueDate,
            endDate: subtask.dueDate,
            allDay: true,
            type: 'project',
            sourceId: subtaskEventId,
            status: subtask.status === 'finished' ? 'completed' : 'pending',
            notifications: []
          };

          batch.push(createEvent(userId, eventData));
        }
      }
    }

    // Remove events for deleted projects and subtasks
    const currentProjectIds = new Set(projects.map(project => project.id));
    const currentSubtaskIds = new Set();
    
    projects.forEach(project => {
      project.subtasks?.forEach(subtask => {
        currentSubtaskIds.add(`${project.id}-${subtask.id}`);
      });
    });

    for (const event of existingProjectEvents) {
      if (event.sourceId) {
        const isSubtask = event.sourceId.includes('-');
        const shouldDelete = isSubtask 
          ? !currentSubtaskIds.has(event.sourceId)
          : !currentProjectIds.has(event.sourceId);
          
        if (shouldDelete) {
          batch.push(deleteEvent(userId, event.id));
        }
      }
    }

    // Execute all operations
    await Promise.all(batch);
  } catch (error) {
    console.error("Error syncing projects to calendar:", error);
    throw createAppError(
      ErrorCode.DB_NETWORK_ERROR,
      "Failed to sync projects to calendar"
    );
  }
};

/**
 * Sync calendar events from Plant care tasks
 */
export const syncFromPlantCare = async (
  userId: string | undefined
): Promise<void> => {
  if (!userId) {
    throw createAppError(
      ErrorCode.DB_PERMISSION_DENIED,
      "Cannot sync plant care: User not authenticated."
    );
  }

  try {
    // Import PlantService dynamically to avoid circular dependencies
    const { PlantService } = await import('./plantService');
    
    const plants = await PlantService.getUserPlants(userId);
    
    // Get existing plant care events to avoid duplicates
    const existingPlantEvents = await getEventsBySourceType(userId, 'plant_care');
    const existingPlantEventMap = new Map(
      existingPlantEvents.map(event => [event.sourceId, event])
    );

    const batch = [];

    for (const plant of plants) {
      for (const careTask of plant.careTasks || []) {
        if (!careTask.dueDate) continue;

        const careTaskEventId = `${plant.id}-${careTask.id}`;
        const existingEvent = existingPlantEventMap.get(careTaskEventId);

        if (existingEvent) {
          // Update existing event if care task has changed
          const shouldUpdate = 
            existingEvent.title !== `${plant.name}: ${careTask.title}` ||
            existingEvent.description !== careTask.description ||
            existingEvent.startDate.getTime() !== careTask.dueDate.getTime() ||
            existingEvent.status !== (careTask.completed ? 'completed' : 'pending');

          if (shouldUpdate) {
            batch.push(updateEvent(userId, existingEvent.id, {
              title: `${plant.name}: ${careTask.title}`,
              description: careTask.description,
              startDate: careTask.dueDate,
              endDate: careTask.dueDate,
              status: careTask.completed ? 'completed' : 'pending'
            }));
          }
        } else {
          // Create new event for care task
          const eventData: CreateCalendarEventData = {
            userId,
            title: `${plant.name}: ${careTask.title}`,
            description: careTask.description,
            startDate: careTask.dueDate,
            endDate: careTask.dueDate,
            allDay: true,
            type: 'plant_care',
            sourceId: careTaskEventId,
            status: careTask.completed ? 'completed' : 'pending',
            notifications: []
          };

          batch.push(createEvent(userId, eventData));
        }

        // Handle recurring care tasks
        if (careTask.recurrence && !careTask.completed) {
          // Generate future occurrences for recurring tasks
          const futureEvents = generateRecurringCareEvents(
            userId,
            plant,
            careTask,
            careTask.dueDate,
            30 // Generate events for next 30 days
          );

          batch.push(...futureEvents.map(eventData => createEvent(userId, eventData)));
        }
      }
    }

    // Remove events for deleted plants and care tasks
    const currentCareTaskIds = new Set();
    
    plants.forEach(plant => {
      plant.careTasks?.forEach(careTask => {
        currentCareTaskIds.add(`${plant.id}-${careTask.id}`);
      });
    });

    for (const event of existingPlantEvents) {
      if (event.sourceId && !currentCareTaskIds.has(event.sourceId)) {
        batch.push(deleteEvent(userId, event.id));
      }
    }

    // Execute all operations
    await Promise.all(batch);
  } catch (error) {
    console.error("Error syncing plant care to calendar:", error);
    throw createAppError(
      ErrorCode.DB_NETWORK_ERROR,
      "Failed to sync plant care to calendar"
    );
  }
};

/**
 * Get events by source type (helper function)
 */
const getEventsBySourceType = async (
  userId: string,
  type: 'task' | 'project' | 'plant_care' | 'custom'
): Promise<CalendarEvent[]> => {
  try {
    const q = query(
      collection(db, "users", userId, "calendarEvents"),
      where("type", "==", type),
      orderBy("startDate", "asc")
    );

    const querySnapshot = await getDocs(q);
    const events: CalendarEvent[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      events.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate(),
        startDate: data.startDate.toDate(),
        endDate: data.endDate.toDate(),
      } as CalendarEvent);
    });

    return events;
  } catch (error) {
    console.error(`Error getting ${type} events:`, error);
    throw createAppError(
      ErrorCode.DB_NETWORK_ERROR,
      `Failed to get ${type} events`
    );
  }
};

/**
 * Generate recurring care events (helper function)
 */
const generateRecurringCareEvents = (
  userId: string,
  plant: any,
  careTask: any,
  startDate: Date,
  daysAhead: number
): CreateCalendarEventData[] => {
  const events: CreateCalendarEventData[] = [];
  
  if (!careTask.recurrence) return events;

  const { type, interval } = careTask.recurrence;
  let currentDate = new Date(startDate);
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + daysAhead);

  while (currentDate <= endDate) {
    // Calculate next occurrence
    switch (type) {
      case 'daily':
        currentDate.setDate(currentDate.getDate() + interval);
        break;
      case 'weekly':
        currentDate.setDate(currentDate.getDate() + (interval * 7));
        break;
      case 'monthly':
        currentDate.setMonth(currentDate.getMonth() + interval);
        break;
      case 'yearly':
        currentDate.setFullYear(currentDate.getFullYear() + interval);
        break;
      default:
        return events; // Invalid recurrence type
    }

    if (currentDate <= endDate) {
      const eventData: CreateCalendarEventData = {
        userId,
        title: `${plant.name}: ${careTask.title}`,
        description: careTask.description,
        startDate: new Date(currentDate),
        endDate: new Date(currentDate),
        allDay: true,
        type: 'plant_care',
        sourceId: `${plant.id}-${careTask.id}-${currentDate.getTime()}`,
        status: 'pending',
        notifications: [],
        recurrence: careTask.recurrence
      };

      events.push(eventData);
    }
  }

  return events;
};

/**
 * Sync all entities to calendar events
 */
export const syncAllToCalendar = async (
  userId: string | undefined
): Promise<void> => {
  if (!userId) {
    throw createAppError(
      ErrorCode.DB_PERMISSION_DENIED,
      "Cannot sync to calendar: User not authenticated."
    );
  }

  try {
    await Promise.all([
      syncFromTasks(userId),
      syncFromProjects(userId),
      syncFromPlantCare(userId)
    ]);
  } catch (error) {
    console.error("Error syncing all to calendar:", error);
    throw createAppError(
      ErrorCode.DB_NETWORK_ERROR,
      "Failed to sync all entities to calendar"
    );
  }
};