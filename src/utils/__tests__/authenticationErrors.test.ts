import {
  AuthenticationErrorType,
  createAuthenticationError,
  classifyFirebaseError,
  shouldRetryError,
  getErrorMessage,
} from '../authenticationErrors';

describe('authenticationErrors', () => {
  describe('createAuthenticationError', () => {
    it('should create authentication error with correct properties', () => {
      const originalError = new Error('Original error');
      const error = createAuthenticationError(
        AuthenticationErrorType.PERMISSION_DENIED,
        'Permission denied',
        originalError,
        true
      );

      expect(error.type).toBe(AuthenticationErrorType.PERMISSION_DENIED);
      expect(error.message).toBe('Permission denied');
      expect(error.retryable).toBe(true);
      expect(error.originalError).toBe(originalError);
    });

    it('should default retryable to false', () => {
      const error = createAuthenticationError(
        AuthenticationErrorType.NOT_AUTHENTICATED,
        'Not authenticated'
      );

      expect(error.retryable).toBe(false);
    });
  });

  describe('classifyFirebaseError', () => {
    it('should classify permission-denied as PERMISSION_DENIED', () => {
      const firebaseError = { code: 'permission-denied', message: 'Permission denied' };
      const error = classifyFirebaseError(firebaseError);

      expect(error.type).toBe(AuthenticationErrorType.PERMISSION_DENIED);
      expect(error.retryable).toBe(true);
      expect(error.message).toContain('permission');
    });

    it('should classify unauthenticated as PERMISSION_DENIED', () => {
      const firebaseError = { code: 'unauthenticated', message: 'Unauthenticated' };
      const error = classifyFirebaseError(firebaseError);

      expect(error.type).toBe(AuthenticationErrorType.PERMISSION_DENIED);
      expect(error.retryable).toBe(true);
    });

    it('should classify network errors as NETWORK_ERROR', () => {
      const firebaseError = { code: 'unavailable', message: 'Service unavailable' };
      const error = classifyFirebaseError(firebaseError);

      expect(error.type).toBe(AuthenticationErrorType.NETWORK_ERROR);
      expect(error.retryable).toBe(true);
      expect(error.message).toContain('Network error');
    });

    it('should classify custom DB_PERMISSION_DENIED as PERMISSION_DENIED', () => {
      const customError = { code: 'DB_PERMISSION_DENIED', message: 'Database permission denied' };
      const error = classifyFirebaseError(customError);

      expect(error.type).toBe(AuthenticationErrorType.PERMISSION_DENIED);
      expect(error.retryable).toBe(true);
    });

    it('should classify authentication loading errors as AUTH_LOADING', () => {
      const loadingError = { message: 'Authentication is still loading' };
      const error = classifyFirebaseError(loadingError);

      expect(error.type).toBe(AuthenticationErrorType.AUTH_LOADING);
      expect(error.retryable).toBe(true);
      expect(error.message).toBe('Loading your data...');
    });

    it('should classify not authenticated errors as NOT_AUTHENTICATED', () => {
      const authError = { message: 'User not authenticated' };
      const error = classifyFirebaseError(authError);

      expect(error.type).toBe(AuthenticationErrorType.NOT_AUTHENTICATED);
      expect(error.retryable).toBe(false);
    });

    it('should classify unknown errors as UNKNOWN_ERROR', () => {
      const unknownError = { message: 'Something went wrong' };
      const error = classifyFirebaseError(unknownError);

      expect(error.type).toBe(AuthenticationErrorType.UNKNOWN_ERROR);
      expect(error.retryable).toBe(false);
    });
  });

  describe('shouldRetryError', () => {
    it('should return true for retryable errors except NOT_AUTHENTICATED', () => {
      const retryableError = createAuthenticationError(
        AuthenticationErrorType.PERMISSION_DENIED,
        'Permission denied',
        undefined,
        true
      );

      expect(shouldRetryError(retryableError)).toBe(true);
    });

    it('should return false for NOT_AUTHENTICATED errors even if retryable', () => {
      const notAuthError = createAuthenticationError(
        AuthenticationErrorType.NOT_AUTHENTICATED,
        'Not authenticated',
        undefined,
        true
      );

      expect(shouldRetryError(notAuthError)).toBe(false);
    });

    it('should return false for non-retryable errors', () => {
      const nonRetryableError = createAuthenticationError(
        AuthenticationErrorType.UNKNOWN_ERROR,
        'Unknown error',
        undefined,
        false
      );

      expect(shouldRetryError(nonRetryableError)).toBe(false);
    });
  });

  describe('getErrorMessage', () => {
    it('should return appropriate message for AUTH_LOADING', () => {
      const error = createAuthenticationError(AuthenticationErrorType.AUTH_LOADING, 'Loading');
      expect(getErrorMessage(error)).toBe('Loading your data...');
    });

    it('should return appropriate message for NOT_AUTHENTICATED', () => {
      const error = createAuthenticationError(AuthenticationErrorType.NOT_AUTHENTICATED, 'Not auth');
      expect(getErrorMessage(error)).toBe('Please log in to access your data.');
    });

    it('should return appropriate message for PERMISSION_DENIED', () => {
      const error = createAuthenticationError(AuthenticationErrorType.PERMISSION_DENIED, 'Permission');
      expect(getErrorMessage(error)).toBe('Unable to access your data. Please try refreshing the page.');
    });

    it('should return appropriate message for NETWORK_ERROR', () => {
      const error = createAuthenticationError(AuthenticationErrorType.NETWORK_ERROR, 'Network');
      expect(getErrorMessage(error)).toBe('Network error. Please check your connection and try again.');
    });

    it('should return original message for unknown errors', () => {
      const error = createAuthenticationError(AuthenticationErrorType.UNKNOWN_ERROR, 'Custom message');
      expect(getErrorMessage(error)).toBe('Custom message');
    });
  });
});