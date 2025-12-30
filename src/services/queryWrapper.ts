import { auth } from '../config/firebase';
import { createAuthenticationError, AuthenticationErrorType, shouldRetryError } from '../utils/authenticationErrors';

export interface AuthenticatedQueryOptions {
  maxRetries?: number;
  retryDelay?: number;
  requireAuth?: boolean;
}

/**
 * Wrapper service for executing authenticated queries with retry logic
 * Handles timing issues between Firebase Auth and Firestore permissions
 */
export class QueryWrapper {
  /**
   * Execute a query with authentication checks and retry logic
   */
  static async executeQuery<T>(
    queryFn: (userId: string) => Promise<T>,
    userId: string | undefined,
    options: AuthenticatedQueryOptions = {}
  ): Promise<T> {
    const {
      maxRetries = 3,
      retryDelay = 1000,
      requireAuth = true
    } = options;

    // Initial authentication check
    if (requireAuth && !userId) {
      throw createAuthenticationError(
        AuthenticationErrorType.NOT_AUTHENTICATED,
        'User not authenticated'
      );
    }

    let lastError: any;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Double-check Firebase Auth state before each attempt
        if (requireAuth) {
          const currentUser = auth.currentUser;
          if (!currentUser || currentUser.uid !== userId) {
            throw createAuthenticationError(
              AuthenticationErrorType.NOT_AUTHENTICATED,
              'Firebase Auth user mismatch'
            );
          }

          // Force refresh the auth token on retries to ensure fresh permissions
          const forceRefresh = attempt > 0;
          await currentUser.getIdToken(forceRefresh);
          
          // Add a small delay after token refresh to ensure it propagates
          if (forceRefresh) {
            await this.sleep(500);
          }
        }

        // Execute the query
        return await queryFn(userId!);
        
      } catch (error) {
        lastError = error;
        console.warn(`Query attempt ${attempt + 1} failed:`, error);

        // Check if this is a retryable error
        const authError = this.classifyError(error);
        
        if (!shouldRetryError(authError) || attempt === maxRetries) {
          throw authError;
        }

        // Wait before retrying (exponential backoff)
        const delay = retryDelay * Math.pow(2, attempt);
        console.log(`Retrying query in ${delay}ms...`);
        await this.sleep(delay);
      }
    }

    throw lastError;
  }

  /**
   * Classify errors for retry logic
   */
  private static classifyError(error: any) {
    console.log('Classifying error:', error);
    
    // Handle Firebase permission errors
    if (error?.code === 'permission-denied' || error?.message?.includes('Missing or insufficient permissions')) {
      return createAuthenticationError(
        AuthenticationErrorType.PERMISSION_DENIED,
        'Permission denied - retrying with fresh auth token',
        error,
        true // Retryable
      );
    }

    // Handle network errors
    if (error?.code === 'unavailable' || error?.code === 'deadline-exceeded') {
      return createAuthenticationError(
        AuthenticationErrorType.NETWORK_ERROR,
        'Network error occurred',
        error,
        true
      );
    }

    // Handle our custom app errors
    if (error?.code === 'DB_PERMISSION_DENIED') {
      return createAuthenticationError(
        AuthenticationErrorType.PERMISSION_DENIED,
        'Database permission denied',
        error,
        true
      );
    }

    // Non-retryable error
    return createAuthenticationError(
      AuthenticationErrorType.UNKNOWN_ERROR,
      error?.message || 'Unknown error',
      error,
      false
    );
  }

  /**
   * Sleep utility for retry delays
   */
  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Execute query with authentication state validation
   * This ensures Firebase Auth is ready before executing the query
   */
  static async executeWithAuthValidation<T>(
    queryFn: (userId: string) => Promise<T>,
    userId: string | undefined,
    options: AuthenticatedQueryOptions = {}
  ): Promise<T> {
    // Wait for auth state to be ready
    await this.waitForAuthReady();
    
    return this.executeQuery(queryFn, userId, options);
  }

  /**
   * Wait for Firebase Auth to be ready and user to be authenticated
   */
  private static async waitForAuthReady(timeout: number = 10000): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(createAuthenticationError(
          AuthenticationErrorType.AUTH_LOADING,
          'Authentication timeout'
        ));
      }, timeout);

      // Check if user is already authenticated
      if (auth.currentUser) {
        clearTimeout(timeoutId);
        resolve();
        return;
      }

      const unsubscribe = auth.onAuthStateChanged((user) => {
        if (user) {
          clearTimeout(timeoutId);
          unsubscribe();
          // Add a small delay to ensure auth context propagates to Firestore
          setTimeout(resolve, 1000);
        }
      });
    });
  }
}