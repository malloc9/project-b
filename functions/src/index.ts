import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onDocumentCreated, onDocumentUpdated, onDocumentDeleted } from "firebase-functions/v2/firestore";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { google } from "googleapis";
import type { OAuth2Client } from "google-auth-library";

// Initialize Firebase Admin
initializeApp();
const db = getFirestore();

// Google Calendar API setup
const SCOPES = ["https://www.googleapis.com/auth/calendar"];

interface CalendarEvent {
  id?: string;
  title: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  reminders?: Array<{
    method: "email" | "popup";
    minutes: number;
  }>;
}

interface UserCalendarConfig {
  accessToken: string;
  refreshToken: string;
  expiryDate?: number;
}

/**
 * Get OAuth2 client for a user
 */
function getOAuth2Client(): OAuth2Client {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

/**
 * Get authenticated calendar client for a user
 */
async function getCalendarClient(userId: string): Promise<ReturnType<typeof google.calendar>> {
  const userDoc = await db.collection("users").doc(userId).get();
  const userData = userDoc.data();
  
  if (!userData?.calendarConfig) {
    throw new HttpsError("failed-precondition", "User has not connected Google Calendar");
  }

  const calendarConfig: UserCalendarConfig = userData.calendarConfig;
  const oauth2Client = getOAuth2Client();
  
  oauth2Client.setCredentials({
    access_token: calendarConfig.accessToken,
    refresh_token: calendarConfig.refreshToken,
    expiry_date: calendarConfig.expiryDate,
  });

  return google.calendar({version: "v3", auth: oauth2Client});
}

/**
 * Initialize OAuth2 flow for Google Calendar access
 */
export const initCalendarAuth = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  const oauth2Client = getOAuth2Client();
  
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    prompt: "consent",
  });

  return {authUrl};
});

/**
 * Complete OAuth2 flow and store tokens
 */
export const completeCalendarAuth = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  const {code} = request.data;
  if (!code) {
    throw new HttpsError("invalid-argument", "Authorization code is required");
  }

  try {
    const oauth2Client = getOAuth2Client();
    const {tokens} = await oauth2Client.getToken(code);
    
    const calendarConfig: UserCalendarConfig = {
      accessToken: tokens.access_token!,
      refreshToken: tokens.refresh_token!,
      expiryDate: tokens.expiry_date,
    };

    await db.collection("users").doc(request.auth.uid).update({
      calendarConfig,
      calendarConnected: true,
    });

    return {success: true};
  } catch (error) {
    console.error("Error completing calendar auth:", error);
    throw new HttpsError("internal", "Failed to complete calendar authentication");
  }
});

/**
 * Create a calendar event
 */
export const createCalendarEvent = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  const {event}: {event: CalendarEvent} = request.data;
  if (!event) {
    throw new HttpsError("invalid-argument", "Event data is required");
  }

  try {
    const calendar = await getCalendarClient(request.auth.uid);
    
    const calendarEvent = {
      summary: event.title,
      description: event.description,
      start: {
        dateTime: event.startDate.toISOString(),
        timeZone: "UTC",
      },
      end: {
        dateTime: event.endDate.toISOString(),
        timeZone: "UTC",
      },
      reminders: {
        useDefault: false,
        overrides: event.reminders || [
          {method: "popup", minutes: 15},
          {method: "email", minutes: 60},
        ],
      },
    };

    const response = await calendar.events.insert({
      calendarId: "primary",
      resource: calendarEvent,
    });

    return {eventId: response.data.id};
  } catch (error) {
    console.error("Error creating calendar event:", error);
    throw new HttpsError("internal", "Failed to create calendar event");
  }
});

/**
 * Update a calendar event
 */
export const updateCalendarEvent = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  const {eventId, event}: {eventId: string; event: Partial<CalendarEvent>} = request.data;
  if (!eventId || !event) {
    throw new HttpsError("invalid-argument", "Event ID and event data are required");
  }

  try {
    const calendar = await getCalendarClient(request.auth.uid);
    
    const calendarEvent: {
      summary?: string;
      description?: string;
      start?: { dateTime: string; timeZone: string };
      end?: { dateTime: string; timeZone: string };
      reminders?: { useDefault: boolean; overrides: Array<{ method: string; minutes: number }> };
    } = {};
    if (event.title) calendarEvent.summary = event.title;
    if (event.description) calendarEvent.description = event.description;
    if (event.startDate) {
      calendarEvent.start = {
        dateTime: event.startDate.toISOString(),
        timeZone: "UTC",
      };
    }
    if (event.endDate) {
      calendarEvent.end = {
        dateTime: event.endDate.toISOString(),
        timeZone: "UTC",
      };
    }
    if (event.reminders) {
      calendarEvent.reminders = {
        useDefault: false,
        overrides: event.reminders,
      };
    }

    await calendar.events.update({
      calendarId: "primary",
      eventId: eventId,
      resource: calendarEvent,
    });

    return {success: true};
  } catch (error) {
    console.error("Error updating calendar event:", error);
    throw new HttpsError("internal", "Failed to update calendar event");
  }
});

/**
 * Delete a calendar event
 */
export const deleteCalendarEvent = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  const {eventId}: {eventId: string} = request.data;
  if (!eventId) {
    throw new HttpsError("invalid-argument", "Event ID is required");
  }

  try {
    const calendar = await getCalendarClient(request.auth.uid);
    
    await calendar.events.delete({
      calendarId: "primary",
      eventId: eventId,
    });

    return {success: true};
  } catch (error) {
    console.error("Error deleting calendar event:", error);
    throw new HttpsError("internal", "Failed to delete calendar event");
  }
});

// Firestore triggers for automatic calendar sync

/**
 * Auto-sync plant care tasks to calendar
 */
export const syncPlantCareTask = onDocumentCreated("users/{userId}/plantCareTasks/{taskId}", async (event) => {
  const taskData = event.data?.data();
  const userId = event.params.userId;
  
  if (!taskData || !taskData.dueDate) return;

  try {
    const calendar = await getCalendarClient(userId);
    
    const calendarEvent = {
      summary: `Plant Care: ${taskData.title}`,
      description: taskData.description || `Care task for plant: ${taskData.plantName}`,
      start: {
        dateTime: taskData.dueDate.toDate().toISOString(),
        timeZone: "UTC",
      },
      end: {
        dateTime: new Date(taskData.dueDate.toDate().getTime() + 30 * 60000).toISOString(), // 30 minutes
        timeZone: "UTC",
      },
      reminders: {
        useDefault: false,
        overrides: [
          {method: "popup", minutes: 15},
          {method: "email", minutes: 60},
        ],
      },
    };

    const response = await calendar.events.insert({
      calendarId: "primary",
      resource: calendarEvent,
    });

    // Update the task with calendar event ID
    await event.data?.ref.update({
      calendarEventId: response.data.id,
    });
  } catch (error) {
    console.error("Error syncing plant care task to calendar:", error);
  }
});

/**
 * Auto-sync projects to calendar
 */
export const syncProject = onDocumentCreated("users/{userId}/projects/{projectId}", async (event) => {
  const projectData = event.data?.data();
  const userId = event.params.userId;
  
  if (!projectData || !projectData.dueDate) return;

  try {
    const calendar = await getCalendarClient(userId);
    
    const calendarEvent = {
      summary: `Project: ${projectData.title}`,
      description: projectData.description || "Household project deadline",
      start: {
        dateTime: projectData.dueDate.toDate().toISOString(),
        timeZone: "UTC",
      },
      end: {
        dateTime: new Date(projectData.dueDate.toDate().getTime() + 60 * 60000).toISOString(), // 1 hour
        timeZone: "UTC",
      },
      reminders: {
        useDefault: false,
        overrides: [
          {method: "popup", minutes: 30},
          {method: "email", minutes: 24 * 60}, // 1 day
        ],
      },
    };

    const response = await calendar.events.insert({
      calendarId: "primary",
      resource: calendarEvent,
    });

    // Update the project with calendar event ID
    await event.data?.ref.update({
      calendarEventId: response.data.id,
    });
  } catch (error) {
    console.error("Error syncing project to calendar:", error);
  }
});

/**
 * Auto-sync simple tasks to calendar
 */
export const syncSimpleTask = onDocumentCreated("users/{userId}/simpleTasks/{taskId}", async (event) => {
  const taskData = event.data?.data();
  const userId = event.params.userId;
  
  if (!taskData || !taskData.dueDate) return;

  try {
    const calendar = await getCalendarClient(userId);
    
    const calendarEvent = {
      summary: `Task: ${taskData.title}`,
      description: taskData.description || "Household task",
      start: {
        dateTime: taskData.dueDate.toDate().toISOString(),
        timeZone: "UTC",
      },
      end: {
        dateTime: new Date(taskData.dueDate.toDate().getTime() + 30 * 60000).toISOString(), // 30 minutes
        timeZone: "UTC",
      },
      reminders: {
        useDefault: false,
        overrides: [
          {method: "popup", minutes: 15},
        ],
      },
    };

    const response = await calendar.events.insert({
      calendarId: "primary",
      resource: calendarEvent,
    });

    // Update the task with calendar event ID
    await event.data?.ref.update({
      calendarEventId: response.data.id,
    });
  } catch (error) {
    console.error("Error syncing simple task to calendar:", error);
  }
});

// Update triggers for calendar sync

export const updatePlantCareTaskCalendar = onDocumentUpdated("users/{userId}/plantCareTasks/{taskId}", async (event) => {
  const beforeData = event.data?.before.data();
  const afterData = event.data?.after.data();
  const userId = event.params.userId;
  
  if (!afterData) return;

  try {
    const calendar = await getCalendarClient(userId);
    
    // If task is completed, delete calendar event
    if (afterData.completed && afterData.calendarEventId) {
      await calendar.events.delete({
        calendarId: "primary",
        eventId: afterData.calendarEventId,
      });
      
      await event.data?.after.ref.update({
        calendarEventId: null,
      });
      return;
    }

    // If due date changed, update calendar event
    if (afterData.calendarEventId && beforeData?.dueDate !== afterData.dueDate) {
      const calendarEvent = {
        summary: `Plant Care: ${afterData.title}`,
        description: afterData.description || `Care task for plant: ${afterData.plantName}`,
        start: {
          dateTime: afterData.dueDate.toDate().toISOString(),
          timeZone: "UTC",
        },
        end: {
          dateTime: new Date(afterData.dueDate.toDate().getTime() + 30 * 60000).toISOString(),
          timeZone: "UTC",
        },
      };

      await calendar.events.update({
        calendarId: "primary",
        eventId: afterData.calendarEventId,
        resource: calendarEvent,
      });
    }
  } catch (error) {
    console.error("Error updating plant care task calendar event:", error);
  }
});

// Delete triggers for calendar cleanup

export const deletePlantCareTaskCalendar = onDocumentDeleted("users/{userId}/plantCareTasks/{taskId}", async (event) => {
  const taskData = event.data?.data();
  const userId = event.params.userId;
  
  if (!taskData?.calendarEventId) return;

  try {
    const calendar = await getCalendarClient(userId);
    
    await calendar.events.delete({
      calendarId: "primary",
      eventId: taskData.calendarEventId,
    });
  } catch (error) {
    console.error("Error deleting plant care task calendar event:", error);
  }
});
