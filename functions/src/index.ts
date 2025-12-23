import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onDocumentCreated, onDocumentUpdated, onDocumentDeleted } from "firebase-functions/v2/firestore";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// Initialize Firebase Admin
initializeApp();
const db = getFirestore();

/**
 * Simple hello world function for testing
 */
export const helloWorld = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
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
export const onUserCreate = onDocumentCreated("users/{userId}", async (event) => {
  const userData = event.data?.data();
  const userId = event.params.userId;
  
  console.log(`New user created: ${userId}`, userData);
  
  // Initialize user settings or perform other setup tasks
  try {
    await event.data?.ref.update({
      createdAt: new Date(),
      lastActive: new Date(),
      settings: {
        notifications: true,
        theme: 'light'
      }
    });
  } catch (error) {
    console.error("Error initializing user document:", error);
  }
});

/**
 * User activity tracking
 */
export const onUserUpdate = onDocumentUpdated("users/{userId}", async (event) => {
  const beforeData = event.data?.before.data();
  const afterData = event.data?.after.data();
  
  // Update last active timestamp if user data changed
  if (beforeData && afterData && JSON.stringify(beforeData) !== JSON.stringify(afterData)) {
    try {
      await event.data?.after.ref.update({
        lastActive: new Date()
      });
    } catch (error) {
      console.error("Error updating user activity:", error);
    }
  }
});

/**
 * Cleanup function when user is deleted
 */
export const onUserDelete = onDocumentDeleted("users/{userId}", async (event) => {
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
  } catch (error) {
    console.error("Error during user cleanup:", error);
  }
});
