import { httpsCallable, getFunctions } from 'firebase/functions';
import type { CalendarEvent, CalendarReminder } from '../types';
import { executeCalendarOperation, calendarQueue, isCalendarAvailable } from '../utils/calendarErrorHandler';

const functions = getFunctions();

// Firebase Functions
const initCalendarAuthFn = httpsCallable(functions, 'initCalendarAuth');
const completeCalendarAuthFn = httpsCallable(functions, 'completeCalendarAuth');
const createCalendarEventFn = httpsCallable(functions, 'createCalendarEvent');
const updateCalendarEventFn = httpsCallable(functions, 'updateCalendarEvent');
const deleteCalendarEventFn = httpsCallable(functions, 'deleteCalendarEvent');

export interface CalendarAuthResult {
  authUrl: string;
}

export interface CalendarEventResult {
  eventId: string;
}

export interface CalendarOperationResult {
  success: boolean;
}

/**
 * Initialize Google Calendar OAuth2 flow
 */
export async function initializeCalendarAuth(): Promise<CalendarAuthResult> {
  const result = await executeCalendarOperation(
    async () => {
      const result = await initCalendarAuthFn();
      return result.data as CalendarAuthResult;
    },
    'initializeCalendarAuth'
  );
  
  if (!result) {
    throw new Error('Failed to initialize calendar authentication');
  }
  
  return result;
}

/**
 * Complete Google Calendar OAuth2 flow
 */
export async function completeCalendarAuth(code: string): Promise<CalendarOperationResult> {
  const result = await executeCalendarOperation(
    async () => {
      const result = await completeCalendarAuthFn({ code });
      return result.data as CalendarOperationResult;
    },
    'completeCalendarAuth'
  );
  
  if (!result) {
    throw new Error('Failed to complete calendar authentication');
  }
  
  return result;
}

/**
 * Create a calendar event
 */
export async function createCalendarEvent(event: CalendarEvent): Promise<string> {
  // Check if calendar is available before attempting
  if (!(await isCalendarAvailable())) {
    throw new Error('Calendar is not available');
  }
  
  const result = await executeCalendarOperation(
    async () => {
      const result = await createCalendarEventFn({ event });
      const data = result.data as CalendarEventResult;
      return data.eventId;
    },
    'createCalendarEvent',
    { maxRetries: 2 } // Fewer retries for create operations
  );
  
  if (result === null) {
    throw new Error('Failed to create calendar event');
  }
  
  return result;
}

/**
 * Update a calendar event
 */
export async function updateCalendarEvent(
  eventId: string, 
  event: Partial<CalendarEvent>
): Promise<void> {
  // Check if calendar is available before attempting
  if (!(await isCalendarAvailable())) {
    throw new Error('Calendar is not available');
  }
  
  const result = await executeCalendarOperation(
    async () => {
      await updateCalendarEventFn({ eventId, event });
      return true;
    },
    'updateCalendarEvent'
  );
  
  if (result === null) {
    throw new Error('Failed to update calendar event');
  }
}

/**
 * Delete a calendar event
 */
export async function deleteCalendarEvent(eventId: string): Promise<void> {
  // Check if calendar is available before attempting
  if (!(await isCalendarAvailable())) {
    throw new Error('Calendar is not available');
  }
  
  const result = await executeCalendarOperation(
    async () => {
      await deleteCalendarEventFn({ eventId });
      return true;
    },
    'deleteCalendarEvent'
  );
  
  if (result === null) {
    throw new Error('Failed to delete calendar event');
  }
}

/**
 * Create calendar event from plant care task
 */
export async function createPlantCareCalendarEvent(
  title: string,
  description: string,
  dueDate: Date,
  plantName?: string
): Promise<string> {
  const event: CalendarEvent = {
    title: `Plant Care: ${title}`,
    description: description || `Care task for plant: ${plantName}`,
    startDate: dueDate,
    endDate: new Date(dueDate.getTime() + 30 * 60000), // 30 minutes
    reminders: [
      { method: 'popup', minutes: 15 },
      { method: 'email', minutes: 60 }
    ]
  };

  return createCalendarEvent(event);
}

/**
 * Create calendar event from project
 */
export async function createProjectCalendarEvent(
  title: string,
  description: string,
  dueDate: Date
): Promise<string> {
  const event: CalendarEvent = {
    title: `Project: ${title}`,
    description: description || 'Household project deadline',
    startDate: dueDate,
    endDate: new Date(dueDate.getTime() + 60 * 60000), // 1 hour
    reminders: [
      { method: 'popup', minutes: 30 },
      { method: 'email', minutes: 24 * 60 } // 1 day
    ]
  };

  return createCalendarEvent(event);
}

/**
 * Create calendar event from simple task
 */
export async function createSimpleTaskCalendarEvent(
  title: string,
  description: string,
  dueDate: Date
): Promise<string> {
  const event: CalendarEvent = {
    title: `Task: ${title}`,
    description: description || 'Household task',
    startDate: dueDate,
    endDate: new Date(dueDate.getTime() + 30 * 60000), // 30 minutes
    reminders: [
      { method: 'popup', minutes: 15 }
    ]
  };

  return createCalendarEvent(event);
}

/**
 * Check if user has connected Google Calendar
 */
export function isCalendarConnected(): boolean {
  // This would be checked from user profile in Firestore
  // For now, return false as a placeholder
  return false;
}

/**
 * Get calendar connection status from user profile
 */
export async function getCalendarConnectionStatus(): Promise<boolean> {
  // This would fetch from Firestore user document
  // Implementation depends on how user profile is managed
  return false;
}
/**
 * Sa
fe calendar operations that handle errors gracefully
 */

/**
 * Safely create calendar event with queuing for retry
 */
export async function safeCreateCalendarEvent(
  event: CalendarEvent,
  taskId: string,
  taskType: 'plant' | 'project' | 'simple'
): Promise<string | null> {
  try {
    return await createCalendarEvent(event);
  } catch (error) {
    console.warn(`Failed to create calendar event for ${taskType} task ${taskId}, queuing for retry:`, error);
    
    // Queue for retry
    calendarQueue.enqueue(
      `create-${taskType}-${taskId}`,
      () => createCalendarEvent(event)
    );
    
    return null;
  }
}

/**
 * Safely update calendar event with queuing for retry
 */
export async function safeUpdateCalendarEvent(
  eventId: string,
  event: Partial<CalendarEvent>,
  taskId: string,
  taskType: 'plant' | 'project' | 'simple'
): Promise<void> {
  try {
    await updateCalendarEvent(eventId, event);
  } catch (error) {
    console.warn(`Failed to update calendar event for ${taskType} task ${taskId}, queuing for retry:`, error);
    
    // Queue for retry
    calendarQueue.enqueue(
      `update-${taskType}-${taskId}`,
      () => updateCalendarEvent(eventId, event)
    );
  }
}

/**
 * Safely delete calendar event with queuing for retry
 */
export async function safeDeleteCalendarEvent(
  eventId: string,
  taskId: string,
  taskType: 'plant' | 'project' | 'simple'
): Promise<void> {
  try {
    await deleteCalendarEvent(eventId);
  } catch (error) {
    console.warn(`Failed to delete calendar event for ${taskType} task ${taskId}, queuing for retry:`, error);
    
    // Queue for retry
    calendarQueue.enqueue(
      `delete-${taskType}-${taskId}`,
      () => deleteCalendarEvent(eventId)
    );
  }
}

/**
 * Manual sync operation for users to retry failed calendar operations
 */
export async function manualSyncCalendar(): Promise<{
  success: boolean;
  message: string;
  pendingOperations: number;
}> {
  try {
    const status = calendarQueue.getStatus();
    
    if (status.pending === 0) {
      return {
        success: true,
        message: 'All calendar operations are up to date.',
        pendingOperations: 0,
      };
    }
    
    // Force process the queue
    // Note: In a real implementation, you might want to trigger immediate processing
    return {
      success: true,
      message: `${status.pending} calendar operations are queued for retry.`,
      pendingOperations: status.pending,
    };
  } catch (error) {
    console.error('Error during manual calendar sync:', error);
    return {
      success: false,
      message: 'Failed to sync calendar. Please try again later.',
      pendingOperations: calendarQueue.getStatus().pending,
    };
  }
}

/**
 * Get calendar sync status
 */
export function getCalendarSyncStatus(): {
  connected: boolean;
  pendingOperations: number;
  processing: boolean;
} {
  const queueStatus = calendarQueue.getStatus();
  
  return {
    connected: true, // This would check actual connection status
    pendingOperations: queueStatus.pending,
    processing: queueStatus.processing,
  };
}