import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  type User as FirebaseUser,
} from 'firebase/auth';
import { auth } from '../config/firebase';
import type { User } from '../types';
import { FirebaseErrorHandler } from './firebaseInit';

/**
 * Authentication service for Firebase Auth operations
 */
export class AuthService {
  /**
   * Sign in user with email and password
   */
  static async login(email: string, password: string): Promise<User> {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return this.mapFirebaseUser(userCredential.user);
    } catch (error) {
      FirebaseErrorHandler.logError(error, 'login');
      throw new Error(FirebaseErrorHandler.getErrorMessage(error));
    }
  }

  /**
   * Create a new user account with email and password
   */
  static async signup(email: string, password: string): Promise<User> {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      return this.mapFirebaseUser(userCredential.user);
    } catch (error) {
      FirebaseErrorHandler.logError(error, 'signup');
      throw new Error(FirebaseErrorHandler.getErrorMessage(error));
    }
  }

  /**
   * Sign out current user
   */
  static async logout(): Promise<void> {
    try {
      await signOut(auth);
    } catch (error) {
      FirebaseErrorHandler.logError(error, 'logout');
      throw new Error(FirebaseErrorHandler.getErrorMessage(error));
    }
  }

  /**
   * Send password reset email
   */
  static async resetPassword(email: string): Promise<void> {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      FirebaseErrorHandler.logError(error, 'resetPassword');
      throw new Error(FirebaseErrorHandler.getErrorMessage(error));
    }
  }

  /**
   * Get current authenticated user
   */
  static getCurrentUser(): User | null {
    const firebaseUser = auth.currentUser;
    return firebaseUser ? this.mapFirebaseUser(firebaseUser) : null;
  }

  /**
   * Listen to authentication state changes
   */
  static onAuthStateChanged(callback: (user: User | null) => void): () => void {
    return onAuthStateChanged(auth, (firebaseUser) => {
      const user = firebaseUser ? this.mapFirebaseUser(firebaseUser) : null;
      callback(user);
    });
  }

  /**
   * Map Firebase user to application User type
   */
  private static mapFirebaseUser(firebaseUser: FirebaseUser): User {
    return {
      uid: firebaseUser.uid,
      email: firebaseUser.email || '',
      displayName: firebaseUser.displayName || undefined,
      createdAt: firebaseUser.metadata.creationTime 
        ? new Date(firebaseUser.metadata.creationTime) 
        : new Date(),
    };
  }

  /**
   * Validate email format
   */
  static validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate password strength
   */
  static validatePassword(password: string): { isValid: boolean; message?: string } {
    if (password.length < 6) {
      return { isValid: false, message: 'Password must be at least 6 characters long' };
    }
    return { isValid: true };
  }
}