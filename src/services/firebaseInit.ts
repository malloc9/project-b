import { connectAuthEmulator } from 'firebase/auth';
import { connectFirestoreEmulator } from 'firebase/firestore';
import { connectStorageEmulator } from 'firebase/storage';
import { connectFunctionsEmulator } from 'firebase/functions';
import { auth, db, storage, functions } from '../config/firebase';

/**
 * Firebase initialization service
 */
export class FirebaseInitService {
  private static initialized = false;
  private static emulatorMode = false;

  /**
   * Initialize Firebase services with optional emulator support
   */
  static async initialize(useEmulators = false): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Connect to emulators in development mode
      if (useEmulators && import.meta.env.DEV) {
        this.connectEmulators();
        this.emulatorMode = true;
      }

      this.initialized = true;
      console.log('Firebase services initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Firebase services:', error);
      throw error;
    }
  }

  /**
   * Connect to Firebase emulators for local development
   */
  private static connectEmulators(): void {
    try {
      // Connect to Auth emulator
      connectAuthEmulator(auth, 'http://localhost:9099');

      // Connect to Firestore emulator
      connectFirestoreEmulator(db, 'localhost', 8080);

      // Connect to Storage emulator
      connectStorageEmulator(storage, 'localhost', 9199);

      // Connect to Functions emulator
      connectFunctionsEmulator(functions, 'localhost', 5001);

      console.log('Connected to Firebase emulators');
    } catch (error) {
      console.warn('Some emulators may already be connected:', error);
    }
  }

  /**
   * Check if Firebase is properly configured
   */
  static validateConfiguration(): boolean {
    const requiredEnvVars = [
      'VITE_FIREBASE_API_KEY',
      'VITE_FIREBASE_AUTH_DOMAIN',
      'VITE_FIREBASE_PROJECT_ID',
      'VITE_FIREBASE_STORAGE_BUCKET',
      'VITE_FIREBASE_MESSAGING_SENDER_ID',
      'VITE_FIREBASE_APP_ID',
    ];

    const missingVars = requiredEnvVars.filter(
      varName => !import.meta.env[varName]
    );

    if (missingVars.length > 0) {
      console.error('Missing Firebase configuration variables:', missingVars);
      return false;
    }

    return true;
  }

  /**
   * Get initialization status
   */
  static isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Check if running in emulator mode
   */
  static isEmulatorMode(): boolean {
    return this.emulatorMode;
  }
}

/**
 * Firebase error handling utilities
 */
export class FirebaseErrorHandler {
  /**
   * Convert Firebase error codes to user-friendly messages
   */
  static getErrorMessage(error: any): string {
    if (!error?.code) {
      return 'An unexpected error occurred. Please try again.';
    }

    switch (error.code) {
      // Auth errors
      case 'auth/user-not-found':
        return 'No account found with this email address.';
      case 'auth/wrong-password':
        return 'Incorrect password. Please try again.';
      case 'auth/email-already-in-use':
        return 'An account with this email already exists.';
      case 'auth/weak-password':
        return 'Password should be at least 6 characters long.';
      case 'auth/invalid-email':
        return 'Please enter a valid email address.';
      case 'auth/too-many-requests':
        return 'Too many failed attempts. Please try again later.';
      case 'auth/network-request-failed':
        return 'Network error. Please check your connection and try again.';

      // Firestore errors
      case 'permission-denied':
        return 'You do not have permission to perform this action.';
      case 'not-found':
        return 'The requested data was not found.';
      case 'already-exists':
        return 'This item already exists.';
      case 'resource-exhausted':
        return 'Service is temporarily unavailable. Please try again later.';
      case 'unauthenticated':
        return 'Please log in to continue.';

      // Storage errors
      case 'storage/unauthorized':
        return 'You do not have permission to upload files.';
      case 'storage/canceled':
        return 'File upload was canceled.';
      case 'storage/unknown':
        return 'An error occurred during file upload.';
      case 'storage/object-not-found':
        return 'File not found.';
      case 'storage/quota-exceeded':
        return 'Storage quota exceeded.';

      default:
        return 'An error occurred. Please try again.';
    }
  }

  /**
   * Log error for debugging purposes
   */
  static logError(error: any, context?: string): void {
    console.error(`Firebase Error${context ? ` (${context})` : ''}:`, {
      code: error?.code,
      message: error?.message,
      stack: error?.stack,
    });
  }
}