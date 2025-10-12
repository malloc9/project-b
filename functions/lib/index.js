"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onUserDelete = exports.onUserUpdate = exports.onUserCreate = exports.helloWorld = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-functions/v2/firestore");
const app_1 = require("firebase-admin/app");
const firestore_2 = require("firebase-admin/firestore");
// Initialize Firebase Admin
(0, app_1.initializeApp)();
const db = (0, firestore_2.getFirestore)();
/**
 * Simple hello world function for testing
 */
exports.helloWorld = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "User must be authenticated");
    }
    return {
        message: "Hello from Firebase Functions!",
        userId: request.auth.uid,
        timestamp: new Date().toISOString()
    };
});
/**
 * Basic user document creation trigger
 */
exports.onUserCreate = (0, firestore_1.onDocumentCreated)("users/{userId}", async (event) => {
    var _a, _b;
    const userData = (_a = event.data) === null || _a === void 0 ? void 0 : _a.data();
    const userId = event.params.userId;
    console.log(`New user created: ${userId}`, userData);
    // Initialize user settings or perform other setup tasks
    try {
        await ((_b = event.data) === null || _b === void 0 ? void 0 : _b.ref.update({
            createdAt: new Date(),
            lastActive: new Date(),
            settings: {
                notifications: true,
                theme: 'light'
            }
        }));
    }
    catch (error) {
        console.error("Error initializing user document:", error);
    }
});
/**
 * User activity tracking
 */
exports.onUserUpdate = (0, firestore_1.onDocumentUpdated)("users/{userId}", async (event) => {
    var _a, _b, _c;
    const beforeData = (_a = event.data) === null || _a === void 0 ? void 0 : _a.before.data();
    const afterData = (_b = event.data) === null || _b === void 0 ? void 0 : _b.after.data();
    const userId = event.params.userId;
    // Update last active timestamp if user data changed
    if (beforeData && afterData && JSON.stringify(beforeData) !== JSON.stringify(afterData)) {
        try {
            await ((_c = event.data) === null || _c === void 0 ? void 0 : _c.after.ref.update({
                lastActive: new Date()
            }));
        }
        catch (error) {
            console.error("Error updating user activity:", error);
        }
    }
});
/**
 * Cleanup function when user is deleted
 */
exports.onUserDelete = (0, firestore_1.onDocumentDeleted)("users/{userId}", async (event) => {
    const userId = event.params.userId;
    console.log(`User deleted: ${userId}`);
    // Perform cleanup tasks like deleting user's subcollections
    try {
        const batch = db.batch();
        // Delete user's plants
        const plantsSnapshot = await db.collection(`users/${userId}/plants`).get();
        plantsSnapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
        });
        // Delete user's projects
        const projectsSnapshot = await db.collection(`users/${userId}/projects`).get();
        projectsSnapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
        });
        // Delete user's tasks
        const tasksSnapshot = await db.collection(`users/${userId}/simpleTasks`).get();
        tasksSnapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
        });
        await batch.commit();
        console.log(`Cleanup completed for user: ${userId}`);
    }
    catch (error) {
        console.error("Error during user cleanup:", error);
    }
});
//# sourceMappingURL=index.js.map