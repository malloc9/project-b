/**
 * Authentication and permission error handling utilities
 */

export enum AuthenticationErrorType {
  NOT_AUTHENTICATED = 'NOT_AUTHENTICATED',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  AUTH_LOADING = 'AUTH_LOADING',
  NETWORK_ERROR = 'NETWORK_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

export interface AuthenticationError extends Error {
  type: AuthenticationErrorType;
  retryable: boolean;
  originalError?: unknown;
}

/**
 * Creates a standardized authentication error
 */
export const createAuthenticationError = (
  type: AuthenticationErrorType,
  message: string,
  originalError?: unknown,
  retryable: boolean = false
): AuthenticationError => {
  const error = new Error(message) as AuthenticationError;
  error.type = type;
  error.retryable = retryable;
  error.originalError = originalError;
  return error;
};

/**
 * Classifies Firebase errors into authentication error types
 */
export const classifyFirebaseError = (error: any): AuthenticationError => {
  // Handle our custom app errors first
  if (error?.code === 'DB_PERMISSION_DENIED') {
    return createAuthenticationError(
      AuthenticationErrorType.PERMISSION_DENIED,
      'You do not have permission to access this data. Please try refreshing the page.',
      error,
      true
    );
  }

  if (error?.code === 'DB_NETWORK_ERROR') {
    return createAuthenticationError(
      AuthenticationErrorType.NETWORK_ERROR,
      'Network error occurred. Please check your connection and try again.',
      error,
      true
    );
  }

  // Handle Firebase Auth errors
  if (error?.code) {
    switch (error.code) {
      case 'permission-denied':
      case 'unauthenticated':
        return createAuthenticationError(
          AuthenticationErrorType.PERMISSION_DENIED,
          'You do not have permission to access this data. Please try refreshing the page.',
          error,
          true // Retryable in case of timing issues
        );
      
      case 'unavailable':
      case 'deadline-exceeded':
      case 'resource-exhausted':
        return createAuthenticationError(
          AuthenticationErrorType.NETWORK_ERROR,
          'Network error occurred. Please check your connection and try again.',
          error,
          true
        );
      
      default:
        return createAuthenticationError(
          AuthenticationErrorType.UNKNOWN_ERROR,
          `An error occurred: ${error.message || 'Unknown error'}`,
          error,
          false
        );
    }
  }

  // Handle authentication loading state
  if (error?.message?.includes('Authentication is still loading')) {
    return createAuthenticationError(
      AuthenticationErrorType.AUTH_LOADING,
      'Loading your data...',
      error,
      true
    );
  }

  // Handle not authenticated errors
  if (error?.message?.includes('not authenticated') || error?.message?.includes('User not authenticated')) {
    return createAuthenticationError(
      AuthenticationErrorType.NOT_AUTHENTICATED,
      'Please log in to access your data.',
      error,
      false
    );
  }

  // Default case
  return createAuthenticationError(
    AuthenticationErrorType.UNKNOWN_ERROR,
    error?.message || 'An unexpected error occurred',
    error,
    false
  );
};

/**
 * Determines if an error should trigger a retry
 */
export const shouldRetryError = (error: AuthenticationError): boolean => {
  return error.retryable && error.type !== AuthenticationErrorType.NOT_AUTHENTICATED;
};

/**
 * Gets user-friendly error message for display
 */
export const getErrorMessage = (error: AuthenticationError): string => {
  switch (error.type) {
    case AuthenticationErrorType.AUTH_LOADING:
      return 'Loading your data...';
    case AuthenticationErrorType.NOT_AUTHENTICATED:
      return 'Please log in to access your data.';
    case AuthenticationErrorType.PERMISSION_DENIED:
      return 'Unable to access your data. Please try refreshing the page.';
    case AuthenticationErrorType.NETWORK_ERROR:
      return 'Network error. Please check your connection and try again.';
    default:
      return error.message || 'An unexpected error occurred';
  }
};