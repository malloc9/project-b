"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deletePlantCareTaskCalendar = exports.updatePlantCareTaskCalendar = exports.syncSimpleTask = exports.syncProject = exports.syncPlantCareTask = exports.deleteCalendarEvent = exports.updateCalendarEvent = exports.createCalendarEvent = exports.completeCalendarAuth = exports.initCalendarAuth = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-functions/v2/firestore");
const app_1 = require("firebase-admin/app");
const firestore_2 = require("firebase-admin/firestore");
const params_1 = require("firebase-functions/params");
const GOOGLE_CLIENT_ID = (0, params_1.defineString)("GOOGLE_CLIENT_ID");
const GOOGLE_CLIENT_SECRET = (0, params_1.defineString)("GOOGLE_CLIENT_SECRET");
const GOOGLE_REDIRECT_URI = (0, params_1.defineString)("GOOGLE_REDIRECT_URI");
// Initialize Firebase Admin
(0, app_1.initializeApp)();
const db = (0, firestore_2.getFirestore)();
// Google Calendar API setup
const SCOPES = ["https://www.googleapis.com/auth/calendar"];
/**
 * Get OAuth2 client for a user
 */
function getOAuth2Client() {
    const { google } = require("googleapis");
    const { OAuth2Client } = require("google-auth-library");
    return new google.auth.OAuth2(GOOGLE_CLIENT_ID.value(), GOOGLE_CLIENT_SECRET.value(), GOOGLE_REDIRECT_URI.value());
}
/**
 * Get authenticated calendar client for a user
 */
async function getCalendarClient(userId) {
    const userDoc = await db.collection("users").doc(userId).get();
    const userData = userDoc.data();
    if (!(userData === null || userData === void 0 ? void 0 : userData.calendarConfig)) {
        throw new https_1.HttpsError("failed-precondition", "User has not connected Google Calendar");
    }
    const calendarConfig = userData.calendarConfig;
    const oauth2Client = getOAuth2Client();
    oauth2Client.setCredentials({
        access_token: calendarConfig.accessToken,
        refresh_token: calendarConfig.refreshToken,
        expiry_date: calendarConfig.expiryDate,
    });
    const { google } = require("googleapis");
    return google.calendar({ version: "v3", auth: oauth2Client });
}
/**
 * Initialize OAuth2 flow for Google Calendar access
 */
exports.initCalendarAuth = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "User must be authenticated");
    }
    const oauth2Client = getOAuth2Client();
    const authUrl = oauth2Client.generateAuthUrl({
        access_type: "offline",
        scope: SCOPES,
        prompt: "consent",
    });
    return { authUrl };
});
/**
 * Complete OAuth2 flow and store tokens
 */
exports.completeCalendarAuth = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "User must be authenticated");
    }
    const { code } = request.data;
    if (!code) {
        throw new https_1.HttpsError("invalid-argument", "Authorization code is required");
    }
    try {
        const oauth2Client = getOAuth2Client();
        const { tokens } = await oauth2Client.getToken(code);
        const calendarConfig = {
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
            expiryDate: tokens.expiry_date,
        };
        await db.collection("users").doc(request.auth.uid).update({
            calendarConfig,
            calendarConnected: true,
        });
        return { success: true };
    }
    catch (error) {
        console.error("Error completing calendar auth:", error);
        throw new https_1.HttpsError("internal", "Failed to complete calendar authentication");
    }
});
/**
 * Create a calendar event
 */
exports.createCalendarEvent = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "User must be authenticated");
    }
    const { event } = request.data;
    if (!event) {
        throw new https_1.HttpsError("invalid-argument", "Event data is required");
    }
    try {
        const calendar = await getCalendarClient(request.auth.uid);
        const calendarEvent = {
            summary: event.title,
            description: event.description,
            start: {
                dateTime: new Date(event.startDate).toISOString(),
                timeZone: "UTC",
            },
            end: {
                dateTime: new Date(event.endDate).toISOString(),
                timeZone: "UTC",
            },
            reminders: {
                useDefault: false,
                overrides: [
                    { method: "popup", minutes: 15 },
                    { method: "email", minutes: 60 },
                ],
            },
        };
        const response = await calendar.events.insert({
            calendarId: "primary",
            resource: calendarEvent,
        });
        return { eventId: response.data.id };
    }
    catch (error) {
        console.error("Error creating calendar event:", error);
        throw new https_1.HttpsError("internal", "Failed to create calendar event");
    }
});
/**
 * Update a calendar event
 */
exports.updateCalendarEvent = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "User must be authenticated");
    }
    const { eventId, event } = request.data;
    if (!eventId || !event) {
        throw new https_1.HttpsError("invalid-argument", "Event ID and event data are required");
    }
    try {
        const calendar = await getCalendarClient(request.auth.uid);
        const calendarEvent = {};
        if (event.title)
            calendarEvent.summary = event.title;
        if (event.description)
            calendarEvent.description = event.description;
        if (event.startDate) {
            calendarEvent.start = {
                dateTime: new Date(event.startDate).toISOString(),
                timeZone: "UTC",
            };
        }
        if (event.endDate) {
            calendarEvent.end = {
                dateTime: new Date(event.endDate).toISOString(),
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
        return { success: true };
    }
    catch (error) {
        console.error("Error updating calendar event:", error);
        throw new https_1.HttpsError("internal", "Failed to update calendar event");
    }
});
/**
 * Delete a calendar event
 */
exports.deleteCalendarEvent = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "User must be authenticated");
    }
    const { eventId } = request.data;
    if (!eventId) {
        throw new https_1.HttpsError("invalid-argument", "Event ID is required");
    }
    try {
        const calendar = await getCalendarClient(request.auth.uid);
        await calendar.events.delete({
            calendarId: "primary",
            eventId: eventId,
        });
        return { success: true };
    }
    catch (error) {
        console.error("Error deleting calendar event:", error);
        throw new https_1.HttpsError("internal", "Failed to delete calendar event");
    }
});
// Firestore triggers for automatic calendar sync
/**
 * Auto-sync plant care tasks to calendar
 */
exports.syncPlantCareTask = (0, firestore_1.onDocumentCreated)("users/{userId}/plantCareTasks/{taskId}", async (event) => {
    const snap = event.data;
    if (!snap) {
        return;
    }
    const taskData = snap.data();
    const userId = event.params.userId;
    if (!taskData || !taskData.dueDate)
        return;
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
                    { method: "popup", minutes: 15 },
                    { method: "email", minutes: 60 },
                ],
            },
        };
        const response = await calendar.events.insert({
            calendarId: "primary",
            resource: calendarEvent,
        });
        // Update the task with calendar event ID
        await snap.ref.update({
            calendarEventId: response.data.id,
        });
    }
    catch (error) {
        console.error("Error syncing plant care task to calendar:", error);
    }
});
/**
 * Auto-sync projects to calendar
 */
exports.syncProject = (0, firestore_1.onDocumentCreated)("users/{userId}/projects/{projectId}", async (event) => {
    const snap = event.data;
    if (!snap) {
        return;
    }
    const projectData = snap.data();
    const userId = event.params.userId;
    if (!projectData || !projectData.dueDate)
        return;
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
                    { method: "popup", minutes: 30 },
                    { method: "email", minutes: 24 * 60 }, // 1 day
                ],
            },
        };
        const response = await calendar.events.insert({
            calendarId: "primary",
            resource: calendarEvent,
        });
        // Update the project with calendar event ID
        await snap.ref.update({
            calendarEventId: response.data.id,
        });
    }
    catch (error) {
        console.error("Error syncing project to calendar:", error);
    }
});
/**
 * Auto-sync simple tasks to calendar
 */
exports.syncSimpleTask = (0, firestore_1.onDocumentCreated)("users/{userId}/simpleTasks/{taskId}", async (event) => {
    const snap = event.data;
    if (!snap) {
        return;
    }
    const taskData = snap.data();
    const userId = event.params.userId;
    if (!taskData || !taskData.dueDate)
        return;
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
                    { method: "popup", minutes: 15 },
                ],
            },
        };
        const response = await calendar.events.insert({
            calendarId: "primary",
            resource: calendarEvent,
        });
        // Update the task with calendar event ID
        await snap.ref.update({
            calendarEventId: response.data.id,
        });
    }
    catch (error) {
        console.error("Error syncing simple task to calendar:", error);
    }
});
// Update triggers for calendar sync
exports.updatePlantCareTaskCalendar = (0, firestore_1.onDocumentUpdated)("users/{userId}/plantCareTasks/{taskId}", async (event) => {
    const change = event.data;
    if (!change) {
        return;
    }
    const beforeData = change.before.data();
    const afterData = change.after.data();
    const userId = event.params.userId;
    if (!afterData)
        return;
    try {
        const calendar = await getCalendarClient(userId);
        // If task is completed, delete calendar event
        if (afterData.completed && afterData.calendarEventId) {
            await calendar.events.delete({
                calendarId: "primary",
                eventId: afterData.calendarEventId,
            });
            await change.after.ref.update({
                calendarEventId: null,
            });
            return;
        }
        // If due date changed, update calendar event
        if (afterData.calendarEventId && (beforeData === null || beforeData === void 0 ? void 0 : beforeData.dueDate) !== afterData.dueDate) {
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
    }
    catch (error) {
        console.error("Error updating plant care task calendar event:", error);
    }
});
// Delete triggers for calendar cleanup
exports.deletePlantCareTaskCalendar = (0, firestore_1.onDocumentDeleted)("users/{userId}/plantCareTasks/{taskId}", async (event) => {
    const snap = event.data;
    if (!snap) {
        return;
    }
    const taskData = snap.data();
    const userId = event.params.userId;
    if (!(taskData === null || taskData === void 0 ? void 0 : taskData.calendarEventId))
        return;
    try {
        const calendar = await getCalendarClient(userId);
        await calendar.events.delete({
            calendarId: "primary",
            eventId: taskData.calendarEventId,
        });
    }
    catch (error) {
        console.error("Error deleting plant care task calendar event:", error);
    }
});
//# sourceMappingURL=index.js.map