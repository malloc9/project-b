import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
} from 'firebase/auth';
import { AuthService } from '../authService';

// Mock Firebase Auth functions
vi.mock('firebase/auth');

// Mock the auth object directly in the service
vi.mock('../../config/firebase', () => ({
  auth: {
    currentUser: null,
  },
}));

const mockSignInWithEmailAndPassword = vi.mocked(signInWithEmailAndPassword);
const mockSignOut = vi.mocked(signOut);
const mockSendPasswordResetEmail = vi.mocked(sendPasswordResetEmail);
const mockOnAuthStateChanged = vi.mocked(onAuthStateChanged);

describe('AuthService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('login', () => {
    it('should successfully login with valid credentials', async () => {
      const mockUser = {
        uid: 'test-uid',
        email: 'test@example.com',
        displayName: 'Test User',
        metadata: {
          creationTime: '2023-01-01T00:00:00.000Z',
        },
      };

      mockSignInWithEmailAndPassword.mockResolvedValue({
        user: mockUser,
      } as any);

      const result = await AuthService.login('test@example.com', 'password123');

      expect(mockSignInWithEmailAndPassword).toHaveBeenCalledWith(
        auth,
        'test@example.com',
        'password123'
      );
      expect(result).toEqual({
        uid: 'test-uid',
        email: 'test@example.com',
        displayName: 'Test User',
        createdAt: new Date('2023-01-01T00:00:00.000Z'),
      });
    });

    it('should throw error for invalid credentials', async () => {
      const mockError = {
        code: 'auth/wrong-password',
        message: 'Wrong password',
      };

      mockSignInWithEmailAndPassword.mockRejectedValue(mockError);

      await expect(
        AuthService.login('test@example.com', 'wrongpassword')
      ).rejects.toThrow('Incorrect password. Please try again.');
    });

    it('should handle user not found error', async () => {
      const mockError = {
        code: 'auth/user-not-found',
        message: 'User not found',
      };

      mockSignInWithEmailAndPassword.mockRejectedValue(mockError);

      await expect(
        AuthService.login('nonexistent@example.com', 'password123')
      ).rejects.toThrow('No account found with this email address.');
    });
  });

  describe('logout', () => {
    it('should successfully logout', async () => {
      mockSignOut.mockResolvedValue();

      await AuthService.logout();

      expect(mockSignOut).toHaveBeenCalledWith(auth);
    });

    it('should handle logout errors', async () => {
      const mockError = {
        code: 'auth/network-request-failed',
        message: 'Network error',
      };

      mockSignOut.mockRejectedValue(mockError);

      await expect(AuthService.logout()).rejects.toThrow(
        'Network error. Please check your connection and try again.'
      );
    });
  });

  describe('resetPassword', () => {
    it('should successfully send password reset email', async () => {
      mockSendPasswordResetEmail.mockResolvedValue();

      await AuthService.resetPassword('test@example.com');

      expect(mockSendPasswordResetEmail).toHaveBeenCalledWith(
        auth,
        'test@example.com'
      );
    });

    it('should handle invalid email error', async () => {
      const mockError = {
        code: 'auth/invalid-email',
        message: 'Invalid email',
      };

      mockSendPasswordResetEmail.mockRejectedValue(mockError);

      await expect(
        AuthService.resetPassword('invalid-email')
      ).rejects.toThrow('Please enter a valid email address.');
    });

    it('should handle user not found error', async () => {
      const mockError = {
        code: 'auth/user-not-found',
        message: 'User not found',
      };

      mockSendPasswordResetEmail.mockRejectedValue(mockError);

      await expect(
        AuthService.resetPassword('nonexistent@example.com')
      ).rejects.toThrow('No account found with this email address.');
    });
  });

  describe('getCurrentUser', () => {
    it('should return current user when authenticated', async () => {
      const mockUser = {
        uid: 'test-uid',
        email: 'test@example.com',
        displayName: 'Test User',
        metadata: {
          creationTime: '2023-01-01T00:00:00.000Z',
        },
      };

      // Mock the auth module to return the user
      const { auth } = await import('../../config/firebase');
      (auth as any).currentUser = mockUser;

      const result = AuthService.getCurrentUser();

      expect(result).toEqual({
        uid: 'test-uid',
        email: 'test@example.com',
        displayName: 'Test User',
        createdAt: new Date('2023-01-01T00:00:00.000Z'),
      });
    });

    it('should return null when not authenticated', async () => {
      const { auth } = await import('../../config/firebase');
      (auth as any).currentUser = null;

      const result = AuthService.getCurrentUser();

      expect(result).toBeNull();
    });
  });

  describe('onAuthStateChanged', () => {
    it('should call callback with user when authenticated', () => {
      const mockCallback = vi.fn();
      const mockUnsubscribe = vi.fn();
      const mockUser = {
        uid: 'test-uid',
        email: 'test@example.com',
        displayName: 'Test User',
        metadata: {
          creationTime: '2023-01-01T00:00:00.000Z',
        },
      };

      mockOnAuthStateChanged.mockImplementation((auth, callback) => {
        callback(mockUser as any);
        return mockUnsubscribe;
      });

      const unsubscribe = AuthService.onAuthStateChanged(mockCallback);

      expect(mockOnAuthStateChanged).toHaveBeenCalledWith(auth, expect.any(Function));
      expect(mockCallback).toHaveBeenCalledWith({
        uid: 'test-uid',
        email: 'test@example.com',
        displayName: 'Test User',
        createdAt: new Date('2023-01-01T00:00:00.000Z'),
      });
      expect(unsubscribe).toBe(mockUnsubscribe);
    });

    it('should call callback with null when not authenticated', () => {
      const mockCallback = vi.fn();
      const mockUnsubscribe = vi.fn();

      mockOnAuthStateChanged.mockImplementation((auth, callback) => {
        callback(null);
        return mockUnsubscribe;
      });

      AuthService.onAuthStateChanged(mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(null);
    });
  });

  describe('validateEmail', () => {
    it('should return true for valid email addresses', () => {
      expect(AuthService.validateEmail('test@example.com')).toBe(true);
      expect(AuthService.validateEmail('user.name+tag@domain.co.uk')).toBe(true);
      expect(AuthService.validateEmail('user123@test-domain.org')).toBe(true);
    });

    it('should return false for invalid email addresses', () => {
      expect(AuthService.validateEmail('invalid-email')).toBe(false);
      expect(AuthService.validateEmail('test@')).toBe(false);
      expect(AuthService.validateEmail('@example.com')).toBe(false);
      expect(AuthService.validateEmail('test.example.com')).toBe(false);
      expect(AuthService.validateEmail('')).toBe(false);
    });
  });

  describe('validatePassword', () => {
    it('should return valid for passwords with 6+ characters', () => {
      expect(AuthService.validatePassword('password123')).toEqual({
        isValid: true,
      });
      expect(AuthService.validatePassword('123456')).toEqual({
        isValid: true,
      });
    });

    it('should return invalid for passwords with less than 6 characters', () => {
      expect(AuthService.validatePassword('12345')).toEqual({
        isValid: false,
        message: 'Password must be at least 6 characters long',
      });
      expect(AuthService.validatePassword('')).toEqual({
        isValid: false,
        message: 'Password must be at least 6 characters long',
      });
    });
  });
});