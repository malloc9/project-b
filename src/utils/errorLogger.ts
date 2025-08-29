import type { AppError } from '../types';

/**
 * Centralized error logging and reporting utility
 */
export class ErrorLogger {
  private static instance: ErrorLogger;
  private errorQueue: Array<{ error: AppError; errorId: string; timestamp: Date }> = [];
  private isOnline = navigator.onLine;

  constructor() {
    // Listen for online/offline events
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);
  }

  static getInstance(): ErrorLogger {
    if (!ErrorLogger.instance) {
      ErrorLogger.instance = new ErrorLogger();
    }
    return ErrorLogger.instance;
  }

  /**
   * Log an error with optional error ID
   */
  static logError(error: AppError, errorId?: string): void {
    const logger = ErrorLogger.getInstance();
    const id = errorId || `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    logger.logErrorInternal(error, id);
  }

  /**
   * Log a JavaScript error and convert it to AppError format
   */
  static logJSError(jsError: Error, context?: string): void {
    const logger = ErrorLogger.getInstance();
    
    const appError: AppError = {
      code: 'unknown-error',
      message: jsError.message || 'JavaScript error occurred',
      details: {
        stack: jsError.stack,
        name: jsError.name,
        context: context || 'JavaScript runtime'
      },
      timestamp: new Date()
    };

    logger.logErrorInternal(appError);
  }

  /**
   * Log a network error
   */
  static logNetworkError(url: string, method: string, status?: number, response?: any): void {
    const logger = ErrorLogger.getInstance();
    
    const appError: AppError = {
      code: 'network-error',
      message: `Network request failed: ${method} ${url}`,
      details: {
        url,
        method,
        status,
        response,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString()
      },
      timestamp: new Date()
    };

    logger.logErrorInternal(appError);
  }

  /**
   * Get error statistics for monitoring
   */
  static getErrorStats(): {
    totalErrors: number;
    errorsByCode: Record<string, number>;
    recentErrors: Array<{ error: AppError; errorId: string; timestamp: Date }>;
  } {
    const logger = ErrorLogger.getInstance();
    const recentErrors = logger.errorQueue.slice(-10); // Last 10 errors
    
    const errorsByCode: Record<string, number> = {};
    logger.errorQueue.forEach(({ error }) => {
      errorsByCode[error.code] = (errorsByCode[error.code] || 0) + 1;
    });

    return {
      totalErrors: logger.errorQueue.length,
      errorsByCode,
      recentErrors
    };
  }

  private logErrorInternal(error: AppError, errorId?: string): void {
    const id = errorId || `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const logEntry = {
      error: {
        ...error,
        userId: this.getCurrentUserId()
      },
      errorId: id,
      timestamp: new Date()
    };

    // Add to local queue
    this.errorQueue.push(logEntry);
    
    // Keep only last 100 errors in memory
    if (this.errorQueue.length > 100) {
      this.errorQueue = this.errorQueue.slice(-100);
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.group(`🚨 Error Logged: ${id}`);
      console.error('Error:', error);
      console.log('Error ID:', id);
      console.log('Timestamp:', logEntry.timestamp);
      console.groupEnd();
    }

    // Store in localStorage for persistence
    this.storeErrorLocally(logEntry);

    // Send to remote logging service if online
    if (this.isOnline) {
      this.sendErrorToRemote(logEntry);
    }
  }

  private getCurrentUserId(): string | undefined {
    // Try to get current user ID from auth context or localStorage
    try {
      const authData = localStorage.getItem('auth_user');
      if (authData) {
        const user = JSON.parse(authData);
        return user.uid;
      }
    } catch (error) {
      // Ignore errors when getting user ID
    }
    return undefined;
  }

  private storeErrorLocally(logEntry: { error: AppError; errorId: string; timestamp: Date }): void {
    try {
      const existingErrors = this.getStoredErrors();
      existingErrors.push(logEntry);
      
      // Keep only last 50 errors in localStorage
      const recentErrors = existingErrors.slice(-50);
      
      localStorage.setItem('error_logs', JSON.stringify(recentErrors));
    } catch (error) {
      // If localStorage is full or unavailable, ignore
      console.warn('Failed to store error locally:', error);
    }
  }

  private getStoredErrors(): Array<{ error: AppError; errorId: string; timestamp: Date }> {
    try {
      const stored = localStorage.getItem('error_logs');
      if (stored) {
        return JSON.parse(stored).map((entry: any) => ({
          ...entry,
          timestamp: new Date(entry.timestamp)
        }));
      }
    } catch (error) {
      console.warn('Failed to retrieve stored errors:', error);
    }
    return [];
  }

  private async sendErrorToRemote(logEntry: { error: AppError; errorId: string; timestamp: Date }): Promise<void> {
    try {
      // In a real application, this would send to a logging service like:
      // - Sentry
      // - LogRocket
      // - Custom logging endpoint
      // - Firebase Analytics/Crashlytics
      
      // For now, we'll just simulate the API call
      if (process.env.NODE_ENV === 'development') {
        console.log('📡 Would send error to remote logging service:', logEntry);
        return;
      }

      // Example implementation for a custom logging endpoint:
      /*
      const response = await fetch('/api/errors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          errorId: logEntry.errorId,
          error: logEntry.error,
          timestamp: logEntry.timestamp.toISOString(),
          userAgent: navigator.userAgent,
          url: window.location.href,
          userId: logEntry.error.userId
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to log error: ${response.status}`);
      }
      */
    } catch (error) {
      // If remote logging fails, store for retry when back online
      console.warn('Failed to send error to remote service:', error);
    }
  }

  private handleOnline = (): void => {
    this.isOnline = true;
    
    // Retry sending any stored errors
    const storedErrors = this.getStoredErrors();
    storedErrors.forEach(logEntry => {
      this.sendErrorToRemote(logEntry);
    });
  };

  private handleOffline = (): void => {
    this.isOnline = false;
  };

  /**
   * Clear all stored error logs
   */
  static clearErrorLogs(): void {
    const logger = ErrorLogger.getInstance();
    logger.errorQueue = [];
    localStorage.removeItem('error_logs');
  }

  /**
   * Export error logs for debugging or support
   */
  static exportErrorLogs(): string {
    const logger = ErrorLogger.getInstance();
    const allErrors = [
      ...logger.getStoredErrors(),
      ...logger.errorQueue
    ];

    return JSON.stringify(allErrors, null, 2);
  }
}

// Set up global error handlers
window.addEventListener('error', (event) => {
  ErrorLogger.logJSError(event.error || new Error(event.message), 'Global error handler');
});

window.addEventListener('unhandledrejection', (event) => {
  const error = event.reason instanceof Error 
    ? event.reason 
    : new Error(String(event.reason));
  
  ErrorLogger.logJSError(error, 'Unhandled promise rejection');
});

// Export singleton instance
export const errorLogger = ErrorLogger.getInstance();